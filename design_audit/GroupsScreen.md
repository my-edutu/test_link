# Component Audit: GroupsScreen

## Purpose
The `GroupsScreen` allows users to discover, join, and manage communities. It categorizes groups by learning focus (e.g., "Grammar Help", "Cultural Exchange") and provides search functionality.

## Key Components
*   **Filters:**
    *   Categories: Horizontal scroll of pills (Language Learning, Cultural Exchange, etc.).
    *   Tabs: `Discover`, `My Groups`, `Created`.
*   **Search**: Local filtering of fetched groups.
*   **Group List Item:**
    *   Shows: Avatar, Private Lock icon, Name, Activity time, Description, Member count, Language.
    *   Action: Smart `Join` / `Leave` button.
*   **Create Modal:** Triggered via header button.

## Interactions / State
*   **Data Fetching:**
    *   `fetchGroups`: Gets all public groups + member counts.
    *   `fetchMyGroups`: Gets groups user is a member of.
*   **Real-time:**
    *   Watches `conversations` (new groups).
    *   Watches `conversation_members` (member count updates).
*   **Logic:**
    *   Merges "Is Joined" status into the main discovery list.
    *   Optimistic updates for Join/Leave actions.

## Visual / Design Notes
*   **Layout:** Clean list with distinct sections for header (orange) and content (gray background).
*   **Empty States:** Specific messaging for each tab (Discover vs My Groups).

## Notes
*   Good separation of concerns.
*   Uses `conversation_members` table as the pivot for membership.
