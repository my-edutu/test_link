# Component Audit: VideoCallScreen

## Purpose
`VideoCallScreen` provides the interface for 1:1 video calls. It handles call status, camera/mic toggles, and translation indicators.

## Key Components
*   **Video Feeds:**
    *   `remoteVideo`: Main view (currently simulated).
    *   `localVideo`: PIP (Picture in Picture) view.
*   **Controls:** Mute, Video Toggle, Speaker, Camera Flip, End Call.
*   **Status:** Connection timer and "Real-time translation" badge.

## Interactions / State
*   **Simulation:** Uses `setTimeout` to simulate connection status (`connecting` -> `connected`).
*   **Toggles:** Local state for `isMuted`, `isVideoOff`, `isSpeakerOn`.
*   **Animation:** Pulse animation for the avatar while connecting.

## Visual / Design Notes
*   **Layout:** Classic video call layout (Full screen remote, small corner local).
*   **Theme:** Dark mode by default (`#000000` background).

## Notes
*   This is a UI shell. Real WebRTC implementation integration (e.g., `react-native-webrtc` or similar) is the next logical step.
