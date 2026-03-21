# Dealer Storefront — Full Extraction (Read-Only)

This document is a **read-only architectural and UX extraction** of the current dealer storefront implementation under `/[dealerSlug]`. It is intended to support rebuilding the storefront as a separate website project that connects to Vehiclix (same data/APIs). **No code was modified.**

---

## 1. Executive Summary

The storefront is a **multi-tenant, slug-based public mini-site** for each dealer (organization). Every public route is under **`/[dealerSlug]`** (e.g. `/lux-evs`, `/lux-evs/inventory`). The same codebase serves all dealers; tenant identity comes from the URL slug and is resolved once in the layout via `getOrganizationBySlug(dealerSlug)`. A **TenantProvider** passes a minimal tenant object (id, name, slug, phone, branding, homepage) to all child components so Navbar, Footer, and homepage sections can render dealer-specific content without prop drilling.

**What the storefront actually is:**
- A **fixed set of pages** (home, showroom, VDP, about, contact, request-vehicle, register, reserve) with a **single shared layout** (Navbar + main + Footer).
- **Content** is dealer-specific (branding, homepage copy, inventory); **structure and UX** are shared (same sections, same layout, same components).
- **Lead entry points:** vehicle inquiry (modal on VDP), vehicle request (form), reservation (deposit flow with Stripe), and customer registration (account creation). There is **no generic “contact form”** that submits to a backend; the Contact page is informational only (phone, email, address, links).
- **Custom domain support** exists in data (OrganizationDomain) and canonical URL generation; routing on custom domains is intended to work via **proxy rewrite** (resolve host → slug, rewrite to `/{slug}{pathname}`). Middleware is not wired in the repo for this; the proxy is a separate entry.
- **SEO:** Every page implements `generateMetadata` with dealer name, canonical URL (custom domain–aware), and OpenGraph where applicable. **primaryColor** and **socialImageUrl** exist in schema/forms but are **not used** on the public site.

---

## 2. Page Map (Routes + Purpose)

| Route | File path | Layout | Purpose |
|-------|-----------|--------|---------|
| `/[dealerSlug]` | `src/app/(marketing)/[dealerSlug]/page.tsx` | Dealer layout | Home page: hero, trust highlights, featured vehicles, testimonial, about teaser, contact CTA. |
| `/[dealerSlug]/inventory` | `src/app/(marketing)/[dealerSlug]/inventory/page.tsx` | Dealer layout | Showroom: list of LISTED vehicles with filters (make, maxPrice, minYear, sort, search). |
| `/[dealerSlug]/inventory/[id]` | `src/app/(marketing)/[dealerSlug]/inventory/[id]/page.tsx` | Dealer layout | Vehicle detail page (VDP): gallery, specs, description, highlights, features, pricing panel (reserve + inquiry). |
| `/[dealerSlug]/inventory/[id]/reserve` | `src/app/(marketing)/[dealerSlug]/inventory/[id]/reserve/page.tsx` | Dealer layout | Reserve: collect contact info, then Stripe deposit; creates Deal + stub User. |
| `/[dealerSlug]/about` | `src/app/(marketing)/[dealerSlug]/about/page.tsx` | Dealer layout | About: mission copy (branding.aboutBlurb or fallback), static value props, home energy teaser. |
| `/[dealerSlug]/contact` | `src/app/(marketing)/[dealerSlug]/contact/page.tsx` | Dealer layout | Contact: display only — phone, email, address, showroom hours, links to request-vehicle and inventory. No form submission. |
| `/[dealerSlug]/request-vehicle` | `src/app/(marketing)/[dealerSlug]/request-vehicle/page.tsx` | Dealer layout | Request vehicle: long form (preferences, budget, timeline, contact); submits to `submitVehicleRequestAction`. |
| `/[dealerSlug]/register` | `src/app/(marketing)/[dealerSlug]/register/page.tsx` | Dealer layout | Customer registration: form with hidden `organizationId` from tenant; submits to `registerAction`. |

**Layout used by all:** `src/app/(marketing)/[dealerSlug]/layout.tsx` (Dealer layout). Root marketing layout is `(marketing)`; no extra wrapper beyond that.

**Confirmed:** There is no separate “contact form” page that creates a lead; contact is display + links only. Reserve exists at `/[dealerSlug]/inventory/[id]/reserve`.

