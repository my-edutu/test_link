# Component Audit: ModernProfileSetup

## Purpose
`ModernProfileSetup` is a multi-step form for completing a user profile, specifically focused on language selection and avatar customization.

## Key Components
*   **Progress Header:** Shows "Step 2 of 3" (66%).
*   **Language Selector:** Chip grid for selecting multiple languages.
*   **Region Selector:** Dropdown placeholder.
*   **Avatar Picker:** Horizontal scroll of preset avatars + "Add Photo" button.

## Interactions / State
*   **Selection:** Local state for `selectedLangs`.
*   **Submission:**
    *   Updates `profiles` table with `interests` array.
    *   Sets `has_completed_onboarding: true`.
    *   Handles loading state during Supabase write.

## Visual / Design Notes
*   **Theme:** Dark mode (`#1c1022` background), Orange (`#ff6d00`) primary color.
*   **Chips:** Rounded pills that toggle active state styles.

## Notes
*   This appears to be the successor to `InterestSelectionScreen`, aligned with the "Modern" design system.
