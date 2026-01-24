# Component Audit: ValidationScreen

## Purpose
`ValidationScreen` is the "Work" interface where users earn points by validating the accuracy of others' recordings. This ensures data quality for the AI model.

## Key Components
*   **Info Card:** Language, Original Phrase, Context.
*   **Player:** Waveform visualization and Play button (`expo-audio`).
*   **Decision:** "Is this pronunciation correct?" -> "Yes, Correct" vs "Needs Work".
*   **Feedback:** Tips card for validators.

## Interactions / State
*   **Data:** Loads a single clip via `clipId`.
*   **Audio:** Uses `useAudioPlayer` from `expo-audio`. Note: checks `getPlayableAudioUrl`.
*   **Submission:** Writes to `validations` table.
*   **Points:** Awards points (+10 for correct, +5 for constructive feedback).

## Visual / Design Notes
*   **Waveform:** Custom visual created with `View` elements (mock data currently).
*   **Feedback loop:** Immediate alert confirmation of points earned.

## Notes
*   The `extractOriginalPrompt` helper handles nested remix chains (e.g., "Create your own version of..."), ensuring the validator sees the core phrase.
