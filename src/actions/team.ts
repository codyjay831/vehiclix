"use server";

import { db } from "@/lib/db";
import { requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum([Role.OWNER, Role.STAFF]),
});

/**
 * Creates a new user within the same organization as the current user.
 * Restricted to OWNER role.
 */
export async function createOrganizationUserAction(rawData: unknown) {
  await requireWriteAccess();
  const currentUser = await requireUserWithOrg();

  // Security Gate: Only OWNER or Super Admin in support mode can create users
  if (currentUser.role !== Role.OWNER && !currentUser.isSupportMode) {
    throw new Error("Unauthorized: Only owners can manage team members");
  }

  const validation = UserSchema.safeParse(rawData);
  if (!validation.success) {
    return { 
      success: false, 
      error: validation.error.errors[0].message 
    };
  }

  const { email, password, firstName, lastName, role } = validation.data;

  // Prevent duplicate email across the whole platform
  const existingUser = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    return { success: false, error: "A user with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role,
        organizationId: currentUser.organizationId,
        isStub: false,
      },
    });

    revalidatePath("/admin/settings/users");
    return { success: true, user: { id: newUser.id, email: newUser.email } };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Updates a user's role.
 * Restricted to OWNER role.
 */
export async function updateOrganizationUserRoleAction(userId: string, newRole: Role) {
  await requireWriteAccess();
  const currentUser = await requireUserWithOrg();

  if (currentUser.role !== Role.OWNER && !currentUser.isSupportMode) {
    throw new Error("Unauthorized");
  }

  // Prevent promoting to SUPER_ADMIN or other restricted roles
  if (newRole !== Role.OWNER && newRole !== Role.STAFF) {
    return { success: false, error: "Invalid role selected" };
  }

  const userToUpdate = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  if (!userToUpdate || userToUpdate.organizationId !== currentUser.organizationId) {
    return { success: false, error: "User not found in your organization" };
  }

  await db.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  revalidatePath("/admin/settings/users");
  return { success: true };
}

/**
 * Deletes a user from the organization.
 * Restricted to OWNER role.
 */
export async function deleteOrganizationUserAction(userId: string) {
  await requireWriteAccess();
  const currentUser = await requireUserWithOrg();

  if (currentUser.role !== Role.OWNER && !currentUser.isSupportMode) {
    throw new Error("Unauthorized");
  }

  // Prevent self-deletion
  if (currentUser.id === userId) {
    return { success: false, error: "You cannot remove yourself" };
  }

  const userToDelete = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  if (!userToDelete || userToDelete.organizationId !== currentUser.organizationId) {
    return { success: false, error: "User not found in your organization" };
  }

  // Check if this is the last owner? 
  // (Optional, but let's stick to minimal for now as per instructions)

  await db.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin/settings/users");
  return { success: true };
}
