Title: Task 01.04 - Global UI Components (shadcn/ui)
Purpose: Install and configure core shadcn/ui components for shared use.
Files likely touched: src/components/ui/*, tailwind.config.ts
Implementation steps:
1. Initialize shadcn/ui with `npx shadcn-ui@latest init`.
2. Install base components: `Button`, `Dialog`, `Toast`, `Skeleton`, `Input`, `Badge`, `DropdownMenu`, `Card`, `Sheet`, `Table`, `Tabs`.
3. Configure Tailwind theme colors to match the "Premium EV" aesthetic (Doc 08).
4. Set up the `Toaster` provider in the root `layout.tsx`.
Acceptance criteria:
- shadcn/ui components are available in `src/components/ui`.
- Toast notifications work when triggered.
- Theme colors are configured as per Doc 08.
- Admin-ready components (Table, Tabs) and Customer-ready components (Card, Dialog) are installed.
Dependencies: Task 01.01
Related epic: 01 — Platform Foundation
Related acceptance tests: None
