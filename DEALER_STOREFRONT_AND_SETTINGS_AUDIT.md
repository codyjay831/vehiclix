# Dealer Settings, Storefront Behavior & Website Individuality — Verification Audit

**Date:** 2025-03-17  
**Mode:** Triangle (investigation, proof, interpretation only — no code changes)  
**Focus:** Dealer settings, storefront behavior, website individuality, and the product model implied by the implementation.

---

## 1. Executive Summary

- **What "View Storefront" does:** It is a link to `/{org.slug}` (e.g. `/evo-motors`) that opens in a new tab. It leads to the **dealer’s public path-based storefront**: a full set of pages (home, inventory, about, contact, request-vehicle, register, VDP, reserve) under a **shared shell** (Navbar + Footer) with **dealer-specific data and config** (branding, homepage content, metadata, canonical URLs). **No authentication is required** to view any of these pages.

- **What the storefront is:** It is **not** “just” a public inventory page. It is a **multi-page dealer mini-site**: homepage with configurable hero/promo/trust/testimonial/about/contact CTA, showroom (inventory), VDP, about, contact, request-vehicle, and register. Layout and page set are **shared**; **content, copy, and identity** are dealer-configurable. So it is **closer to a lightweight customizable dealer website** than to a single inventory list.

- **Dealer-specific settings today:** Stored in **Organization** (name, slug, phone, status), **OrganizationBranding** (logo, hero copy, about blurb, contact, social image, primaryColor), **OrganizationHomepage** (homepage toggles and copy), and **OrganizationDomain** (custom domains). **Branding** and **Homepage** are edited in Admin Settings and **drive the public storefront**. **Custom Domains** are configured in Admin and used for **canonical URLs and (if proxy runs) domain-based routing**. **Users** and **Billing** are operational/internal.

- **Product model implied by the code:** The system behaves as a **multi-tenant platform with lightweight dealer storefronts**: one shared app shell and page set, with per-dealer identity (name, logo, contact), configurable homepage content, optional custom domain, and dealer-scoped inventory. The docs describe a **future** move to subdomain-based routing and “full suite of branded pages” — the **current** implementation already provides that suite; the gap is **routing** (path vs subdomain/custom domain) and **degree of layout/UX customization**, not page count.

- **Drift vs intent:** The codebase is **aligned** with “each dealer has a public-facing mini-site” but **ahead** of the doc’s “Phase C – Custom Dealer Storefronts” in content/branding; **behind** on subdomain/custom-domain execution (proxy exists but is not wired via Next.js middleware). Some settings (**primaryColor**, **socialImageUrl**) exist in schema/forms but are **not fully used** on the public site. **Organization name/slug/phone** are not editable in dealer Settings (set at creation; slug change is support-only).

- **Decision required:** Whether the storefront should be **defined and communicated** as: (a) a **public inventory view**, (b) a **lightweight dealer mini-site** (current behavior), or (c) a **full customizable dealer website** (future direction). That choice drives messaging, roadmap, and where to invest next (e.g. wiring proxy, OG image, primaryColor, or deeper layout customization).

---

## 2. Current Storefront Behavior

### 2.1 What “View Storefront” Actually Does

| Aspect | Finding | Evidence |
|--------|--------|----------|
| **Location** | Admin Settings layout, top-right. | `src/app/(admin)/admin/settings/layout.tsx` L51–58 |
| **Rendered when** | `org?.slug` is truthy (dealer has a slug). | Same file L51: `{org?.slug && (...)}` |
| **Target** | `href={/${org.slug}}` with `target="_blank"`. | L54: `<Link href={\`/${org.slug}\`} target="_blank">` |
| **Label** | “View Storefront” with Globe icon. | L55–56 |
| **Effect** | Opens the dealer’s **root storefront URL** in a new tab (e.g. `https://<origin>/evo-motors`). | No redirect; direct navigation. |

So: **“View Storefront” = open the public dealer home at `/{slug}` in a new tab.** No server-side redirect; the browser loads the marketing route `/(marketing)/[dealerSlug]/page.tsx` for that slug.

