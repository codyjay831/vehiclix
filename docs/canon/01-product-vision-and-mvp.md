# 01 - Product Vision and MVP

## 1. Product Vision
The **Evo Motors Platform** is a premium, digital-first experience for a boutique electric vehicle (EV) dealership. The platform aims to modernize the used EV purchasing journey, moving away from traditional high-pressure sales environments toward a clean, transparent, and guided online showroom similar to Tesla's purchasing flow.

The system serves as a bridge between high-end inventory curation and professional home energy solutions, positioning Evo Motors as a comprehensive partner in the transition to electric mobility.

## 2. System Scope
The platform provides an end-to-end customer journey for vehicle acquisition and home energy service leads. It includes:
*   **Public-facing Storefront:** Inventory browsing and educational resources.
*   **Customer Portal:** Personal dashboard for tracking deals, managing documents, and initiating service requests.
*   **Owner/Admin Dashboard:** A lightweight management interface for inventory, vehicle sourcing requests, and deal lifecycle tracking.
*   **Integrations:** 
    *   **Stripe:** Processing reservation deposits.
    *   **DocuSign:** Secure digital contract execution.
    *   **Prisma/PostgreSQL:** Core data persistence.

## 3. User Roles
The system is restricted to two primary roles for the MVP:

*   **Owner:** A single-user administrative role. The owner manages all inventory, reviews vehicle requests, tracks deal progress, sends/monitors contracts, and views deposits.
*   **Customer:** Individuals browsing inventory or requesting vehicles. Customers can create accounts, place deposits, upload required documentation (ID, proof of insurance), sign contracts, and track their purchase progress.

## 4. Core Customer Journeys

### Flow 1: Browse and Purchase Inventory
1.  **Discovery:** Customer browses curated EV inventory with high-resolution media and detailed specs.
2.  **Selection:** Customer selects a vehicle and reviews pricing/incentives.
3.  **Reservation:** Customer places a deposit via Stripe to hold the vehicle.
4.  **Onboarding:** Customer creates an account and enters the purchasing portal.
5.  **Documentation:** Customer uploads required identification and insurance documents.
6.  **Contracting:** Customer signs purchase agreements via DocuSign integration.
7.  **Fulfillment:** Customer tracks the deal status until delivery/pickup.

### Flow 2: Vehicle Sourcing Request
1.  **Request:** Customer submits a request for a specific EV (Make, Model, Year, Budget, Mileage) not currently in inventory.
2.  **Dealer Review:** Owner reviews the request and sources options from auctions.
3.  **Proposal:** Owner proposes one or more specific vehicles to the customer.
4.  **Conversion:** Upon customer approval of a proposal, the request converts into a standard deal flow.

### Flow 3: Home Energy Services (Baytech)
1.  **Lead Capture:** During the purchase flow, customers are offered optional add-ons for EV charger or solar installation.
2.  **Handoff:** The system records the interest and creates a lead record for **Baytech Smart Homes**.
3.  **External Fulfillment:** Baytech fulfills these services outside the Evo Motors platform.

## 4.5 Domain Lifecycle Models

### Inventory States
*   **Draft:** Vehicle being prepared (not visible to customers).
*   **Listed:** Visible on the website and available for reservation.
*   **Reserved:** Deposit placed by a customer; hidden or marked as unavailable to others.
*   **Under Contract:** Documents and/or financing are in progress.
*   **Sold:** Transaction complete; vehicle removed from active listing.
*   **Archived:** Historical record for internal reporting.

### Vehicle Request States
*   **Submitted:** Initial request received from customer.
*   **Under Review:** Owner is evaluating the request.
*   **Sourcing:** Owner is actively searching auctions for matching vehicles.
*   **Vehicle Proposed:** Owner has sent one or more vehicle options to the customer.
*   **Customer Approved:** Customer has selected a proposed vehicle.
*   **Converted to Deal:** Request has transitioned into an active purchasing deal.
*   **Closed:** Request finished without a deal (e.g., cancelled or no match found).

### Deal States
*   **Lead:** Initial interest recorded without a deposit.
*   **Deposit Pending:** Customer initiated payment but not yet confirmed.
*   **Deposit Received:** Payment confirmed; vehicle moved to **Reserved**.
*   **Documents Pending:** Waiting for customer to upload ID and insurance.
*   **Contracts Sent:** Owner has triggered DocuSign for purchase agreements.
*   **Contracts Signed:** Customer has completed all digital signatures.
*   **Financing Pending:** Waiting for external financing approval (manual dealer step).
*   **Ready for Delivery:** All requirements met; scheduling pickup/delivery.
*   **Completed:** Vehicle delivered and transaction closed.
*   **Cancelled:** Deal terminated; vehicle returned to **Listed**.

