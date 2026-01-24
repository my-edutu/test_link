# Component Audit: ModernAuthLanding

## Purpose
`ModernAuthLanding` is the redesigned entry point for user authentication. It provides a polished, high-fidelity UI for users to choose their sign-in method (Google, Apple, or Email).

## Key Components
*   **Hero Section:** Branding ("LinguaLink") and welcome message.
*   **Auth Options:**
    *   Social Buttons: Google, Apple.
    *   Primary Action: "Create Account" (Email navigation).
    *   Secondary Action: "Log In" link.
*   **Theming:** Fully theme-aware (Light/Dark mode) using `useTheme`.

## Interactions / State
*   **Navigation:** Moves to `SignUp` or `SignIn` screens.
*   **Theming:** Dynamic styles based on `ThemeContext`.

## Visual / Design Notes
*   **Aesthetics:** Clean, minimalistic, spacing-conscious. Uses a card-like layout for buttons.
*   **Iconography:** `Ionicons` (logos) and `MaterialIcons` (UI elements).

## Notes
*   This appears to be the "V2" auth screen intended to replace `WelcomeScreen`.