### 2.2 Route, Layout, Data, and Tenant Resolution

| Layer | Implementation | File(s) |
|-------|----------------|---------|
| **Route** | Dynamic segment `[dealerSlug]`. Sibling routes: `page.tsx` (home), `about`, `contact`, `inventory`, `inventory/[id]`, `inventory/[id]/reserve`, `register`, `request-vehicle`. | `src/app/(marketing)/[dealerSlug]/` |
| **Layout** | `DealerLayout`: loads org by `getOrganizationBySlug(dealerSlug)`; if not found → `notFound()`. If `status === "SUSPENDED"` → controlled “Temporarily unavailable” message. Otherwise wraps children in `TenantProvider` + shared `Navbar` + `Footer`. | `src/app/(marketing)/[dealerSlug]/layout.tsx` |
| **Data loading** | Layout: `getOrganizationBySlug(dealerSlug)` with `include: { branding: true, homepage: true, subscription: true, domains: { where: { status: VERIFIED } } }`. Page-level: same org fetch where needed; inventory via `getPublicInventory(org.id, filters)` etc. | `src/lib/organization.ts` (getOrganizationBySlug), `src/lib/inventory.ts` |
| **Tenant resolution** | **Path-based:** tenant = organization whose `slug` matches `dealerSlug`. **Domain-based (when proxy runs):** custom host → `/api/org/resolve-domain?host=...` → returns slug → internal rewrite to `/{slug}{pathname}`. | `src/app/(marketing)/[dealerSlug]/layout.tsx`, `src/proxy.ts` L51–69, `src/app/api/org/resolve-domain/route.ts` |

### 2.3 Public vs Private and Authentication

- **Public:** The `[dealerSlug]` layout and all child pages **do not require authentication**. Layout calls `getAuthenticatedUser()` only to pass `userRole` into `Navbar` for Login/Admin/Portal and CTA; missing user is handled (e.g. “Login” shown). No redirect to login for anonymous visitors.
- **Confirmed:** Non-authenticated users can open `/{slug}`, `/{slug}/inventory`, `/{slug}/about`, etc., and see full content. Access control is **only** for admin (`/admin`), portal (`/portal`), and super-admin routes.

### 2.4 Domain vs Path

- **Path-based:** Primary and current behavior. Storefront URL = `https://<platform-domain>/<dealerSlug>` (and children). Example: `https://vehiclix.app/evo-motors`.
- **Domain-based:** Implemented but **not active** in default Next.js flow:
  - **Custom domain → slug:** `src/proxy.ts` (L21–78): if host is not platform host, calls `/api/org/resolve-domain?host=...`; if slug returned, rewrites to `/${slug}${pathname}`.
  - **API:** `src/app/api/org/resolve-domain/route.ts` resolves verified `OrganizationDomain` hostname to org slug.
  - **Canonical URLs:** `getCanonicalUrl(organization)` in `src/lib/organization.ts` uses primary verified custom domain when present; otherwise `https://{platformDomain}/{slug}`.
  - **Gap:** There is **no `middleware.ts`** in the repo that invokes `proxy.ts`. So custom-domain rewrites only run if the deployment pipeline wires the proxy (e.g. edge or custom server). Per existing audit, custom-domain routing is “in code but not active” for standard Next.

**Summary:** Storefront is **path-based by default**; **domain-based** is implemented for canonical URLs and for routing **if** the proxy is used in deployment.

---

## 3. Dealer Settings Map

### 3.1 Data Models (Schema)

