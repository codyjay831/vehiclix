# Phase 4 Outcome: Vehicle Detail Page Overhaul

## Objective
Rework the vehicle detail page hierarchy to reflect the new workflow and separate concerns into Listing Status, Listing Copy, and Share & Distribution.

## Scope of Changes

### New Components
- **`src/components/admin/ListingWorkflowPanel.tsx`**: A dedicated card for managing the vehicle's lifecycle (`Draft -> Unpublished -> Listed -> Sold/Archived`). It includes primary CTAs (e.g., "Publish to Showroom") and status descriptions.
- **`src/components/admin/ListingCopyPanel.tsx`**: A dedicated card for generating channel-specific copy (Facebook, Craigslist, Email) based on vehicle facts.

### Updated Components
- **`src/components/admin/DistributionPanel.tsx`**: Refocused strictly on "Share & Distribution" (Public Link, SMS Share). It now explicitly disables public sharing if the vehicle is not in the `LISTED` state, providing clear feedback to the admin.
- **`src/components/admin/ListingGeneratorModal.tsx`**: Updated titles and labels to use "Template" and "Copy" instead of "Generator" to manage user expectations and remove "direct-post" ambiguity. (Note: This component was further enhanced in Phase 5).

### Page Updates
- **`src/app/(admin)/admin/inventory/[id]/page.tsx`**:
    - Restructured the main content column to lead with the three new workflow sections.
    - Integrated `ListingWorkflowPanel`, `ListingCopyPanel`, and the refactored `DistributionPanel`.
    - Maintained the existing readiness checklist as a high-visibility header for non-published vehicles.
    - Enforced the "Public View" button gating at the top level.

## Behavior Changes
- **Workflow-First UX**: The detail page now guides the user through the logical progression of a vehicle listing.
- **Safe Sharing**: Admins can no longer accidentally share or open the public view for vehicles that are still in `DRAFT` or `UNPUBLISHED` states.
- **Clearer Terminology**: Removed confusing "Post to..." wording in favor of "Template" and "Copy", clarifying that these are manual copy-paste actions.

## Verification Results
- **Typecheck**: `npm run typecheck` passed.
- **Workflow Gating**: Verified that "Publish to Showroom" and "Move to Unpublished" buttons respect readiness rules.
- **Visual Hierarchy**: The page now clearly separates internal workflow (Status), content preparation (Copy), and external sharing (Distribution).

## Acceptance Criteria Check
- [x] Hierarchy reflects workflow: Status -> Copy -> Share.
- [x] Dedicated Listing Status section implemented.
- [x] Dedicated Create Listing Copy section implemented.
- [x] Dedicated Share & Distribution section implemented.
- [x] Public View hidden/disabled when not `LISTED`.
- [x] "Direct-post" wording removed.
- [x] Page remains clean and professional.

## Next Steps
Proceed to **Phase 5**: Create the data model for saved listing drafts and update the listing generator UX into a persistent drafting workspace. (Completed)
