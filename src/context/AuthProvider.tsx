import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../supabaseClient';
import { identifyUser, resetUser, trackEvent, AnalyticsEvents } from '../services/analytics';
import { API_BASE_URL } from '../config';

type AuthContextValue = {
  session: import('@supabase/supabase-js').Session | null;
  user: import('@supabase/supabase-js').User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<null | string>;
  signInWithGoogle: () => Promise<null | string>;
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
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      console.log('AuthProvider: init starting');
      try {
        // Increased timeout from 3s to 10s for slower connections
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timed out')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        console.log('AuthProvider: session retrieved', !!data?.session);
        setSession(data?.session ?? null);
      } catch (e: any) {
        console.error('AuthProvider: init error/timeout', e?.message || e);
        // On timeout or error, assume no session so app can at least load
        setSession(null);
      } finally {
        setLoading(false);
        console.log('AuthProvider: loading set to false');
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, newSession?.user?.email);
      setSession(newSession);
      setLoading(false);

      // Handle OAuth sign-in success (only for OAuth, not email signup)
      if (event === 'SIGNED_IN' && newSession?.user && newSession.user.app_metadata?.provider === 'google') {
        await handleOAuthSignIn(newSession.user);
      }

      // On any successful sign-in, ensure referral code exists and attribute invite if present
      if (event === 'SIGNED_IN' && newSession?.user) {
        try {
          await ensureReferralSetup(newSession.user, newSession.access_token);
          await syncLocationFromMetadata(newSession.user);

          // Identify user in PostHog analytics
          const userMeta = newSession.user.user_metadata as any;
          identifyUser(newSession.user.id, {
            email: newSession.user.email,
            username: userMeta?.username,
            full_name: userMeta?.full_name,
            primary_language: userMeta?.primary_language,
            country: userMeta?.country,
            created_at: newSession.user.created_at,
          });

          // Track login event
          trackEvent(AnalyticsEvents.USER_LOGGED_IN, {
            provider: newSession.user.app_metadata?.provider || 'email',
          });
        } catch (e) {
          console.log('Post sign-in referral setup error:', e);
        }
      }

      // On sign out, reset analytics user
      if (event === 'SIGNED_OUT') {
        resetUser();
        trackEvent(AnalyticsEvents.USER_LOGGED_OUT);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    } catch (error: any) {
      return error?.message || 'An unexpected error occurred';
    }
  };

  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    setLoading(true);
    try {
      // Create redirect URI for OAuth/email callbacks (Expo Go & dev builds)
      // Route mapped in App.tsx as AuthCallback → 'auth-callback'
      // Use web redirect for production, custom scheme for development
      const redirectUri = __DEV__
        ? AuthSession.makeRedirectUri({
          scheme: 'lingualink',
          path: 'auth-callback',
        })
        : 'https://lingualinknew.netlify.app';

      console.log('Google OAuth redirect URI:', redirectUri);

      // Start OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true, // We'll handle the redirect manually
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        return `OAuth Error: ${error.message}`;
      }

      if (!data.url) {
        console.error('No OAuth URL received');
        return 'Failed to get OAuth URL from Supabase';
      }

      console.log('Opening OAuth URL:', data.url);

      // Open the OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri,
        {
          showInRecents: true,
          preferEphemeralSession: true,
        }
      );

      console.log('OAuth result:', result);

      if (result.type === 'success' && result.url) {
        console.log('OAuth success, URL:', result.url);

        // Parse the URL to extract the session
        try {
          const url = new URL(result.url);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            console.error('OAuth error in URL:', error);
            return `OAuth Error: ${error}`;
          }

          if (code) {
            const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              console.error('Code exchange error:', exchangeError);
              return `Session Error: ${exchangeError.message}`;
            }

            console.log('Session retrieved successfully');
            return null; // Success
          } else {
            console.error('No code found in redirect URL');
            return 'No authentication code received';
          }
        } catch (urlError) {
          console.error('Error parsing redirect URL:', urlError);
          return 'Error processing OAuth redirect';
        }
      } else if (result.type === 'cancel') {
        console.log('OAuth cancelled by user');
        return 'Google sign-in was cancelled';
      } else {
        console.log('OAuth failed:', result);
        return `OAuth failed: ${result.type}`;
      }
    } catch (e: any) {
      console.error('Google sign-in exception:', e);
      return `Exception: ${e?.message || 'Unknown error occurred'}`;
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (user: import('@supabase/supabase-js').User) => {
    try {
      // Check if user profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError);
        return;
      }

      // If profile doesn't exist, create one
      if (!existingProfile) {
        const userMetadata = user.user_metadata;
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: userMetadata?.full_name || userMetadata?.name || '',
            username: userMetadata?.username || userMetadata?.email?.split('@')[0] || '',
            avatar_url: userMetadata?.avatar_url || '',
            primary_language: userMetadata?.primary_language || 'English',
            country: (userMetadata as any)?.country || null,
            state: (userMetadata as any)?.state || null,
            city: (userMetadata as any)?.city || null,
            lga: (userMetadata as any)?.lga || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
        }
      }
    } catch (error) {
      console.error('Error in handleOAuthSignIn:', error);
    }
  };

  const generateReferralCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude easily confused chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  };

  const ensureReferralSetup = async (user: import('@supabase/supabase-js').User, accessToken?: string) => {
    // Attribute referral if invite code was provided in metadata
    const inviteCodeRaw = (user.user_metadata as any)?.invite_code_input as string | undefined;

    if (inviteCodeRaw && accessToken) {
      const inviteCode = inviteCodeRaw.trim();
      if (inviteCode) {
        try {
          await fetch(`${API_BASE_URL}/ambassador/referral`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'x-user-id': user.id,
            },
            body: JSON.stringify({ code: inviteCode }),
          });

          // Clear metadata
          await supabase.auth.updateUser({ data: { invite_code_input: null } });
        } catch (e) {
          console.log('Error setting up referral:', e);
        }
      }
    }
  };

  const syncLocationFromMetadata = async (user: import('@supabase/supabase-js').User) => {
    try {
      const meta = user.user_metadata as any;
      const hasAny = meta?.country || meta?.state || meta?.city || meta?.lga;
      if (!hasAny) return;
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          country: meta.country || null,
          state: meta.state || null,
          city: meta.city || null,
          lga: meta.lga || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
    } catch (e) {
      console.log('syncLocationFromMetadata error', e);
    }
  };

  const signUp: AuthContextValue['signUp'] = async ({ email, password, fullName, username, primaryLanguage, inviteCode, country, state, city, lga }) => {
    setLoading(true);
    try {
      // Check if email already exists
      const { data: existingEmail, error: emailCheckErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (emailCheckErr) return emailCheckErr.message;
      if (existingEmail) return 'An account with this email already exists';

      // Ensure unique username
      const { data: existing, error: checkErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (checkErr) return checkErr.message;
      if (existing) return 'Username is already taken';

      // Compute redirect for email confirmation links (works in Expo Go)
      const emailRedirectTo = __DEV__
        ? AuthSession.makeRedirectUri({
          scheme: 'lingualink',
          path: 'auth-callback',
        })
        : 'https://lingualinknew.netlify.app';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username,
            primary_language: primaryLanguage,
            // Persist invite code temporarily in metadata; backend will process on first sign-in
            invite_code_input: inviteCode || null,
            // Store location in metadata for now (not persisted to profiles yet)
            country: country || null,
            state: state || null,
            city: city || null,
            lga: lga || null,
          },
          emailRedirectTo,
        },
      });
      if (error) return error.message;

      // For email signup, we expect no session until email is confirmed
      // Return success to show verification screen, but don't create session yet
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Compute redirect for password reset links
      const emailRedirectTo = __DEV__
        ? AuthSession.makeRedirectUri({
          scheme: 'lingualink',
          path: 'auth-callback',
        })
        : 'https://lingualinknew.netlify.app';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: emailRedirectTo,
      });

      if (error) {
        return error.message;
      }

      return null; // Success
    } catch (error: any) {
      return error?.message || 'An unexpected error occurred';
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return error.message;
      }

      return null; // Success
    } catch (error: any) {
      return error?.message || 'An unexpected error occurred';
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ session, user, loading, signIn, signInWithGoogle, signUp, resetPassword, updatePassword, signOut }),
    [session, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


