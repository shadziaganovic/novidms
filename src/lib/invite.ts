import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless invite tokens: an HMAC-signed payload carrying the invited user id.
// No DB column needed (keeps the Faza 1 schema as specified) — validity is the
// signature + a 14-day age check. Runs only in Node (server actions / the
// public /invite page), so node:crypto is fine here.

const PURPOSE = "invite";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET nije postavljen.");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createInviteToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, p: PURPOSE, iat: Date.now() }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyInviteToken(
  token: string | undefined | null,
): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
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
