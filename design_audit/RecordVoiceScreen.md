# Component Audit: RecordVoiceScreen

## Purpose
`RecordVoiceScreen` is the core creation tool for the app. It enables users to record audio clips, optionally responding to prompts or other users (Duets).

## Key Components
*   **Recording Interface:**
    *   Microphone button with pulse animation.
    *   Timer (max 60s) and Waveform visualization.
*   **Prompts:**
    *   `DailyPromptsSection`: Fetches and displays daily topics.
    *   `PromptCard`: Editable text area for custom or preset prompts.
*   **Upload:** Option to pick existing audio files (`expo-document-picker`).
*   **Duet Mode:** Displays the "Original Clip" being responded to if in Duet mode.

## Interactions / State
*   **Audio:** Managed via `expo-av` (`Recording`, `Sound`). Handles permissions and file URI generation.
*   **Submission:**
    *   Uploads file to Supabase Storage.
    *   Inserts record into `voice_clips`.
    *   Marks daily prompt as used.
    *   Increments `duets_count` on original clip if applicable.
*   **Validation:** Checks for language selection and prompt text before allowing save.

## Visual / Design Notes
*   **Feedback:** clear "Recording" state with red UI elements and pulsing.
*   **Tips:** Context-aware tips (Duet vs Normal).

## Notes
*   Crucial component. The logic for "Daily Prompts" is integrated here, bridging content creation with gamification.
