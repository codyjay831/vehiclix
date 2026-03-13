# Pilot Onboarding Manual (Manual Process)

This document outlines the manual steps required to onboard a new dealer for the Vehiclix Pilot.

## Prerequisites
- Database access (connection string)
- Admin credentials for the Vehiclix platform

## Step 1: Execute Onboarding Utility
Run the onboarding script using the following environment variables:

```bash
DEALER_NAME="Acme EV" \
DEALER_SLUG="acme-ev" \
ADMIN_EMAIL="admin@acmeev.com" \
ADMIN_PASSWORD="secure-password-here" \
npx tsx scripts/onboard-dealer.ts
```

This will:
1. Create the `Organization` record.
2. Create the initial `OWNER` user.
3. Output the new `Organization ID`. **Copy this ID.**

## Step 2: Verify Admin Isolation
1. Log in at `/login` with the newly created admin email and password.
2. Ensure you are redirected to `/admin`.
3. Verify the layout shows the correct dealer name (e.g., "ACME Admin").
4. Verify the dashboard is empty (Inventory, Inquiries, Deals should all be 0).

## Step 3: Verify Public Isolation
1. Go to the public showroom (`/inventory`).
2. Verify that **NO** vehicles from other dealers are visible (it should show "No vehicles found" if empty).
3. Create a test vehicle in the Admin dashboard.
4. Refresh the public showroom and verify the new vehicle appears **ONLY** if requested via the specific dealer context (Note: Currently public showroom defaults to Evo Motors unless overridden).

## Step 4: Customer Registration Link
Provide the pilot dealer with their specific registration URL for their customers:

`https://vehiclix.com/register?org=PASTE_ORGANIZATION_ID_HERE`

When customers register using this link:
1. Their `User` record will be automatically associated with the correct organization.
2. Their portal will only show data (deals, inquiries) belonging to that organization.

## Step 5: Integration Warning
Inform the pilot dealer:
- **Payments**: Deposits flow into the global Vehiclix Stripe account.
- **Contracts**: E-signatures are processed via the global Vehiclix DocuSign account.
- **Branding**: The public marketing website (`/`, `/about`) currently remains branded as Evo Motors.
