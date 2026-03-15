# Deployment Guide: Vehiclix on Google Cloud (Firebase App Hosting)

This document provides instructions for deploying the Vehiclix platform to Google Cloud using Firebase App Hosting.

## 1. Production Environment Variables Inventory

| Variable | Type | Purpose | Launch Req? |
|----------|------|---------|-------------|
| `DATABASE_URL` | Secret | Connection string for your production PostgreSQL. | **YES** |
| `DIRECT_URL` | Secret | Required for Prisma migrations during build. | **YES** |
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
- **Database Error**: Ensure `DIRECT_URL` is set correctly for migrations.
- **Redirect Loop**: Check `APP_URL` matches the accessing domain exactly.
- **Rollback**: Use the Firebase Console to redeploy a previous successful build.
