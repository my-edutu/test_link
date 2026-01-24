# Component Audit: GroupChatScreen

## Purpose
The `GroupChatScreen` manages the chat interface for group conversations. It extends standard chat functionality with group-specific features like member lists, real-time joining/leaving updates, and shared context.

## Key Components
*   **Header:** Custom title view showing Group Avatar, Name, Member count, and Call buttons.
*   **Message List:** Supports Text, Voice, and basic Image types.
*   **Real-time Logic:**
    *   Listens for Message `INSERT`.
    *   Listens for Member `INSERT`/`DELETE` to update counts.
*   **Typing Indicators:** Simulates multi-user typing.

## Interactions / State
*   **Data Fetching:**
    *   `fetchMessages`: Joins `messages` with `profiles`.
    *   `fetchGroupMembers`: Joins `conversation_members` with `profiles`.
*   **Voice:**
    *   Records using `expo-av`.
    *   Uploads to `voice-messages` bucket.
    *   Sends optimistically, then confirms with DB insert.
*   **Optimistic UI:** extensively used for sending messages to make the app feel snappy.

## Visual / Design Notes
*   **Animations:** Typing dots (`Animated.sequence`), Recording pulse.
*   **Colors:** Consistent with `ChatDetailScreen` (Orange/White theme).

## Notes
*   Code structure is very similar to `ChatDetailScreen` but adapted for multiple senders (showing avatars/names for incoming messages).
