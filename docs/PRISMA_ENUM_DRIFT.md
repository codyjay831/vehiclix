# Prisma enums and migrations

PostgreSQL stores enums as database types. If you add a value to an `enum` in `prisma/schema.prisma` but do not ship a migration that updates the database (e.g. `ALTER TYPE ... ADD VALUE`), the generated client will send values Postgres rejects.

## Required workflow

1. Edit `prisma/schema.prisma`.
2. Create and commit a migration: `npx prisma migrate dev --name describe_change` (or author SQL by hand in a new `prisma/migrations/<timestamp>_<name>/migration.sql` folder).
3. Run `npx prisma generate`.
4. Restart the Next.js dev server (and clear `.next` if you see stale Prisma client behavior).

## Automated check

- **Local / CI:** `npm run guard:prisma-enum-sync` — compares every `enum` in `schema.prisma` to `CREATE TYPE` / `ALTER TYPE ... ADD VALUE` across `prisma/migrations`, with no database required.
- **CI (with Postgres):** `.github/workflows/prisma-verify.yml` also runs `prisma migrate deploy` and `prisma migrate diff --from-schema ... --to-url ...` so the applied database matches the schema after migrations.

## PostgreSQL version

`ALTER TYPE ... ADD VALUE IF NOT EXISTS` requires **PostgreSQL 15+**. This repo targets **Postgres 16** (Docker and CI).
