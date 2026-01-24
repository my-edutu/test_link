# Component Audit: ForgotPasswordScreen

## Purpose
The `ForgotPasswordScreen` provides a mechanism for users to request a password reset via email. It handles input validation and communicates with Supabase Auth.

## Key Components
*   **Form:** Email input field.
*   **States:**
    *   `Input`: Standard entry.
    *   `Loading`: Sending request.
    *   `Success`: Confirmation screen showing email sent.
    *   `Error`: Validation or API error display.

## Interactions / State
*   **Supabase:** Calls `resetPassword(email)`.
*   **Validation:** Regex check for email format.
*   **Navigation:** Returns to `SignIn`.

## Visual / Design Notes
*   **Theme:** Orange (`#FF8A00`) background for the header area, transitioning to white/gray form.
*   **Iconography:** Large mail icon (`ionic-ons`) for success state.

## Notes
*   Simple, functional component. No complex logic.
