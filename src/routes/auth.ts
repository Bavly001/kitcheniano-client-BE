// ==============================================================================
// CUSTOMER AUTHENTICATION ROUTES (src/routes/auth.ts)
// ==============================================================================
// Endpoints for customer registration, login, and profile fetching.
// Directly mirrors the clean structure of todo-list-app-BE/routes/auth.js.

import { Router, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db';
import { signToken } from '../utils/jwt';
import { hashPassword, comparePassword, sanitizeClient } from '../utils/password';
import { authenticateClient, AuthenticatedClientRequest } from '../middleware/auth';

const router = Router();

// POST /client/auth/register
router.post('/register', async (req: AuthenticatedClientRequest, res: Response) => {
  const { email, password, firstName, lastName, phone, address } = req.body || {};
  const orgId = (req.headers['x-organization-id'] as string) || process.env.DEFAULT_ORG_ID || '';

  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ error: 'Email, password, firstName, and lastName are required' });
    return;
  }

  if (typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Please enter a valid email address' });
    return;
  }

  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  try {
    // 1. Check if email already registered for this organization
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM clients WHERE email = ? AND organizationId = ?',
      [email.toLowerCase().trim(), orgId],
    );

    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      return;
    }

    // 2. Hash password and insert client
    const passwordHash = await hashPassword(password);
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO clients (organizationId, email, passwordHash, firstName, lastName, phone, address, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        orgId,
        email.toLowerCase().trim(),
        passwordHash,
        firstName.trim(),
        lastName.trim(),
        phone ? phone.trim() : null,
        address ? address.trim() : null,
      ],
    );

    const clientId = result.insertId;

    // 3. Issue client JWT token
    const token = signToken({
      clientId,
      email: email.toLowerCase().trim(),
      organizationId: orgId,
      role: 'client',
    });

    const client = {
      id: clientId,
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone || null,
      address: address || null,
      organizationId: orgId,
    };

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      client,
    });
  } catch (err: any) {
    console.error('[AUTH REGISTER ERROR]:', err);
    res.status(500).json({ error: 'Failed to create customer account' });
  }
});

// POST /client/auth/login
router.post('/login', async (req: AuthenticatedClientRequest, res: Response) => {
  const { email, password } = req.body || {};
  const orgId = (req.headers['x-organization-id'] as string) || process.env.DEFAULT_ORG_ID || '';

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, organizationId, email, passwordHash, firstName, lastName, phone, address
       FROM clients
       WHERE email = ? AND organizationId = ?`,
      [email.toLowerCase().trim(), orgId],
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const clientRecord = rows[0];

    // If account was created by an admin without a password yet
    if (!clientRecord.passwordHash) {
      res.status(401).json({
        error: 'Your customer profile was created without a password. Please register or contact the kitchen.',
      });
      return;
    }

    const isValid = await comparePassword(password, clientRecord.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({
      clientId: clientRecord.id,
      email: clientRecord.email,
      organizationId: clientRecord.organizationId,
      role: 'client',
    });

    res.json({
      token,
      client: sanitizeClient(clientRecord),
    });
  } catch (err: any) {
    console.error('[AUTH LOGIN ERROR]:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// GET /client/auth/me
router.get('/me', authenticateClient, async (req: AuthenticatedClientRequest, res: Response) => {
  const clientId = req.client!.id;
  const orgId = req.organizationId!;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, organizationId, email, firstName, lastName, phone, address, gender, birthdate, createdAt, updatedAt
       FROM clients
       WHERE id = ? AND organizationId = ?`,
      [clientId, orgId],
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Client profile not found' });
      return;
    }

    res.json({ client: rows[0] });
  } catch (err: any) {
    console.error('[AUTH ME ERROR]:', err);
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

export default router;