| Model | Purpose | Key fields (dealer-facing) |
|-------|--------|----------------------------|
| **Organization** | Core dealer record. | `name`, `slug`, `phone`, `status` (ACTIVE/SUSPENDED) |
| **OrganizationBranding** | Identity and contact for public site. | `logoUrl`, `primaryColor`, `heroHeadline`, `heroSubheadline`, `aboutBlurb`, `contactEmail`, `contactPhone`, `address`, `socialImageUrl` |
| **OrganizationHomepage** | Homepage content and toggles. | `showPromo`, `promoText`, `heroHeadline`, `heroSubheadline`, `heroPrimaryCtaLabel`, `heroPrimaryCtaRoute`, `showTrustHighlights`, `trustHighlightsJson`, `showFeaturedInventory`, `showTestimonial`, `testimonialQuote`, `testimonialAuthor`, `showAboutTeaser`, `aboutTeaser`, `showContactCta`, `contactCtaHeadline`, `contactCtaBody` |
| **OrganizationDomain** | Custom domain for storefront. | `hostname`, `isPrimary`, `status` (PENDING/VERIFIED), `verificationToken`, `verifiedAt` |
| **OrganizationSubscription** | Billing / feature flags (e.g. custom domains). | Used by `hasFeature(subscription, "customDomains")` in DomainManager |

Source: `prisma/schema.prisma` (Organization, OrganizationBranding, OrganizationHomepage, OrganizationDomain, OrganizationSubscription).

### 3.2 Where Settings Are Edited (Admin UI)

| Setting area | Route | Component | Server action(s) |
|--------------|--------|-----------|-------------------|
| **Branding** | `/admin/settings/branding` | `BrandingEditorForm` | `updateOrganizationBrandingAction` |
| **Homepage** | `/admin/settings/homepage` | `HomepageEditorForm` | `updateHomepageAction` |
| **Custom Domains** | `/admin/settings/domains` | `DomainManager` | `addDomainAction`, `deleteDomainAction`, `verifyDomainAction`, `setPrimaryDomainAction` |
| **Users** | `/admin/settings/users` | `UserTable` + team actions | team actions (invite, remove, set role) |
| **Billing** | `/admin/settings/billing` | Billing UI | billing actions (Stripe) |
| **Organization name / slug / phone** | — | **No dealer-facing form.** Name and slug set at creation (e.g. beta/request-access). Slug change: `updateOrganizationSlugAction` exists but is support-only (requireWriteAccess); no link from dealer Settings. | `updateOrganizationSlugAction` (no Settings UI) |

Settings nav: `src/components/admin/SettingsNav.tsx` (Branding, Users, Custom Domains, Homepage, Billing). Default settings redirect: `src/app/(admin)/admin/settings/page.tsx` → redirect to `/admin/settings/branding`.

### 3.3 Categorization of Configurable Fields

1. **Operational / internal**  
   Users (team), Billing, Organization `status` (super-admin suspend/reactivate). Not shown on public storefront.

2. **Public business identity**  
   **Organization:** `name`, `slug`, `phone` (name/slug used in metadata, nav, titles; phone as contact fallback). **Branding:** `logoUrl`, `heroHeadline`, `heroSubheadline`, `aboutBlurb`, `contactEmail`, `contactPhone`, `address`.  
   Used in: Navbar, Footer, About, Contact, metadata, ContactCTA.

3. **Branding / style**  
   **Branding:** `logoUrl` (display). `primaryColor` exists in schema and seed but is **not** in `BrandingEditorForm` and **not** read in any component (no dynamic theme from it). So effectively **logo only** for visual identity today.

4. **Storefront / inventory display**  
   **Homepage:** toggles and copy for hero, promo, trust highlights, featured inventory, testimonial, about teaser, contact CTA. **Inventory:** no dealer-level “display” settings (e.g. grid vs list); filters/sort are URL params. Inventory list and VDP are shared layout with dealer-scoped data.

5. **Contact / location / business info**  
   **Branding:** `contactEmail`, `contactPhone`, `address`. **Organization:** `phone` (fallback). Used on Contact page, Footer, ContactCTA.

6. **Public website customization**  
   Homepage section visibility and copy (Homepage), custom domain (Domains), canonical/SEO via `getCanonicalUrl(org)` and per-page `generateMetadata`. **SEO/metadata:** title template and canonical are dealer-specific; **socialImageUrl** is stored and editable but **not** passed to dealer layout/page `openGraph.images` (only vehicle VDP uses `vehicle.media[0].url` for OG image).

