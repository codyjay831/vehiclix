Title: Task 01.05 - Shared Enums and Types
Purpose: Centralize core enums and TypeScript types to ensure consistency across the codebase.
Files likely touched: src/types/index.ts, src/types/enums.ts
Implementation steps:
1. Create `src/types/enums.ts` and define all core status enums matching the Prisma schema and Canon 11:
   - `VehicleStatus`
   - `DealStatus`
   - `RequestStatus`
   - `ProposalStatus`
   - `EnergyServiceStatus`
2. Create `src/types/index.ts` to export these enums and define shared interfaces (e.g., Vehicle, Deal, Customer) that mirror the Prisma models.
3. Ensure these types are used in server actions and components to prevent duplication or drift.
Acceptance criteria:
- `src/types/enums.ts` exists and contains all canon enums.
- Types are centralized and exported for use throughout the application.
- Enums match the Prisma schema exactly.
Dependencies: Task 01.02
Related epic: 01 — Platform Foundation
Related acceptance tests: None (consistency foundation)
