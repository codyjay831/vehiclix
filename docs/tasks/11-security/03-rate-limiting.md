Title: Task 11.03 - Rate Limiting Enforcement
Purpose: Prevent automated abuse of auth and form submission endpoints.
Files likely touched: src/middleware.ts, src/lib/rate-limiter.ts
Implementation steps:
1. Implement a rate-limiter in `src/lib/rate-limiter.ts` using Redis or an in-memory store.
2. Apply the rate-limiter to login, register, inquiries, and request-vehicle endpoints via middleware.
3. Define specific limits: e.g., 5 failed login attempts per hour, 10 inquiries per minute.
Acceptance criteria:
- Rate limiting triggers after the specified number of attempts (Test 11.03 context).
- Exceeding the limit results in a 429 Too Many Requests response.
Dependencies: Task 01.03, Task 11.01
Related epic: 11 — Security Hardening and Audit
Related acceptance tests: None (security requirement)
