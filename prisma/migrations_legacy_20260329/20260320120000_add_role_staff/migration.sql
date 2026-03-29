-- Align PostgreSQL "Role" enum with prisma/schema.prisma (STAFF was missing from init baseline).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';
