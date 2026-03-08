# Evo Motors Platform: Implementation Epics

This directory contains the implementation-ready epics for the Evo Motors Platform. These documents translate the canonical specifications into actionable engineering scopes.

## 1. Epic Overview

| Epic | Summary |
|------|---------|
| [01 — Platform Foundation](./01-platform-foundation.md) | Next.js/Prisma scaffolding, shared enums, and identity resolution core. |
| [02 — Public Showroom and Content](./02-public-showroom-and-content.md) | Homepage, Inventory grid, and premium Vehicle Detail Pages (VDP). |
| [03 — Customer Auth and Portal](./03-customer-auth-and-portal.md) | Secure registration, stub-to-full account upgrades, and portal dashboard. |
| [04 — Owner Inventory Management](./04-owner-inventory-management.md) | Admin inventory CRUD, photo reordering, and vehicle status control. |
| [05 — Inquiries, Trade-Ins, and Financing Interest](./05-inquiries-trade-ins-and-financing-interest.md) | Lead capture for questions, trade-in info, and financing intent. |
| [06 — Vehicle Request and Proposal System](./06-vehicle-request-and-proposal-system.md) | Custom sourcing workflow from customer request to dealer proposal. |
| [07 — Deal Lifecycle and Progress Tracking](./07-deal-lifecycle-and-progress-tracking.md) | The transactional state machine linking vehicles to customers. |
| [08 — Stripe Deposit Payments](./08-stripe-deposit-payments.md) | Reservation deposit checkout, webhooks, and concurrency protection. |
| [09 — Documents, Uploads, and DocuSign](./09-documents-uploads-and-docusign.md) | Private file uploads (ID/Insurance) and DocuSign contract execution. |
| [10 — Baytech Energy Service Handoff](./10-baytech-energy-handoff.md) | Referral leads for EV chargers and solar installations. |
| [11 — Security Hardening and Audit](./11-security-hardening-and-audit.md) | Middleware enforcement, 2FA, rate limiting, and transaction reconciliation. |

---

## 2. Dependency Graph

```text
01 Foundation (Base for all)
 └── 04 Owner Inventory (Feeds 02)
      └── 02 Public Showroom (Feeds 05)
           └── 05 Inquiries/Leads (Feeds 07)
                └── 03 Customer Auth/Portal (Feeds 07, 06)
                     ├── 06 Vehicle Request System
                     └── 07 Deal Lifecycle (Depends on 08, 09)
                          ├── 08 Stripe Payments
                          └── 09 Documents/DocuSign
                               └── 10 Baytech Handoff
                                    └── 11 Security/Audit (Hardens all)
```

---

## 3. Recommended Build Order

We recommend building in the order listed (01 through 11) for the following reasons:

1.  **Platform First (01):** You cannot build features without the data models and shared UI components.
2.  **Inventory Before Showroom (04 → 02):** The public site is empty without the admin tools to add vehicles.
3.  **Leads Before Auth (05 → 03):** Capturing leads (Inquiries) is the top of the funnel and tests the "stub customer" logic before full registration is required.
4.  **Auth Before Deals (03 → 07):** Deals require a verified customer account for the portal experience.
5.  **Deals Before Payments (07 → 08):** You need the deal state machine to handle the result of a payment.
6.  **Integrations Last (08, 09, 10):** Stripe, DocuSign, and Baytech are complex external points that should be plugged into a stable internal deal flow.
7.  **Hardening (11):** While security is considered throughout, the final middleware enforcement and reconciliation jobs are best applied once the full flow is stable.

---

## 4. Operational Canon Mapping

These epics are built upon three critical operational documents:

*   **UX Behavior:** See `docs/canon/10-user-experience-scenarios.md` for specific screen interactions (Scenarios A-R).
*   **Data Behavior:** See `docs/canon/11-data-relationships-and-cta-mapping.md` for database write rules and linking logic.
*   **Acceptance Testing:** See `docs/canon/12-mvp-acceptance-scenarios.md` for the test cases used to verify each epic.

---

## 5. Important Implementation Warnings

*   **Canon is Truth:** If an epic seems to contradict a `docs/canon/*.md` file, the canon file wins.
*   **No Scope Creep:** Do not add "nice-to-have" features (chat, automated pricing, etc.) that are explicitly listed as non-goals in `docs/canon/09`.
*   **Solo Operator Focus:** Always design admin tools for a single person. Avoid complex multi-user approval workflows.
*   **Premium Aesthetic:** Customer-facing pages must prioritize large media and whitespace (Tesla-like), while admin pages prioritize density and efficiency.
