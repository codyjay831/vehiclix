# Pilot Verification Checklist

Run this checklist after onboarding a new dealer to ensure isolation and operational readiness.

## 1. Identity & Access
- [ ] Admin login successful.
- [ ] Admin logout successful.
- [ ] Attempting to access `/admin` without login redirects to `/login`.
- [ ] Attempting to access another dealer's `/admin/deals/[id]` returns 404/Access Denied.

## 2. Data Isolation
- [ ] Dashboard shows only the dealer's own statistics.
- [ ] Inventory list shows only the dealer's own vehicles.
- [ ] Creating a new vehicle record works and includes the correct `organizationId`.
- [ ] Deleting/Updating a vehicle only affects the dealer's own records.

## 3. Public Presence
- [ ] Showroom (`/inventory`) filters correctly by `organizationId`.
- [ ] Vehicle Detail Page (`/inventory/[id]`) only shows vehicles belonging to the context dealer.
- [ ] Inquiry submission (`/inventory/[id]` -> Form) associates the inquiry with the correct dealer.

## 4. Customer Portal
- [ ] Registration with `?org=[ID]` correctly associates the customer.
- [ ] Customer portal shows "Welcome to [Dealer Name]".
- [ ] Active deals list is empty for new customers.
- [ ] Creating a deal for this customer (via admin) shows up in the customer portal.
- [ ] Document upload for a deal records the correct organization in the audit trail.

## 5. Audit Trail
- [ ] Check `ActivityEvent` table for the new `organizationId`.
- [ ] Verify `auth.login` events are recorded.
- [ ] Verify `vehicle.created` events include the correct `organizationId`.

## 6. Integration Attributes
- [ ] Stripe PaymentIntent metadata includes the correct `dealId`.
- [ ] DocuSign Envelope creation succeeds and links back to the correct `dealId`.
