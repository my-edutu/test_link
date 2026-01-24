# Component Audit: ChatDetailScreen

## Purpose
The `ChatDetailScreen` is the core messaging interface. It supports text, voice, and media messages, along with real-time translation features. It manages the connection to a specific conversation, handles message history, and provides real-time updates.

## Key Components
*   **Header:** Custom implementation via `navigation.setOptions`. Shows avatar, online status, and call buttons (Audio/Video).
*   **Message List:**
    *   `ScrollView` with auto-scroll to bottom.
    *   `MessageBubble`: Differentiates between "me" (Right/Orange) and "them" (Left/Gray).
    *   `VoiceMessage`: Custom player with waveform, play/pause, and duration.
    *   `Translation`: Optional toggleable translated text below original message.
*   **Input Area:** (Not fully visible in viewed code, but implied) Text input and attachment/voice buttons.
*   **Typing Indicator:** Animated dots showing when the other user is typing.

## Interactions / State
*   **Data Fetching:** Loads initial messages from Supabase `messages` table.
*   **Real-time:**
    *   Subscribes to `messages` for new insertions.
    *   Subscribes to `users_presence` for online status.
    *   Subscribes to `typing` channel for typing indicators.
*   **Voice Recording:**
    *   Uses `expo-av` for recording and playback.
    *   Visual feedback during recording (pulsing dot, timer).
    *   Uploads to Supabase Storage (`voice-messages` bucket).
*   **Optimistic UI:** Adds temporary messages (`temp_...`) locally before confirmation from server.

## Visual / Design Notes
*   **Styling:** Clean, modern chat UI.
*   **Colors:** Orange (`#FF8A00`) is the primary accent for user's messages and active elements.
*   **Feedback:** "Reading" receipts logic (marking conversation as read).

## Improvements / To-Do
*   **Input Handling:** Ensure `KeyboardAvoidingView` works smoothly across platforms.
*   **Media:** Fully implement image/video sending (current implementation focuses on Voice/Text).
*   **Pagination:** Implement infinite scroll for older messages (currently loads all).