## 4.6 Baytech Integration Rules
The platform serves strictly as a lead generation tool for Baytech Smart Homes:
*   **No Scheduling:** The system does not schedule installation dates.
*   **No Project Management:** Baytech projects are managed in their own external systems.
*   **Lead Generation Only:** The system generates a record containing:
    *   `customer_id`
    *   `deal_id`
    *   `service_type` (Charger / Solar)
    *   `property_address`
    *   `notes`

## 5. Owner Responsibilities
The owner dashboard is the operational hub for the dealership:
*   **Inventory Management:** Adding/editing vehicles with photo and video assets.
*   **Sourcing Management:** Reviewing and responding to "Vehicle Requested" submissions.
*   **Deal Lifecycle Tracking:** Progressing deals through the states defined in Section 4.5.
*   **Financial Oversight:** Monitoring deposit payments and lead generation for Baytech.
*   **Document Management:** Triggering DocuSign requests and verifying customer uploads.

## 6. System Design Principles
*   **Minimalist Aesthetic:** High-impact vehicle imagery and video walkthroughs with minimal UI clutter.
*   **Showroom Experience:** The interface should feel like a premium product showcase, not a traditional "used car" site.
*   **Inventory Philosophy:** Prioritize a small, curated selection of high-quality vehicles with professional media rather than a large search-based marketplace.
*   **Guided Progression:** Multi-step flows should be clear, reducing cognitive load for the customer.
*   **High Trust:** Transparent pricing, clear status indicators, and professional document handling.

## 7. Security Expectations
*   **Authentication:** Secure customer and owner accounts.
*   **Two-Factor Authentication (2FA):** Mandatory for the Owner account.
*   **Data Protection:** Secure storage for customer documents (identification, etc.).
*   **Audit Logging:** Detailed logs for critical deal actions (status changes, document signatures, payment events).
*   **Role Isolation:** Strict separation of data access between Customer and Owner.

## 8. MVP Feature Set
*   **Public Site:** Home page, inventory listing, vehicle detail pages (VDP), EV incentive/rebate education.
*   **Inventory Engine:** Support for high-res images and video embeds.
*   **Customer Portal:** Personal dashboard (see Section 8.2).
*   **Owner Dashboard:** Inventory CRUD, Request management, Deal overview, Baytech lead list.
*   **Payments:** Stripe integration for reservation deposits (see Section 8.1).
*   **Sourcing:** "Request a Vehicle" form and back-office tracking.

### 8.1 Deposit Rules
*   **Amount:** $500–$1000 reservation deposit.
*   **Behavior:** Reserves the vehicle and moves its state to **Reserved**.
*   **Refundability:** Rules determined by dealership policy (typically refundable until contract signature).
*   **Credit:** The deposit amount is credited toward the final purchase price.

### 8.2 Customer Portal Capabilities
**Customers can:**
*   View vehicles they have purchased or are in the process of purchasing.
*   View active deals and their current status.
*   Upload required documents (ID, proof of insurance).
*   View and sign contracts via DocuSign.
*   Track overall deal progress.
*   View the status of their Baytech service requests (Lead status only).

**Customers cannot:**
*   Edit vehicle pricing or details.
*   Modify the structure or terms of a deal.
*   Access or view other customers' data.

### 8.3 Document Types
The system supports the following document types (via upload or DocuSign):
*   **Purchase Agreement:** Core sales contract.
*   **Buyers Guide:** Federally mandated disclosure.
*   **Disclosure Forms:** State/Local required disclosures.
*   **Delivery Acknowledgement:** Signed upon receipt of vehicle.
*   **Warranty Disclosure:** Terms of any included or optional warranties.

## 9. Explicit Non-Goals
*   **Automated Financing:** No direct API integration with lenders for instant approvals (manual process initially).
*   **CRM Complexity:** No advanced marketing automation, email sequencing, or lead scoring.
*   **Service Scheduling:** No booking interface for vehicle maintenance or repairs.
*   **Multi-Employee Support:** No granular permissions or multiple staff accounts.
*   **Advanced Accounting:** No integration with ERPs or complex ledger systems.

## 10. Future Expansion Possibilities
*   Automated trade-in valuation tools.
*   Direct lender integrations for real-time financing.
*   Service/Maintenance management module.
*   Expansion to multiple physical locations/dealerships.
*   Real-time chat/consultation within the portal.
