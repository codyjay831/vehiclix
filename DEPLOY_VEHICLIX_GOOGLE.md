# Deployment Guide: Vehiclix on Google Cloud (Firebase App Hosting)

This document provides instructions for deploying the Vehiclix platform to Google Cloud using Firebase App Hosting.

## 1. Production Environment Variables Inventory

| Variable | Type | Purpose | Launch Req? |
|----------|------|---------|-------------|
| `DATABASE_URL` | Secret | PostgreSQL URL for **local dev**, **Prisma CLI** (`migrate`, `studio`), and **optional** build-time tools. Not used at **runtime** when the Cloud SQL connector is enabled. | **YES** (for CLI/dev) |
| `USE_CLOUD_SQL_CONNECTOR` | Secret/Public | Set to `true` in **production runtime** to connect via `@google-cloud/cloud-sql-connector` (private IP) instead of `DATABASE_URL`. Omit or not `true` locally. | **YES** (prod runtime) |
| `CLOUD_SQL_INSTANCE_CONNECTION_NAME` | Secret/Public | Cloud SQL instance name (`project:region:instance`). Used by runtime connector; avoids hardcoded instance drift. | **YES** (prod runtime connector) |
| `DB_PASSWORD` | Secret | Postgres password when `USE_CLOUD_SQL_CONNECTOR=true` (runtime). Do not embed in `DATABASE_URL` for that mode. | **YES** (with connector) |
| `DB_USER` | Secret/Public | Postgres user for runtime connector. Defaults to `postgres` if unset. | Optional |
| `DB_NAME` | Secret/Public | Postgres database for runtime connector. Defaults to `vehiclix` if unset. | Optional |
| `DIRECT_URL` | Secret | Legacy/doc name; this repo’s Prisma 7 config uses `DATABASE_URL` only for CLI. Safe to align with `DATABASE_URL` if you use a direct URL for migrations. | Optional |
| `AUTH_SECRET` | Secret | Random string for signing session JWTs. | **YES** |
| `STRIPE_SECRET_KEY` | Secret | Your production Stripe secret key. | **YES** |
| `STRIPE_WEBHOOK_SECRET` | Secret | Signing secret for Stripe webhooks. | **YES** |
| `APP_URL` | Public | Set to `https://vehiclix.app`. | **YES** |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | Public | Set to `vehiclix.app`. | **YES** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Your production Stripe publishable key. | **YES** |
| `TWO_FACTOR_ENCRYPTION_KEY` | Secret | Hex key for encrypting 2FA secrets. | **YES** |
| `ALLOW_MOCK_AUTH` | Secret | **MUST be "false" in production.** | **YES** |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Secret | Stable key for encrypting Server Action IDs. | **YES** |
| `NEXT_DEPLOYMENT_ID` | Public | Unique ID for the current build (e.g., Git commit hash). | **YES** |
| `RESEND_API_KEY` | Secret | API key for Resend (required for invite emails). | **YES** |
| `MAIL_FROM_ADDRESS` | Public | Authorized sender email in Resend (e.g., `noreply@vehiclix.com`). | **YES** |
| `DOCUSIGN_WEBHOOK_SECRET` | Secret | Signing secret for DocuSign webhooks. | Optional |

---

### Special Note on Server Actions Stability
Next.js Server Actions require a stable encryption key in production to prevent "Action not found" errors after redeploys.
1. Generate a key: `openssl rand -base64 32`
2. Set it as `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` in Firebase App Hosting.
3. Use a unique `NEXT_DEPLOYMENT_ID` for each build (e.g., your Git commit hash) to manage client-side cache skew.

---

## 2. Firebase App Hosting Setup

1.  **Initialize Firebase**:
    - Run `firebase login`.
    - Run `firebase init apphosting`.
2.  **Select Project**: Choose your Google Cloud project.
3.  **Connect GitHub**: Link your repository (`master` branch).
4.  **Automatic Detection**: Firebase will detect the Next.js project and `standalone` output.

---

## 3. GitHub Connection & Deployment

1.  Push the code to your GitHub repository.
2.  Firebase App Hosting will trigger a build on every push to the connected branch.
3.  Ensure the build command in Firebase is set to `npm run build` (which includes `prisma generate`).

---

## 3b. Production schema migrations (Prisma `P2022` / “column does not exist”)

Firebase App Hosting **does not** automatically run `prisma migrate deploy`. If production code is newer than the Cloud SQL schema, admin routes that query `Vehicle` (and similar) can throw **Prisma `P2022`**: *column does not exist*. That is **not** fixed by redeploying alone; the **production** database must receive pending migrations.

### Rules

