import { cookies } from "next/headers";

export type UserRole = "OWNER" | "CUSTOMER";

export async function getMockSession() {
  const cookieStore = await cookies();
  const mockRole = cookieStore.get("evo_mock_role")?.value as UserRole | undefined;

  if (!mockRole) {
    return null;
  }

  return {
    user: {
      role: mockRole,
      email: mockRole === "OWNER" ? "owner@evomotors.com" : "customer@evomotors.com",
    },
  };
}

export async function hasRole(role: UserRole) {
  const session = await getMockSession();
  return session?.user.role === role;
}