---

## 3. Component Map (Shared vs Page-Specific)

### 3.1 Layout & shared (used across multiple pages)

| Component | Path | Used in | Notes |
|-----------|------|---------|--------|
| **Dealer layout** | `src/app/(marketing)/[dealerSlug]/layout.tsx` | All `/[dealerSlug]/*` | Loads org by slug; if SUSPENDED shows message; else TenantProvider + Navbar + main + Footer. |
| **TenantProvider** | `src/components/providers/TenantProvider.tsx` | Layout | Provides `{ id, name, slug, phone?, branding?, homepage? }`. |
| **Navbar** | `src/components/public/Navbar.tsx` | Layout | Logo (branding.logoUrl or name + icon), nav links (Showroom, Find My EV, About), Login/Admin/Portal, CTA. Uses tenant for links and logo. |
| **Footer** | `src/components/public/Footer.tsx` | Layout | Logo, slogan, Showroom/Company links when tenant; contact (email, phone, address from branding/org). |

### 3.2 Home page only

| Component | Path | Data / behavior |
|-----------|------|------------------|
| **PromoBar** | `src/components/public/PromoBar.tsx` | Renders only if `showPromo && promoText` (from getSafeHomepage). |
| **Hero** | `src/components/public/Hero.tsx` | getSafeHomepage: heroHeadline, heroSubheadline, heroPrimaryCtaLabel/Route, showTrustHighlights + trustHighlights. |
| **TrustHighlights** | `src/components/public/TrustHighlights.tsx` | getSafeHomepage: showTrustHighlights, trustHighlights (icon, title, description). |
| **FeaturedInventory** | `src/components/public/FeaturedInventory.tsx` | getSafeHomepage.showFeaturedInventory; props: `vehicles` (from getFeaturedInventory, serialized). Uses InventoryCard. |
| **Testimonial** | `src/components/public/Testimonial.tsx` | getSafeHomepage: showTestimonial, testimonialQuote, testimonialAuthor. |
| **AboutTeaser** | `src/components/public/AboutTeaser.tsx` | getSafeHomepage: showAboutTeaser, aboutTeaser; links to about + request-vehicle. |
| **ContactCTA** | `src/components/public/ContactCTA.tsx` | getSafeHomepage: showContactCta, contactCtaHeadline, contactCtaBody; tenant branding for phone/email. |

### 3.3 Inventory / showroom

| Component | Path | Used in |
|-----------|------|---------|
| **InventoryFilters** | `src/components/public/InventoryFilters.tsx` | Inventory page. URL query: make, maxPrice, minYear, sort, search. |
| **InventoryGrid** | `src/components/public/InventoryGrid.tsx` | Inventory page. Empty state (no filters) vs no results (with filters) vs grid of InventoryCard. |
| **InventoryCard** | `src/components/public/InventoryCard.tsx` | FeaturedInventory, InventoryGrid. Primary image, year/make/model/trim, price, mileage, range; link to VDP. |

### 3.4 VDP only

| Component | Path | Notes |
|-----------|------|--------|
| **MediaGallery** | `src/components/public/MediaGallery.tsx` | vehicle.media; lightbox; thumbnails. |
| **VehicleSpecChips** | `src/components/public/VehicleSpecChips.tsx` | Compact chips: fuel, body, transmission, doors, drivetrain, battery, trim. |
| **VehicleSpecs** | `src/components/public/VehicleSpecs.tsx` | Full spec grid + optional EV subsection. |
| **VdpContent** | `src/components/public/VdpContent.tsx` | description, highlights, features. |
| **PricingPanel** | `src/components/public/PricingPanel.tsx` | Price, deposit copy, Reserve CTA, “Ask About Vehicle” → InquiryModal. |
| **InquiryModal** | `src/components/public/InquiryModal.tsx` | Modal form; submitInquiryAction(vehicleId + contact + message, etc.). |

### 3.5 Reserve flow

| Component | Path | Notes |
|-----------|------|--------|
| **ReservationClientPage** | `src/components/public/ReservationClientPage.tsx` | Contact form then Stripe; initiateVehicleReservationAction → clientSecret → StripeReservationForm. |
| **StripeReservationForm** | `src/components/public/StripeReservationForm.tsx` | Stripe Elements; completes payment for deposit. |

