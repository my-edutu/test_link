# Component Audit: ProfileScreen

## Purpose
`ProfileScreen` is the central hub for user identity and content management. It allows users to view their stats, manage their profile details, and access their created content.

## Key Components
*   **Header:** Quick stats (Followers, Following, Likes), Avatar with edit badge.
*   **Edit Modes:**
    *   **Avatar:** `expo-image-picker` integration.
    *   **Bio/Location:** Inline editing via Modals/Inputs.
    *   **Language:** Picker for primary language.
*   **Content Tabs:** `My Clips` | `Badges` | `Rewards`.
*   **Lists:** Renders `VoiceClip` cards with action counts (likes, comments, validations).

## Interactions / State
*   **Data Fetching:**
    *   Loads `profiles`, `voice_clips`, and `followers` counts from Supabase.
    *   Handles "Pull to Refresh".
*   **Updates:**
    *   Optimistic updates for bio/location.
    *   Real-time avatar upload to Supabase Storage (`avatars` bucket).
*   **Error Handling:** Retry mechanism for failed data loads.

## Visual / Design Notes
*   **Theme:** Complex dark mode UI with specific color tokens (`#1c1022`, `#ff6d00`).
*   **Feedback:** Loading spinners during profile picture upload.

## Notes
*   This is a "Heavy" component with significant logic for data management and state transitions.
