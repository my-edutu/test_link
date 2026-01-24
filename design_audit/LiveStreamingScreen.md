# Component Audit: LiveStreamingScreen

## Purpose
The `LiveStreamingScreen` is the broadcaster interface. It allows users to stream video, interact with chat, and receive virtual gifts.

## Key Components
*   **Camera:** Uses `expo-camera` (`CameraView`) for full-screen video capture.
*   **Overlay:**
    *   **Header:** Live status, Viewer count (`Animated`), Duration.
    *   **Chat:** Scrollable list of comments overlaying the bottom video area.
    *   **Controls:** Mute, Camera Flip, Gift, Effects (placeholder).
*   **Modals:** `SettingsModal` for title/language, `GiftsPanel` for sending (viewer side simulation).

## Interactions / State
*   **Broadcasting:**
    *   Creates record in `live_streams` table.
    *   Generates a `stream_key`.
    *   *Note:* Real video streaming (RTMP/WebRTC) ingestion isn't fully implemented in the frontend code shown; it relies on the `CameraView`.
*   **Socket.IO:** Used for chat and viewer count updates (connects to `ws://localhost:3001`).
*   **Animations:** Floating hearts (Gifts), pulsing Live badge, expanding viewer count.

## Visual / Design Notes
*   **Immersive:** Full-screen UI with semi-transparent overlays (`rgba(0,0,0,0.7)`).
*   **Chat:** Messages appear at the bottom-left, similar to Instagram/TikTok Live.

## Notes
*   **Crucial:** The actual *streaming* capability (sending video to a server) is not visible in this file. It sets up the UI and the metadata record, but `expo-camera` is just a preview. Integration with a streaming library (like `react-native-live-stream` or similar) would be the next step for real functionality.
