# Component Audit: ModernOnboarding

## Purpose
`ModernOnboarding` is the introductory screen for new users. It focuses on emotional connection ("Amplify Your Voice", "Preserve Our Heritage") rather than functional explanation.

## Key Components
*   **Hero Image:** Large central illustration with a glowing background effect.
*   **Messaging:** Bold typography emphasizing cultural preservation.
*   **Pagination Dots:** Visual indicator (Step 1 of 3 implied).
*   **Actions:** "Get Started" button leading to Auth.

## Interactions / State
*   **Navigation:** Direct link to `ModernAuthLanding`.
*   **Theming:** Uses `useTheme` for background colors.

## Visual / Design Notes
*   **Typography:** Large, impactful headings using font weights (`800`).
*   **Glow Effect:** Simulated using an absolute positioned View with opacity (since Blur is limited in RN).

## Notes
*   Simple, high-impact landing page.
