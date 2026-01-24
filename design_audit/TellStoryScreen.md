# Component Audit: TellStoryScreen

## Purpose
`TellStoryScreen` is a specialized recording interface for longer-form narrative content. Unlike standard clips, these are intended for "AI Video Generation".

## Key Components
*   **Prompt Card:** Encourages specific types of stories (Folktales, History).
*   **Recording:** Longer limit (2:00 vs 1:00 for clips).
*   **AI Mock:** "Create AI Story" button triggers a simulation of backend processing.

## Interactions / State
*   **Recording:** Standard `isRecording` toggle logic (simplified compared to `RecordVoiceScreen` in this file, relying more on UI state than complex `expo-av` handling visible in the snippet).
*   **Submission:** Currently mocks the "AI Processing" step with an Alert.

## Visual / Design Notes
*   **Theme:** Uses Purple (`#8B5CF6`) as the primary color to distinguish from the standard Orange recording flow.
*   **Educational:** Includes a "Great stories include..." section to guide users.

## Notes
*   This appears to be a "Future Feature" or "Beta" screen where the actual AI video generation pipeline is simulated.
