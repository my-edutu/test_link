# Component Audit: ChatListScreen

## Purpose
The `ChatListScreen` acts as the hub for all social interactions. It aggregates one-on-one chats, group conversations, contact discovery, and games. It also features a "Stories" rail at the top, similar to Instagram/WhatsApp.

## Key Components
*   **Stories Rail:** Horizontal `FlatList` of user stories. Includes an "Add Story" button.
*   **Tab Navigation:** Internal tabs (`Chats`, `Groups`, `Contacts`, `Games`) to filter the main content view.
*   **List Items:**
    *   `ChatItem`: Avatar, Name, Last Message, Time, Unread Badge, Quick Call actions.
    *   `GameCard`: Large cards for initiating games (`TurnVerse`, `Word Chain`).
*   **Floating Actions / Modals:**
    *   `CreateModal`: Rapid access to create Group, Story, or Go Live.

## Interactions / State
*   **Data Fetching:**
    *   `fetchChats`: Complex logic to merge conversation data with "other participant" details.
    *   `fetchStories`: Loads active public stories, sorts by viewed status and time.
*   **Real-time:**
    *   Listens for new messages to update `lastMessage` preview and re-order list.
    *   Listens for new stories and story views.
*   **Navigation:** Navigates to `ChatDetail`, `GroupChat`, `StoryView`, or `UserProfile`.

## Visual / Design Notes
*   **Header:** Orange background (`#FF8A00`) with white text/icons.
*   **Empty States:** Friendly empty states with calls to action (e.g., "Discover & Join Groups").
*   **Badges:** Unread counts are prominent red circles.

## Complexity
*   **High.** This screen handles a significant amount of data aggregation and logic (sorting, filtering, real-time updates) for multiple domains (chats, stories, groups).
