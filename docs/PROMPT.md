# TASK: Finalize Authentication and Onboarding Flow

## Context
We are building LinguaLink. Users are currently hitting "Onboarding check timed out" or getting stuck on the Landing screen. The "Next" button in onboarding has been moved to a ScrollView for better web support.

## Objective
Ensure a user can:
1. Open the app (Splash).
2. Go through all 3 onboarding slides using the "Next" button.
3. Land on Auth Landing and Sign Up/Sign In.
4. Complete Profile Setup (Location/Language) and "Enter the App".
5. Be correctly routed to the Main App without timeouts.

## Requirements
- Fix any remaining "Unexpected text node" or layout issues in `ModernOnboarding.tsx`.
- Ensure `AuthGate` in `App.tsx` doesn't hang. Use `maybeSingle()` and default to `false` quickly.
- Verify `ModernProfileSetup.tsx` correctly updates the `has_completed_onboarding` flag in Supabase.

## Success Criteria
- No "Timed Out" red screens.
- All 3 onboarding screens are distinct and navigable.
- Profile setup completion redirects to the main app dashboard.

**When complete, output: <promise>DONE</promise>**
