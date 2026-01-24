# Component Audit: InvitesScreen

## Purpose
The `InvitesScreen` manages the user's referral program participation. It displays their unique referral code and a list of users who have joined using that code.

## Key Components
*   **Summary Cards:** Two top cards showing "Your code" and "Total invited".
*   **Invitee List:** Simple `FlatList` showing Avatar, Name, and Joined Date.
*   **Empty State:** Encouraging message if no referrals yet.

## Interactions / State
*   **Data Fetching:**
    *   Fetches `referral_codes` for the current user.
    *   Fetches `referrals` linked to that code.
    *   Fetches `profiles` for the referred user IDs to display names/avatars.
*   **Refresh:** Drag-to-refresh support.

## Visual / Design Notes
*   **Layout:** Standard list view.
*   **Simplicity:** Very focused UI, no complex interactions.

## Notes
*   Good use of relational data fetching (manually joining `referrals` -> `profiles`).
