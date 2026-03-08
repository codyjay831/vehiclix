Title: Task 01.01 - Project Initial Scaffold
Purpose: Initialize the Next.js 14+ project with TypeScript, Tailwind CSS, and folder structure.
Files likely touched: package.json, next.config.mjs, tailwind.config.ts, src/app/layout.tsx
Implementation steps:
1. Run the following command to initialize the project:
   ```bash
   npx create-next-app@latest . \
     --typescript \
     --eslint \
     --tailwind \
     --app \
     --src-dir \
     --import-alias "@/*"
   ```
   (Note: use `.` to install in the current directory if appropriate, or name the project directory).
2. Configure `next.config.mjs` for any specific requirements (e.g., image domains).
3. Set up the basic folder structure: `src/app`, `src/components`, `src/lib`, `src/hooks`, `src/types`, `src/actions`.
4. Install base dependencies: `prisma`, `@prisma/client`, `lucide-react`, `clsx`, `tailwind-merge`.
Acceptance criteria:
- Next.js 14+ app starts successfully with `npm run dev`.
- Tailwind CSS is working on the placeholder homepage.
- Basic directory structure exists (src dir used, app router confirmed).
Dependencies: None
Related epic: 01 — Platform Foundation
Related acceptance tests: None