---

## 4. Public vs Internal Settings Impact Table

| Setting / area | Stored (model) | Edited (admin) | Read / rendered | Affects public? | Affects admin? | Notes |
|----------------|----------------|----------------|-----------------|------------------|-----------------|--------|
| **Organization.name** | Organization | No (set at creation) | Layout metadata, Navbar, Footer, About, Contact, inventory title, etc. | Yes | Yes (layout) | Not editable in Settings. |
| **Organization.slug** | Organization | No (support-only action) | URL for “View Storefront”, all dealer links. | Yes | Yes | Defines storefront path. |
| **Organization.phone** | Organization | No | Contact fallback when branding.contactPhone missing. | Yes | — | Not in Settings form. |
| **Organization.status** | Organization | Super-admin only | Layout: SUSPENDED → “Temporarily unavailable” message. | Yes | — | Operational. |
| **Branding.logoUrl** | OrganizationBranding | Branding | Navbar, Footer. | Yes | — | Confirmed. |
| **Branding.primaryColor** | OrganizationBranding | **No** (not in form) | **Nowhere** (no component reads it). | No | No | Orphan: schema/seed only. |
| **Branding.heroHeadline/Subheadline** | OrganizationBranding | Branding | `getSafeHomepage` fallback for hero; metadata fallback. | Yes | — | Confirmed. |
| **Branding.aboutBlurb** | OrganizationBranding | Branding | About page. | Yes | — | Confirmed. |
| **Branding.contactEmail/Phone/address** | OrganizationBranding | Branding | Contact page, Footer, ContactCTA. | Yes | — | Confirmed. |
| **Branding.socialImageUrl** | OrganizationBranding | Branding | **Not used** in dealer metadata (no openGraph.images from it). | No | — | Stored, not wired to OG. |
| **Homepage.*** (all toggles/copy) | OrganizationHomepage | Homepage | Hero, PromoBar, TrustHighlights, FeaturedInventory, Testimonial, AboutTeaser, ContactCTA; metadata. | Yes | — | Confirmed. |
| **Homepage.showTrustHighlights** | OrganizationHomepage | Homepage | `getSafeHomepage`; Hero, TrustHighlights. | Yes | — | Form sends `trustHighlightsJson: undefined` when unchecked; action sets `showTrustHighlights: undefined` so Prisma may not persist `false` (undefined = don’t update). |
| **Domains** (hostname, primary, status) | OrganizationDomain | Domains | `getCanonicalUrl(org)`, resolve-domain API, proxy rewrite. | Yes (canonical + routing if proxy used) | — | Canonical always; routing only if proxy runs. |
| **Users / Billing** | User, Subscription | Users, Billing | Access control, feature flags (e.g. customDomains). | No | Yes | Internal. |

---

## 5. Product Model Verdict

### 5.1 Options Considered

1. **Simple dealer app with a public inventory page** — One main public page (inventory) and maybe a simple detail page.
2. **Multi-tenant platform with lightweight dealer storefronts** — One shared shell and page set; per-dealer data and config (identity, homepage content, domains); no per-dealer layout/theming.
3. **Platform drifting toward full dealer websites** — Same as (2) but with roadmap/UX that suggests each dealer could eventually have a fully customizable site (themes, layout, extra pages).
4. **Mixed/ambiguous** — Some areas look like (1), others like (2) or (3).

### 5.2 Verdict: **Multi-tenant platform with lightweight dealer storefronts (2)**

**Evidence:**

