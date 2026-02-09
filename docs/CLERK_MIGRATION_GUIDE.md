# Clerk Authentication Migration Guide

This guide outlines the steps to replace Supabase Auth with Clerk in the Lingualink AI application.

## 1. Setup Clerk Project

1.  Go to [dashboard.clerk.com](https://dashboard.clerk.com) and create a new application.
2.  Enable **Email/Password** and **Google** (Social) authentication.
3.  Copy your **Publishable Key** from the API Keys section.

## 2. Install Dependencies

```bash
npx expo install @clerk/clerk-expo
```

## 3. Configure Environment Variables

Add your Clerk publishable key to your `.env` file:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## 4. Wrap Application with ClerkProvider

Modify `App.tsx` only to replace `AuthProvider` (Supabase) with `ClerkProvider` for the outer shell, but you will likely need to keep a custom `AuthProvider` that interfaces with Clerk to maintain your existing context API (`useAuth`).

**Better Approach:**
Modify `src/context/AuthProvider.tsx` to use Clerk internally instead of Supabase.

```tsx
// App.tsx
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { tokenCache } from './src/utils/cache'; // You need to implement token cache

export default function App() {
  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
       <ClerkLoaded>
          {/* Your App Content */}
       </ClerkLoaded>
    </ClerkProvider>
  );
}
```

## 5. Implement Token Cache

Create `src/utils/cache.ts` to persist sessions on mobile:

```typescript
import * as SecureStore from 'expo-secure-store';

export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};
```

## 6. Update Auth Screens

Refactor `SignUpScreen`, `SignInScreen`, `VerifyEmailScreen` to use Clerk hooks:

- `useSignUp()`
- `useSignIn()`
- `useAuth()` (for user ID and signOut)
- `useUser()` (for user details)

**Example SignIn:**

```tsx
const { signIn, setActive, isLoaded } = useSignIn();

const onSignInPress = async () => {
  if (!isLoaded) return;
  try {
    const completeSignIn = await signIn.create({
      identifier: email,
      password,
    });
    await setActive({ session: completeSignIn.createdSessionId });
  } catch (err: any) {
    console.error(JSON.stringify(err, null, 2));
  }
};
```

## 7. Sync with Supabase (Database)

You still need Supabase for your database (profiles, stories, etc.).

1.  **Enable Custom JWTs** in Supabase Project Settings > API > Authentication.
2.  **Create a JWT Template** in Clerk Dashboard > [Integration] > Supabase.
3.  Configure Clerk to sign tokens with your Supabase Signing Secret.

**Middleware/Context Update:**
When making requests to Supabase from the app, you need to inject the Clerk token:

```typescript
const { getToken } = useAuth(); // Clerk's useAuth

const supabaseClient = async () => {
  const token = await getToken({ template: 'supabase' });
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
};
```

## 8. Migration Checklist

- [ ] Install `@clerk/clerk-expo`
- [ ] Set up Token Cache
- [ ] Integrate ClerkProvider in `App.tsx`
- [ ] Refactor `AuthProvider` context to wrap Clerk hooks (to minimize changing UI code) OR refactor all screens to use Clerk hooks directly.
- [ ] Set up Clerk-Supabase integration (JWT templates).
- [ ] Update RLS policies in Supabase if necessary (userId changes? Clerk IDs are different from Supabase IDs!).
    - **CRITICAL:** Clerk User IDs (e.g., `user_2...`) are different from Supabase UUIDs.
    - **Option A:** Store Clerk ID in your public.profiles table as a new column or primary key.
    - **Option B:** Map them securely. (Option A is recommended for new apps).

## 9. Handling User Data Migration (If Production)

If you have existing users, you cannot easily migrate their passwords to Clerk.
- You might need to ask users to reset passwords.
- Or use Clerk's migration API (requires exporting password hashes from Supabase, which is complex).
