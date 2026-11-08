// ==============================================================================
// KITCHENIANO CLIENT MICROSERVICE - DATABASE MODULE (src/db.ts)
// ==============================================================================
// Manages MySQL connection pool shared directly with the kitchen dashboard database.

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'kitcheniano_user',
  password: process.env.DB_PASSWORD || 'kitcheniano_pass',
  database: process.env.DB_NAME || 'kitcheniano_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Verifies database connectivity on server startup.
 */
export async function initializeDatabase(retries = 5, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[DB] Attempting database connection (attempt ${attempt}/${retries})...`);
      const connection = await pool.getConnection();
      console.log(`[DB] Successfully connected to MySQL database: ${process.env.DB_NAME || 'kitcheniano_db'}`);
      connection.release();
      return;
    } catch (err: any) {
      console.warn(`[DB] Database connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.warn('[DB] Could not connect to MySQL right now. Server will still accept requests once DB is up.');
      }
    }
  }
}
