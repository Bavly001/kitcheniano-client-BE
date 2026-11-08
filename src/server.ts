// ==============================================================================
// KITCHENIANO CLIENT STOREFRONT - BACKEND SERVER (src/server.ts)
// ==============================================================================
// Lightweight Express + TypeScript microservice for customer ordering & live tracking.
// Designed with the simple, modular architecture of todo-list-app-BE/server.js.

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './db';

import authRoutes from './routes/auth';
import menuRoutes from './routes/menu';
import cartRoutes from './routes/cart';
import ordersRoutes from './routes/orders';
import notificationsRoutes from './routes/notifications';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4001;

// Enable Cross-Origin Resource Sharing
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);

// Parse incoming JSON payloads with fallback
app.use(express.json({ type: ['application/json', 'text/plain', '*/*'] }));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // Keep body as string if not valid JSON
    }
  }
  next();
});

// Parse URL-encoded payloads
app.use(express.urlencoded({ extended: true }));

// Request trace logger
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[CLIENT-API] ${req.method} ${req.url}`);
  next();
});

// Health check endpoints
app.get(['/', '/health', '/api/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'kitcheniano-client-be',
    message: 'Kitcheniano Customer Storefront API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular route handlers
// 1. Customer Authentication (register, login, me)
app.use(['/client/auth', '/api/auth'], authRoutes);

// 2. Public Menu Catalog (browse dishes, dish details)
app.use(['/client/menu', '/api/menu'], menuRoutes);

// 3. Persistent Shopping Cart (sync, get, clear)
app.use(['/client/cart', '/api/cart'], cartRoutes);

// 4. Customer Orders (place order, history, tracking)
app.use(['/client/orders', '/api/orders'], ordersRoutes);

// 5. Real-time Live Notifications (SSE stream, webhooks)
app.use(['/client/notifications', '/api/notifications'], notificationsRoutes);

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[SERVER ERROR]:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start HTTP server
async function startServer(): Promise<void> {
  await initializeDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Kitcheniano Client API listening on http://0.0.0.0:${PORT}`);
  });
}

// Start server if executed directly
if (require.main === module) {
  startServer().catch((err) => {
    console.error('[FATAL] Server startup failed:', err);
    process.exit(1);
  });
}

export default app;
