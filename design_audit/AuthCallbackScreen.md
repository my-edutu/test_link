# Component Audit: AuthCallbackScreen

## Purpose
The `AuthCallbackScreen` handles the redirection flow from external authentication providers (like Google OAuth) or magic links. It processes the URL parameters to establish a Supabase session and redirects the user to the appropriate screen.

## Key Components
*   **States:**
    *   `loading`: Shows an `ActivityIndicator` and status text.
    *   `success`: Brief success message before navigation.
    *   `error`: Displays error message and an implicit "OK" alert to return to SignIn.
*   **UI:** Minimalist. Centered loader and text.

## Interactions / State
*   **Effects:**
    *   `useEffect` parses route params (`code`, `type`, `access_token`, `refresh_token`).
    *   Calls `supabase.auth.setSession` or `supabase.auth.exchangeCodeForSession`.
*   **Navigation:**
    *   On success: Rely on `AuthGate` (in `App.tsx` or parent) to handle the session change, or explicitly navigates to `NewPassword` if `type === 'recovery'`.
    *   On error: Alerts user and navigates back to `SignIn`.

## Visual / Design Notes
*   **Colors:** Uses `#FF8A00` (Orange) for loading and `#EF4444` (Red) for errors.
*   **Layout:** Centered flex container.

## Notes
*   Critical for OAuth flows.
*   Handles multiple auth types: `recovery`, `signup`, `magiclink`, `email_change`.
