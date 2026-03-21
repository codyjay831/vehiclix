# Evo Motors Launch Readiness Audit

**Date:** 2025-03-17  
**Scope:** Verification-grade audit of Evo Motors website within shared codebase (Evo Motors + Vehiclix).  
**Constraint:** Investigation and proof only; no code changes.

---

## 1. Executive Summary

- **Evo Motors** is implemented as **one organization (dealer)** in the multi-tenant app. It is reached today at **path-based routes** under `/[dealerSlug]` (e.g. `/evo-motors`, `/evo-motors/inventory`). The seed creates an organization named "Evo Motors" with slug `evo-motors`; that slug is also in `RESERVED_SLUGS` so no other org can claim it.
- **Vehiclix** is the **platform** brand: root layout, root landing (`/`), login, legal pages, emails, and deployment docs all use a single **centralized branding config** (`src/config/branding.ts`) that is **Vehiclix-only** (companyName, platformDomain, contact, metadata).
- **Separation today:** By **route group** ((marketing), (admin), (portal), (super-admin)) and by **path** (`[dealerSlug]`). Dealer pages use `TenantProvider` and org-specific metadata; platform pages and shared UI fall back to `BRANDING` (Vehiclix). **Custom domain** support exists in code (proxy + resolve-domain API) but **Next.js middleware is not wired** (no `middleware.ts`; `proxy.ts` is never invoked by the framework), so custom-domain rewrites do not run.
- **Verdict:** **No, not safely yet** to launch Evo Motors on **its own domain** without addressing branding and middleware. **Yes, with caveats** if launching Evo only at **vehiclix.app/evo-motors** (path-based): tenant isolation and metadata are correct; only minor fixes (e.g. favicon) recommended.

---

