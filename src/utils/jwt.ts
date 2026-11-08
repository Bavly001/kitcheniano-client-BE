// ==============================================================================
// JWT UTILITIES (src/utils/jwt.ts)
// ==============================================================================
import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export interface ClientTokenPayload {
  clientId: number;
  email: string;
  organizationId: string;
  role: 'client';
}

export const JWT_SECRET = process.env.JWT_SECRET || '';
export const DEFAULT_EXPIRATION = '7d';

/**
 * Signs a payload into a standard JWT.
 */
export function signToken(payload: ClientTokenPayload, options: SignOptions = {}): string {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: DEFAULT_EXPIRATION,
    ...options,
  });
}

/**
 * Verifies a JWT and returns the decoded client payload, or null if invalid.
 */
export function verifyToken(token: string): ClientTokenPayload | null {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return null;
  }

  try {
    const decoded = jwt.verify(token.trim(), JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return decoded as ClientTokenPayload;
  } catch {
    return null;
  }
}
