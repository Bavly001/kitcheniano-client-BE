// ==============================================================================
// PERSISTENT SHOPPING CART ROUTES (src/routes/cart.ts)
// ==============================================================================
// Persists and synchronizes customer shopping carts in the shared client_carts table.

import { Router, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../db';
import { authenticateClient, AuthenticatedClientRequest } from '../middleware/auth';

const router = Router();

// Enforce client authentication for all cart operations
router.use(authenticateClient);

// GET /client/cart - Get client's current cart with joined dish details & subtotal
router.get('/', async (req: AuthenticatedClientRequest, res: Response) => {
  const clientId = req.client!.id;
  const orgId = req.organizationId!;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.menuItemId, c.quantity, m.name, m.price, m.imageUrl, m.isActive, m.isVisibleOnMenu
       FROM client_carts c
       INNER JOIN menu_items m ON c.menuItemId = m.id
       WHERE c.clientId = ? AND c.organizationId = ?
       ORDER BY c.id ASC`,
      [clientId, orgId],
    );

    let subtotal = 0;
    const items = rows.map((row) => {
      const price = Number(row.price || 0);
      const quantity = Number(row.quantity || 1);
      const lineTotal = Number((price * quantity).toFixed(2));
      subtotal += lineTotal;

      return {
        id: row.id,
        menuItemId: row.menuItemId,
        name: row.name,
        price,
        imageUrl: row.imageUrl || null,
        quantity,
        lineTotal,
        isAvailable: Boolean(row.isActive && row.isVisibleOnMenu),
      };
    });

    res.json({
      items,
      itemCount: items.reduce((acc, curr) => acc + curr.quantity, 0),
      subtotal: Number(subtotal.toFixed(2)),
    });
  } catch (err: any) {
    console.error('[CART GET ERROR]:', err);
    res.status(500).json({ error: 'Failed to retrieve shopping cart' });
  }
});

// PUT /client/cart - Synchronize / replace cart items from frontend
router.put('/', async (req: AuthenticatedClientRequest, res: Response) => {
  const clientId = req.client!.id;
  const orgId = req.organizationId!;
  const { items } = req.body || {};

  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Items must be an array of { menuItemId, quantity }' });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Delete existing cart items for this client and org
    await connection.query(
      'DELETE FROM client_carts WHERE clientId = ? AND organizationId = ?',
      [clientId, orgId],
    );

    // 2. Insert new validated items if any
    const validItems = items.filter(
      (item) => item && typeof item.menuItemId === 'number' && typeof item.quantity === 'number' && item.quantity > 0,
    );

    for (const item of validItems) {
      await connection.query(
        `INSERT INTO client_carts (clientId, organizationId, menuItemId, quantity, updatedAt)
         VALUES (?, ?, ?, ?, NOW())`,
        [clientId, orgId, item.menuItemId, item.quantity],
      );
    }

    await connection.commit();

    // 3. Return the refreshed cart
    const [refreshedRows] = await connection.query<RowDataPacket[]>(
      `SELECT c.id, c.menuItemId, c.quantity, m.name, m.price, m.imageUrl
       FROM client_carts c
       INNER JOIN menu_items m ON c.menuItemId = m.id
       WHERE c.clientId = ? AND c.organizationId = ?`,
      [clientId, orgId],
    );

    let subtotal = 0;
    const cartItems = refreshedRows.map((row) => {
      const price = Number(row.price || 0);
      const quantity = Number(row.quantity || 1);
      const lineTotal = Number((price * quantity).toFixed(2));
      subtotal += lineTotal;
      return {
        id: row.id,
        menuItemId: row.menuItemId,
        name: row.name,
        price,
        imageUrl: row.imageUrl || null,
        quantity,
        lineTotal,
      };
    });

    res.json({
      message: 'Cart synchronized successfully',
      items: cartItems,
      itemCount: cartItems.reduce((acc, curr) => acc + curr.quantity, 0),
      subtotal: Number(subtotal.toFixed(2)),
    });
  } catch (err: any) {
    await connection.rollback();
    console.error('[CART SYNC ERROR]:', err);
    res.status(500).json({ error: 'Failed to synchronize shopping cart' });
  } finally {
    connection.release();
  }
});

// DELETE /client/cart - Clear entire cart
router.delete('/', async (req: AuthenticatedClientRequest, res: Response) => {
  const clientId = req.client!.id;
  const orgId = req.organizationId!;

  try {
    await pool.query(
      'DELETE FROM client_carts WHERE clientId = ? AND organizationId = ?',
      [clientId, orgId],
    );
    res.json({ message: 'Cart cleared successfully', items: [], subtotal: 0, itemCount: 0 });
  } catch (err: any) {
    console.error('[CART CLEAR ERROR]:', err);
    res.status(500).json({ error: 'Failed to clear shopping cart' });
  }
});

export default router;
