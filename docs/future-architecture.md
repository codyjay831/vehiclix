# Future Architecture Backlog

This document tracks planned architectural evolutions for the Vehiclix platform. These changes are intended to support long-term scaling and multi-channel capabilities after the pilot phase has validated core dealer workflows.

## TODO: Separation of Vehicle Assets from Public Listings

### Context
Currently, Vehiclix uses a single `Vehicle` model to represent both the physical car and its advertisement on the website showroom. This works for the pilot but will become a bottleneck for multi-channel distribution.

### Future Model Structure

**Vehicle**
- Represents the real-world physical asset.
- Contains immutable or asset-specific data: VIN, technical specs, battery health, purchase history, internal notes.
- Belongs to an `Organization`.

**Listing**
- Represents a public advertisement or "offer" for a vehicle.
- Belongs to an `Organization`.
- References a `Vehicle` (one vehicle may have many listings over time or across platforms).
- Stores marketing-specific data: Public title, description, price, publish state, and platform-specific metadata.

### Example Relationship
```
Organization
  └─ Vehicles (Asset Inventory)
        └─ Listings (Marketing / Distribution)
              ├─ Leads
              └─ Deals
```

### Proposed Model Attributes (Conceptual)

**Listing**
- `id`: UUID
- `vehicleId`: UUID (FK to Vehicle)
- `organizationId`: UUID (FK to Organization)
- `title`: String (Marketing headline)
- `description`: Text (Ad copy)
- `price`: Decimal (Listing price, may differ from vehicle book value)
- `status`: Enum (DRAFT, ACTIVE, SOLD, EXPIRED, ARCHIVED)
- `publishTargets`: String[] (e.g., ["WEBSITE", "FACEBOOK", "MARKETPLACE"])
- `externalIds`: JSON (e.g., { facebookId: "...", craigslistId: "..." })
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Rationale for Separation
1.  **Asset vs. Ad:** A `Vehicle` is what you own; a `Listing` is how you sell it.
2.  **Multi-Channel:** Allows a single vehicle to be published to Facebook, the dealer's website, and social groups with different prices or descriptions optimized for each platform.
3.  **Independence:** Price drops or description changes on a listing should not overwrite the "source of truth" record for the vehicle asset.
4.  **Lifecycle Management:** Listings have their own lifecycles (e.g., a listing might expire after 30 days on Marketplace while the vehicle remains in inventory).

### Implementation Timing
This architectural shift should be implemented during **Phase B – Listing Distribution Engine**. It is a prerequisite for "one-click publishing" to multiple platforms.

**Status:** PENDING (Post-Pilot)

---

## TODO: Dealer Public Storefronts

### Context
Vehiclix currently supports multi-tenant organizations (dealers). In the pilot phase, all dealers operate under the same domain and share the initial Evo Motors marketing site. In the future, every dealer will need their own public-facing web presence.

### Recommended Architecture: Subdomain-Based Routing
To provide a premium and isolated experience for each dealer, the platform should move toward subdomain-based routing instead of path-based routing.

**Domain Strategy:**
- `vehiclix.app` → Platform marketing and corporate site.
- `app.vehiclix.app` → Centralized dealer dashboard (admin).
- `*.vehiclix.app` → Dealer-specific public storefronts.

**Example Mapping:**
- `smithautos.vehiclix.app` → Storefront for Organization where `slug = "smithautos"`.
- `acmemotors.vehiclix.app` → Storefront for Organization where `slug = "acmemotors"`.

### Routing & Resolution Logic
When a request enters the platform, the system should resolve the tenant (Organization) using the following priority order:
1. **Custom Domain:** (e.g., `smithautos.com`) mapped to the organization.
2. **Subdomain:** (e.g., `smithautos.vehiclix.app`) mapped via the `slug`.
3. **Fallback Path:** (If applicable) for legacy or development support.

Once the organization is resolved, all public queries (Inventory, Listings, Inquiries) are strictly scoped to that Organization ID.

### Scope of Dealer Storefronts
Each storefront will contain a full suite of branded pages:
- **Homepage:** Dealer-specific content and featured inventory.
- **Showroom:** Filterable inventory listing page.
- **Vehicle Detail Page (VDP):** Deep-dive specs and media for a specific vehicle.
- **Conversion Flows:** Inquiry forms and reservation/deposit initiation.
- **Tenant Portal:** Branded customer portal login and access.

### Rationale for Subdomains vs. Path Routing
1. **Cleaner Branding:** `dealer.vehiclix.app` feels more professional and owned than `vehiclix.app/dealers/dealer`.
2. **SEO Isolation:** Search engines treat subdomains as more distinct entities, allowing dealers to build their own local SEO authority.
3. **Cache & Security Separation:** Easier to implement tenant-specific caching strategies and security headers at the edge.
4. **Custom Domain Readiness:** Subdomain routing is the natural prerequisite for allowing dealers to point their own domains (CNAME) to the platform.

### Implementation Timing
This change should be implemented during **Phase C – Custom Dealer Storefronts**. This will coincide with the introduction of dynamic runtime branding.

**Status:** PENDING (Post-Pilot)
