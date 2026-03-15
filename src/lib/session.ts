import { SignJWT, jwtVerify } from "jose";
import { Role } from "@prisma/client";

const secretKey = process.env.AUTH_SECRET;
if (!secretKey) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is not set in production. Failing fast.");
  }
  // In dev, we can warn but let it continue with a dummy key if allowed, 
  // but the prompt says "Do not silently allow insecure fallback behavior."
  // So I'll just throw in all environments if it's missing.
  throw new Error("AUTH_SECRET is required but missing from environment variables.");
}
const key = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  role: Role;
  email: string;
  organizationId?: string | null;
  supportOrgId?: string | null;
  expiresAt: Date;
  isTwoFactorVerified: boolean;
};

/**
 * Encrypts a payload into a signed JWT.
 */
export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(key);
}

/**
 * Decrypts and verifies a JWT.
 */
export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}
