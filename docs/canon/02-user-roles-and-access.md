# 02 - User Roles and Access

## 1. Role Definitions
The platform operates with a strict dual-role model to ensure operational simplicity and data security.

*   **Owner (Admin):** The single administrative account for the dealership operator. This role has full visibility and control over inventory, customer requests, deal progress, and lead generation for Baytech Smart Homes.
*   **Customer:** Individuals who have registered an account. This role is restricted to a personal view of their own transactions, documents, and vehicle sourcing requests.

## 2. Authentication Model
The authentication system is built for security and ease of use, integrating with the Next.js and Prisma stack.

### Customer Authentication
*   **Self-Registration:** Customers can create their own accounts via an email/password registration flow.
*   **Email Verification:** Mandatory verification is required before a customer can place a deposit or upload documents.
*   **Password Protection:** Strong password hashing (e.g., Argon2 or bcrypt) is required.
*   **Social Login (Optional):** Future support for Google/Apple login may be added, but email/password is the MVP standard.

### Owner Authentication
*   **Manual Provisioning:** Owner accounts cannot be self-registered. They must be manually created via database seeding or an internal administrative command.
*   **Strict Credentials:** High-entropy password requirements.

## 3. Owner Security Requirements
Due to the sensitivity of dealership operations and customer data, the Owner account requires enhanced security measures.

*   **Two-Factor Authentication (2FA):** Mandatory 2FA (TOTP or SMS-based) for all Owner logins.
*   **Audit Logging:** All administrative actions must be logged with a timestamp and the owner's user ID:
    *   `inventory_edit`
    *   `deal_status_change`
    *   `document_request_sent`
    *   `baytech_lead_created`
*   **Session Isolation:** Administrative routes must be protected by middleware that specifically checks for the `OWNER` role.

## 4. Customer Access Rules
Customer access is governed by the principle of **Least Privilege**.

*   **Identity Isolation:** Customers can only query or modify data that is explicitly linked to their unique `user_id`.
*   **Data Boundaries:**
    *   **Deals:** Can only view deals where they are the primary buyer.
    *   **Documents:** Can only view or sign documents associated with their active deals.
    *   **Uploads:** Can only access files they have personally uploaded.
*   **No Admin Access:** Customers must be restricted from all `/admin` or `/owner` prefixed routes via server-side middleware.

## 5. Session Security Model
Sessions are managed to prevent unauthorized access and protect against session hijacking.

*   **Storage:** Secure, HTTP-only, SameSite cookies.
*   **Expiration:**
    *   **Customer Sessions:** 30 days of inactivity before re-authentication is required.
    *   **Owner Sessions:** 8 hours of inactivity or 24 hours total duration, whichever comes first.
*   **Re-authentication:** Required for high-risk actions (e.g., changing password or updating sensitive banking information for deposits).

## 6. File Upload Security
The system handles sensitive identification (Driver’s License, Insurance).

*   **Secure Storage:** Uploads must be stored in a non-publicly accessible bucket (e.g., S3 with private ACLs or a protected local directory).
*   **Access Control:** Files are only retrievable via signed URLs or a proxy service that verifies:
    *   The requester is the Owner.
    *   OR the requester is the Customer who originally uploaded the file.
*   **Public Exposure:** No uploaded files should be served via public URLs.

## 7. Document Access Control
Documents handled via DocuSign must be tracked within the PostgreSQL database.

*   **Mapping:** Every document record in the database must be linked to a `deal_id` and a `customer_id`.
*   **Visibility:** 
    *   Customers see the status and can download their own signed PDF copies.
    *   The Owner sees all signed documents for all deals.
*   **Inter-Customer Privacy:** A customer must never be able to view or even know about the existence of documents for another customer’s deal.

## 8. Baytech Lead Access
Baytech leads represent business opportunities for an external entity.

*   **Owner View:** Full access to view, track, and export lead data (customer details, service type, address, notes).
*   **Customer View:** Restricted to a simple status indicator (e.g., "Request Received") within their portal. Customers cannot see internal lead notes or administrative tracking.
*   **System Boundary:** The Evo Motors platform does not provide login access for Baytech employees; the Owner serves as the manual bridge for lead fulfillment.

## 9. Access Philosophy
The system prioritizes **simplicity over granularity**.

*   **Binary Permissions:** The system either permits an action based on the `Owner` flag or it denies it for everyone else unless they are the owner of the specific resource.
*   **No Complex RBAC:** There are no roles like "Salesperson" or "Manager." This avoids technical debt during the initial build phase.

## 10. Future Expansion Considerations
*   **Multi-Employee Support:** If the dealership grows, the `Owner` role may be refactored into a `Staff` role with granular permissions (e.g., "Manager" vs "Salesperson").
*   **Baytech Portal:** Future integration may include a dedicated role for Baytech employees to log in and manage their own leads directly.
*   **Third-Party Auditor Role:** Potential for a read-only role for compliance or tax auditing.
