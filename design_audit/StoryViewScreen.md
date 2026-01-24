# Component Audit: StoryViewScreen

## Purpose
`StoryViewScreen` is a full-screen media viewer for stories. It plays videos or displays images and handles "read receipts".

## Key Components
*   **Media Viewer:**
    *   `VideoView` (expo-video) for `.mp4`/`.mov`.
    *   `Image` for static content.
*   **Header:** Simple overlay with Close button and Author name.

## Interactions / State
*   **Analytics:** Automatically inserts a record into `story_views` when the component mounts/renders.
*   **Detection:** `isVideoUrl` helper determines player vs image.

## Visual / Design Notes
*   **Immersive:** Black background (`#000`) and hidden status bar (implied by design).

## Notes
*   Simple but effective. Does not yet implement "auto-advance" to next story, which is common in story UIs (Instagram/Snapchat).
