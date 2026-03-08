Title: Task 03.01 - Customer Registration and Login
Purpose: Implement the basic authentication flow for customers using email and password.
Files likely touched: src/app/register/page.tsx, src/app/login/page.tsx, src/lib/auth.ts
Implementation steps:
1. Create `src/app/register/page.tsx` and `src/app/login/page.tsx` with email/password forms.
2. Implement password hashing using Argon2 or bcrypt in `src/lib/auth.ts`.
3. Use NextAuth.js or a custom session manager to handle user sessions.
4. Redirect authenticated users to `/portal`.
Acceptance criteria:
- Customers can register and log in to their account (Test XSY-005).
- Accessing protected portal routes requires an active session.
- Passwords are securely hashed in the database.
Dependencies: Task 01.03, Task 01.02
Related epic: 03 — Customer Auth and Portal
Related acceptance tests: XSY-005
