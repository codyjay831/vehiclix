import { db } from "@/lib/db";

/**
 * Keep all call sites on a single runtime DB client to prevent
 * production drift between "@/lib/prisma" and "@/lib/db".
 */
export const prisma = db;