- **Page set:** Each dealer gets home, inventory, inventory/[id], reserve, about, contact, request-vehicle, register. That is a **full mini-site**, not a single inventory list. (`src/app/(marketing)/[dealerSlug]/` and layout.)
- **Shared shell:** One Navbar, one Footer, same section order on home (PromoBar → Hero → TrustHighlights → FeaturedInventory → Testimonial → AboutTeaser → ContactCTA). Layout and section structure are **not** dealer-configurable; only **content** and **visibility** are. (`src/app/(marketing)/[dealerSlug]/page.tsx`, `src/components/public/*`.)
- **Configurable identity and content:** Logo, hero/CTA copy, about blurb, contact info, homepage toggles and copy, optional custom domain. No per-dealer CSS theme or layout variants. (`OrganizationBranding`, `OrganizationHomepage`, `getSafeHomepage`, TenantProvider.)
- **Docs:** `docs/future-architecture.md` describes “Dealer Public Storefronts” as future “Phase C” with subdomain routing and “full suite of branded pages.” The **suite of pages** already exists; the **routing** (subdomain/custom domain) and **dynamic runtime branding** (e.g. primaryColor) are the pending parts. So implementation is **ahead** on “storefront as mini-site,” **behind** on routing and theme.

**Conclusion:** The current implementation **is** (2). It is **not** (1) because the storefront is multi-page and content-rich. It is **not yet** (3) because there is no layout/theme customization or extra dealer-defined pages; it is **positioned** to evolve toward (3) (custom domains, future primaryColor/socialImageUrl, doc language).

---

## 6. Individuality / Branding Boundary

### 6.1 How Much Individuality Each Dealer Has

- **Data/content:** **High.** Dealer name, slug, logo, hero/CTA copy, about blurb, contact details, homepage section visibility and copy, testimonial, trust highlights, custom domain. All of this is per-organization and drives what the public sees.
- **Branding/layout/UX:** **Low.** Single shared layout (Navbar + Footer), same page list, same section order on home. Only **content** and **visibility** vary. **primaryColor** is in DB but unused; no dealer-specific theme or fonts/layout.

### 6.2 Architecture Assumption

- **Shared shell + dealer data:** **Yes.** One React tree and route set; tenant context (TenantProvider) supplies org + branding + homepage; components branch on tenant and `getSafeHomepage(...)`.
- **Shared shell + configurable identity:** **Yes.** Identity = name, logo, contact, copy; no structural or theme customization.
- **Future customizable dealer websites:** **Partially assumed.** Custom domain and canonical support and “storefront” wording imply dealers can “own” a site. Docs mention “dynamic runtime branding” and subdomains. Schema has `primaryColor` and `socialImageUrl` but they are not yet used on the public site.

### 6.3 Where the Boundary Is Blurry

- **Naming:** “View Storefront” and “storefront” in DomainManager/Homepage/Branding copy suggest a **site**, not just a page. “Landing Page Content” (Homepage) vs “Website Branding” (Branding) mix “page” and “website.”
- **DomainManager:** “Connect your own domain to your **dealership storefront**” and “route traffic to your **Vehiclix storefront**” — implies the storefront is a first-class site tied to a domain.
- **future-architecture.md:** “Each storefront will contain a **full suite** of branded pages” — already true; “Phase C” and “Custom Dealer Storefronts” sound like a future state, but the suite exists today.
- **primaryColor / socialImageUrl:** Schema and (for socialImageUrl) form imply future “branding” use; no usage yet, so the **intended** boundary (per-dealer theme/OG image) is not yet implemented.

---

## 7. Drift / Surprise Analysis

### 7.1 Likely Accidental or Incomplete

- **primaryColor:** In schema and seed, not in Branding form or any UI. **Inference:** intended for future theming; never wired. **Impact:** low (default theme used).
- **socialImageUrl:** Editable in Branding; not passed to dealer `generateMetadata`/openGraph. **Inference:** intended for OG image; wiring missed. **Impact:** shared links may not get dealer-specific image.
- **showTrustHighlights when unchecked:** Form sends `trustHighlightsJson: undefined`; action sets `showTrustHighlights: undefined`; Prisma update may leave existing `true` in DB. **Inference:** bug. **Impact:** toggling “Visible” off may not persist.
- **Proxy not invoked by Next.js:** Custom-domain rewrite lives in `proxy.ts`; no `middleware.ts` calls it. **Inference:** deployment or middleware wiring not done. **Impact:** custom domains don’t route without custom deployment.

