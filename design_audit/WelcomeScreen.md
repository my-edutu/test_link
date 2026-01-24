# Component Audit: WelcomeScreen

## Purpose
`WelcomeScreen` is the functional entry point for the application. It introduces the value proposition ("Preserving languages", "AI Stories") and directs users to Auth.

## Key Components
*   **Hero:** Microphone icon with sparkles.
*   **Features List:** 4 key items (Share Voice, AI Stories, Preserve Culture, Earn & Learn).
*   **Actions:** "Get Started" (SignUp) and "I Already Have an Account" (SignIn).

## Interactions / State
*   **Navigation:** Simple stack navigation.
*   **Theme:** Uses `useTheme` for Light/Dark mode compatibility.

## Visual / Design Notes
*   **Icons:** Consistent use of `Ionicons` for feature bullets.
*   **Layout:** Scrollable content to ensure it fits on smaller screens (`SafeAreaView`).

## Notes
*   This screen competes with `ModernAuthLanding`. We should decide if `ModernAuthLanding` replaces this or if this is step 1 of a flow.
