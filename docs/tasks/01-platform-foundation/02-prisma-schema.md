Title: Task 01.02 - Database Schema Implementation (Prisma)
Purpose: Implement the core data model in Prisma as defined in the canonical documentation.
Files likely touched: prisma/schema.prisma
Implementation steps:
1. Initialize Prisma with `npx prisma init`.
2. Copy all models and enums from `docs/canon/11, Section 7` into `schema.prisma`.
3. Ensure all enums (VehicleStatus, DealStatus, RequestStatus, ProposalStatus, EnergyServiceStatus) match the canon status machines exactly.
4. Configure the PostgreSQL database connection via `.env`.
5. Run the initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```
6. Generate the Prisma Client with `npx prisma generate`.
Acceptance criteria:
- `prisma/schema.prisma` contains all 15+ models and all enums from Canon 11.
- All enums match canon status machines exactly.
- Database migration completes successfully using `migrate dev`.
- Prisma Client is generated successfully.
Dependencies: Task 01.01
Related epic: 01 — Platform Foundation
Related acceptance tests: None (structural foundation)