### 7.2 Intentionally Designed

- **Path-based storefront by slug:** Clear design: `/{slug}`, `/{slug}/inventory`, etc., with tenant from slug.
- **TenantProvider + getSafeHomepage:** Central way to resolve “what does this dealer show” with branding/homepage fallbacks.
- **SUSPENDED:** Controlled “Temporarily unavailable” instead of 404; super-admin and copy reference “public storefront.”
- **Canonical URL from custom domain:** `getCanonicalUrl` prefers verified primary domain; SEO and future domain routing are intended.
- **Dealer metadata template:** `%s | {dealerName}` and dealer-specific canonical/OG in layout and pages.

### 7.3 Ambiguous (Needs Product Clarification)

- **Organization name/slug/phone not editable in Settings:** Owners cannot change business name or slug from Settings. **Question:** Is that intentional (stability, support-only) or an oversight?
- **“Storefront” in UI:** Whether to call it “storefront,” “dealer website,” or “public inventory” in admin and docs — affects expectations.
- **Scope of “Custom Domains”:** Whether custom domain is “your storefront lives at your domain” (current design) or “optional vanity URL” — already implemented as first; messaging should match.

---

## 8. Key Decision Now Required

### 8.1 What the System Currently Is

A **multi-tenant platform** where each dealer has a **public, path-based mini-site** at `/{slug}` with a **shared shell** (Navbar, Footer, same page set) and **dealer-specific content and identity** (name, logo, copy, contact, homepage toggles, optional custom domain for canonical and, if proxy is wired, routing). **No auth** required to view. **Admin “View Storefront”** simply opens that URL in a new tab.

### 8.2 What It Is Closest To Becoming

**Lightweight dealer mini-sites** that can be reached by **custom domain** (once proxy/middleware is wired) and, if desired, **slightly more branding** (primaryColor, socialImageUrl for OG). The doc’s “Phase C – Custom Dealer Storefronts” is largely **content-wise** already there; the open work is **routing** (subdomain/custom domain) and **optional** visual/metadata polish.

### 8.3 Major Product Decision

**Define and commit** to one of:

- **A. Public inventory view** — Message and scope the storefront as “your public inventory page (and VDP).” Then simplify or de-emphasize homepage customization, custom domain, and “storefront” language.
- **B. Lightweight dealer mini-site** — Message and scope as “your dealer mini-site: home, showroom, about, contact, request-vehicle, register.” Keep current feature set; fix wiring (proxy, OG image, showTrustHighlights); clarify that layout/theme stay shared.
- **C. Full customizable dealer website** — Roadmap toward layout/theme options, more sections, or dealer-defined pages. Then plan primaryColor, socialImageUrl, and possibly layout variants.

The codebase already implements **B**; the decision is whether to **declare** and **support** B, or to move toward A or C.

### 8.4 Should “Storefront” Remain…?

| Option | Implication |
|-------|-------------|
| **Just a public inventory view** | Would require **reducing** or hiding homepage customization, custom domains, and “storefront” wording; or explicitly framing them as “optional extras.” Architecture would stay; positioning would narrow. |
| **Lightweight dealer mini-site** | **No structural change.** Align naming and docs with current behavior; wire proxy (if desired), OG image, and showTrustHighlights; keep one shared shell + configurable content. |
| **Full customizable dealer website** | **Larger roadmap:** theming (primaryColor), OG (socialImageUrl), possibly layout/section options or custom pages. More product and eng investment. |

### 8.5 Architectural Consequences

- **If (A) — inventory only:** Fewer settings and copy about “storefront” and “homepage”; possible consolidation of Homepage into a single “hero + inventory” view; custom domain could be framed as “optional vanity URL” only.
- **If (B) — mini-site:** Keep current architecture; add middleware (or equivalent) to run proxy for custom domains; wire socialImageUrl to metadata; fix showTrustHighlights persistence; document “storefront = dealer mini-site.”
- **If (C) — full website:** Keep B, then add theme (primaryColor), richer metadata, and a path to layout/section customization or new page types; may need design system and tenant-level layout config.

