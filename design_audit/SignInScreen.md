# Component Audit: SignInScreen

## Purpose
`SignInScreen` handles user authentication via Email/Password or Google OAuth.

## Key Components
*   **Form:** Email and Password inputs with visibility toggle.
*   **Actions:** "Sign In", "Forgot Password", "Continue with Google".
*   **Navigation:** Link to `SignUpScreen`.

## Interactions / State
*   **Auth Provider:** Calls `signIn` or `signInWithGoogle` from `useAuth`.
*   **Validation:** Basic regex for email, requirement checks for password.
*   **Feedback:** Displays specific error messages (e.g., "Invalid login credentials", "Email not confirmed").

## Visual / Design Notes
*   **Layout:** `KeyboardAvoidingView` ensures inputs remain visible.
*   **Style:** Dark theme consistency with `ModernAuthLanding`.

## Notes
*   Standard auth flow implementation.
