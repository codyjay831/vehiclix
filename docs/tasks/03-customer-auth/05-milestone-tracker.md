Title: Task 03.05 - Active Deal Milestone Tracker
Purpose: Visualize the purchase progress for a customer's active deal.
Files likely touched: src/components/MilestoneTracker.tsx, src/app/portal/deals/[id]/page.tsx
Implementation steps:
1. Create `MilestoneTracker.tsx` with a progress bar and status labels (Doc 10, Scenario R).
2. Map deal statuses to friendly customer-facing labels.
3. Implement "Next Action" cards that prompt the customer based on the current deal stage (e.g., "Upload Documents").
Acceptance criteria:
- Milestone tracker correctly highlights the current stage of the deal (Test DEP-005).
- Progress bar and friendly labels are visually accurate.
Dependencies: Task 03.04, Task 07.01
Related epic: 03 — Customer Auth and Portal
Related acceptance tests: Scenario R, DEP-005
