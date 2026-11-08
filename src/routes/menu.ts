// ==============================================================================
// PUBLIC MENU CATALOG ROUTES (src/routes/menu.ts)
// ==============================================================================
// Public endpoints for customers to browse published menu items.
// Enforces least-privilege: raw stock, supplier batches, and recipes are hidden.

import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../db';

const router = Router();

// GET /client/menu
// Query params: search, limit, page
router.get('/', async (req: Request, res: Response) => {
  const orgId = (req.headers['x-organization-id'] as string) || process.env.DEFAULT_ORG_ID || '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT id, organizationId, name, description, price, imageUrl, notes, createdAt
      FROM menu_items
      WHERE organizationId = ?
        AND isVisibleOnMenu = 1
        AND isActive = 1
    `;
    const params: any[] = [orgId];

    if (search) {
      query += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    // Format prices as numbers
    const items = rows.map((dish) => ({
      id: dish.id,
      name: dish.name,
      description: dish.description || '',
      price: Number(dish.price || 0),
      imageUrl: dish.imageUrl || null,
      notes: dish.notes || null,
    }));

    res.json({
      items,
      total: items.length,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('[MENU CATALOG ERROR]:', err);
    res.status(500).json({ error: 'Failed to fetch published menu items' });
  }
});

// GET /client/menu/:id
router.get('/:id', async (req: Request, res: Response) => {
  const orgId = (req.headers['x-organization-id'] as string) || process.env.DEFAULT_ORG_ID || '';
  const dishId = Number(req.params.id);

  if (isNaN(dishId)) {
    res.status(400).json({ error: 'Invalid dish ID' });
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, organizationId, name, description, price, imageUrl, notes, createdAt
       FROM menu_items
       WHERE id = ?
         AND organizationId = ?
         AND isVisibleOnMenu = 1
         AND isActive = 1`,
      [dishId, orgId],
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Dish not found or not published to the public menu' });
      return;
    }

    const dish = rows[0];
    res.json({
      dish: {
        id: dish.id,
        name: dish.name,
        description: dish.description || '',
        price: Number(dish.price || 0),
        imageUrl: dish.imageUrl || null,
        notes: dish.notes || null,
      },
    });
  } catch (err: any) {
    console.error('[MENU ITEM ERROR]:', err);
    res.status(500).json({ error: 'Failed to fetch dish details' });
  }
});

export default router;