### 3.6 Other

| Component | Path | Used in |
|-----------|------|---------|
| **VehicleRequestForm** | `src/components/public/VehicleRequestForm.tsx` | Request-vehicle page. |
| **DealerRegisterForm** | `src/components/public/DealerRegisterForm.tsx` | Register page. |

**Unused on storefront:** `EducationSection` (`src/components/public/EducationSection.tsx`) — not referenced by any page.

---

## 4. Data Flow (Per Page)

### 4.1 Data loading pattern

- **Layout:** `getOrganizationBySlug(dealerSlug)` — returns Organization with `branding`, `homepage`, `domains` (verified). Used for notFound, SUSPENDED check, and TenantProvider.
- **Home:** `getOrganizationBySlug`, `getFeaturedInventory(org.id)`, `serializeDecimal(featuredVehicles)`. Homepage sections use `getSafeHomepage(org.homepage, org.branding, org.name)` on the client via tenant.
- **Inventory:** `getOrganizationBySlug`, `getPublicInventory(org.id, filters)`, `getPublicMakes(org.id)`, `serializeDecimal(vehicles)`. Filters from searchParams: make, maxPrice, minYear, sort, search.
- **VDP:** `getOrganizationBySlug`, `getPublicVehicleDetail(org.id, id)`. If no vehicle: custom “No Longer Available” UI. Else: `trackVehicleViewAction(vehicle.id, org.id)`, `serializeDecimal(vehicle)`.
- **Reserve:** `getOrganizationBySlug`, `getPublicVehicleDetail(organization.id, vehicleId)`; then render ReservationClientPage with vehicleId, dealerSlug, organizationId, organizationName.
- **About / Contact / Request-vehicle / Register:** `getOrganizationBySlug` only (and notFound if missing). Register page does not pass params to the form; form uses `useTenant()` for org.

### 4.2 Data sources (files)

| Data | Source |
|------|--------|
| Organization (by slug) | `src/lib/organization.ts`: `getOrganizationBySlug(slug)` — includes branding, homepage, domains (verified). |
| Canonical URL | `src/lib/organization.ts`: `getCanonicalUrl(organization, path?)` — primary verified domain or `https://{platformDomain}/{slug}`. |
| Homepage content | `src/lib/homepage.ts`: `getSafeHomepage(homepage, branding, organizationName)` — merges OrganizationHomepage + OrganizationBranding with defaults. |
| Featured vehicles | `src/lib/inventory.ts`: `getFeaturedInventory(organizationId)` — 3 latest LISTED, with media (take 1), organization snippet, _count.inquiries. |
| Public inventory list | `src/lib/inventory.ts`: `getPublicInventory(organizationId, filters)` — LISTED only; filters: make, maxPrice, minYear, sort, search; media take 1. |
| Public makes | `src/lib/inventory.ts`: `getPublicMakes(organizationId)` — distinct make for LISTED. |
| Public vehicle detail | `src/lib/inventory.ts`: `getPublicVehicleDetail(organizationId, id)` — LISTED only; full media, organization snippet, _count.inquiries. |
| Media URLs | Vehicle media `url` is enriched in inventory lib via `getPublicUrl(m.url)` (`src/lib/storage/index.ts`). |
| Serialization | `src/lib/serializers.ts`: `serializeDecimal(data)` — Decimal → string, Date → string for client components. |

### 4.3 Models used on storefront

| Model | Where used |
|-------|------------|
| **Organization** | Layout, every page; slug, name, id, phone, status; tenant context. |
| **OrganizationBranding** | Layout (tenant), Navbar (logo, name), Footer (logo, contact), Hero/Trust/AboutTeaser/ContactCTA (via getSafeHomepage fallbacks), About (aboutBlurb), Contact (contactPhone, contactEmail, address). |
| **OrganizationHomepage** | Layout (tenant), getSafeHomepage for all homepage sections. |
| **OrganizationDomain** | getCanonicalUrl (verified domains, primary). |
| **Vehicle** | Inventory list, featured list, VDP, reserve; only vehicleStatus = LISTED. |
| **VehicleMedia** | Inventory cards (first image), VDP gallery; url from getPublicUrl. |

