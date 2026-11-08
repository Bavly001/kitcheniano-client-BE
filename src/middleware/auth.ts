// ==============================================================================
// AUTHENTICATION MIDDLEWARE (src/middleware/auth.ts)
// ==============================================================================
// Protects client endpoints using JWT authentication.
// Mirrors the clean structure from todo-list-app-BE/middleware/auth.js.

import { Request, Response, NextFunction } from 'express';
import { verifyToken, ClientTokenPayload } from '../utils/jwt';

export interface AuthenticatedClientRequest extends Request {
  client?: {
    id: number;
    email: string;
    organizationId: string;
    role: 'client';
  };
  organizationId?: string;
}

/**
 * Express middleware to authenticate customer requests via JWT.
 * Extracts JWT strictly from 'Authorization: Bearer <token>' header or '?token=' query parameter.
 */
export function authenticateClient(
  req: AuthenticatedClientRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  let token: string | null = null;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (authHeader) {
    token = authHeader.trim();
  } else if (typeof req.query.token === 'string') {
    // Allows EventSource SSE browser connections to authenticate via query string
    token = req.query.token.trim();
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: valid client token required' });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.clientId) {
    res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    return;
  }

  // Resolve organization ID from headers or token
  const headerOrgId = req.headers['x-organization-id'] as string | undefined;
  const orgId = headerOrgId || decoded.organizationId || process.env.DEFAULT_ORG_ID || '';

  req.client = {
    id: decoded.clientId,
    email: decoded.email,
    organizationId: orgId,
    role: 'client',
  };
  req.organizationId = orgId;

  next();
}

/**
 * Optional authentication: extracts client if a valid token exists,
 * but does not reject the request if unauthenticated.
 */
export function optionalClientAuth(
  req: AuthenticatedClientRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  let token: string | null = null;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.clientId) {
      req.client = {
        id: decoded.clientId,
        email: decoded.email,
        organizationId: decoded.organizationId || process.env.DEFAULT_ORG_ID || '',
        role: 'client',
      };
    }
  }

  const headerOrgId = req.headers['x-organization-id'] as string | undefined;
  req.organizationId = req.client?.organizationId || headerOrgId || process.env.DEFAULT_ORG_ID || '';

  next();
}
