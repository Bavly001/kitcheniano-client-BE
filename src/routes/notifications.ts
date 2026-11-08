// ==============================================================================
// REAL-TIME NOTIFICATIONS & SSE STREAM (src/routes/notifications.ts)
// ==============================================================================
// Exposes Server-Sent Events (SSE) stream for customers to receive real-time updates.

import { Router, Response } from 'express';
import { authenticateClient, AuthenticatedClientRequest } from '../middleware/auth';
import { registerClientConnection, sendToClient, getActiveClientCount } from '../utils/sse';

const router = Router();

// GET /client/notifications/stream - Live SSE connection for customer browser
router.get('/stream', authenticateClient, (req: AuthenticatedClientRequest, res: Response) => {
  const clientId = req.client!.id;
  const orgId = req.organizationId!;

  // 1. Establish SSE stream headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // 2. Register client in connection registry
  registerClientConnection(clientId, orgId, res);

  // 3. Send initial connection confirmation
  res.write(
    `event: connected\ndata: ${JSON.stringify({
      status: 'connected',
      clientId,
      organizationId: orgId,
      timestamp: new Date().toISOString(),
    })}\n\n`,
  );

  // 4. Send keep-alive heartbeat comment every 25s
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// POST /client/notifications/webhook - Internal webhook called on order status change
router.post('/webhook', (req, res) => {
  const { orderId, clientId, status, paymentStatus, message } = req.body || {};

  if (!orderId || !clientId || !status) {
    res.status(400).json({ error: 'orderId, clientId, and status are required' });
    return;
  }

  sendToClient(Number(clientId), 'order_status_updated', {
    orderId: Number(orderId),
    status,
    paymentStatus: paymentStatus || null,
    message: message || `Order #${orderId} status changed to ${status}`,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Notification dispatched to client' });
});

// GET /client/notifications/status - Debug stats
router.get('/status', (req, res) => {
  res.json({
    activeConnections: getActiveClientCount(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
