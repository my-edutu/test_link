# Component Audit: HomeScreen

## Purpose
The `HomeScreen` is the primary content feed for the application, designed to showcase language learning content through "Voice Clips" (audio snippets with waveforms) and "Stories" (narratives).

## Key Components
*   **Tabs:** `All` | `Voice` | `Stories` | `Lab`.
*   **Feed Items:**
    *   `VoiceClipCard`: Shows user info, phrase, translation, audio waveform visualization, and playback controls.
    *   `StoryCard`: Shows thumbnail, title, duration, and type (e.g., "AI Story").
*   **Modals:**
    *   `CreateModal`: Quick access to "Record Voice" or "Tell Story".
    *   `MoreOptionsModal`: Context menu for actions like Duet, Remix, or Validate.

## Interactions / State
*   **Audio Playback:**
    *   Manages a single `sound` instance to ensure only one clip plays at a time.
    *   Uses `getPlayableAudioUrl` for Supabase Storage resolution.
*   **Filtering:** Local filtering of `mockVoiceClips` and `mockStories` based on `activeTab`.
*   **Navigation:** Deep links to `RecordVoice`, `TellStory`, and internal sub-features (Duet/Remix).

## Visual / Design Notes
*   **Waveform:** Simulated using a series of `View` bars with varying heights (`renderWaveform`).
*   **Badges:** "Needs Validation" (Yellow) vs "Verified" (Green) indicators on clips.
*   **Theme:** Light card-based UI on a gray background (`#F8F9FA`).

## Notes
*   Currently relies heavily on **Mock Data** (`mockVoiceClips`, `mockStories`).
*   Needs integration with the real `fetchRealContent` logic seen in `EnhancedHomeScreen`.
