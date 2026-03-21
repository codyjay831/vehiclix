# Vehiclix × External Dealership Website — Production Integration Guide

This guide describes how a **separate** dealership site (for example **Evo Motors** on its own domain) connects to **Vehiclix** using the live **Website Integration API v1** surface in this codebase. It is the intended standard for onboarding future dealer frontends.

**Base path (this deployment):** all public v1 routes are mounted under **`/api/v1/public/…`** (e.g. `https://vehiclix.app/api/v1/public/catalog`).

---

## 1. Overview (Simple Explanation)

**What Vehiclix does**  
Vehiclix is the **backend engine**: it stores inventory, enforces dealer (tenant) boundaries, serves a **public catalog API**, and owns **lead capture**, **inquiries**, **vehicle requests**, and **reservation / deposit** flows through server-side pipelines (validation, CRM, payments where applicable).

**What the external website does**  
The dealer website is a **presentation shell only**: pages, branding, forms, and client-side UX. It must **not** talk to the database, duplicate pricing/inventory rules, or embed secret keys.

**How they connect**  
- **Reads:** the site’s server or build step calls Vehiclix **GET** endpoints (catalog, dealer profile, vehicle detail).  
- **Writes:** the **browser never posts directly to Vehiclix** for lead-style operations. The site implements a **same-origin API route** (proxy) that forwards JSON to Vehiclix and returns a normalized response.

**Why they stay separate**  
Security (no exposed secrets), **CORS** control, stable **contract** (API versioning), and **multi-tenant** correctness: dealer identity is resolved on Vehiclix from **host + optional `dealerSlug`**, not from untrusted fields in the body.

---

## 2. Architecture Diagram (Text-Based)

### Inventory (read)

```text
Browser → Dealer website (SSR/ISR or server fetch)
       → HTTPS GET → Vehiclix GET /api/v1/public/catalog?dealerSlug=…
                    → Vehiclix GET /api/v1/public/catalog/[slugOrId]?dealerSlug=…
                    → Vehiclix GET /api/v1/public/dealers?dealerSlug=…
       → Database (inside Vehiclix only)
       → JSON DTOs back to the website → HTML/JSON to browser
```

*Note:* Reads can be done **server-to-server** (no CORS) or from the browser **if** Vehiclix CORS policy allows your origin. Many teams still proxy catalog through their site for a single origin and caching; the **non-negotiable** pattern below is for **writes**.

### Lead submission (write)

```text
Browser → POST same-origin /api/leads (or /api/reservations) on dealer site
       → Dealer Next.js route handler (proxy)
       → HTTPS POST → Vehiclix POST /api/v1/public/leads?dealerSlug=…
                     or POST /api/v1/public/reservations?dealerSlug=…
       → Core actions (inquiry / vehicle request / reservation pipeline)
       → Database (inside Vehiclix only)
       → JSON response → proxy normalizes → browser
```

---

## 3. Environment Setup

Use **public** env vars on the **dealer website** project (values differ per environment).

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_VEHICLIX_API_URL` | Absolute base URL of the Vehiclix deployment **including** `/api/v1/public` **or** the deployment root—pick one convention and stick to it. Example: `https://vehiclix.app/api/v1/public` so paths become `${BASE}/catalog`. |
| `NEXT_PUBLIC_DEALER_SLUG` | Stable tenant key (e.g. `evo-motors`). Must match the organization `slug` in Vehiclix. |

### Local development

- Run Vehiclix locally (e.g. `http://localhost:3000`).  
- Run the dealer site on a **different port** (e.g. `http://localhost:3001`) so cookies, dev servers, and hot reload do not collide.  
- Set:

```env
NEXT_PUBLIC_VEHICLIX_API_URL=http://localhost:3000/api/v1/public
NEXT_PUBLIC_DEALER_SLUG=evo-motors
```

Because `localhost` is treated as a **platform host** in Vehiclix’s resolver, **custom domain resolution does not apply**; use **`dealerSlug` as a query parameter** on every public API call (see §7).

### Production

- Point `NEXT_PUBLIC_VEHICLIX_API_URL` at the production Vehiclix URL.  
- Set `NEXT_PUBLIC_DEALER_SLUG` to the dealer’s production slug.  
- If the site is served on a **verified custom domain** mapped in Vehiclix, you may omit `dealerSlug` on reads/writes **only when** the Host header on the request Vehiclix sees matches that domain (typically the proxy forwards the original host or you use server-side fetch from the dealer origin). When in doubt, **always append `?dealerSlug=…`**—it is the approved fallback.