## 2. Current Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Root layout (src/app/layout.tsx)                                            │
│  - metadataBase, title, description, openGraph, favicon from BRANDING       │
│  - BRANDING = Vehiclix (src/config/branding.ts)                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ├── (marketing)/
         │   ├── layout.tsx          → no brand override; Navbar/Footer below   │
         │   ├── page.tsx            → ROOT LANDING: Vehiclix copy ("Vehiclix  │
         │   │                           is the premium multi-tenant platform")│
         │   ├── login/, request-access/, privacy/, terms/  → use BRANDING      │
         │   └── [dealerSlug]/       → Evo Motors here when slug = evo-motors  │
         │       ├── layout.tsx      → generateMetadata(org), TenantProvider   │
         │       ├── page.tsx        → dealer home (Hero, FeaturedInventory)   │
         │       ├── about/, contact/, inventory/, register/, request-vehicle/ │
         │       └── inventory/[id], inventory/[id]/reserve/                    │
         │
         ├── (admin)/admin/          → Owner/Staff; org from session            │
         ├── (portal)/portal/        → Customer; org from session              │
         └── (super-admin)/super-admin/ → Platform; "Vehiclix Admin" in UI     │
```

- **Evo Motors entry points:** `/(marketing)/[dealerSlug]/...` with `dealerSlug === "evo-motors"` (from seed: `normalizeSlug("Evo Motors")`). No dedicated Evo route group; Evo is one tenant.
- **Vehiclix entry points:** `/` (landing), `/login`, `/request-access`, `/privacy`, `/terms`, `/admin`, `/super-admin`, and any page that uses `BRANDING` when not in a dealer context.
- **Custom domain flow (in code but not active):** `proxy.ts` → for non-platform host, calls `/api/org/resolve-domain?host=...` → rewrite to `/{slug}{pathname}`. Next.js does **not** run `proxy.ts` (no `middleware.ts` in repo).

---

## 3. Findings by Section

### A. Site Surface / Routing

| Question | Finding | Evidence |
|----------|--------|----------|
| Evo Motors pages/layouts/entry | Evo is the dealer at `[dealerSlug]` with slug `evo-motors`. Layout: `(marketing)/[dealerSlug]/layout.tsx`. Pages: same folder (page, about, contact, inventory, register, request-vehicle, inventory/[id], reserve). | `prisma/seed.ts` (org "Evo Motors", slug from normalizeSlug), `src/app/(marketing)/[dealerSlug]/*` |
| Vehiclix pages/layouts/entry | Platform = Vehiclix. Root landing `(marketing)/page.tsx`; login, request-access, privacy, terms; admin, portal, super-admin. | `src/app/(marketing)/page.tsx` (Vehiclix copy), `src/app/(super-admin)/super-admin/layout.tsx` ("Vehiclix Admin"), `src/config/branding.ts` |
| Separation mechanism | **Route groups** (marketing, admin, portal, super-admin). **Path**: dealer by `[dealerSlug]`. **Domain**: intended via proxy + resolve-domain API; **not active** (no middleware). **Env**: `NEXT_PUBLIC_PLATFORM_DOMAIN` / `BRANDING.platformDomain` (default vehiclix.app). **Conditional layouts**: dealer layout provides tenant metadata and TenantProvider; root layout is single. **Hardcoded paths**: `/admin`, `/portal`, `/login`, etc. | `src/proxy.ts`, `src/app/api/org/resolve-domain/route.ts`, `src/lib/domain-shared.ts`, `src/app/(marketing)/[dealerSlug]/layout.tsx` |
| Root layout(s) for Evo | Single root layout for entire app. Evo dealer pages are nested under it; they get dealer-specific metadata from `[dealerSlug]/layout.tsx`, but root `metadataBase`/default title remain from BRANDING (Vehiclix). | `src/app/layout.tsx` (BRANDING), `src/app/(marketing)/[dealerSlug]/layout.tsx` (generateMetadata per org) |
| Per-site metadata | Dealer pages: `generateMetadata` in layout and per page; template `%s | {dealerName}`, canonical from `getCanonicalUrl(org)`. Root and non-dealer pages use BRANDING (Vehiclix). | `[dealerSlug]/layout.tsx` (title template, canonical, openGraph), `getCanonicalUrl` in `src/lib/organization.ts` |

---

### B. Branding / UX Separation

| Item | Location | Notes |
|------|----------|------|
| **Central config** | `src/config/branding.ts` | Single export `BRANDING`: companyName "Vehiclix", platformDomain (env or "vehiclix.app"), contact, socials, metadata. No Evo-specific config. |
| **"Evo Motors"** | `prisma/seed.ts`, docs, `src/lib/constants.ts` (RESERVED_SLUGS: "evomotors", "evo-motors") | Only as org name in DB and reserved slugs; no Evo branding config. |
| **"Vehiclix"** | `src/config/branding.ts`, `src/app/(marketing)/page.tsx` (body copy), `src/app/(super-admin)/super-admin/layout.tsx`, `src/lib/mail.ts`, `src/actions/auth.ts` (baseUrl fallback), `src/actions/beta.ts`, `src/lib/notifications.ts`, `src/components/admin/DomainManager.tsx`, `src/components/admin/HomepageEditorForm.tsx` (placeholder), `src/actions/domain.ts` (token prefix), `src/app/(marketing)/login/page.tsx`, `src/components/portal/PortalDashboardContent.tsx` ("Vehiclix Concierge"), `next.config.ts` (images hostname), `DEPLOY_VEHICLIX_GOOGLE.md` | Platform-wide. |
| **Brand logos** | Navbar/Footer use `tenant?.branding?.logoUrl` or BRANDING; no hardcoded logo path. | `src/components/public/Navbar.tsx`, `Footer.tsx` |
| **Favicon** | Root layout references `icon: "/favicon.ico"`. No `favicon.ico` in `public/` (only vercel.svg, window.svg, file.svg). | `src/app/layout.tsx` L25; `public/` listing |
| **Titles/descriptions/OG** | Root: BRANDING. Dealer: generateMetadata with org name and getCanonicalUrl(org). | layout.tsx, [dealerSlug]/layout.tsx, dealer pages |

**Brand leakage (exact files):**

- **Root/platform pages:** `src/app/layout.tsx`, `src/app/(marketing)/page.tsx`, `src/app/(marketing)/login/page.tsx`, `src/app/(marketing)/privacy/page.tsx`, `src/app/(marketing)/terms/page.tsx` — all use BRANDING (Vehiclix).
- **Shared components when no tenant:** Navbar, Footer use `tenant?.name || BRANDING.companyName` — so on `/` they show Vehiclix; on `/evo-motors` they show Evo Motors.
- **Portal:** `src/components/portal/PortalDashboardContent.tsx` L238: `"{BRANDING.companyName} Concierge"` — always Vehiclix.
- **Admin layout:** `src/app/(admin)/admin/layout.tsx` uses `organization?.name || BRANDING.companyName` — org-scoped; fallback is Vehiclix.
- **Emails:** `src/lib/mail.ts` — subject and body are "Vehiclix Beta", "Vehiclix", "The Vehiclix Team".
- **Homepage editor placeholder:** `src/components/admin/HomepageEditorForm.tsx` L376: placeholder "The team at Vehiclix made buying an EV seamless...".

---

### C. Deployment / Domain Readiness

| Item | Finding | Evidence |
|------|--------|----------|
| Firebase / Hosting | Doc only: DEPLOY_VEHICLIX_GOOGLE.md. APP_URL and NEXT_PUBLIC_PLATFORM_DOMAIN set to vehiclix.app. No firebase.json or apphosting config in repo. | DEPLOY_VEHICLIX_GOOGLE.md |
| Custom domains | Org can have verified OrganizationDomain; getCanonicalUrl(org) prefers primary verified domain. Proxy rewrites non-platform host → `/{slug}...` via resolve-domain API. | `src/lib/organization.ts` (getCanonicalUrl), `src/proxy.ts`, `src/app/api/org/resolve-domain/route.ts` |
| What controls Evo on its own domain | 1) Evo org has verified domain in DB. 2) Incoming requests to that host must be rewritten to /evo-motors/... — that requires **middleware** to run. **No middleware.ts**; proxy.ts is never invoked by Next.js. So custom domain for Evo **does not work** with current repo. | No file named `middleware.ts`; `proxy.ts` exports `proxy` and `config` but is not imported by framework. |
| Production config gaps | **Canonical/metadataBase:** Root is `https://${BRANDING.platformDomain}`; dealer pages use getCanonicalUrl(org) (correct for org’s domain or platform slug URL). **robots.txt:** none. **sitemap:** none. **favicon:** referenced, file missing. **Social preview:** uses BRANDING. **noindex:** not set. **404:** dealer slug not found uses notFound() (OK). **Internal links:** dealer pages use `tenant.slug` in paths (correct). | `src/app/layout.tsx`, dealer generateMetadata, `public/` |

---

### D. Auth / Data / Storage Impact

| Area | Finding | Evidence |
|------|--------|----------|
| Shared auth/DB/storage | Single session cookie (`evo_session`), single Prisma DB, single storage (local or one GCS bucket). | `src/actions/auth.ts` (SESSION_COOKIE_NAME), Prisma single schema, `src/lib/storage/index.ts`, GCS/local providers |
| Auth redirects / cookies / org | Login redirect uses `APP_URL || "https://vehiclix.app"` for 2FA URL. Post-login redirect is path-based (/admin, /portal, /super-admin). Session carries organizationId; admin/portal scope by organizationId. No single-brand assumption in routing. | `src/actions/auth.ts` L128, L152–165; admin/portal layouts resolve org from session |
| Storage namespacing | GCS: keys like `inventory/{filename}`, `documents/{filename}`. No organizationId in path. Local: `public/uploads/inventory/`, `storage/documents/`. Same for all orgs. | `src/lib/storage/gcs-provider.ts`, `local-provider.ts` |
| Risk of Evo launch to Vehiclix | Data: None; tenant isolation by organizationId. Storage: same bucket/prefix; collision only if same filename (UUIDs reduce risk). Auth: shared; no conflict. | Inventory and docs scoped by organizationId in app code; storage keys not org-prefixed |

---

## 4. Blocker Table (Severity + Confidence)

| # | Severity | Issue | Why it matters | Exact file(s) | Recommended fix | Confidence |
|---|----------|--------|----------------|--------------|-----------------|------------|
| 1 | **Critical** | Single branding config is Vehiclix-only | Evo on its own domain would still show Vehiclix in root metadata, login, legal, emails, portal copy. | `src/config/branding.ts`, all consumers of BRANDING | Add host- or env-based branding (e.g. Evo config when host = Evo domain) or separate build with Evo branding. | High |
| 2 | **Critical** | Custom-domain middleware not wired | Custom domain for Evo (or any dealer) does not work; proxy logic exists but is never run. | No `middleware.ts`; `src/proxy.ts` not used by Next.js | Create `middleware.ts` at project root that imports and invokes `proxy` from `src/proxy.ts` (or move proxy logic into middleware.ts). | High |
| 3 | **Critical** | Favicon missing | Root layout references `/favicon.ico`; file absent in public. | `src/app/layout.tsx` L25; `public/` has no favicon.ico | Add `public/favicon.ico` (or remove/change icon in layout). | High |
| 4 | **Important** | APP_URL / vehiclix.app hardcoded fallbacks | Email and redirect links point to platform URL; wrong if Evo is on its own domain. | `src/actions/auth.ts` L128, `src/actions/beta.ts` L133/235, `src/lib/notifications.ts` L58, `src/lib/mail.ts` (brand copy) | Use APP_URL everywhere and set per deployment; or derive from request host for links. | High |
| 5 | **Important** | next.config images allow only vehiclix.app | If Evo domain serves pages with images, Next image optimization may reject Evo domain. | `next.config.ts` L10–14 | Add Evo domain(s) to images.remotePatterns when using Evo domain. | Medium |
| 6 | **Important** | Storage not org-namespaced | Theoretically same filename across orgs could collide; current use (UUID filenames) makes this low. | `src/lib/storage/gcs-provider.ts`, `local-provider.ts` | Prefix keys with `orgId` or `orgSlug` (e.g. `inventory/{orgId}/{filename}`). | Medium |
| 7 | **Nice-to-have** | No robots.txt / sitemap | SEO and crawler behavior not explicitly configured. | — | Add `app/robots.ts` and `app/sitemap.ts` (or static files). | High |
| 8 | **Nice-to-have** | Portal “Vehiclix Concierge” | Customer-facing portal always shows platform name. | `src/components/portal/PortalDashboardContent.tsx` L238 | Use tenant name or BRANDING when tenant context exists; or per-site config. | High |

---

## 5. Minimum Safe Launch Plan

**1) Must fix before launch (Evo on its own domain)**  
- Wire middleware so custom-domain rewrites run: e.g. add `middleware.ts` at root that calls the existing proxy logic.  
- Resolve branding on Evo domain: either (a) runtime branding by host (Evo config when host = Evo domain), or (b) separate deploy with Evo-specific env/config.  
- Add `public/favicon.ico` (or adjust layout icon).  
- Set APP_URL (and any link base URLs) for the deployment that serves Evo so emails/redirects are correct.

**2) Can ignore until after launch**  
- robots.txt / sitemap (unless SEO is required day one).  
- Storage org namespacing (low risk with current usage).  
- Portal “Vehiclix Concierge” if Evo customers are OK with platform name in that spot for now.

**3) Recommended launch approach**

- **Same deployment, domain-based branding:** Possible if you add host-based branding and wire middleware. Same codebase, one deploy; when host = Evo domain use Evo metadata/branding and existing custom-domain rewrite.  
- **Separate deployment from same repo:** Set Evo-specific env (e.g. NEXT_PUBLIC_PLATFORM_DOMAIN=evomotors.com, and a way to load Evo branding). Deploy to a second Firebase site or project. No need for custom-domain rewrite if the app is only served on Evo’s domain.  
- **Temporary soft launch:** Run Evo only at **vehiclix.app/evo-motors** (path-based). No custom domain, no middleware change. Fix favicon; optionally add robots/sitemap. Evo experience is already correct on dealer routes; only platform landing and non-dealer pages stay Vehiclix.

**4) Order of operations (minimum safe path)**

1. Add `middleware.ts` that runs existing proxy logic (if you need custom domain for Evo).  
2. Add favicon to `public/` and/or fix layout icon.  
3. Introduce Evo branding (host-based or env-based) and use it for metadata and key customer-facing pages when Evo is the context.  
4. Set APP_URL (and mail/link bases) for the environment that will serve Evo.  
5. If using Evo’s domain in Next image src, add that domain to `next.config.ts` images.  
6. (Optional) Add robots.txt and sitemap; (optional) namespace storage by org.

---

## 6. “Go Live Now?” Verdict

- **Evo on its own domain:** **No, not safely yet.** Critical gaps: custom-domain middleware not wired, and branding is Vehiclix-only. Fix middleware + branding (and favicon/APP_URL) before going live on Evo’s domain.
- **Evo at vehiclix.app/evo-motors only (path-based):** **Yes, with caveats.** Tenant isolation and dealer metadata are correct; only add favicon and confirm no unintended Vehiclix copy on dealer pages (currently dealer pages use tenant name). Accept that root `/` and login remain Vehiclix.

---

## 7. Proof Index (File / Snippet Summary)

| Conclusion | File(s) | Snippet / logic |
|------------|--------|------------------|
| Evo is one org, slug evo-motors | `prisma/seed.ts` | normalizeSlug("Evo Motors"), upsert org with slug defaultSlug |
| Reserved slug evo-motors | `src/lib/constants.ts` | RESERVED_SLUGS includes "evomotors", "evo-motors" |
| Root layout uses BRANDING (Vehiclix) | `src/app/layout.tsx` | metadataBase, title, description, openGraph, icon from BRANDING |
| Dealer metadata overrides per org | `src/app/(marketing)/[dealerSlug]/layout.tsx` | generateMetadata: template "%s \| ${dealerName}", canonical from getCanonicalUrl(organization) |
| Root landing is Vehiclix copy | `src/app/(marketing)/page.tsx` | "Vehiclix is the premium multi-tenant platform..." |
| isPlatformHost uses BRANDING.platformDomain | `src/lib/domain-shared.ts` | normalizeHostname(BRANDING.platformDomain), compare to host |
| Custom domain rewrite in proxy | `src/proxy.ts` | Non-platform host → fetch resolve-domain → rewrite to /{slug}{pathname} |
| No middleware.ts | Repo search | No file named middleware.ts; proxy.ts not invoked by Next |
| getCanonicalUrl: custom domain or platform slug | `src/lib/organization.ts` | primaryDomain ? `https://${primaryDomain.hostname}` : `https://${BRANDING.platformDomain}/${organization.slug}` |
| Favicon referenced, not in public | `src/app/layout.tsx`, `public/` | icon: "/favicon.ico"; public has only vercel.svg, window.svg, file.svg |
| APP_URL fallback vehiclix.app | `src/actions/auth.ts`, `src/actions/beta.ts`, `src/lib/notifications.ts` | process.env.APP_URL \|\| "https://vehiclix.app" |
| Mail brand Vehiclix | `src/lib/mail.ts` | Subject "Welcome to Vehiclix Beta..."; body "Vehiclix", "The Vehiclix Team" |
| GCS storage prefix no org | `src/lib/storage/gcs-provider.ts` | prefix "inventory/" or "documents/"; key = prefix + filename |
| Inventory scoped by organizationId | `src/lib/inventory.ts` | getFeaturedInventory(org.id), getPublicInventory(organizationId), etc. |

---

*End of audit. No code was changed; findings are confirmed from repo inspection or inferred as noted.*