1. **`npx prisma migrate deploy` uses `DATABASE_URL` from your shell** (or `.env` via `prisma.config.ts`). It does **not** read Firebase Console by itself. If the log shows `127.0.0.1` and `evomotors_db`, you only updated **local** Postgres — not Cloud SQL.
2. **`DATABASE_URL` must be a single line** with no spaces or line breaks inside the value. In the console, it should look exactly like:  
   `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`
3. **Password URL encoding**: If the password contains `@`, `:`, `/`, `#`, `?`, `%`, or spaces, encode them for the URL (e.g. `@` → `%40`). Otherwise Prisma returns **P1013** (invalid URL / port).
4. **Private IP hosts (`10.x`, `172.16.x`, etc.)**: Your laptop **cannot** reach Cloud SQL’s private IP without **Cloud SQL Auth Proxy** (or an equivalent VPN / bastion). Putting `10.x` in `DATABASE_URL` is correct for **Cloud Run inside the VPC**; from home you must proxy to `127.0.0.1:<localPort>` and point `DATABASE_URL` there for CLI commands.

### Recommended: migrate from your machine via Cloud SQL Auth Proxy

1. Install [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy) and authenticate (`gcloud auth application-default login` or a service account with **Cloud SQL Client**).
2. Start the proxy against your instance (example; use your real `project:region:instance`):

   ```bash
   cloud-sql-proxy --private-ip --port 6543 PROJECT_ID:REGION:INSTANCE_NAME
   ```

3. In **another** terminal, set `DATABASE_URL` to **localhost + proxy port** (use your real password; encode special characters):

   ```powershell
   $env:DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@127.0.0.1:6543/vehiclix?schema=public"
   npx prisma migrate deploy
   npx prisma migrate status
   ```

4. Confirm the first line of output shows **`vehiclix` at `127.0.0.1:6543`** (or your chosen port), **not** `evomotors_db` on `5432`, before trusting the result.

### One-shot script (Windows)

Prerequisite: **Application Default Credentials** — install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install), then:

```bash
gcloud auth application-default login
```

Set a migrate URL (use your real password; URL-encode special characters if needed):

```powershell
$env:MIGRATE_DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@127.0.0.1:6543/vehiclix?schema=public"
powershell -ExecutionPolicy Bypass -File .\scripts\run-production-migrate.ps1
```

The script downloads `tools/cloud-sql-proxy.exe` if missing, starts the proxy, runs `prisma migrate deploy` and `migrate status`, then stops the proxy.

### Runtime vs CLI (`USE_CLOUD_SQL_CONNECTOR`)

- If **`USE_CLOUD_SQL_CONNECTOR=true`** in Firebase, the **running app** can use the connector + `DB_PASSWORD` instead of `DATABASE_URL` for the DB pool. **Prisma CLI** still needs a reachable `DATABASE_URL` when you run `migrate deploy` (typically via the proxy URL above).
- If **`USE_CLOUD_SQL_CONNECTOR` is not `true`**, the app uses **`DATABASE_URL`** at runtime; it must be reachable from Cloud Run (private IP + VPC, as configured in `apphosting.yaml`).

### Stripe

`STRIPE_SECRET_KEY` should be a **live** secret key in real production billing; a `sk_test_…` placeholder skips real charges but is not a substitute for production configuration.

---

## 4. Custom Domain Setup (vehiclix.app)

1.  In Firebase Console: **App Hosting** > **Settings** > **Custom Domains**.
2.  Add `vehiclix.app`.
3.  Configure DNS records (A/AAAA/TXT) as provided by Firebase.
4.  Provisioning SSL may take up to 24 hours.

---

## 5. Risk Classification & Deferred Items

### ⚠️ [WARNING] File Storage (Ephemeral Filesystem)
The current implementation saves photos to `public/uploads` and documents to `storage/`.
- **Status**: **DEFER** for early internal launch.
- **Risk**: Files will be lost on re-deploy or instance restart.
- **Migration**: Future move to **Google Cloud Storage (GCS)** is required for real customer scale.

### ⚠️ [WARNING] Database Connection Limits
- **Status**: **DEFER** for early launch.
- **Risk**: Serverless functions can exhaust DB connections.
- **Mitigation**: Use a connection pooler (e.g., Supabase/Neon pgbouncer) in `DATABASE_URL`.

---

## 6. Rollback & Troubleshooting

- **Build Failure**: Check the Firebase App Hosting logs. Common cause: missing secrets in the console.
- **Database Error**: For Prisma CLI/migrations, ensure `DATABASE_URL` points at a reachable Postgres URL. For production **runtime** with the connector, set `USE_CLOUD_SQL_CONNECTOR=true` and `DB_PASSWORD`; avoid enabling the connector during `next build` unless the build environment has Cloud SQL Admin API access and VPC reachability (prefer runtime-only connector secrets).
- **Redirect Loop**: Check `APP_URL` matches the accessing domain exactly.
- **Rollback**: Use the Firebase Console to redeploy a previous successful build.
