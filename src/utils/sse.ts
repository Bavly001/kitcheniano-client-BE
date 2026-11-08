// ==============================================================================
// REAL-TIME SSE BROADCASTER (src/utils/sse.ts)
// ==============================================================================
// Tracks active SSE connections for logged-in clients and streams live order updates.

import { Response } from 'express';

interface ClientConnection {
  clientId: number;
  organizationId: string;
  res: Response;
}

const activeConnections = new Set<ClientConnection>();

/**
 * Registers an active SSE client response stream.
 */
export function registerClientConnection(
  clientId: number,
  organizationId: string,
  res: Response,
): ClientConnection {
  const connection: ClientConnection = { clientId, organizationId, res };
  activeConnections.add(connection);

  res.on('close', () => {
    activeConnections.delete(connection);
  });

  return connection;
}

/**
 * Broadcasts an SSE event to a specific client.
 */
export function sendToClient(clientId: number, eventName: string, data: any): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const conn of activeConnections) {
    if (conn.clientId === clientId) {
      try {
        conn.res.write(payload);
      } catch (err) {
        activeConnections.delete(conn);
      }
    }
  }
}

/**
 * Broadcasts an SSE event to all connected clients of an organization.
 */
export function broadcastToOrg(organizationId: string, eventName: string, data: any): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const conn of activeConnections) {
    if (conn.organizationId === organizationId) {
      try {
        conn.res.write(payload);
      } catch (err) {
        activeConnections.delete(conn);
      }
    }
  }
}

/**
 * Returns count of currently active SSE subscriber connections.
 */
export function getActiveClientCount(): number {
  return activeConnections.size;
}
