# Phase 5 Outcome: Persistent Listing Drafting Workspace

## Objective
Implement a data model and UI for saving and editing listing drafts per vehicle and per channel (Facebook, Craigslist, Email), transforming the static generator into a persistent drafting workspace.

## Scope of Changes

### Database Changes
- **New Model**: `VehicleListingDraft` added to `prisma/schema.prisma`.
  - Stores `vehicleId`, `channel` (string), and `content` (text).
  - Unique constraint on `[vehicleId, channel]` ensures one draft per channel per vehicle.
- **Migration**: Applied `20260404153448_add_vehicle_listing_drafts`.

### Server Actions
- **`saveVehicleListingDraftAction`**: Upserts a draft for a vehicle/channel.
- **`getVehicleListingDraftAction`**: Retrieves a draft (used for checking existence/loading).

### Data Access Updates
- **`src/lib/prisma/vehicle-safe-select.ts`**: Updated `buildVehicleInventorySelect` to include `listingDrafts` in the payload. This ensures all admin detail views have access to existing drafts without extra fetches.

### UI/UX Updates
- **`ListingGeneratorModal.tsx` (Drafting Workspace)**:
  - Now acts as a stateful editor.
  - Loads existing drafts on open; falls back to default generation if no draft exists.
  - Added "Save Draft" button for manual persistence.
  - Added "Reset" functionality to revert to the default fact-based template.
  - Auto-saves on "Copy to Clipboard" to ensure the latest version is captured.
- **`ListingCopyPanel.tsx`**:
  - Displays "Saved Draft" status with a green checkmark if a draft exists.
  - Shows "Last updated X ago" timestamp for each channel.
  - Button labels dynamically change to "Edit [Channel] Draft" when one exists.

## Behavior Changes
- **Persistence**: Edits made to listing templates are now saved permanently to the database. Admins can refine a description over multiple sessions.
- **Fact-Based Defaults**: The system still generates high-quality defaults based on the latest vehicle data, but user overrides are preserved.
- **Workflow Integration**: The UI now clearly indicates which channels have been prepared, providing a sense of progress.

## Verification Results
- **Prisma Sync**: Schema, migration, and client generation successful.
- **Typecheck**: All TypeScript errors resolved; nested relation types are correctly inferred.
- **Persistence Loop**: Verified that saving a draft, closing the modal, and reopening it preserves the content. Verified that "Reset" restores the original template.

## Acceptance Criteria Check
- [x] Data model for saved listing drafts implemented.
- [x] One saved listing draft per vehicle per channel supported.
- [x] Listing generator converted to an editable drafting workspace.
- [x] Save and Reset functionality implemented.
- [x] UI indicates existence and staleness (updated timestamp) of drafts.

## Next Steps
Proceed to **Phase 6**: Unify publish validation on the server-side, polish, QA hardening, edge cases, and final documentation.
