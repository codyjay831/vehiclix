# 04 - Domain: Inventory and Vehicle Requests

## 1. Domain Overview
The Evo Motors platform revolves around a curated selection of electric vehicles. This domain handles the lifecycle of vehicles from preparation to sale, as well as the specialized flow for sourcing vehicles that are not currently in stock.

The domain is composed of four primary entities:
*   **Vehicle:** The core representation of a car.
*   **VehicleMedia:** Associated images and videos for a vehicle.
*   **VehicleRequest:** A customer's request for a specific, non-inventoried vehicle.
*   **VehicleProposal:** A dealer's offer of a specific vehicle in response to a request.

## 2. Vehicle Entity
The **Vehicle** entity represents a specific EV owned or controlled by Evo Motors.

### Key Fields
*   `id`: Internal unique identifier (UUID).
*   `vin`: Vehicle Identification Number (Unique).
*   `make`: Manufacturer (e.g., Tesla, Rivian).
*   `model`: Specific model name (e.g., Model 3, R1T).
*   `year`: Manufacturing year.
*   `price`: Listing price in USD.
*   `mileage`: Current odometer reading.
*   `battery_range_estimate`: Estimated range on a full charge (miles).
*   `drivetrain`: e.g., AWD, RWD, FWD.
*   `exterior_color`: Primary paint color.
*   `interior_color`: Cabin material/color.
*   `condition_notes`: Detailed text describing the vehicle's state.
*   `vehicle_status`: Current lifecycle state (see Section 4).

### Ownership
*   Vehicles are owned and managed exclusively by the **Owner**.
*   Customers have read-only access to `Listed` vehicles.

## 3. Vehicle Media Entity
Media is decoupled from the main Vehicle record to allow for flexible gallery management and video integration.

### Key Fields
*   `id`: Internal unique identifier.
*   `vehicle_id`: Foreign key to the `Vehicle` entity.
*   `media_type`: Enum (`IMAGE`, `VIDEO`).
*   `url`: Publicly accessible URL (e.g., S3 or CDN).
*   `display_order`: Integer used for sorting the gallery (lower is first).

### Rules
*   Every vehicle must have at least one high-quality `IMAGE` before being moved to `Listed`.
*   Video walkthroughs are stored as `VIDEO` type with a link to the hosted walkthrough (e.g., YouTube/Vimeo embed or direct file).

## 4. Vehicle Inventory Lifecycle
The `vehicle_status` field governs visibility and availability.

### States
*   **Draft:** Vehicle record is being created or media is being uploaded. *Not visible to customers.*
*   **Listed:** Vehicle is publicly available for browsing and reservation. *Visible to all.*
*   **Reserved:** A customer has placed a deposit. The vehicle is held for that customer. *Visible to reserver; hidden or marked 'Reserved' for others.*
*   **Under Contract:** Documentation or financing is in progress. *Visible to participant; hidden for others.*
*   **Sold:** Transaction is complete. *Removed from public listing.*
*   **Archived:** Historical record for internal accounting. *Internal only.*

## 5. Vehicle Request Entity
The **VehicleRequest** entity captures a customer's specific needs for a car the dealer will source from auctions.

### Key Fields
*   `id`: Internal unique identifier.
*   `customer_id`: Foreign key to the `Customer` who made the request.
*   `make`: Desired manufacturer.
*   `model`: Desired model.
*   `year_min`: Minimum manufacturing year.
*   `year_max`: Maximum manufacturing year.
*   `budget_max`: Maximum target price.
*   `mileage_max`: Maximum odometer reading.
*   `notes`: Customer's specific preferences (e.g., "Must have white interior").
*   `request_status`: Current lifecycle state (see Section 6).

## 6. Vehicle Request Lifecycle
The `request_status` manages the sourcing workflow.

### States & Transitions
*   **Submitted:** Initial request from the customer.
*   **Under Review:** Owner has acknowledged the request and is verifying feasibility.
*   **Sourcing:** Owner is actively searching auctions and dealer networks.
*   **Vehicle Proposed:** One or more **VehicleProposal** records have been sent to the customer.
*   **Customer Approved:** Customer has selected a proposal.
*   **Converted to Deal:** Request has transitioned into an active purchasing flow (Deal record created).
*   **Closed:** Request is finished (e.g., cancelled by customer or expired).

## 7. Vehicle Proposal Entity
A **VehicleProposal** is a specific vehicle found by the dealer that matches a customer's request.

### Key Fields
*   `id`: Internal unique identifier.
*   `request_id`: Foreign key to the parent `VehicleRequest`.
*   `vin`: VIN of the proposed vehicle (may not yet be in inventory).
*   `make`: Vehicle make.
*   `model`: Vehicle model.
*   `year`: Manufacturing year.
*   `mileage`: Current odometer reading.
*   `estimated_price`: The expected final price including dealer fees.
*   `proposal_status`: Current state (see Section 8).
*   `notes`: Dealer comments (e.g., "Clean Carfax, one owner").

## 8. Proposal Lifecycle
*   **Proposed:** Initial state when sent to the customer.
*   **Customer Accepted:** Customer wants to proceed with this specific vehicle.
*   **Customer Declined:** Customer is not interested in this specific vehicle.
*   **Expired:** Proposal is no longer valid (e.g., vehicle sold at auction to someone else).

### Rule
*   Once a proposal is **Accepted**, the Owner creates a **Vehicle** record and a **Deal** record, linking them to the customer.

## 9. Customer Visibility Rules
*   **Requests:** Customers can view the list and status of their own requests.
*   **Proposals:** Customers can view proposals linked to their requests, including photos and specs provided by the dealer.
*   **Exclusions:** 
    *   Customers **cannot** see auction sourcing details (e.g., which auction house, bidding history).
    *   Customers **cannot** see internal dealer notes or acquisition costs.
    *   Customers **cannot** see other customers' requests or proposals.

## 10. Inventory Philosophy
The Evo Motors platform is built on a **Boutique Model**:
*   **Curation over Volume:** A small, high-quality inventory is preferred over a large, cluttered marketplace.
*   **Media-First:** Every vehicle page must lead with high-resolution imagery and video to establish trust.
*   **Transparency:** All pricing and specs are presented clearly without hidden fees or "call for price" tactics.
*   **Trust-Focused:** Detailed condition notes and battery health estimates are mandatory for every listing.
