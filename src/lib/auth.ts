// Auth primitives using the Web Crypto API only, so this module can be imported
// from `proxy.ts` (which runs before the full Node server). It must NOT import
// `next/headers` or any Node-only API — cookie handling lives in `session.ts`.

export const SESSION_COOKIE = "novidms_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET nije postavljen. Dodajte ga u .env (vidi .env.example).",
    );
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function stringToBase64Url(str: string): string {
  return bytesToBase64Url(encoder.encode(str));
}

function base64UrlToString(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return decoder.decode(bytes);
}

async function hmac(payloadB64: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payloadB64),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export type Role = "ADMIN" | "MEMBER";

export interface SessionData {
  /** User id. */
  uid: string;
  /** Tenant (company) id — the basis of all tenant isolation. */
  tenantId: string;
  role: Role;
}

/** Create a signed session token carrying the user id, tenant id and role. */
export async function createSessionToken(data: SessionData): Promise<string> {
  const payload = stringToBase64Url(
    JSON.stringify({
      uid: data.uid,
      tenantId: data.tenantId,
      role: data.role,
      iat: Date.now(),
    }),
  );
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

/** Verify signature + expiry; returns the session data, or null if invalid. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionData | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expected = await hmac(payloadB64);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlToString(payloadB64)) as {
      uid?: string;
      tenantId?: string;
      role?: string;
      iat?: number;
    };
    if (
      typeof payload.uid !== "string" ||
      typeof payload.tenantId !== "string" ||
      (payload.role !== "ADMIN" && payload.role !== "MEMBER") ||
      typeof payload.iat !== "number"
    ) {
      return null;
    }
    if (Date.now() - payload.iat > SESSION_MAX_AGE_SECONDS * 1000) {
      return null;
    }
    return { uid: payload.uid, tenantId: payload.tenantId, role: payload.role };
  } catch {
    return null;
  }
}

export function isAdmin(role: string | undefined): boolean {
  return role === "ADMIN";
}
