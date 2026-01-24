# Component Audit: SignUpScreen

## Purpose
`SignUpScreen` handles new user registration, collecting essential profile data and preferences.

## Key Components
*   **Form Fields:** Full Name, Username, Email, Password, Primary Language, Location (Country, State, City, LGA), Invite Code.
*   **Validation:**
    *   **Real-time:** Checks Supabase for existing Email/Username during typing (debounced).
    *   **Client-side:** Regex patterns and length checks.
*   **Language Picker:** Modal for selecting primary language.

## Interactions / State
*   **Registration:** Calls `signUp` from `useAuth` with extended metadata.
*   **Feedback:** Success alert prompts user to verify email.

## Visual / Design Notes
*   **Progressive Disclosure:** Shows success checkmarks for valid fields.
*   **Welcome Pack:** Visual banner highlighting the "100 points" reward for joining.

## Notes
*   More complex than SignIn due to the profile metadata requirements and real-time validation calls.
