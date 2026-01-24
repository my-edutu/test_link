# Component Audit: SettingsScreen

## Purpose
`SettingsScreen` manages user preferences and account configuration. It groups settings into logical sections (Account, Referrals, Language, Notifications, App Info).

## Key Components
*   **Sections:**
    *   **Account:** Edit Profile, Change Password.
    *   **Referrals:** Display invite code and count.
    *   **Language:** Set primary language/dialects.
    *   **Notifications:** Toggles for specific alert types.
*   **Modals:**
    *   `ProfileEditModal`: Update name, bio, location.
    *   `ChangePasswordModal`: specific UI for password updates within the app.
    *   `LanguagePicker`: Shared component for language selection.

## Interactions / State
*   **Supabase Integation:**
    *   Fetches/Updates `profiles` table (including `notification_prefs` JSONB column).
    *   Handles auth `signOut`.
    *   Fetches referral code and invite count.
*   **Referrals:** Includes "Copy to Clipboard" and "Share" native share sheet logic.

## Visual / Design Notes
*   **Clean Layout:** Grouped list items with icons.
*   **Modals:** Uses dedicated modal components to keep the main screen clean.

## Notes
*   A robust implementation that handles real data.
