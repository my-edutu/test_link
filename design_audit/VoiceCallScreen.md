# Component Audit: VoiceCallScreen

## Purpose
`VoiceCallScreen` handles audio-only calls with a unique focus on **Real-time Translation**. It visualizes the conversation as a chat-like interface where spoken words are transcribed and translated instantly.

## Key Components
*   **Visual Interface:** Large avatar (pulsing when speaking), distinct from a standard phone call screen to emphasize the translation bubbles.
*   **Translations:** `TranslationBubble` list showing Original vs Translated text for both speakers.
*   **Controls:** Mute, Speaker, End Call, Hide/Show Translations.

## Interactions / State
*   **Simulation:**
    *   `simulateRealTimeTranslations()`: Emits mock transaction bubbles every 15 seconds to demonstrate the feature.
*   **Animation:** Bubbles animate in (`translateY` + fade).

## Visual / Design Notes
*   **Bubbles:** Color-coded (My text: Orange/Yellow, Their text: Green).
*   **Header:** "LinguaCall" branding.

## Notes
*   This screen is conceptually very strong for a language app. The implementation currently relies on `mockTranslations` logic.
