# Component Audit: LibraryScreen

## Purpose
The `LibraryScreen` serves as the user's personal portfolio. It displays all content created by the user, categorized into Voice Clips, Video Clips, and AI Stories.

## Key Components
*   **Tabs:** `Voice Clips` | `Video Clips` | `AI Stories`.
*   **Lists:**
    *   `VoiceClip`: List item with playback, stats, and delete option.
    *   `VideoClip`: Grid layout of video thumbnails.
*   **Empty States:** CTA buttons to Record/Create when lists are empty.

## Interactions / State
*   **Data Fetching:**
    *   Queries `voice_clips` and `video_clips` filtered by `user_id`.
*   **Audio:** Single-source playback logic similar to other screens.
*   **Deletion:**
    *   Optimistic UI removal.
    *   Deletes from DB and attempts to remove file from Supabase Storage.

## Visual / Design Notes
*   **Grid vs List:** Videos are shown in a 2-column grid (`videoGrid`), while voice clips are a vertical list (`clipsContainer`).
*   **Badges:** Duration and Validation badges overlaying content.

## Notes
*   Standard "My Content" view.
*   Includes "Delete" functionality which is sensitive; guarded by `Alert` confirmation.
