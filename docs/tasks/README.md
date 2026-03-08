# Evo Motors Platform: Implementation Task List

This directory contains the structured implementation tasks for the Evo Motors Platform, organized by epic.

## 1. Task Folders

Each folder corresponds to an epic from `docs/epics/` and contains granular tasks (10-60 minutes) for implementation.

| Epic Folder | Summary |
|-------------|---------|
| [01-platform-foundation](./01-platform-foundation/) | Next.js, Prisma, shared types/enums, shared UI components, and auth middleware. |
| [04-owner-inventory](./04-owner-inventory/) | Admin inventory management and media handling. |
| [02-public-showroom](./02-public-showroom/) | Public inventory browsing and VDP. |
| [05-leads](./05-leads/) | Inquiry capture, trade-ins, and financing interest. |
| [03-customer-auth](./03-customer-auth/) | Customer registration, login, and portal shell. |
| [06-vehicle-requests](./06-vehicle-requests/) | Custom vehicle sourcing and proposal system. |
| [07-deals](./07-deals/) | Deal lifecycle orchestration and progress tracking. |
| [08-payments](./08-payments/) | Stripe reservation deposits and webhooks. |
| [09-documents](./09-documents/) | Private document uploads and DocuSign signing. |
| [10-baytech](./10-baytech/) | Energy service lead handoff to Baytech. |
| [11-security](./11-security/) | Audit logging, 2FA, rate limiting, and reconciliation. |

---

## 2. Global Implementation Rules

- **Strict MVP Scope:** Do not implement features not explicitly defined in the task documents or canon docs.
- **Single Responsibility:** Each task touches only one primary responsibility.
- **Canon Compliance:** If a task contradicts a canon document, the canon document is the source of truth.
- **Testing:** Reference the specific Acceptance Test IDs from `docs/canon/12-mvp-acceptance-scenarios.md` during implementation.
- **Solo Operator Focus:** Admin tasks must be optimized for a single owner.

---

## 3. Recommended Build Path

Follow the folder numbering (01 to 11) for the correct implementation order, as defined in the [Epics README](../epics/README.md).
