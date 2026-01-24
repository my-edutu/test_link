# Component Audit: GroupCallScreen

## Purpose
The `GroupCallScreen` facilitates multi-user audio/video calls. Currently, it appears to be a **simulated UI** rather than a full WebRTC implementation, designed to demonstrate the layout and interaction patterns.

## Key Components
*   **Grid Layout:** Scrollable grid of participants.
    *   `ParticipantContainer`: Handles Video/VideoOff states, Mute status, and Name overlays.
    *   `YourVideo`: Highlighted with an orange border.
*   **Status Header:** Shows group name, call duration, and participant count.
*   **Controls:** Bottom bar with standard call actions (Mute, Video, Speaker, Camera Flip, End Call).

## Interactions / State
*   **Simulation:**
    *   `setTimeout` simulates connection delay.
    *   `activeParticipants` is a local state array with mock data.
    *   `callDuration` ticks up every second.
*   **Toggles:** Local state for Mute, Video, Speaker.

## Visual / Design Notes
*   **Theme:** Dark mode (`#000000`/`#1F2937`) for immersive calling experience.
*   **Feedback:** Visual indicators for "Muted" (Red mic icon) and "Translation Active" (Green banner).

## Notes
*   **Action Required:** Needs integration with a real Video SDK (e.g., Agora, Twilio, or WebRTC via Supabase Realtime). Use of "Video Feed" text placeholders confirms this is a UI prototype.
