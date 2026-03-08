# 03 - Customer Journeys

## 1. Journey Overview
The Evo Motors platform provides three primary digital experiences:
1.  **Browse and Purchase Existing Inventory:** A direct-to-consumer purchase path for vehicles currently in stock.
2.  **Request a Vehicle for Dealer Sourcing:** A specialized flow for customers seeking an EV not currently in inventory.
3.  **Home Energy Add-Ons (Baytech):** An optional service lead generation flow for EV charger and solar installations.

All journeys are designed to be premium, low-friction, and guided, ensuring the customer feels supported throughout the complex process of vehicle acquisition.

## 2. Customer Entry Points
*   **Public Landing Page:** High-level branding, curated vehicle highlights, and clear CTAs for "Browse Inventory" or "Request a Vehicle."
*   **Inventory Listing Page:** A clean, visually rich grid of available EVs.
*   **Vehicle Detail Page (VDP):** The primary decision point for Flow 1, featuring expansive media and "Start Purchase" CTA.
*   **Request Vehicle Page:** The starting point for Flow 2, explaining the sourcing process.

---

## 3. Journey 1 — Browse and Purchase Existing Inventory

### Discovery & Selection
1.  **Browse:** Customer views curated inventory (`Listed` state).
2.  **VDP:** Customer reviews photos, specs, and transparent pricing.
3.  **Start Purchase:** Customer clicks "Start Purchase" and is guided to place a reservation deposit ($500–$1000).

### Reservation & Onboarding
4.  **Deposit Placement:** Customer pays via Stripe (`Deposit Pending` -> `Deposit Received`).
5.  **Account Creation:** Immediately after deposit, the customer is prompted to create an account to enter the portal.
6.  **Portal Entry:** Customer sees their "Active Deal" on the dashboard.

### Transaction Readiness
7.  **Document Upload:** Customer is prompted to upload Driver's License and Proof of Insurance (`Documents Pending`).
8.  **Contract Signing:** Once documents are verified by the Owner, the Owner triggers a DocuSign request (`Contracts Sent`).
9.  **Signing:** Customer signs the digital purchase agreement (`Contracts Signed`).

### Delivery & Completion
10. **Financing/Final Payment:** Final funding is handled manually (Owner step, `Financing Pending`).
11. **Ready for Delivery:** Once funds are cleared, the deal moves to `Ready for Delivery`.
12. **Completion:** Vehicle is delivered/picked up, and the deal moves to `Completed`. Vehicle state moves to `Sold`.

---

## 4. Journey 2 — Request a Vehicle

### Request Initiation
1.  **Submission:** Customer enters make, model, year range, and budget on the "Request a Vehicle" page (`Submitted`).
2.  **Confirmation:** Customer sees a "Request Received" screen with an explanation of next steps (Owner review).

### Sourcing Phase
3.  **Review:** Owner reviews and moves request to `Under Review` or `Sourcing`.
4.  **Wait State:** Customer sees "Sourcing in Progress" in their portal. This is a low-activity phase where the customer is encouraged to wait for notifications.

### Proposal & Conversion
5.  **Proposal:** Owner uploads one or more vehicle options from auctions (`Vehicle Proposed`).
6.  **Customer Decision:** Customer views photos and specs for proposed vehicles.
    *   **Decline:** Request stays in `Sourcing` or is `Closed`.
    *   **Approve:** Customer selects a vehicle (`Customer Approved`).
7.  **Deal Conversion:** Owner moves the request to `Converted to Deal`. A new Deal record is created, and the customer is prompted to place a deposit, entering **Journey 1 at Step 4**.

---

## 5. Journey 3 — EV Charger and Solar Add-On Flow

### Presentation
*   **Placement:** Surfaced as an optional "Home Energy" section during the **Document Upload** or **Ready for Delivery** stages of a deal.
*   **Options:** Strictly limited to **EV Charger Installation** and **Solar Installation**.

