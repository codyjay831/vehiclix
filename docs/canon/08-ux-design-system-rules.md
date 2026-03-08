# 08 - UX and Design System Rules

## 1. UX Overview
The Evo Motors Platform is designed as a high-trust, premium experience that bridges the gap between a high-end digital showroom and an efficient back-office management tool. The UX must reflect the boutique nature of the dealership: small-scale, curated, and highly professional.

## 2. Dual Experience Model (Customer vs Owner)
The system supports two distinct visual and functional modes that must remain separated in their design intent.

*   **Customer-Facing (Showroom Mode):** An editorial, media-first experience designed to build trust and guide the customer through a high-value purchase. It prioritizes emotional resonance, clarity, and calm.
*   **Owner-Facing (Back-Office Mode):** A task-oriented, operational interface designed for speed and clarity. It prioritizes data density, status management, and efficient workflows.

## 3. Customer-Facing Design Rules
Customer pages must avoid "SaaS dashboard" aesthetics.
*   **Media Priority:** Large, high-resolution imagery and video walkthroughs are the primary content.
*   **Visual Clarity:** Minimal UI clutter. Avoid multiple borders, shadows, and complex card nesting.
*   **Guided CTAs:** One primary action per screen (e.g., "Start Purchase", "Upload Document"). Secondary actions should be clearly de-emphasized.
*   **Trust Reinforcement:** Clear pricing, verified vehicle specs, and transparent status indicators.

## 4. Owner/Admin Design Rules
The admin interface is built for the solo operator to manage the business efficiently.
*   **Data Density:** Use tables and compact lists to review multiple inventory items or deals at once.
*   **Actionable States:** Clear status badges (e.g., `Documents Pending`, `Sourcing`) with direct paths to the next logical action.
*   **Efficiency:** Use dialogs and sheets for quick edits rather than full-page navigations where appropriate.

## 5. shadcn/ui Usage Rules
shadcn/ui provides the technical foundation but must not define the visual brand for the customer.
*   **Customer Side:** Customizing components is mandatory. Use `Dialog`, `Sheet`, and `Button` but apply custom typography, padding, and border-radius to match the premium "Showroom" aesthetic. Avoid `Table` components on customer pages.
*   **Admin Side:** Use shadcn components closer to their defaults for speed and familiarity. `Table`, `DropdownMenu`, and `Tabs` are appropriate here.
*   **Common Components:** `Toast`, `Dialog`, and `Input` are used in both modes but styled differently to maintain the mode's specific density and tone.

## 6. Typography Rules
Typography is a key differentiator between a "tool" and an "experience."
*   **Customer Side:** 
    *   Large, confident hero headings (H1).
    *   Generous line-height for readability.
    *   Restrained use of bold weights to maintain a clean, modern feel.
*   **Owner Side:** 
    *   Prioritize vertical hierarchy and scanability.
    *   Smaller type scale to support higher data density.

## 7. Layout and Spacing Rules
*   **Customer Layouts:**
    *   Vertical spacing is generous (large `py` values).
    *   Wide content containers (up to `max-w-7xl` or full-width media).
    *   Single-column focus for mobile purchase steps.
*   **Admin Layouts:**
    *   Compact margins and padding.
    *   Clear header/sidebar navigation.
    *   Dashboard-style grids for overview screens.

## 8. Vehicle Detail Page (VDP) Rules
The VDP is the most critical page in the customer journey.
*   **Hero Section:** Full-width or large-scale media gallery with a sticky "Purchase Summary" card on desktop.
*   **Video Placement:** Walkthrough videos must be prominent, ideally integrated directly into the media gallery or a dedicated "Walkthrough" section.
*   **EV Specs:** Use clean, icon-supported blocks for Range, Battery Health, and Drivetrain.
*   **Pricing:** Bold, transparent pricing with no hidden fee disclaimers.
*   **CTA Placement:** "Start Purchase" (or "Reserve Now") must be the most prominent visual element in the sticky action bar or sidebar.
*   **Energy Mention:** Subtle, non-intrusive mention of Baytech charger/solar options toward the bottom of the specs or in a separate "Ownership Experience" section.

## 9. Inventory Browsing Rules
The inventory is small and curated.
*   **Card Design:** Large images, minimal text on the card. Focus on Model, Year, Price, and Range.
*   **Filter UX:** Simple, relevant filters (e.g., Make, Price Range, Drivetrain). No giant sidebar filter sets.
*   **Empty State:** If inventory is zero, the page should gracefully pivot to the "Request a Vehicle" flow.

## 10. Purchase Flow UX Rules
Purchasing a car is complex; the software must make it feel simple.
*   **Progressive Disclosure:** Do not show the ID upload form until the deposit is confirmed.
*   **Step Indicators:** Clear visual progress (e.g., 1. Reserve, 2. Documents, 3. Contract).
*   **Status Clarity:** If a step is pending owner review, clearly state "We are reviewing your documents" rather than showing an error or empty state.

## 11. Energy Add-On Presentation Rules
Baytech services are supportive, not distracting.
*   **Optionality:** Use "Interested in an EV charger?" checkboxes or simple cards.
*   **Lightweight Flow:** Clicking interest should only trigger a address verification or a simple "Thank you, Baytech will reach out" message.
*   **Zero Interference:** The user must be able to complete their car purchase without interacting with the energy section.

## 12. Motion and Interaction Rules
*   **Calmness:** Use subtle fades and transforms. Avoid bouncy or fast animations.
*   **Polish:** Lightweight hover states on buttons and media items.
*   **Purpose:** Motion should only be used to guide the eye or confirm an action (e.g., a subtle slide when a new step appears).

## 13. Explicit Anti-Patterns
*   **No SaaS Dashboards for Customers:** Do not use sidebar navigation or multi-pane grids for the customer's purchase portal.
*   **No Dense Tables for Public View:** Never show vehicle lists in a data table format to customers.
*   **No Generic Components:** Do not use unstyled shadcn/ui buttons or inputs in the showroom.
*   **No Over-surfacing Tech:** Avoid showing "UUIDs," raw error codes, or internal database IDs to customers.
*   **No Clutter:** Do not overload the VDP with too many "Similar Vehicles" or "Add-on Packages" that distract from the primary purchase.
*   **No Market-Style Search:** For an inventory of <20 cars, a complex search bar with multi-select facets is an anti-pattern; simple filters are sufficient.