**Internal-only (not shown on storefront):** Vehicle.internalNotes, Vehicle.shares (views are tracked but not necessarily displayed in this extraction), Deal/User/VehicleInquiry/VehicleRequest as created by actions.

---

## 5. Branding System (Current + Unused)

### 5.1 Where stored

- **Organization:** name, slug, phone, status.
- **OrganizationBranding:** logoUrl, primaryColor, heroHeadline, heroSubheadline, aboutBlurb, contactEmail, contactPhone, address, socialImageUrl.
- **OrganizationHomepage:** showPromo, promoText; heroHeadline, heroSubheadline, heroPrimaryCtaLabel, heroPrimaryCtaRoute; showTrustHighlights, trustHighlightsJson; showFeaturedInventory; showTestimonial, testimonialQuote, testimonialAuthor; showAboutTeaser, aboutTeaser; showContactCta, contactCtaHeadline, contactCtaBody.

### 5.2 Where edited

- **Branding:** Admin → Settings → Branding — `src/app/(admin)/admin/settings/branding/page.tsx` → `BrandingEditorForm` (`src/components/admin/BrandingEditorForm.tsx`). Action: `updateOrganizationBrandingAction` in `src/actions/organization.ts`.
- **Homepage:** Admin → Settings → Homepage — `src/app/(admin)/admin/settings/homepage/page.tsx` → `HomepageEditorForm`. Action: update organization homepage (same actions/organization or dedicated).
- **Organization name/slug/phone:** Not editable in dealer Settings (set at creation; slug change is support-only per existing audit).

### 5.3 Where rendered (storefront)

| Field | Rendered |
|-------|----------|
| **logoUrl** | Navbar, Footer (when set). |
| **heroHeadline, heroSubheadline** | getSafeHomepage fallback → Hero; metadata (home) description. |
| **aboutBlurb** | getSafeHomepage fallback for aboutTeaser; About page body. |
| **contactEmail, contactPhone, address** | Contact page; Footer “Get in Touch”; ContactCTA (phone/email when set). |
| **socialImageUrl** | **Not rendered** — not used in generateMetadata or OG images. |
| **primaryColor** | **Not rendered** — not in BrandingEditorForm; no component reads it (theme is app default). |

### 5.4 Homepage section toggles and content

From `src/lib/homepage.ts` (HOMEPAGE_DEFAULTS and getSafeHomepage):

- **showPromo** (default false) + **promoText** → PromoBar.
- **heroHeadline, heroSubheadline, heroPrimaryCtaLabel, heroPrimaryCtaRoute** → Hero.
- **showTrustHighlights** (default true) + **trustHighlights** (JSON array: icon, title, description) → TrustHighlights; Hero also shows first 3 if showTrustHighlights.
- **showFeaturedInventory** (default true) → FeaturedInventory (data from getFeaturedInventory).
- **showTestimonial** (default false) + **testimonialQuote, testimonialAuthor** → Testimonial.
- **showAboutTeaser** (default true) + **aboutTeaser** → AboutTeaser.
- **showContactCta** (default true) + **contactCtaHeadline, contactCtaBody** → ContactCTA.

Content is injected from OrganizationHomepage with fallbacks to OrganizationBranding and then to default strings (and organization name where relevant).

---

## 6. Inventory / Showroom Logic

- **Fetch:** `getPublicInventory(org.id, filters)` — only vehicleStatus LISTED; optional filters: make, maxPrice (number), minYear (number), sort, search (make/model/vin insensitive).
- **Sort options:** newest (createdAt desc), price-asc, price-desc, mileage-asc.
- **Makes:** `getPublicMakes(org.id)` for filter dropdown.
- **Vehicle card (InventoryCard):** primary media (first), drivetrain badge, year/make/model/trim, price (formatted), mileage, batteryRangeEstimate; “View Details” → `/{slug}/inventory/{id}`.
- **Media:** Each vehicle in list includes media with take 1, orderBy displayOrder; url from getPublicUrl in lib.

---

## 7. Vehicle Detail Page (VDP)