### Data Collection
*   **Minimal Friction:** Customer selects interest and provides/confirms their property address.
*   **Handoff:** System records the request and informs the customer: *"Your interest has been shared with Baytech Smart Homes. A specialist will contact you directly."*

### System Boundary
*   **Tracking:** Customers see "Lead Shared with Baytech" in their portal.
*   **Fulfillment:** No project status, scheduling, or payment for Baytech is handled within Evo Motors.

---

## 6. Customer Portal Experience
The portal is the single source of truth for the customer journey:
*   **Dashboard:** Shows the primary status of active deals.
*   **Document Center:** A checklist of needed uploads and a viewer for signed DocuSign contracts.
*   **Milestone Tracker:** A visual timeline (e.g., Deposit -> Documents -> Contracts -> Delivery).
*   **Vehicle Request Tracker:** Shows current sourcing status for custom requests.
*   **Baytech Status:** Confirmation that energy service leads were successfully generated.

---

## 7. Customer-Visible Status and Progress Rules

### Inventory States (Customer-Facing)
*   `Listed`: Visible and available for purchase.
*   `Reserved`: No longer visible in public search; visible only to the reserving customer.
*   `Under Contract`: Not visible to public; visible to customer as "Contract in Progress."
*   `Sold`: Removed from public site.

### Deal States (Customer-Facing Label)
*   `Deposit Received`: "Vehicle Reserved"
*   `Documents Pending`: "Awaiting Your Documentation"
*   `Contracts Sent`: "Ready for Signature"
*   `Contracts Signed`: "Contract Completed"
*   `Financing Pending`: "Finalizing Transaction"
*   `Ready for Delivery`: "Ready for Pickup/Delivery"
*   `Completed`: "Vehicle Delivered"

---

## 8. Customer Trust and UX Principles
*   **Guided Progress:** Use breadcrumbs or step-indicators to show the customer exactly where they are in the buying flow.
*   **High-Impact Media:** Always prioritize large, professional imagery and embedded video walkthroughs to reduce "used car" anxiety.
*   **Transparency:** Pricing, fees, and incentives must be clear before the deposit is placed.
*   **Calm Interface:** Avoid flashy "Buy Now" banners; use refined typography and generous whitespace.
*   **No Buried Forms:** Don't ask for ID or insurance until *after* the deposit has secured the vehicle.

---

## 9. Failure / Delay / Exception Handling

### Account & Deposit Issues
*   **Incomplete Registration:** If a customer starts a deposit but abandons account creation, the system triggers a manual Owner follow-up (Lead state).
*   **Deposit Refund:** If a deal is cancelled after deposit (`Cancelled`), the Owner manually initiates the Stripe refund according to policy.

### Document & Contract Issues
*   **Invalid Documents:** If the Owner rejects an upload, the customer sees "Action Required" and a reason (e.g., "Expired License") in the portal.
*   **Contract Delays:** If a contract isn't signed within 48 hours, the system sends an automated reminder.

### Sourcing Exceptions
*   **Vehicle Declined:** If a customer declines a sourced vehicle, the request returns to `Sourcing` or is marked `Closed` by the Owner.
*   **Vehicle Unavailable:** If a sourced/proposed vehicle is sold at auction before the customer approves, the Owner marks it as "Unavailable" and proposes a new one.

---

## 10. Explicit Out-of-Scope Behaviors
*   **No Automated Trade-In:** No real-time valuation tool; customers may provide trade-in details in notes for manual review.
*   **No Live Chat:** No real-time chat widget. Communication is via email/phone or portal updates.
*   **No Instant Credit Approval:** No lender API integration. Customers are informed that financing is finalized manually with the Owner.
*   **No Baytech Project Management:** Evo Motors does not track Baytech installation dates or project milestones.
*   **No Peer Interaction:** Customers cannot see other customers' reviews, requests, or activity.
