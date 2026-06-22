import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

// Password hashing with scrypt (built into Node, no native dependency). Runs
// only in server actions / route handlers (Node runtime), never in the proxy.

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derived = scryptSync(password, salt, 64);
  return (
    keyBuffer.length === derived.length && timingSafeEqual(keyBuffer, derived)
  );
}

/**
 * A hash of a random, unknowable secret. Used for invited users who have not
 * set a password yet — nobody can log in as them until they use the invite
 * link to choose their own password.
 */
export function randomPasswordHash(): string {
  return hashPassword(randomBytes(24).toString("hex"));
}