### Port separation (example)

| App | Port | Role |
|-----|------|------|
| Vehiclix | 3000 | API + admin + platform |
| Evo Motors site | 3001 | Dealer marketing / inventory UI |

---

## 4. Inventory Integration (READ)

### Endpoints (implemented)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/public/catalog` | Listed inventory; returns `{ items: PublicVehicleCardDto[] }` |
| GET | `/api/v1/public/catalog/[vehicleId]` | Vehicle detail (path segment is **slug preferred**, UUID allowed) |
| GET | `/api/v1/public/dealers` | Dealer branding / homepage public DTO |

### Query parameters (catalog list)

Supported on the catalog list route include: `make`, `maxPrice`, `minYear`, `sort`, `search`, plus **`dealerSlug`** for tenant resolution when needed.

### How the website should fetch

Prefer **server-side** fetch (RSC, route handler, or edge) so secrets stay server-only and you avoid CORS. Pattern:

```ts
const base = process.env.NEXT_PUBLIC_VEHICLIX_API_URL!.replace(/\/$/, "");
const slug = process.env.NEXT_PUBLIC_DEALER_SLUG!;
const url = `${base}/catalog?dealerSlug=${encodeURIComponent(slug)}`;

const res = await fetch(url, { next: { revalidate: 60 } });
if (!res.ok) throw new Error(`Catalog ${res.status}`);
const { items } = (await res.json()) as { items: unknown[] };
```

### Adapter / mapping layer

Vehiclix returns **stable DTO field names** (e.g. list cards use `heroImage`, `price` as string, `slug`, `mileage`). Your theme may expect `image`, `primaryPhoto`, `listPrice`, etc. **Map in one module** (adapter) so UI components stay dumb.

Example mapping:

```ts
type CatalogCard = {
  slug: string | null;
  title: string;
  priceLabel: string;
  imageUrl: string | null;
};

function toThemeCard(v: {
  slug: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  price: string;
  heroImage: string | null;
}): CatalogCard {
  return {
    slug: v.slug,
    title: [v.year, v.make, v.model, v.trim].filter(Boolean).join(" "),
    priceLabel: v.price,
    imageUrl: v.heroImage,
  };
}
```

### Common pitfalls

| Issue | Mitigation |
|-------|------------|
| **Images** | List DTO uses **`heroImage`**; detail DTO adds **`images[]`**. Do not assume `photo` / `thumbnail` exist on the API. |
| **Pagination** | Current list endpoint returns a single `items` array; filter via query params. If the array grows large, add server-side caching or incremental loading strategies on your side. |
| **Field mismatch** | `price` is a **string** in the public DTO; parse safely if you need numbers for sorting client-side. |
| **Wrong tenant** | Missing or wrong `dealerSlug` on platform hosts → 404 dealer / empty catalog. |

---

## 5. Lead Integration (WRITE) — Most Important

### Why a proxy route is required

1. **CORS:** Browsers block many cross-origin POSTs to APIs that do not send permissive CORS headers. A **same-origin** `/api/leads` avoids that class of failure entirely.  
2. **Hide the API base URL:** You can change Vehiclix URL or path per environment **only in server env**, not in every client bundle.  
3. **Standardize payloads:** One place to add logging, honeypot checks, captcha, field renaming, and consistent error JSON for the UI.

### Step 1 — Create a local API route (proxy)

Example: `app/api/leads/route.ts` on the **dealer** site.

- Accept `POST` from your forms (same origin).  
- Read JSON body.  
- **Server-side** `fetch` to Vehiclix:

`POST ${NEXT_PUBLIC_VEHICLIX_API_URL}/leads?dealerSlug=${slug}`

- Forward relevant headers if needed (`Content-Type: application/json`).  
- Return a **normalized** shape, e.g. `{ ok: true }` or `{ ok: false, message }` mapped from Vehiclix `4xx/5xx`.

