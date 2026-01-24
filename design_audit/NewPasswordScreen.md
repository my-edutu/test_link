# Component Audit: NewPasswordScreen

## Purpose
`NewPasswordScreen` allows users to set a new password after a recovery request. It verifies the existence of a valid Supabase session before allowing the update.

## Key Components
*   **Form:** "New Password" and "Confirm Password" inputs.
*   **Validation:** Client-side checks for length (>6 chars) and matching passwords.
*   **Feedback:** Success state (Green checkmark) and Error state (Red alert box).

## Interactions / State
*   **Session Check:** `useEffect` checks `supabase.auth.getSession()` on mount.
*   **Submission:** Calls `updatePassword` from `AuthProvider`, then signs the user out upon success.

## Visual / Design Notes
*   **Theme:** Orange (`#FF8A00`) background consistent with auth flows.
*   **Keyboard Handling:** Wrapped in `KeyboardAvoidingView` for usability on smaller screens.

## Notes
*   This flow relies on deep linking or a prior "Forgot Password" flow correctly setting the session.
