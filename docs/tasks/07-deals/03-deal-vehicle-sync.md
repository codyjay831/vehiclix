Title: Task 07.03 - Deal-Vehicle Sync Logic
Purpose: Ensure the vehicle status automatically reflects the deal's progress.
Files likely touched: src/lib/actions/deal.ts, src/lib/actions/status.ts
Implementation steps:
1. Implement logic to update `Vehicle.vehicleStatus` on `Deal.dealStatus` changes.
2. Ensure: `Deposit Received` → `Reserved`, `Completed` → `Sold`.
3. Wrap status updates in a database transaction to ensure atomicity.
Acceptance criteria:
- Marking a deal "Completed" moves the vehicle status to "Sold" (Test INV-007).
- Deal and vehicle statuses stay in sync as they move through the lifecycle.
Dependencies: Task 07.02, Task 04.04
Related epic: 07 — Deal Lifecycle and Progress Tracking
Related acceptance tests: INV-007, XSY-002
