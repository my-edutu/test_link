import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth, useSignIn, useSignUp, useUser } from '@clerk/clerk-expo';
import { useOAuth } from '@clerk/clerk-expo'; // For Google
import * as Linking from 'expo-linking';
import { supabase, setSupabaseToken } from '../supabaseClient';
import { setAuthTokenProvider } from '../services/authFetch';
import { identifyUser, resetUser, trackEvent, AnalyticsEvents } from '../services/analytics';

// Define the shape of our Auth Context
// We keep it compatible with the previous Supabase interface as much as possible
type AuthContextValue = {
  session: any | null; // Clerk session
  user: any | null;    // Clerk user
  loading: boolean;
  supabaseSynced: boolean;
  signIn: (email: string, password: string) => Promise<null | string>;
  signInWithGoogle: () => Promise<null | string>;
  signInWithApple: () => Promise<null | string>; // Added signInWithApple
  signUp: (
    params: {
      email: string;
      password: string;
      fullName: string;
      username: string;
      primaryLanguage: string;
      inviteCode?: string;
      country?: string;
      state?: string;
      city?: string;
      lga?: string;
    }
  ) => Promise<null | string>;
  resetPassword: (email: string) => Promise<null | string>;
  updatePassword: (newPassword: string) => Promise<null | string>;
  signOut: () => Promise<void>;
  refreshProfile: () => void;
  profileVersion: number;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, userId, sessionId, getToken, signOut: clerkSignOut } = useAuth();
  const { user: clerkUser } = useUser();
  const { signIn: clerkSignIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp: clerkSignUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();

  // Google OAuth Hook
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' });
  // Apple OAuth Hook
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' });

  const [loading, setLoading] = useState(true);
  const [profileVersion, setProfileVersion] = useState(0);

  const refreshProfile = () => {
    console.log("AuthProvider: Forcing profile refresh");
    setProfileVersion(v => v + 1);
  };

  // Sync loading state
  useEffect(() => {
    if (isLoaded && isSignInLoaded && isSignUpLoaded) {
      setLoading(false);
    }
  }, [isLoaded, isSignInLoaded, isSignUpLoaded]);

  // Wire up Clerk token to authFetch so API calls are authenticated
  useEffect(() => {
    if (isSignedIn && userId) {
      setAuthTokenProvider(
        () => getToken({ template: 'supabase' }), // Use Supabase template (HS256) for backend compatibility
        userId
      );
    } else {
      setAuthTokenProvider(() => Promise.resolve(null), null);
    }
  }, [isSignedIn, userId, getToken]);

  // Sync Supabase with Clerk JWT (Optional - enables Row Level Security)
  const [supabaseSynced, setSupabaseSynced] = useState(false);

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null;
    let syncTimeout: NodeJS.Timeout | null = null;

    const refreshSupabaseToken = async () => {
      if (!isSignedIn || !userId) {
        setSupabaseToken(null);
        setSupabaseSynced(false);
        return;
      }

      try {
        console.log('AuthProvider: Fetching Supabase token...');
        // Get fresh JWT token from Clerk's "supabase" template
        // skipCache ensures we always get a fresh token
        const token = await getToken({ template: 'supabase', skipCache: true });

        if (token) {
          console.log('AuthProvider: Supabase token received, synced!');
          setSupabaseToken(token);
          setSupabaseSynced(true);
        } else {
          console.warn('AuthProvider: No token returned from Clerk, proceeding anyway');
          setSupabaseToken(null);
          // Still mark as synced to allow app to proceed (degraded mode)
          setSupabaseSynced(true);
        }
      } catch (e: any) {
        if (e.message?.includes('No JWT template exists')) {
          console.warn('AuthProvider: JWT template "supabase" not found. Create it in Clerk Dashboard. Proceeding in degraded mode.');
        } else {
          console.warn('AuthProvider: Token refresh error:', e.message, '- Proceeding in degraded mode.');
        }
        setSupabaseToken(null);
        // Mark as synced anyway to prevent infinite loading
        setSupabaseSynced(true);
      }
    };

    // Safety timeout: if sync doesn't complete in 5 seconds, proceed anyway
    if (isSignedIn && userId) {
      syncTimeout = setTimeout(() => {
        if (!supabaseSynced) {
          console.warn('AuthProvider: Sync timeout - proceeding without Supabase token');
          setSupabaseSynced(true);
        }
      }, 5000);
    }


    // Initial token fetch
    refreshSupabaseToken();

    // Refresh token every 50 seconds (before 60-second default expiry)
    if (isSignedIn && userId) {
      refreshInterval = setInterval(refreshSupabaseToken, 50 * 1000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
    };
  }, [isSignedIn, userId, getToken]);

  // Global Presence Tracking
  useEffect(() => {
    let channel: any = null;

    const trackPresence = async () => {
      if (!isSignedIn || !userId || !supabaseSynced) return;

      try {
        console.log('AuthProvider: Joining global presence channel...');
        channel = supabase.channel('users_presence', {
          config: {
            presence: {
              key: userId,
            },
          },
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            // Optional: You could store who is online in a context state if needed
            // const state = channel.presenceState();
            // console.log('Global presence sync:', Object.keys(state).length);
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('AuthProvider: Subscribed to presence');
              await channel.track({
                userId: userId,
                online_at: new Date().toISOString()
              });
            }
          });
      } catch (err) {
        console.warn('AuthProvider: Presence error', err);
      }
    };

    trackPresence();

    return () => {
      if (channel) {
        console.log('AuthProvider: Leaving presence channel');
        supabase.removeChannel(channel);
      }
    };
  }, [isSignedIn, userId, supabaseSynced]);


  // Wrapper for SignIn
  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    if (!isSignInLoaded) return 'Auth not loaded';
    try {
      const result = await clerkSignIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        return null;
      } else {
        return 'Sign in incomplete. Check email verification.';
      }
    } catch (err: any) {
      console.error('SignIn Error:', err);
      // Clerk errors array
      return err.errors?.[0]?.message || err.message || 'Sign in failed';
    }
  };

  // Wrapper for Google SignIn
  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    try {
      const { createdSessionId, setActive } = await startGoogleFlow({
        redirectUrl: Linking.createURL('/dashboard', { scheme: 'lingualink' }),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        return null;
      }
      return 'OAuth cancelled or failed';
    } catch (err: any) {
      console.error('OAuth Error:', err);
      return err.message || 'Google Sign In failed';
    }
  };

  // Wrapper for Apple SignIn
  const signInWithApple: AuthContextValue['signInWithApple'] = async () => {
    try {
      const { createdSessionId, setActive } = await startAppleFlow({
        redirectUrl: Linking.createURL('/dashboard', { scheme: 'lingualink' }),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        return null;
      }
      return 'OAuth cancelled or failed';
    } catch (err: any) {
      console.error('Apple OAuth Error:', err);
      return err.message || 'Apple Sign In failed';
    }
  };

  // Wrapper for SignUp
  const signUp: AuthContextValue['signUp'] = async ({
    email,
    password,
    username,
    fullName,
    primaryLanguage,
    inviteCode,
    country,
    state,
    city,
    lga
  }) => {
    if (!isSignUpLoaded) return 'Auth not loaded';
    try {
      // 1. Create User in Clerk
      const result = await clerkSignUp.create({
        emailAddress: email,
        password,
        username, // Clerk supports username
        unsafeMetadata: {
          full_name: fullName,
          primary_language: primaryLanguage,
          invite_code: inviteCode,
          country,
          state,
          city,
          lga
        }
      });

      // 2. Prepare Email Verification (Supabase flow expected verification)
      await clerkSignUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // Return null (success) so app navigates to VerifyEmailScreen
      return null;
    } catch (err: any) {
      console.error('SignUp Error:', err);
      return err.errors?.[0]?.message || err.message || 'Sign up failed';
    }
  };

  // Implement SignOut
  const signOut = async () => {
    await clerkSignOut();
    // Analytics
    resetUser();
    trackEvent(AnalyticsEvents.USER_LOGGED_OUT);
  };

  // Placeholders for Password Reset (To be implemented with Clerk flow if needed)
  const resetPassword = async (email: string) => {
    // Trigger email code flow
    // For now, return "Check your email" simulated
    return 'Password reset flow requires code verification update';
  };
  const updatePassword = async (newPassword: string) => {
    try {
      // In Clerk, updating password uses a specific method
      if (clerkUser) {
        await clerkUser.updatePassword({ newPassword });
        return null;
      }
      return 'No user found';
    } catch (err: any) {
      return err.errors?.[0]?.message || 'Update failed';
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session: sessionId ? { user: clerkUser } : null,
      user: clerkUser,
      loading,
      supabaseSynced,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signUp,
      resetPassword,
      updatePassword,
      signOut,
      refreshProfile,
      profileVersion
    }),
    [sessionId, clerkUser, loading, supabaseSynced, isSignInLoaded, isSignUpLoaded, profileVersion]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => { // Renamed slightly to avoid conflict with Clerk useAuth internally if needed, but exports keep existing name
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// Maintain compatibility with existing imports
export { useAuthContext as useAuth }; 
