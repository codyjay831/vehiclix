Title: Task 01.03 - Auth Middleware Scaffolding
Purpose: Create the middleware to handle route-level protection for Owner and Customer roles.
Files likely touched: src/middleware.ts, src/lib/auth.ts
Implementation steps:
1. Create a `middleware.ts` file in `src/`.
2. Implement logic to check for session cookies and role-based access.
3. Define route groups as follows:
   - **Public:** `/`, `/inventory`, `/inventory/[slug]`, `/request-vehicle`
   - **Customer:** `/portal/*`, `/uploads/*`, `/deals/*`
   - **Owner:** `/admin/*`, `/inventory/manage/*`, `/deals/manage/*`
4. Create a mock auth helper in `src/lib/auth.ts` to simulate identities (Owner vs Customer) during early development.
Acceptance criteria:
- Accessing `/admin/*` without an Owner session redirects to `/login`.
- Accessing `/portal/*` without an Authenticated session redirects to `/login`.
- Public routes are accessible without authentication.
- Middleware correctly identifies role requirements for the defined route groups.
Dependencies: Task 01.01
Related epic: 01 — Platform Foundation
Related acceptance tests: None (structural foundation)
