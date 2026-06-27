import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless password-reset tokens: an HMAC-signed { uid, iat } payload, with the
// signature additionally bound to the user's CURRENT password hash. That makes a
// link single-use: the moment the password changes (i.e. a reset completes), the
// signature no longer matches and any outstanding links die. 1-hour validity.
// Node-only (server actions / the public reset page), so node:crypto is fine.

const PURPOSE = "reset";
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET nije postavljen.");
  return s;
}

function sign(payload: string, passwordHash: string): string {
  return createHmac("sha256", secret())
    .update(`${payload}.${passwordHash}`)
    .digest("base64url");
}

export function createResetToken(userId: string, passwordHash: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, p: PURPOSE, iat: Date.now() }),
  ).toString("base64url");
  return `${payload}.${sign(payload, passwordHash)}`;
}

/**
 * The uid embedded in the token, WITHOUT signature/age checks — used only to look
 * up the user so the caller can fetch the current password hash for full verify.
 */
export function decodeResetUserId(
  token: string | undefined | null,
): string | null {
  if (!token) return null;
  const [payload] = token.split(".");
  if (!payload) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: string;
      p?: string;
    };
    return data.p === PURPOSE && typeof data.uid === "string" ? data.uid : null;
  } catch {
    return null;
  }
}

/** Full check: signature (bound to passwordHash) + purpose + age. */
export function verifyResetToken(
  token: string | undefined | null,
  passwordHash: string,
): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, passwordHash);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: string;
      p?: string;
      iat?: number;
    };
    if (
      data.p !== PURPOSE ||
      typeof data.uid !== "string" ||
      typeof data.iat !== "number"
    ) {
      return null;
    }
    if (Date.now() - data.iat > MAX_AGE_MS) return null;
    return data.uid;
  } catch {
    return null;
  }
}