```ts
import { NextResponse } from "next/server";

const base = process.env.NEXT_PUBLIC_VEHICLIX_API_URL!.replace(/\/$/, "");
const slug = process.env.NEXT_PUBLIC_DEALER_SLUG!;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const res = await fetch(`${base}/leads?dealerSlug=${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, status: res.status, vehiclix: data },
      { status: res.status >= 500 ? 502 : res.status }
    );
  }

  return NextResponse.json({ ok: true, vehiclix: data }, { status: 201 });
}
```

### Step 2 — Frontend calls **only** the local route

```ts
await fetch("/api/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

### Step 3 — Payload structure (API v1 truth)

`POST /api/v1/public/leads` accepts a **discriminated union** on `type`. Implemented types:

#### `inquiry` (vehicle-specific)

Use on VDP / “Ask about this car” forms. **Requires** `vehicleSlug` **or** `vehicleId` (UUID).

```json
{
  "type": "inquiry",
  "vehicleSlug": "2024-tesla-model-3-abc",
  "firstName": "Jordan",
  "lastName": "Lee",
  "email": "jordan@example.com",
  "phone": "5551234567",
  "preferredContact": "EMAIL",
  "message": "Can I see it Saturday?",
  "tradeInInterest": false,
  "financingInterest": true,
  "honeypot": ""
}
```

`preferredContact`: `"EMAIL" | "PHONE" | "EITHER"`.  
`phone`: minimum length **10** (digits as entered).  
Optional `honeypot` field for bot mitigation.

#### `vehicle_request` (“find / order this type of vehicle”)

Use for “We’ll source a car for you” flows. **Requires** `make`, `model`, **`budgetMax` (minimum 5000)**, and contact fields.

```json
{
  "type": "vehicle_request",
  "make": "Tesla",
  "model": "Model Y",
  "yearMin": 2022,
  "yearMax": 2024,
  "trim": "Long Range",
  "mileageMax": 35000,
  "colorPrefs": "White or silver",
  "features": "Tow hitch",
  "budgetMax": 45000,
  "timeline": "Within 30 days",
  "financingInterest": true,
  "tradeInInterest": false,
  "notes": "Also interested in used inventory",
  "firstName": "Jordan",
  "lastName": "Lee",
  "email": "jordan@example.com",
  "phone": "5551234567"
}
```

Numeric fields must be **valid numbers or omitted**—see §6.

#### “Contact” in product language

There is **no** separate `type: "contact"` in v1. In practice:

- **General dealership contact** tied to a specific listing → use **`inquiry`** with that vehicle’s `vehicleSlug`.  
- **General “contact us / help me find a car”** → use **`vehicle_request`** with realistic `make` / `model` and use **`notes`** for free text.

#### `reservation` (deposit flow)

Reservations are **not** submitted through `/leads`. They use:

`POST /api/v1/public/reservations`

Same vehicle reference rules (`vehicleSlug` or `vehicleId`). Success response includes Stripe-related fields such as **`clientSecret`** and **`dealId`** for client-side payment confirmation—proxy this route separately (e.g. `app/api/reservations/route.ts`) and never expose server secrets to the browser.

---

## 6. Data Sanitization Rules (Important)

Vehiclix validates bodies with **strict schemas**. Common failure mode: empty HTML number inputs become `""` or `NaN` in JSON, or optional fields are sent as `null` in ways that break coercion.

**Rules:**

- **Never send `NaN`.**  
- **Never send empty strings for numeric fields.**  
- For optional numbers, send either a **valid number** or **omit the key** entirely.

Helper:

```ts
export function toNumberOrUndefined(
  value: unknown
): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}
```

Example when building `vehicle_request` from a form:

```ts
const payload = {
  type: "vehicle_request" as const,
  make: form.make.trim(),
  model: form.model.trim(),
  budgetMax: toNumberOrUndefined(form.budgetMax) ?? 5000,
  yearMin: toNumberOrUndefined(form.yearMin),
  yearMax: toNumberOrUndefined(form.yearMax),
  mileageMax: toNumberOrUndefined(form.mileageMax),
  // omit keys when undefined — do not set yearMin: undefined in JSON if your serializer drops them; that's fine
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  email: form.email.trim(),
  phone: form.phone.replace(/\D/g, "").slice(0, 15),
};
```

**Why it matters:** Zod `z.coerce.number()` may reject empty strings; invalid values surface as **400** with validation messages—sanitizing at the edge avoids noisy failures and support tickets.

---

## 7. Dealer Resolution

Vehiclix resolves the tenant **at the request boundary** (`resolveDealerFromRequest`):

1. **Host / domain first:** If the `Host` is **not** a platform host, Vehiclix looks up a **verified** `OrganizationDomain` for that hostname and loads the organization by slug.  
2. **Fallback:** Query parameter **`dealerSlug`** (validated, normalized). Used when the request hits the platform domain, localhost, or when no verified domain matches.

**`NEXT_PUBLIC_DEALER_SLUG`:** Use this in the dealer site to append `?dealerSlug=evo-motors` to every proxied request in dev and whenever domain routing is ambiguous.

**Multi-tenant:** The API **never** trusts a client-supplied `organizationId` in the body for public writes; org is always derived from resolution above.

---

## 8. Common Errors + Fixes

| Symptom | Cause | Fix |
|---------|--------|-----|
| **CORS error** in browser | Client POST directly to Vehiclix | Use same-origin **proxy** (`/api/leads`, `/api/reservations`) |
| **404 on OPTIONS** (“preflight”) | Wrong path / typo / server not handling OPTIONS on your proxy | Ensure your Next route implements `POST`; preflight hits your app first |
| **404 dealer not found** | Wrong slug or domain not verified | Fix `dealerSlug`; complete domain verification in Vehiclix admin |
| **400 validation / “Invalid input” / NaN** | Empty strings or NaN in numeric fields | `toNumberOrUndefined` + omit keys; ensure `budgetMax` ≥ **5000** for `vehicle_request` |
| **404 vehicle** | Wrong slug or not LISTED | Use `slug` from catalog DTO; do not guess IDs |
| **Images not showing** | Mapping expects wrong fields | Map `heroImage` / `images` from DTOs; allow Next/Image `remotePatterns` for Vehiclix media hosts if optimizing images |

---

## 9. Validation Checklist (Smoke Test)

1. **Inventory:** `GET …/catalog?dealerSlug=…` returns `items` with expected count and `heroImage` URLs load in the browser.  
2. **Dealer:** `GET …/dealers?dealerSlug=…` returns name, slug, branding aligned with Vehiclix admin.  
3. **Contact / inquiry:** From a VDP, submit **`inquiry`** via local proxy; response **201** with `{ success: true }` from Vehiclix.  
4. **Vehicle request:** Submit **`vehicle_request`** with valid `budgetMax`; **201** and record visible in Vehiclix admin pipeline.  
5. **Reservation (if enabled):** Proxy to `POST …/reservations`; confirm **201** and payment client secret only handled on client as intended.  
6. **Browser network tab:** No direct cross-origin POSTs to Vehiclix from the form origin (only to your `/api/...`).  
7. **Logs:** No validation errors from NaN / empty numeric fields on submit.

---

## 10. Reusable Pattern (Any Website)

The pattern is **not** Next-specific:

- **Read:** any runtime that can `GET` HTTPS can consume the catalog and dealer endpoints.  
- **Write:** any stack that can implement a **server-side POST** (Next route, Cloudflare Worker, Laravel, Rails controller, Supabase Edge Function, etc.) can proxy to Vehiclix.

Core rule:

> **Any site can plug into Vehiclix as long as it can call HTTP endpoints and keep secrets on the server.**

Shopify / Webflow / plain React SPAs still need a **small server bridge** for writes (platform webhook, automation, or hosted function)—the **browser-only** rule applies: **no direct lead POST from browser to Vehiclix** in production unless you explicitly operate a CORS-approved integration (the proxy remains the default standard).

---

## 11. Final Summary

- **Vehiclix** is the **engine**: inventory, tenant boundaries, leads, reservations, and admin truth.  
- The **dealer website** is the **UI layer**: fetch, map, display, collect input.  
- The **proxy** is the **bridge**: same-origin writes, stable errors, room for bot protection.  
- The **API** is the **contract**: `/api/v1/public/catalog`, `/dealers`, `/leads`, `/reservations` with DTOs and validation as implemented.  
- This model **scales to many clients**: each site gets env vars + adapter + thin routes; core stays one place.

For deeper API rules and future constraints, see **`docs/canon/VEHICLIX_WEBSITE_INTEGRATION_API_V1_CANON.md`** in this repository.
