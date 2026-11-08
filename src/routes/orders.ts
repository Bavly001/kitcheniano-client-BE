// ==============================================================================
// CUSTOMER ORDERS & TRACKING ROUTES (src/routes/orders.ts)
// ==============================================================================
// Handles customer order placement, price snapshotting, history, and status tracking.

import { Router, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db';
import { authenticateClient, AuthenticatedClientRequest } from '../middleware/auth';
import { sendToClient } from '../utils/sse';

const router = Router();

// Enforce authentication on all order operations
router.use(authenticateClient);

// POST /client/orders - Place a new order
router.post('/', async (req: AuthenticatedClientRequest, res: Response) => {
  const clientId = req.client!.id;
  const orgId = req.organizationId!;
  const {
    customerName,
    customerPhone,
    customerAddress,
    type = 'delivery',
    scheduledFor,
    notes,
    items,
  } = req.body || {};

  if (!customerName || !customerPhone) {
    res.status(400).json({ error: 'Customer name and phone number are required' });
    return;
  }

  if (type === 'delivery' && !customerAddress) {
    res.status(400).json({ error: 'Delivery address is required for delivery orders' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Order must contain at least one dish' });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch dish details from menu_items to snapshot authoritative prices and names
    const itemIds = items.map((i: any) => i.menuItemId).filter(Boolean);
    if (itemIds.length === 0) {
      res.status(400).json({ error: 'Invalid dish items provided' });
      connection.release();
      return;
    }

    const [dishes] = await connection.query<RowDataPacket[]>(
      `SELECT id, name, price, isActive, isVisibleOnMenu
       FROM menu_items
       WHERE id IN (?) AND organizationId = ?`,
      [itemIds, orgId],
    );

    const dishMap = new Map<number, any>();
    dishes.forEach((d) => dishMap.set(d.id, d));

    let subtotal = 0;
    const validatedItems: Array<{
      menuItemId: number;
      nameSnapshot: string;
      priceSnapshot: number;
      quantity: number;
    }> = [];

    for (const itemInput of items) {
      const dish = dishMap.get(itemInput.menuItemId);
      if (!dish || !dish.isActive || !dish.isVisibleOnMenu) {
        await connection.rollback();
        res.status(400).json({
          error: `Dish #${itemInput.menuItemId} is not currently available for ordering`,
        });
        connection.release();
        return;
      }

      const price = Number(dish.price || 0);
      const quantity = Math.max(Number(itemInput.quantity) || 1, 1);
      subtotal += price * quantity;

      validatedItems.push({
        menuItemId: dish.id,
        nameSnapshot: dish.name,
        priceSnapshot: price,
        quantity,
      });
    }

    const finalSubtotal = Number(subtotal.toFixed(2));
    const totalPrice = finalSubtotal; // Client storefront places orders without staff discounts
    const scheduledDate = scheduledFor ? new Date(scheduledFor) : new Date(Date.now() + 35 * 60 * 1000);

    // 2. Insert into orders table
    const [orderResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO orders (
        organizationId, clientId, customerName, customerPhone, customerAddress,
        type, status, paymentStatus, subtotal, discountAmount, discountPercent,
        totalPrice, scheduledFor, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, 0, 0, ?, ?, ?, NOW())`,
      [
        orgId,
        clientId,
        customerName.trim(),
        customerPhone.trim(),
        type === 'delivery' ? customerAddress.trim() : null,
        type,
        finalSubtotal,
        totalPrice,
        scheduledDate,
        notes || null,
      ],
    );

    const orderId = orderResult.insertId;

    // 3. Insert items into order_items table
    for (const item of validatedItems) {
      await connection.query(
        `INSERT INTO order_items (orderId, menuItemId, nameSnapshot, priceSnapshot, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.menuItemId, item.nameSnapshot, item.priceSnapshot, item.quantity],
      );
    }

    // 4. Clear client's shopping cart in client_carts
    await connection.query(
      'DELETE FROM client_carts WHERE clientId = ? AND organizationId = ?',
      [clientId, orgId],
    );

    await connection.commit();

    // 5. Build response object
    const createdOrder = {
      id: orderId,
      organizationId: orgId,
      clientId,
      customerName,
      customerPhone,
      customerAddress: type === 'delivery' ? customerAddress : null,
      type,
      status: 'pending',
      paymentStatus: 'unpaid',
      subtotal: finalSubtotal,
      totalPrice,
      scheduledFor: scheduledDate.toISOString(),
      notes: notes || null,
      items: validatedItems,
    };

    // 6. Broadcast SSE event to client
    sendToClient(clientId, 'order_status_updated', {
      orderId,
      status: 'pending',
      message: 'Your order was successfully placed and received by the kitchen!',
      timestamp: new Date().toISOString(),
    });

    // 7. Non-blocking asynchronous webhook alert to kitchen dashboard
    notifyKitchenDashboard(createdOrder, orgId).catch(() => {});

    res.status(201).json({
      message: 'Order placed successfully',
      order: createdOrder,
    });
  } catch (err: any) {
    await connection.rollback();
    console.error('[ORDER CREATION ERROR]:', err);
    res.status(500).json({ error: 'Failed to place order' });
  } finally {
    connection.release();
  }
});

// GET /client/orders - Get customer's order history
router.get('/', async (req: AuthenticatedClientRequest, res: Response) => {
  const clientId = req.client!.id;
  const orgId = req.organizationId!;

  try {
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT id, organizationId, customerName, customerPhone, customerAddress,
              type, status, paymentStatus, subtotal, totalPrice, scheduledFor, notes, createdAt
       FROM orders
       WHERE clientId = ? AND organizationId = ?
       ORDER BY createdAt DESC`,
      [clientId, orgId],
    );

    if (orders.length === 0) {
      res.json({ orders: [] });
      return;
    }

    const orderIds = orders.map((o) => o.id);
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT id, orderId, menuItemId, nameSnapshot, priceSnapshot, quantity
       FROM order_items
       WHERE orderId IN (?)`,
      [orderIds],
    );

    const itemsByOrder = new Map<number, any[]>();
    items.forEach((item) => {
      const list = itemsByOrder.get(item.orderId) || [];
      list.push({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.nameSnapshot,
        price: Number(item.priceSnapshot || 0),
        quantity: item.quantity,
      });
      itemsByOrder.set(item.orderId, list);
    });

    const populatedOrders = orders.map((o) => ({
      id: o.id,
      organizationId: o.organizationId,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerAddress: o.customerAddress,
      type: o.type,
      status: o.status,
      paymentStatus: o.paymentStatus,
      subtotal: Number(o.subtotal || 0),
      totalPrice: Number(o.totalPrice || 0),
      scheduledFor: o.scheduledFor,
      notes: o.notes,
      createdAt: o.createdAt,
      items: itemsByOrder.get(o.id) || [],
    }));

    res.json({ orders: populatedOrders });
  } catch (err: any) {
    console.error('[ORDERS GET ERROR]:', err);
    res.status(500).json({ error: 'Failed to retrieve customer orders' });
  }
});

// GET /client/orders/:id - Get single order details with status for live tracking
router.get('/:id', async (req: AuthenticatedClientRequest, res: Response) => {
  const clientId = req.client!.id;
  const orgId = req.organizationId!;
  const orderId = Number(req.params.id);

  if (isNaN(orderId)) {
    res.status(400).json({ error: 'Invalid order ID' });
    return;
  }

  try {
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT id, organizationId, customerName, customerPhone, customerAddress,
              type, status, paymentStatus, subtotal, totalPrice, scheduledFor, notes, createdAt
       FROM orders
       WHERE id = ? AND clientId = ? AND organizationId = ?`,
      [orderId, clientId, orgId],
    );

    if (orders.length === 0) {
      res.status(404).json({ error: 'Order not found for your account' });
      return;
    }

    const order = orders[0];
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT id, menuItemId, nameSnapshot, priceSnapshot, quantity
       FROM order_items
       WHERE orderId = ?`,
      [orderId],
    );

    res.json({
      order: {
        id: order.id,
        organizationId: order.organizationId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        type: order.type,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotal: Number(order.subtotal || 0),
        totalPrice: Number(order.totalPrice || 0),
        scheduledFor: order.scheduledFor,
        notes: order.notes,
        createdAt: order.createdAt,
        items: items.map((i) => ({
          id: i.id,
          menuItemId: i.menuItemId,
          name: i.nameSnapshot,
          price: Number(i.priceSnapshot || 0),
          quantity: i.quantity,
        })),
      },
    });
  } catch (err: any) {
    console.error('[ORDER DETAILS ERROR]:', err);
    res.status(500).json({ error: 'Failed to retrieve order details' });
  }
});

/**
 * Triggers an HTTP notification to the kitchen dashboard (port 4000)
 */
async function notifyKitchenDashboard(order: any, orgId: string): Promise<void> {
  const kitchenUrl = process.env.KITCHEN_DASHBOARD_URL || 'http://localhost:4000';
  try {
    await fetch(`${kitchenUrl}/public/orders/notify-kitchen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': orgId,
      },
      body: JSON.stringify({
        orderId: order.id,
        customerName: order.customerName,
        totalPrice: order.totalPrice,
        status: order.status,
      }),
    });
  } catch {
    // Non-blocking best effort: MySQL write is authoritative
  }
}

export default router;