---

## 9. Proof Index (File Paths and Code References)

| Topic | File(s) | Reference (description) |
|-------|---------|--------------------------|
| View Storefront button | `src/app/(admin)/admin/settings/layout.tsx` | L51–58: Link `/${org.slug}` target="_blank", "View Storefront" |
| Dealer layout & tenant | `src/app/(marketing)/[dealerSlug]/layout.tsx` | Full file: getOrganizationBySlug, SUSPENDED handling, TenantProvider, tenant shape |
| Tenant shape | `src/components/providers/TenantProvider.tsx` | id, name, slug, phone, branding, homepage |
| Organization + relations | `src/lib/organization.ts` | getOrganizationBySlug, getCanonicalUrl; include branding, homepage, domains |
| Public storefront pages | `src/app/(marketing)/[dealerSlug]/` | page.tsx, about, contact, inventory, inventory/[id], reserve, register, request-vehicle |
| No auth required | `src/app/(marketing)/[dealerSlug]/layout.tsx` | getAuthenticatedUser() only for Navbar userRole; no redirect |
| Schema (Organization, Branding, Homepage, Domain) | `prisma/schema.prisma` | L14–36 (Organization), L39–61 (Homepage), L63–78 (Branding), L81–94 (Domain) |
| Settings nav & routes | `src/components/admin/SettingsNav.tsx` | Branding, Users, Custom Domains, Homepage, Billing |
| Branding form & action | `src/components/admin/BrandingEditorForm.tsx`, `src/actions/organization.ts` | Fields (no primaryColor); updateOrganizationBrandingAction, BrandingSchema |
| Homepage form & action | `src/components/admin/HomepageEditorForm.tsx`, `src/actions/homepage.ts` | All homepage fields; updateHomepageAction; showTrustHighlights derived from trustHighlightsJson |
| getSafeHomepage | `src/lib/homepage.ts` | Defaults and fallbacks from homepage + branding + org name |
| Usage of tenant/homepage in public components | `src/components/public/Hero.tsx`, `PromoBar.tsx`, `TrustHighlights.tsx`, `FeaturedInventory.tsx`, `Testimonial.tsx`, `AboutTeaser.tsx`, `ContactCTA.tsx` | useTenant(), getSafeHomepage(tenant.homepage, tenant.branding, tenant.name) |
| Navbar/Footer branding | `src/components/public/Navbar.tsx`, `Footer.tsx` | tenant?.branding?.logoUrl, tenant?.name, contact from branding |
| About/Contact dealer data | `src/app/(marketing)/[dealerSlug]/about/page.tsx`, `contact/page.tsx` | org.branding?.aboutBlurb; contact from branding/org.phone |
| Metadata (dealer) | `src/app/(marketing)/[dealerSlug]/layout.tsx`, page.tsx, about, contact, inventory, etc. | generateMetadata with getCanonicalUrl(org); title template %s \| dealerName; no socialImageUrl in openGraph |
| Custom domain resolution | `src/proxy.ts`, `src/app/api/org/resolve-domain/route.ts` | proxy rewrites by host → slug; API returns slug for verified hostname |
| Canonical URL | `src/lib/organization.ts` | getCanonicalUrl: primary verified domain or platformDomain/slug |
| primaryColor | `prisma/schema.prisma` (OrganizationBranding) | Field present; no usage in BrandingEditorForm or components |
| socialImageUrl | `src/components/admin/BrandingEditorForm.tsx`, `src/actions/organization.ts` | Stored; not used in dealer generateMetadata openGraph.images |
| Future architecture | `docs/future-architecture.md` | “Dealer Public Storefronts,” subdomain strategy, “full suite of branded pages” |
| Super-admin storefront link | `src/components/super-admin/DealershipQuickActions.tsx` | storefrontUrl = origin + / + slug; “View public storefront”; suspend copy re “public storefront” |

---

**End of audit.** No code changes were made; findings are based on repository inspection and the evidence cited above.
