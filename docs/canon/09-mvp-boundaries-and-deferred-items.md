# 09 - MVP Boundaries and Deferred Items

## 1. MVP Overview
The **Evo Motors Platform** MVP is designed for a solo-operated boutique electric vehicle (EV) dealership. The primary objective is to provide a premium, digital-first customer experience that simplifies the vehicle purchasing process. To ensure speed-to-market and operational simplicity, the MVP focuses strictly on the core transaction lifecycle, intentionally excluding secondary operations and complex enterprise integrations.

## 2. Core MVP Capabilities
The following capabilities represent the minimum viable scope required for the platform's success.

### Inventory Management
*   **Owner Capability:** Create, edit, and archive vehicle listings.
*   **Media Support:** Support for high-resolution image galleries and video walkthrough embeds.
*   **Specifications:** Detailed input for EV-specific data (Range, Battery Health, Drivetrain).

### Vehicle Browsing
*   **Customer Experience:** Premium, media-rich browsing of curated inventory.
*   **Detail Pages:** Trust-focused Vehicle Detail Pages (VDP) with clear pricing and specs.

### Vehicle Request System
*   **Customer Initiation:** "Request a Vehicle" form for sourcing non-inventoried EVs.
*   **Owner Fulfillment:** Response flow with specific vehicle proposals.

### Deal Management
*   **Orchestration:** Deals serve as the central link between Customers, Vehicles, Documents, and Payments.
*   **Lifecycle Tracking:** State-based tracking from Lead to Completed.

### Deposit Handling
*   **Payment Integration:** Stripe-powered reservation deposits ($500–$1000).
*   **Automated State Change:** Successful payment triggers vehicle reservation and deal status updates.

### Document Handling
*   **Secure Uploads:** Customers upload required identification and insurance documents.
*   **Digital Signatures:** DocuSign integration for legally binding purchase agreements.

### Customer Portal
*   **Self-Service:** Dashboard for tracking active deals and vehicle requests.
*   **Secure Access:** Viewing and signing documents, tracking progress, and managing personal uploads.

### Energy Service Requests
*   **Lead Capture:** Optional interest capture for EV Charger and Solar installation.
*   **Baytech Handoff:** Simple lead record generation for external fulfillment.

---

## 3. Explicit Non-Goals
The following features are **not in scope** for the MVP. Engineers must avoid implementing placeholders or architectural hooks for these items unless specifically requested.

*   **Lender Integrations:** No automated credit applications or lender APIs. Loan approvals are processed manually and offline.
*   **Trade-In Automation:** No automated appraisal tools or real-time valuation integrations (e.g., KBB, Black Book).
*   **Advanced CRM Systems:** No marketing automation, automated email sequencing, lead scoring, or campaign management.
*   **Messaging Systems:** No built-in real-time chat or customer/owner messaging inbox within the platform.
*   **Service Department:** No maintenance scheduling, repair tracking, or service department workflows.
*   **Baytech Project Management:** No installation scheduling, permit tracking, electrical design management, or contractor crew dispatching.
*   **Marketplace Complexity:** No large-scale search engine, extensive filter facets, or UI optimized for thousands of vehicles.
*   **Multi-User / Multi-Location:** No support for multiple employee roles, granular permissions, or multi-dealership operations.
*   **Advanced Analytics:** No business intelligence (BI) dashboards, complex sales reporting, or detailed financial forecasting.

---

## 4. Deferred Feature Opportunities
The following enhancements are identified for future phases but are **deferred** until the MVP is validated.

*   **Automated Trade-In Valuation:** Integrated appraisal tools to provide real-time values.
*   **Direct Lender APIs:** Real-time credit decisioning and loan origination inside the portal.
*   **Enhanced EV Incentive Calculators:** Dynamic calculation of federal, state, and local rebates.
*   **Integrated Messaging:** Secure, real-time consultation channel between Customer and Owner.
*   **Service & Maintenance Portal:** Post-purchase maintenance scheduling and service history tracking.
*   **Baytech Fulfillment Integration:** Read-only visibility into installation progress (e.g., "Permit Approved").
*   **Business Dashboard:** Automated reporting on inventory turnover, lead conversion, and revenue.

---

## 5. Simplicity Principles
The MVP follows a philosophy of **operational simplicity**:
*   **Solo Operator Focus:** The system assumes one person manages all dealer actions. Avoid multi-step approval workflows.
*   **Guided Flows:** Optimize for the happy path. Reduce cognitive load for the customer.
*   **High Trust over High Volume:** Prioritize the quality of information and presentation over the quantity of listings.
*   **Minimal Technical Debt:** Favor clean, well-defined domain models over complex "extensible" abstractions that may never be used.
*   **Manual Bridge:** Where automation is complex (e.g., financing), use a "manual bridge" (Owner intervention) rather than over-engineering a solution.
