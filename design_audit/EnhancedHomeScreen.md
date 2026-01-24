# Component Audit: EnhancedHomeScreen

## Purpose
The `EnhancedHomeScreen` is the main landing feed of the application. It mimics a social media feed (TikTok/Instagram style) focusing on language learning content. It aggregates Voice Clips, Video Clips, Live Streams, and stories into a unified vertical list.

## Key Components
*   **Tabs:** `Following` | `Discover` | `Trending` | `Live`.
*   **Live Stream Rail:** Horizontal list of active streams (fetched from `live_streams` table).
*   **Post Feed:**
    *   Unified list of `VoiceClip` and `VideoClip` items.
    *   Each post shows: User info, Content (Audiowave/Video), Engagement stats (Likes, Comments, Shares, Validations).
    *   **Interactive Elements:** Play/Pause audio, Expand video, Like, Validate (unique to this app - rating pronunciation), Repost.
*   **Modals:** `PostOptionsModal` (for sharing/reporting), `VideoPlayerModal`.

## Interactions / State
*   **Data Fetching:**
    *   `fetchRealContent`: complex query joining `voice_clips`, `video_clips` and `profiles`.
    *   `fetchLiveStreams`: gets active streams.
*   **Real-time:**
    *   Subscribes to `notifications` for badge count (custom hook).
    *   Subscribes to `likes`, `voice_clips` (duets), and `validations` for live engagement updates.
*   **Audio/Video:**
    *   Uses `useAudioPlayback` hook for managing single-source-of-truth audio.
    *   Handles video playback in a dedicated modal.
*   **Optimistic UI:** Used for Liking and Validating to ensure instant feedback.

## Visual / Design Notes
*   **Complexity:** High. Lots of layers (Video, Audio, Realtime, Social Graph).
*   **Navigation:** Custom sticky header behavior implied by `activeTab`.

## Notes
*   **Validation Logic:** Unique feature where users rate others' pronunciation.
*   **Social Graph:** Checks `followers` table to determine `isFollowing` state for each post author.
