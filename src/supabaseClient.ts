import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] CRITICAL: Missing required environment variables!');
  console.error('[Supabase] EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('[Supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
  throw new Error(
    'Supabase configuration error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in environment variables.'
  );
}

// Store the current Clerk token for authenticated requests
let currentClerkToken: string | null = null;
let authenticatedClient: SupabaseClient | null = null;

// Create base Supabase client (anonymous access)
const baseSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Clerk handles session persistence
    autoRefreshToken: false, // Clerk handles token refresh
  },
  global: {
    headers: {
      'X-Client-Info': 'lingualink-mobile',
    },
  },
});

// Function to set the Clerk token and create authenticated client
export const setSupabaseToken = (token: string | null) => {
  currentClerkToken = token;

  if (token) {
    // Create authenticated client with Clerk JWT in Authorization header
    authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'lingualink-mobile',
          'Authorization': `Bearer ${token}`,
        },
      },
    });
  } else {
    authenticatedClient = null;
  }
};

// Export supabase - returns authenticated client if available, otherwise base client
// This allows existing code to work without changes
const supabaseProxy = new Proxy(baseSupabase, {
  get(target, prop, receiver) {
    // Use authenticated client if token is set
    const client = authenticatedClient || target;
    const value = Reflect.get(client, prop, receiver);

    // Bind methods to the correct client
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export const supabase = supabaseProxy as SupabaseClient;

// Helper to check if we have an authenticated session
export const hasAuthToken = (): boolean => {
  return currentClerkToken !== null;
};

// Get the raw authenticated client (for advanced use cases)
export const getAuthenticatedSupabase = (): SupabaseClient => {
  return authenticatedClient || baseSupabase;
};


