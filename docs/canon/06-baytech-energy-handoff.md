# 06 - Domain: Baytech Energy Handoff

## 1. Integration Overview
The **Baytech Energy Handoff** flow manages the transition of a customer from the Evo Motors vehicle-buying experience to home energy services provided by **Baytech Smart Homes**. This integration is designed as a lightweight "lead capture" system rather than a project management tool.

## 2. Product Boundary Between Evo Motors and Baytech
The Evo Motors platform is strictly for vehicle transactions. Baytech Smart Homes is a separate business entity.

### Explicit Boundaries:
*   **Evo Motors In-Scope:** Capture interest, collect property address, generate lead records, and track the handoff status.
*   **Evo Motors Out-of-Scope:** Quoting, site surveys, electrical design, permitting, installation scheduling, technician management, and invoicing for Baytech services.
*   **Communication:** Once the handoff state moves to `Submitted to Baytech`, the primary fulfillment relationship moves outside the Evo Motors platform.

## 3. EnergyServiceRequest Entity
The `EnergyServiceRequest` represents a customer's expressed interest in home energy services.

### Key Fields
*   `id`: Internal unique identifier (UUID).
*   `customer_id`: Foreign key to the `Customer` record.
*   `deal_id`: (Optional) Foreign key linking the request to a specific vehicle purchase.
*   `service_type`: Enum (`EV_CHARGER`, `SOLAR`).
*   `service_status`: Current stage of the handoff lifecycle (see Section 4).
*   `property_address`: The physical location where service is requested.
*   `notes`: Customer-provided context or specific preferences.
*   `created_at`: Timestamp of initial capture.

### Entity: EnergyServiceStatusHistory
Used to track the movement of a lead through the handoff lifecycle for audit and reporting.
*   `request_id`: Link to the parent request.
*   `status`: The state being entered.
*   `changed_by`: (Optional) Link to the User/Owner who updated the status.
*   `timestamp`: When the change occurred.

## 4. Energy Service Lifecycle
This lifecycle tracks the **handoff progress**, not the **installation progress**.

### States:
*   **Interest Captured:** Customer has expressed interest but not yet submitted the request.
*   **Submitted to Baytech:** Request has been formally recorded and is ready for Baytech review.
*   **Acknowledged:** Baytech has received the lead and assigned it to an internal staff member.
*   **Contact Pending:** Baytech has attempted to reach the customer but hasn't yet established contact.
*   **Closed:** The handoff process is complete (e.g., project started or customer declined).

## 5. Customer Experience Rules
*   **Surfacing:** Baytech options (EV Charger and Solar) are surfaced during the vehicle purchase flow or as an optional "Add-On" section in the Customer Portal.
*   **Non-Interruptive:** Requesting a service must not block the vehicle purchase, document upload, or contract signing flows.
*   **Data Entry:** Customers provide basic property info and service preference. They do not upload site plans or electrical diagrams.
*   **Visibility:** Customers can see that their request was "Received" and "Acknowledged" by Baytech. They cannot see internal Baytech project tasks or contractor-only notes.

## 6. Owner Visibility Rules
*   **Lead Review:** The Owner can view all service requests, filterable by customer or deal.
*   **Handoff Updates:** The Owner can manually move a request through the lifecycle (e.g., from `Submitted` to `Acknowledged`).
*   **Deal Connection:** The Owner can easily see which vehicle purchase inspired the energy service request.
*   **No Ops Management:** The Owner dashboard does not include scheduling tools, crew calendars, or supply chain management for Baytech.

## 7. Data Ownership and Storage Rules
*   **Shared Data:** `customer_id`, `property_address`, and `service_type` are stored in Evo Motors to facilitate the handoff.
*   **Fulfillment Data:** Detailed project information (permit numbers, electrical diagrams, invoice line items) remains strictly within Baytech’s external systems and is **not** mirrored in Evo Motors.
*   **Lead History:** Evo Motors maintains the record of the handoff for historical reporting and customer portal visibility.

## 8. Explicit Non-Goals
The Evo Motors platform **will NOT** manage:
*   Real-time installation scheduling.
*   Generating site-specific quotes or solar production estimates.
*   Managing permit applications or inspection results.
*   Technician dispatch or field operations tracking.
*   Financial invoicing or collection for Baytech services.

## 9. Future Expansion Notes
*   **Baytech Staff Role:** Future phases may introduce a read-only or lead-update role for Baytech employees.
*   **API Handoff:** Integration with a third-party CRM (e.g., HubSpot or a dedicated contractor tool) for automated lead pushing.
*   **Enhanced Portal:** Providing a read-only view of project milestones (e.g., "Permit Approved") once the project is in execution phase.
