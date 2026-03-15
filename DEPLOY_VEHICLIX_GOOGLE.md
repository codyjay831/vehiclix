# Deployment Guide: Vehiclix on Google Cloud (Firebase App Hosting)

This document provides instructions for deploying the Vehiclix platform to Google Cloud using Firebase App Hosting.

## 1. Production Environment Variables

The following environment variables must be configured in the Firebase Console (under App Hosting settings):

### Required Secrets
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Transaction mode recommended for serverless). |
| `DIRECT_URL` | Direct PostgreSQL connection string (Required for Prisma migrations). |
| `AUTH_SECRET` | A long, random string used to sign session JWTs. |
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_live_...` or `sk_test_...`). |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for `https://vehiclix.app/api/webhooks/stripe`. |

### Required Public Variables
| Variable | Value |
|----------|-------|
| `APP_URL` | `https://vehiclix.app` |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | `vehiclix.app` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key. |

---

## 2. Firebase App Hosting Setup

1.  **Initialize Firebase**:
    - Ensure you have the [Firebase CLI](https://firebase.google.com/docs/cli) installed.
    - Run `firebase login`.
    - Run `firebase init apphosting`.
2.  **Select Project**: Choose your Google Cloud project.
3.  **Connect GitHub**: Link your repository and branch (usually `master` or `main`).
4.  **Automatic Detection**: Firebase App Hosting will automatically detect the Next.js project and the `standalone` output configuration.

---

## 3. Custom Domain Setup (vehiclix.app)

1.  In the Firebase Console, go to **App Hosting** > **Settings**.
2.  Add a **Custom Domain**.
3.  Enter `vehiclix.app`.
4.  Update your DNS provider with the A/AAAA and TXT records provided by Firebase.
5.  Wait for SSL certificate provisioning (can take up to 24 hours).

---

## 4. Multi-Tenant DNS Configuration

Since Vehiclix supports custom domains for dealerships (e.g., `dealer.com` mapping to `vehiclix.app/dealer-slug`), ensure your production environment supports:
- **Wildcard DNS**: If you plan to use subdomains like `dealer.vehiclix.app`.
- **Domain Mapping**: The `src/proxy.ts` (Next.js Proxy) is already configured to handle external domain routing via the `/api/org/resolve-domain` endpoint.

---

## 5. Post-Deployment Verification Checklist

- [ ] **Auth**: Verify login at `https://vehiclix.app/login` works and sets secure cookies.
- [ ] **Stripe**: Ensure Stripe Checkout sessions redirect back to `https://vehiclix.app`.
- [ ] **Webhooks**: Configure your Stripe Dashboard to send `payment_intent.succeeded` events to `https://vehiclix.app/api/webhooks/stripe`.
- [ ] **Database**: Verify Prisma migrations ran successfully (`npx prisma migrate deploy` during build).
- [ ] **Proxy**: Test that accessing a dealership slug works (e.g., `/lux-evs`).

---

## 6. Critical Deployment Notes & Limitations

### ⚠️ File Storage Warning
The current implementation uses **local filesystem storage** for vehicle photos (`public/uploads`) and private documents (`storage/documents`).
- **Limitation**: Firebase App Hosting (and most serverless environments) has an ephemeral filesystem. **Uploaded files will be lost** whenever the instance restarts or a new deployment occurs.
- **Production Recommendation**: Modify `src/lib/storage.ts` and `src/actions/inventory.ts` to use **Google Cloud Storage (GCS)** or AWS S3 before going live with real users.

### Database Connection Pooling
Ensure your PostgreSQL provider (e.g., Supabase, Neon, or Google Cloud SQL) is configured with a connection pooler (like PgBouncer), as serverless functions can quickly exhaust database connections. Use the `?pgbouncer=true` flag in your `DATABASE_URL` if supported.
