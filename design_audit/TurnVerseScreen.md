# Component Audit: TurnVerseScreen

## Purpose
`TurnVerseScreen` is the interface for a multiplayer language game called "TurnVerse". It combines live audio/video concepts with gameplay.

## Key Components
*   **Lobby:**
    *   **Live Rooms:** Grid of active games with viewer counts and thumbnails.
    *   **Trending Categories:** Filter chips for game types.
*   **Game Room (Modal):**
    *   **Stage:** 6-grid layout showing participants (`host` + `players`).
    *   **Timer:** Central countdown for the current turn.
    *   **Prompt:** Displays the target word/phrase to translate.
    *   **Controls:** Mic/Hand raise controls.

## Interactions / State
*   **Game Logic (Simulated):**
    *   `gameTimer` counts down from 10s.
    *   `handlePlayerEliminated` logic cycles turns and resets timer.
    *   `generateNewWord` picks a random mock word.
*   **Animation:** Complex animations for "pulse" timer and "stage entry".

## Visual / Design Notes
*   **Dark Theme:** Uses `#1F2937` background for a "Gaming/Night mode" feel.
*   **Feedback:** Visual indicators for "On Stage", "Host", "Live", and "Current Turn".

## Notes
*   This is a highly complex "Game" screen. Currently operates on local state/mock data. Converting this to real-time multiplayer (via Supabase Realtime or Socket.io) will be a significant engineering task.
