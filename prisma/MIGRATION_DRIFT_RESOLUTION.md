# Prisma Migration Drift — Resolution Plan

## A. Root cause of drift

1. **Two migration histories**
   - The database’s `_prisma_migrations` table contains records for **seven migrations** that are no longer in the active migrations folder (`prisma/migrations/`). Those seven exist only in `prisma/migrations_archive/` (e.g. `20260307230422_init`, `20260308050758_schema_corrections`, …). So the DB was migrated with the old sequence; the repo was later restructured to a single **baseline** plus new migrations.
   - Prisma therefore reports: *“The migrations from the database are not found locally.”*

2. **Failed baseline migration**
   - Migration `20260315000000_init_baseline` is recorded in the DB as **failed** (likely it was run, failed partway or timed out, and left in a failed state).
   - Prisma error **P3009** blocks **all** new migrations while any migration is in a failed state. So `prisma migrate deploy` refuses to apply the three pending migrations (organization status, Phase 2 Vehicle fields, EV spec fields) until this is resolved.

3. **Summary**
   - Drift = DB has old migration names (archived in repo) + a failed baseline.
   - Blocker for Phase 2 = failed `20260315000000_init_baseline`, not the “not found locally” warning.

---

## B. Recommended resolution plan

**Goal:** Get the three pending migrations applied so Phase 2 and EV spec columns exist, without changing feature code or doing a destructive reset.

**Steps:**

1. **Confirm the baseline schema is present**  
   Ensure the database already has the core schema (e.g. `Organization`, `Vehicle`, and other tables from the baseline or from the archived migrations). If this DB was used with the app before, that is usually the case.

2. **Mark the failed baseline as applied**  
   Tell Prisma that `20260315000000_init_baseline` is successfully applied so it no longer blocks deploy. Only do this if the schema is already in place (step 1).

3. **Apply the three pending migrations**  
   Run `prisma migrate deploy`. Prisma will apply, in order:
   - `20260316000000_add_organization_status`
   - `20260316100000_add_vehicle_phase2_fields`
   - `20260316200000_add_vehicle_ev_spec_fields`

4. **(Optional) Clean up orphan migration records**  
   If you want `prisma migrate status` to be green with no “not found locally” warnings, you can remove the seven old migration rows from `_prisma_migrations`. **Only do this on a dev/clone DB** after the three migrations above are applied. This is optional and slightly risky (see E).

---

## C. Exact commands in order

**Safe commands (run in this order):**

```powershell
# 1. From repo root
cd "c:\Users\Codyj\Projects\Evo Motors"

# 2. Mark the failed baseline as applied (only if DB already has the baseline schema)
npx prisma migrate resolve --applied "20260315000000_init_baseline"

# 3. Apply the three pending migrations (adds org status, Phase 2 Vehicle fields, EV spec fields)
npx prisma migrate deploy

# 4. Regenerate client so types match DB
npx prisma generate
```

**Optional (dev only) — clean orphan migration records so status is clean:**

```powershell
# Run this only on a development database after steps 1–4 above.
# Uses Prisma db execute; requires a SQL file.

# Create a one-off SQL file (e.g. prisma/scripts/clean_orphan_migrations.sql) with:
# DELETE FROM "_prisma_migrations"
# WHERE "migration_name" IN (
#   '20260307230422_init',
#   '20260308050758_schema_corrections',
#   '20260313000001_add_branding_and_cleanup',
#   '20260313000002_add_organization_domains',
#   '20260314000001_add_organization_homepage',
#   '20260314000002_add_crm_leads',
#   '20260314000003_add_billing_subscriptions'
# );
# Then: npx prisma db execute --file prisma/scripts/clean_orphan_migrations.sql
```

Use this only if you want a clean `migrate status` and accept that the DB’s migration history will no longer reflect the old migrations. Do **not** run on production unless you have explicitly decided to drop that history.

---

## D. Post-fix verification commands

```powershell
cd "c:\Users\Codyj\Projects\Evo Motors"

# Should show 4 migrations applied and possibly still “migrations from the database are not found locally” (unless you ran the optional cleanup).
npx prisma migrate status

# Should complete with no schema errors (client matches DB).
npx prisma generate

# Optional: introspect to confirm Phase 2 + EV columns exist on Vehicle (bodyStyle, fuelType, transmission, doors, batteryCapacityKWh, batteryChemistry, chargingStandard).
npx prisma db pull --print
# Then diff or discard the result; this is only to verify columns.
```

After that, run the app and test create/edit vehicle with Phase 2 and EV fields.

---

## E. Risks / warnings

- **Resolve --applied on the baseline**  
  Only run `prisma migrate resolve --applied "20260315000000_init_baseline"` if the database already has the baseline schema (tables, enums). If the DB is empty or missing tables, marking it applied and then running deploy will **not** re-run the baseline; you would have to baseline again or fix manually.

- **Deleting the seven orphan rows**  
  Optional cleanup removes history that the DB was migrated with the old set. Do **not** do this on production unless you have a clear reason and backups. For local/dev, it is low risk if the schema is correct and the three new migrations are applied.

- **Do not run**
  - `prisma migrate reset` (drops DB and re-applies all migrations; **destructive**).
  - `prisma migrate resolve --rolled-back "20260315000000_init_baseline"` unless you intend to re-apply the baseline (and the baseline would then run again and likely fail because objects already exist).

- **Production**  
  For production, prefer: backup DB, then run only steps 1–3 (resolve baseline as applied, then deploy). Skip the optional cleanup unless you have a separate decision to simplify migration history.

---

## Summary

| Item | Action |
|------|--------|
| **Blocker** | Failed migration `20260315000000_init_baseline` (P3009). |
| **Fix** | `prisma migrate resolve --applied "20260315000000_init_baseline"` then `prisma migrate deploy`. |
| **Optional** | Delete seven orphan rows from `_prisma_migrations` for a clean status (dev only). |
| **Do not** | Edit feature code, run migrate reset, or run rolled-back without a clear plan. |
