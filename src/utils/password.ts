// ==============================================================================
// PASSWORD & SANITIZATION UTILITIES (src/utils/password.ts)
// ==============================================================================
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compares candidate password against stored password hash.
 */
export async function comparePassword(candidate: string, stored: string): Promise<boolean> {
  if (!candidate || !stored) {
    return false;
  }
  try {
    return await bcrypt.compare(candidate, stored);
  } catch {
    return false;
  }
}

/**
 * Strips passwordHash and sensitive fields from client entity.
 */
export function sanitizeClient<T extends Record<string, any>>(client: T): Omit<T, 'passwordHash' | 'password'> {
  if (!client) return client;
  const { passwordHash, password, ...safe } = client;
  return safe as Omit<T, 'passwordHash' | 'password'>;
}
