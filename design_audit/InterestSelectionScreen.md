# Component Audit: InterestSelectionScreen

## Purpose
The `InterestSelectionScreen` is part of the onboarding flow. It allows users to personalize their experience by selecting interests across categories like Language, Topic, Region, and Content Type.

## Key Components
*   **Grid Layout:** Renders `InterestCard` items in a flex wrap container.
*   **Progress Bar:** Visual indicator of completion based on category coverage.
*   **Interest Data:** Static list of interests with emojis and colors.

## Interactions / State
*   **Selection:** Arrays of strings (`selectedInterests`). Toggles ID on tap.
*   **Persistence:**
    *   Saves to `profiles` table in Supabase via `upsert`.
    *   Sets `has_completed_onboarding: true`.
*   **Navigation:** Replaces stack with `MainTabs` upon completion or skip.

## Visual / Design Notes
*   **Cards:** Square, bordered cards (`#E5E7EB`) that turn colored upon selection.
*   **Visual Feedback:** Checkmark badge appearing on selected items.

## Notes
*   Clean, gamified implementation of preference gathering.
