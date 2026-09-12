import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const SCRYPT_KEYLEN = 64;
// 12 hours - short enough that a stolen cookie has a limited blast radius,
// long enough that the client dashboard doesn't force daily re-logins.
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  // Buffers must be equal length before timingSafeEqual will compare them;
  // a length mismatch here just means "wrong password", not an error.
  return derivedKey.length === expected.length && timingSafeEqual(derivedKey, expected);
}

export interface SessionTokenPayload {
  accountId: string;
  role: "admin" | "client";
  clientGhlLocationId?: string;
}

interface SignedTokenPayload extends SessionTokenPayload {
  iat: number;
  exp: number;
}

/**
 * Stateless, HMAC-signed session tokens - deliberately not JWT (no library,
 * no alg-confusion surface, one fixed signing scheme). Tradeoff: tokens
 * can't be revoked before they expire. Acceptable for a 12-hour TTL on an
 * internal/client dashboard; revisit with a server-side session table if
 * "kill this session now" ever becomes a real requirement.
 */
export function signSessionToken(payload: SessionTokenPayload, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const full: SignedTokenPayload = { ...payload, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string, secret: string): SignedTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = createHmac("sha256", secret).update(body).digest("base64url");
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let payload: SignedTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SignedTokenPayload;
  } catch {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
