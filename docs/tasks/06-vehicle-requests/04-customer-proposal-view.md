Title: Task 06.04 - Customer Proposal View (Portal)
Purpose: Display dealer proposals to customers in their portal.
Files likely touched: src/app/portal/requests/[id]/page.tsx, src/components/ProposalCard.tsx
Implementation steps:
1. Create `src/app/portal/requests/[id]/page.tsx` to show the sourcing request detail.
2. Implement `ProposalCard.tsx` that displays all proposal vehicle details and photos.
3. Add "Accept" and "Decline" buttons to the proposal card.
Acceptance criteria:
- Customers can view all proposals linked to their sourcing request in the portal (Test REQ-005).
- Proposal details (photos, price, specs) are rendered correctly.
Dependencies: Task 03.04, Task 06.03
Related epic: 06 — Vehicle Request and Proposal System
Related acceptance tests: REQ-005
