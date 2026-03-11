import { cookies } from "next/headers";
import { db } from "./db";
import { encrypt, decrypt } from "./session";
import type { SessionPayload } from "./session";
import { Role, User } from "@prisma/client";

/**
 * Resolves the authenticated user.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("evo_session")?.value;
  const payload = await decrypt(token);

  if (payload) {
    return db.user.findUnique({
      where: { id: payload.userId },
    });
  }

  // Fallback to mock auth if enabled
  if (process.env.ALLOW_MOCK_AUTH === "true") {
    const mockRole = cookieStore.get("evo_mock_role")?.value as Role | undefined;
    const mockEmail = cookieStore.get("evo_mock_user_email")?.value;

    if (mockRole && mockEmail) {
      return db.user.findUnique({
        where: { email: mockEmail },
      });
    }
  }

  return null;
}

/**
 * Legacy/Staged compatibility helper.
 * Returns a minimal session object.
 */
export async function getMockSession() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  return {
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}

/**
 * Check if the current user has a specific role.
 */
export async function hasRole(role: Role) {
  const user = await getAuthenticatedUser();
  return user?.role === role;
}
