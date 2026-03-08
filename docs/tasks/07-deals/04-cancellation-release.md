Title: Task 07.04 - Cancellation and Release Flow
Purpose: Handle deal cancellations and release vehicles back to inventory.
Files likely touched: src/lib/actions/deal.ts, src/lib/actions/status.ts
Implementation steps:
1. Implement a `cancelDeal` server action that sets `Deal.dealStatus` to `Cancelled`.
2. Update the linked `Vehicle.vehicleStatus` to `Listed` (if was Reserved/Under Contract).
3. Ensure cancellation log captures the reason and timestamp.
Acceptance criteria:
- Cancelling a deal returns the vehicle to "Listed" status (Test XSY-006).
- Releasing a reservation correctly updates both deal and vehicle records.
Dependencies: Task 07.02, Task 07.03
Related epic: 07 — Deal Lifecycle and Progress Tracking
Related acceptance tests: XSY-006
