# Component Audit: UserProfileScreen

## Purpose
`UserProfileScreen` displays the public profile of other users. It allows viewing their content, following them, and engaging (validating counts, duets).

## Key Components
*   **Header:**
    *   Dynamic Title: "Profile".
    *   Actions: Message (creates DM) and Follow/Unfollow toggle.
*   **Profile Info:**
    *   Avatar, Name, Username, Bio.
    *   Metadata: Location, Join Date, Language.
    *   Follow Stats: Followers, Following (Mutual count logic included).
    *   Engagement Stats: Validations, Clips, Stories, Duets.
*   **Content Tabs:**
    *   **Clips:** List of `VoiceClip` cards.
    *   **Badges:** Mock badges (Language Pioneer, etc.).
    *   **Rewards:** Placeholder for rewards.

## Interactions / State
*   **Read:** Fetches `profiles` (for user details) and `voice_clips` (content).
*   **Engagement:**
    *   `toggleFollow`: Optimistic update for follow button.
    *   `handleQuickValidation`: Inline validation of clips directly from the list.
*   **Navigation:** Deep links to `ChatDetail` via `create_or_get_dm` RPC call.

## Visual / Design Notes
*   **Verified Badge:** Blue tick for visually confirmed users.
*   **Empty States:** Custom icons/text when no clips exist.

## Notes
*   Very similar to `ProfileScreen` (My Profile) but read-only for certain fields and includes "Follow" logic instead of "Edit".
