# Component Audit: ModernSplash

## Purpose
`ModernSplash` serves as the initial loading screen, providing visual feedback while the app initializes. It sets the tone with the "heritage engine" messaging.

## Key Components
*   **Visuals:**
    *   Animated Logo (pulsing).
    *   Waveform visualization (animated bars).
    *   Glowing background blobs.
*   **Progress Bar:** Simulated loading progress (stops at 74% in code before navigation).

## Interactions / State
*   **Animation:** Uses `Animated.loop` and `Animated.sequence` for the pulse effect.
*   **Navigation:** Uses `setTimeout` (3000ms) to simulate loading before replacing with `ModernOnboarding`.

## Visual / Design Notes
*   **Theme:** Uses `useTheme` for dynamic colors.
*   **Layout:** Centered content with decorative background elements.

## Notes
*   Currently a simulation. In a real scenario, this would check auth state or load resources instead of a fixed timer.
