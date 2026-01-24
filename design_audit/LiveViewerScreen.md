# Component Audit: LiveViewerScreen

## Purpose
The `LiveViewerScreen` is the viewer-side interface for watching live streams. It connects users to a broadcast, displaying the video feed alongside real-time interactions like chat and follower status.

## Key Components
*   **Video Player:** Uses `expo-video` (`VideoView`) to render the stream.
*   **Overlay:**
    *   **Status:** "LIVE" / "Stream Ended" badges.
    *   **Info:** Stream title, host name, viewer count.
    *   **Chat:** Real-time comment list.
*   **Interactions:** Follow/Unfollow button, Comment input, Share modal.

## Interactions / State
*   **Data Fetching:**
    *   Fetches `live_streams` by `roomId` (joined with `profiles` for streamer info).
    *   Checks initial `isFollowing` status.
*   **Real-time:**
    *   Subscribes to `DELETE` events on `live_streams` to detect when the broadcast ends.
    *   Simulates socket.io connection for chat (in current code).
*   **Video:**
    *   Uses a placeholder URL (`BigBuckBunny.mp4`) for the prototype.
    *   Includes play/pause toggle in the overlay.

## Visual / Design Notes
*   **Immersive:** Dark UI with overlaid controls.
*   **Feedback:** Loading spinners for video buffering.
*   **Error Handling:** Graceful UI for "Stream Ended" or "Not Found".

## Notes
*   Like `LiveStreamingScreen`, the specific video URL logic (`getStreamingUrl`) is currently a placeholder and needs integration with a real streaming provider (HLS/RTMP).