- **Data:** Full vehicle from `getPublicVehicleDetail(org.id, id)`; serialized for client.
- **Image handling:** MediaGallery: main image + thumbnails; lightbox (Dialog); prev/next; media[].url (already public URL from lib).
- **Specs:** VehicleSpecChips (compact); VehicleSpecs (grid + EV subsection); VdpContent (description, highlights[], features[]).
- **CTAs:** PricingPanel: “Reserve Now” → `/{slug}/inventory/{id}/reserve`; “Ask About Vehicle” opens InquiryModal → submitInquiryAction.
- **Tracking:** `trackVehicleViewAction(vehicle.id, org.id)` (server) after successful load.
- **Not found:** Custom “No Longer Available” block with links to showroom and request-vehicle.

---

## 8. Lead Flow Architecture

| Lead type | Entry point | Handler | Fields collected |
|----------|-------------|--------|-------------------|
| **Vehicle inquiry** | VDP “Ask About Vehicle” → InquiryModal | `submitInquiryAction` (`src/actions/inquiry.ts`) | vehicleId, firstName, lastName, email, phone, preferredContact (EMAIL/PHONE/EITHER), message?, tradeInInterest, financingInterest, honeypot. Creates/finds User (stub), VehicleInquiry; CRM lead; notifies dealer. |
| **Vehicle request** | Request-vehicle page form | `submitVehicleRequestAction` (`src/actions/request.ts`) | organizationId (from tenant), make, model, yearMin, yearMax, trim, mileageMax, colorPrefs, features, budgetMax, timeline, financingInterest, tradeInInterest, notes, firstName, lastName, email, phone. Creates/finds User (stub), VehicleRequest; CRM lead. |
| **Reservation** | VDP “Reserve Now” or direct reserve URL | `initiateVehicleReservationAction` (`src/actions/payment.ts`) then Stripe | vehicleId, organizationId (from route), firstName, lastName, email, phone. Creates/finds User (stub), Deal (DEPOSIT_PENDING), DealDeposit, Stripe PaymentIntent; returns clientSecret + dealId. StripeReservationForm completes payment. |
| **Customer registration** | Register page | `registerAction` (`src/actions/auth.ts`) | organizationId (hidden from tenant), firstName, lastName, email, phone (optional), password. Creates User (CUSTOMER) or links to org. |

**Contact page:** No form; no backend action for “contact.” Only display and links.

---

## 9. Auth / Login Touchpoints

- **Where:** Navbar (desktop and mobile). Links: “Login” → `/login`; “Admin” / “Portal” after login; “Customer Portal” in Footer → `/login`.
- **Route:** Login is **not** under dealerSlug: `src/app/(marketing)/login/page.tsx` (marketing layout). Same for 2FA: `login/verify-2fa`.
- **Dealer context:** Login does not receive dealerSlug in the URL; after login, user is sent to /admin or /portal by role. Storefront remains slug-based; no redirect back to dealer storefront after login is encoded in this extraction.

---

## 10. Metadata / SEO

- **Layout** (`generateMetadata` in `[dealerSlug]/layout.tsx`): title template `%s | {dealerName}`, default title dealerName; description “Official showroom of {dealerName}…”; alternates.canonical = getCanonicalUrl(org); openGraph url + siteName.
- **Home:** title “Home”; description from heroSubheadline or default; canonical; openGraph title (heroHeadline or default), description, url, type website. **No OG image** from branding (socialImageUrl not used).
- **Inventory:** title “Showroom”; description; canonical /inventory; openGraph url.
- **VDP:** title “{year} {make} {model} {trim}”; description from vehicle.description slice or default; canonical /inventory/{id}; openGraph title, description, url, images from vehicle.media[0].url if present.
- **Reserve:** title “Reserve {vehicleName}”; description; canonical /inventory/{id}/reserve.
- **About, Contact, Request-vehicle, Register:** each has title, description, canonical for path, openGraph url.

Canonical and OG url use `getCanonicalUrl(organization, path)` so custom domain is used when a primary verified domain exists.

---

## 11. Custom Domain Support

- **Stored:** OrganizationDomain: organizationId, hostname (unique), isPrimary, status (e.g. VERIFIED), verificationToken, verifiedAt. Fetched with org in getOrganizationBySlug (domains where status = VERIFIED).
- **Canonical URL:** getCanonicalUrl(organization, path) uses primary verified domain or `https://{BRANDING.platformDomain}/{organization.slug}` + path.
- **Routing intent:** `src/proxy.ts` describes custom domain handling: if host is not platform host, call `/api/org/resolve-domain?host=...`; if slug returned, rewrite to `/{slug}{pathname}`. Admin/portal/login redirect to platform. Proxy is separate from Next.js middleware; middleware is not wired in this repo for domain resolution.

