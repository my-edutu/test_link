# Component Audit: ContactDiscoveryScreen

## Purpose
The `ContactDiscoveryScreen` enables users to find new people to connect with. It utilizes categories like "Suggested", "Influencers", and "Search" to present potential connections based on language or popularity.

## Key Components
*   **Tabs:** `Suggested`, `Influencers`, `Search`, `Sync`.
*   **User Cards:**
    *   `SuggestedUser`: Standard card with avatar, bio, and connection reason (e.g., "Mutual Friends").
    *   `InfluentialUser`: Highlighted design with "TOP" badge and engagement stats.
*   **Search Interface:** Live search bar filtering local mock data (simulated).
*   **Sync Section:** Cards for syncing contacts, inviting friends, and QR code sharing.

## Interactions / State
*   **Follow Logic:** Local state toggle (`handleFollow`) updating `isFollowing` status and follower counts immediately.
*   **Search:** Filters the mock list based on `searchQuery`.
*   **Sync:** Mocked `Alert` flows for permission requests.

## Visual / Design Notes
*   **Layout:** Clean vertical scroll.
*   **Influencer Card:** Distinct styling with borders and engagement metrics to denote status.
*   **Tags:** Language tags (`#FEF3E2` bg, `#D97706` text) help users find relevant language partners quickly.

## Notes
*   Currently relies heavily on `mockSuggestedUsers` and `mockInfluentialUsers`. Needs backend integration for real recommendations.
