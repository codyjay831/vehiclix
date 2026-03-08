# 07 - Authentication, Security, and Audit

## 1. Security Overview
The Evo Motors Platform handles sensitive customer information, including personally identifiable information (PII) such as driver's licenses, insurance documents, and legally binding contracts. Security is a primary architectural requirement. The system must ensure data confidentiality, integrity, and availability through robust authentication, session management, and server-side validation.

## 2. Authentication Model
The system uses a role-based authentication model with two distinct roles: **Owner** and **Customer**.

### Customer Authentication
*   **Self-Registration:** Customers can create accounts via email and password.
*   **Email Verification:** Required to verify ownership of the email address before high-stakes actions (deposits, document uploads).
*   **Password Requirements:** Must meet modern complexity standards (minimum length, special characters).

### Owner Authentication
*   **Manual Provisioning:** Owner accounts cannot be self-registered and must be created via administrative scripts or database seeding.
*   **Two-Factor Authentication (2FA):** Mandatory for all Owner accounts (e.g., TOTP or SMS). Access to administrative tools is denied without a valid 2FA token.

## 3. Session Management
Sessions must be handled securely to prevent common attacks such as hijacking, CSRF, and token leakage.

*   **Technology:** Secure, HTTP-only, SameSite=Lax (or Strict) cookies for session tokens.
*   **Customer Sessions:** 
    *   Duration: 30 days of inactivity before expiration.
    *   Renewal: Refresh on active usage.
*   **Owner Sessions:** 
    *   Duration: 8 hours of inactivity.
    *   Security: Higher scrutiny, requiring re-authentication for sensitive actions.
*   **Protection:** CSRF tokens must be validated for all state-changing requests (POST, PATCH, DELETE).

## 4. Route Protection
Access control is enforced at the server-side middleware level.

*   **Public Routes:** Home page, inventory browsing, vehicle detail pages, educational content. No authentication required.
*   **Customer Routes:** `/portal/*`, `/uploads/*`, `/deals/*`. Requires a valid Customer session. Access limited to the customer's own resources.
*   **Owner Routes:** `/admin/*`, `/inventory/manage/*`, `/deals/manage/*`. Requires a valid Owner session with 2FA verification.
*   **Enforcement:** Any attempt by a customer to access an owner route must result in a 403 Forbidden or 404 Not Found response.

## 5. File Upload Security
Sensitive documents (Driver's License, Insurance) require strict isolation.

*   **Storage:** Private storage (e.g., S3 buckets with restricted ACLs or private local directories).
*   **Accessibility:** Files must **never** be served via public URLs.
*   **Access Pattern:** Retrieval via server-side signed URLs (expiring in minutes) or proxying through an authenticated endpoint.
*   **Authorization:** The server must verify that the requester is the **Owner** or the **Customer** linked to the specific deal before generating an access URL.

## 6. Document Security
Contracts and disclosures are legally binding and must be protected.

*   **Association:** Every document must be linked to a specific `deal_id` and `customer_id` in the PostgreSQL database.
*   **Signed Contracts:** Finalized PDF documents from DocuSign must be retrieved and stored securely within the system's private storage.
*   **Privacy:** Access is restricted to the involved Customer and the Owner.

## 7. Stripe Integration Security
The system treats Stripe as the single source of truth for financial transactions.

*   **Webhook Verification:** All incoming Stripe webhooks must be verified using the Stripe signing secret.
*   **Server-Side Validation:** Deposit status must be confirmed via a server-to-server call to Stripe (e.g., retrieving the PaymentIntent) before updating the database.
*   **No Client-Side Reliance:** The system must not update deal or vehicle status based solely on frontend success callbacks.

## 8. DocuSign Integration Security
The system treats DocuSign as the single source of truth for contract execution.

*   **Webhook Verification:** All DocuSign Connect webhook notifications must be verified via HMAC or secret keys.
*   **Server-Side Validation:** Contract completion status must be confirmed via the DocuSign API.
*   **Persistence:** Once signed, the system must trigger a background job to download and secure the finalized document.

## 9. Audit Logging Requirements
Critical administrative and transactional events must be logged for traceability.

### Required Events:
*   `inventory_modified`: Creating, editing, or archiving vehicles.
*   `deal_status_changed`: Moving a deal through its lifecycle.
*   `document_uploaded`: When a customer provides a file.
*   `contract_initiated`: When the owner sends a DocuSign envelope.
*   `payment_confirmed`: When a Stripe deposit is verified.
*   `baytech_lead_captured`: When an energy service request is created.

### Log Format:
Logs must include:
*   `timestamp`: UTC time of the event.
*   `user_id`: The ID of the actor (Owner or Customer).
*   `action`: A standardized string code (e.g., `DEAL_CANCELLED`).
*   `entity_id`: The ID of the primary related record (e.g., `deal_id`).

## 10. Rate Limiting Expectations
To prevent automated abuse and brute-force attacks, the following endpoints must be rate-limited:

*   **Auth Endpoints:** Account registration, login attempts, password resets.
*   **Submission Endpoints:** Vehicle request forms, service request forms.
*   **Public API:** General search and browsing endpoints.
*   **Implementation:** Basic bucket-based or window-based rate limiting at the application or infrastructure layer.