---

## 12. UX & Design Patterns

- **Layout:** Fixed Navbar (top), scrollable main, Footer. Max width 7xl, padding px-6 lg:px-8. Main content often pt-24 or pt-32 to clear navbar.
- **Typography:** Uppercase headings, font-black, tracking-tight or tracking-widest; italic for emphasis; primary color for accent word (e.g. first word + rest in primary).
- **Cards:** Rounded-2xl/3xl, border-2, muted/primary/5 backgrounds; CardHeader/CardContent/CardFooter where applicable.
- **Buttons:** Rounded-full common; primary CTA with shadow; outline for secondary; uppercase tracking-widest.
- **Spacing:** space-y-4/6/8/12; gap-4/6/8; sections py-24 or py-32.
- **Animations:** animate-in (fade-in, slide-in-from-*), duration-500; used on VDP and empty states.
- **Consistent:** Same nav links and footer structure across dealers; only content (name, logo, copy, inventory) changes.

---

## 13. Gaps / Unused Features

- **primaryColor:** In OrganizationBranding schema and seed; not in BrandingEditorForm; no component reads it. **Unused.**
- **socialImageUrl:** In schema and BrandingEditorForm; not used in any generateMetadata or openGraph.images. **Unused on storefront.**
- **EducationSection:** Component exists under `src/components/public/EducationSection.tsx`; not imported by any page. **Unused.**
- **Contact form:** No “contact us” form that creates a lead; Contact page is display + links only.
- **Register page:** Does not pass params to DealerRegisterForm; form relies on TenantProvider (layout already loaded org). If opened without tenant (e.g. direct /register without slug), form would not have organizationId — but route is under [dealerSlug] so layout always runs first.
- **Custom domain routing:** Implemented in proxy (resolve-domain API + rewrite); Next.js middleware not wired in repo for same behavior.
- **Footer social links:** Markup has “Social links hidden until real profiles exist” — no Instagram/Twitter/LinkedIn links rendered from branding.

---

## 14. File Reference Summary

| Concern | Files |
|--------|--------|
| Routes | `src/app/(marketing)/[dealerSlug]/layout.tsx`, `page.tsx`, `inventory/page.tsx`, `inventory/[id]/page.tsx`, `inventory/[id]/reserve/page.tsx`, `about/page.tsx`, `contact/page.tsx`, `request-vehicle/page.tsx`, `register/page.tsx` |
| Org + canonical | `src/lib/organization.ts`, `src/lib/domain-shared.ts` |
| Homepage config | `src/lib/homepage.ts` |
| Inventory data | `src/lib/inventory.ts` |
| Serialization | `src/lib/serializers.ts` |
| Storage/URLs | `src/lib/storage/index.ts` |
| Tenant | `src/components/providers/TenantProvider.tsx` |
| Public components | `src/components/public/*` (Navbar, Footer, Hero, PromoBar, TrustHighlights, FeaturedInventory, Testimonial, AboutTeaser, ContactCTA, InventoryFilters, InventoryGrid, InventoryCard, MediaGallery, VehicleSpecChips, VehicleSpecs, PricingPanel, VdpContent, InquiryModal, ReservationClientPage, StripeReservationForm, VehicleRequestForm, DealerRegisterForm; EducationSection unused) |
| Lead actions | `src/actions/inquiry.ts`, `src/actions/request.ts`, `src/actions/payment.ts`, `src/actions/auth.ts` (register) |
| Branding/homepage admin | `src/app/(admin)/admin/settings/branding/page.tsx`, `homepage/page.tsx`; `src/components/admin/BrandingEditorForm.tsx`, HomepageEditorForm; `src/actions/organization.ts` |
| Config | `src/config/branding.ts` |
| Schema | `prisma/schema.prisma` (Organization, OrganizationBranding, OrganizationHomepage, OrganizationDomain, Vehicle, VehicleMedia) |
| Types | `src/types/index.ts`, `src/types/enums.ts` |
| Proxy (domain) | `src/proxy.ts` |

---

**End of extraction.** This document reflects the **current implementation only**; no refactors or proposals are included.
