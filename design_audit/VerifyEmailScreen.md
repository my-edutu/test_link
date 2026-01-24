# Component Audit: VerifyEmailScreen

## Purpose
`VerifyEmailScreen` is an interstitial screen shown after Sign Up. It instructs the user to click the link sent to their email.

## Key Components
*   **Visual:** Mail icon (`Ionicons`).
*   **Information:** Displays the `email` address the link was sent to.
*   **Action:** "Resend verification email" button.

## Interactions / State
*   **Resend:** Calls `supabase.auth.resend` with type `signup`.

## Visual / Design Notes
*   **Clean:** Minimalist white background to focus on the instruction.
*   **Status:** Disables button while "Sending...".

## Notes
*   Critical for the "Email Confirmation" auth flow.
