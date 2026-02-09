import { GestureHandlerRootView } from 'react-native-gesture-handler';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavigationContainer, NavigationContainerRef, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthProvider';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { OfflineProvider } from './src/context/OfflineProvider';
import { NotificationProvider, useNotifications } from './src/context/NotificationProvider';
import InAppNotificationBanner from './src/components/InAppNotificationBanner';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, Modal, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions, StatusBar, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { supabase } from './src/supabaseClient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// PostHog Analytics
import { PostHogProvider, PostHog } from 'posthog-react-native';
import { setPostHogClient } from './src/services/analytics';

// React Query imports for offline persistence
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all screens
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import NewPasswordScreen from './src/screens/NewPasswordScreen';
import RecordVoiceScreen from './src/screens/RecordVoiceScreen';
import RecordVideoScreen from './src/screens/RecordVideoScreen';
import TellStoryScreen from './src/screens/TellStoryScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import RewardsScreen from './src/screens/RewardsScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import StoreScreen from './src/screens/StoreScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import InvitesScreen from './src/screens/InvitesScreen';
import ValidationScreen from './src/screens/ValidationScreen';
import WithdrawalScreen from './src/screens/WithdrawalScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SavedItemsScreen from './src/screens/SavedItemsScreen';
import FAQScreen from './src/screens/FAQScreen';

// Native call screens - Lazy loaded to prevent crashes in Expo Go
import Constants from 'expo-constants';
import NativeFeatureUnavailable from './src/screens/NativeFeatureUnavailable';
import SplashScreen from './src/screens/SplashScreen';

// Fallback component for native-only features in Expo Go


const VoiceCallScreen = (props: any) => {
  console.log('[App] Rendering VoiceCallScreen wrapper', { appOwnership: Constants.appOwnership });
  if (Constants.appOwnership === 'expo') {
    console.log('[App] Running in Expo Go, showing NativeOnlyFallback');
    return <NativeFeatureUnavailable featureName="Voice Call" />;
  }
  console.log('[App] Running in native build, requiring VoiceCallScreen');
  const Cmp = require('./src/screens/VoiceCallScreen').default;
  return <Cmp {...props} />;
};
const VideoCallScreen = (props: any) => {
  if (Constants.appOwnership === 'expo') return <NativeFeatureUnavailable featureName="Video Call" />;
  const Cmp = require('./src/screens/VideoCallScreen').default;
  return <Cmp {...props} />;
};
const GroupCallScreen = (props: any) => {
  if (Constants.appOwnership === 'expo') return <NativeFeatureUnavailable featureName="Group Call" />;
  const Cmp = require('./src/screens/GroupCallScreen').default;
  return <Cmp {...props} />;
};
const LiveStreamingScreen = (props: any) => {
  if (Constants.appOwnership === 'expo') return <NativeFeatureUnavailable featureName="Live Streaming" />;
  const Cmp = require('./src/screens/LiveStreamingScreen').default;
  return <Cmp {...props} />;
};
const LiveViewerScreen = (props: any) => {
  if (Constants.appOwnership === 'expo') return <NativeFeatureUnavailable featureName="Live Viewer" />;
  const Cmp = require('./src/screens/LiveViewerScreen').default;
  return <Cmp {...props} />;
};

import TurnVerseScreen from './src/screens/TurnVerseScreen';
import ContactDiscoveryScreen from './src/screens/ContactDiscoveryScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import AuthCallbackScreen from './src/screens/AuthCallbackScreen';
import InterestSelectionScreen from './src/screens/InterestSelectionScreen';
import CreateStoryScreen from './src/screens/CreateStoryScreen';
import StoryViewScreen from './src/screens/StoryViewScreen';
import LiveStreamSummaryScreen from './src/screens/LiveStreamSummaryScreen';
import { DuetRecordScreen } from './src/screens/DuetRecordScreen';
import { RemixHistoryScreen } from './src/screens/RemixHistoryScreen';
import AdminModerationScreen from './src/screens/AdminModerationScreen';
import PaymentSettingsScreen from './src/screens/PaymentSettingsScreen';
import AdminPayoutScreen from './src/screens/AdminPayoutScreen';


import ModernOnboarding from './src/screens/ModernOnboarding';
import ModernAuthLanding from './src/screens/ModernAuthLanding';
import ModernProfileSetup from './src/screens/ModernProfileSetup';
import ModernHomeScreen from './src/screens/ModernHomeScreen';
import MenuScreen from './src/screens/MenuScreen';
import * as ExpoSplashScreen from 'expo-splash-screen';
import PermissionBridgeScreen from './src/screens/PermissionBridgeScreen';

// CRITICAL: Prevent auto-hide so we can control it safely
ExpoSplashScreen.preventAutoHideAsync().catch((e) => {
  console.warn('[App] Failed to prevent auto-hide:', e);
});

// Also attempt an immediate hide in case the native side is already ready/stuck
// This defines a "race" where we try to hide it ASAP if the JS bundle loads fast enough
setTimeout(() => {
  ExpoSplashScreen.hideAsync().catch(() => { });
}, 500);

// Navigation types
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

// Define shared contact interface
interface Contact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  language: string;
  isOnline: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  members: number;
  language: string;
  lastActivity: string;
  isPrivate: boolean;
  unreadCount: number;
}

interface Story {
  id: string;
  user: Contact;
  thumbnail: string;
  timestamp: string;
  viewed: boolean;
}

import AmbassadorScreen from './src/screens/AmbassadorScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import { CallProvider } from './src/context/CallProvider';
import { CallSignal } from './src/services/callSignaling';

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  NewPassword: { resetCode?: string } | undefined;
  VerifyEmail: { email?: string } | undefined;
  OTPVerification: { email: string };
  AuthCallback: { code?: string } | undefined;
  InterestSelection: undefined;
  MainTabs: undefined;
  RecordVoice: { mode?: 'record' | 'upload'; isDuet?: boolean; originalClip?: any } | undefined;
  RecordVideo: { mode?: 'record' | 'upload'; isDuet?: boolean; originalClip?: any } | undefined;
  TellStory: undefined;
  Settings: undefined;
  UserProfile: { userId: string };
  Validation: { clipId?: string; language?: string } | undefined;
  Rewards: undefined;
  Leaderboard: undefined;
  Store: undefined;
  Withdrawal: undefined;
  RemixHistory: undefined;
  DuetRecord: { parentClipId: string; parentUsername: string; parentClipUrl?: string; parentClipPhrase?: string };
  ChatDetail: { contact: Contact; conversationId?: string };
  VoiceCall: { contact: Contact };
  VideoCall: { contact: Contact };
  IncomingCall: { callSignal: CallSignal };
  GroupChat: { group: Group };
  GroupCall: { group: Group };
  TurnVerse: undefined;
  WordChain: undefined;
  StartLive: undefined;
  LiveStream: { isHost?: boolean; roomId?: string };
  LiveViewer: { roomId: string };
  LiveStreamSummary: { summary: any };
  CreateGroup: undefined;
  CreateStory: undefined;
  StoryView: { story: Story };
  ContactDiscovery: undefined;
  Groups: undefined;
  Invites: undefined;

  ModernOnboarding: undefined;
  ModernAuthLanding: undefined;
  ModernProfileSetup: undefined;
  ModernHomeScreen: undefined;
  PermissionBridge: undefined;
  Library: undefined;
  ChatList: undefined;
  Profile: undefined;
  AdminModeration: undefined;
  PaymentSettings: undefined;
  AdminPayout: undefined;
  Notifications: undefined;
  SavedItems: undefined;
  FAQ: undefined;
  Ambassador: { referralCode?: string } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Create: undefined;
  Chat: undefined;
  Menu: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const CreateModalContext = React.createContext<{
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  navigation: any | null;
}>({
  showCreateModal: false,
  setShowCreateModal: () => { },
  navigation: null,
});

const CreateModal = () => {
  const { showCreateModal, setShowCreateModal, navigation } = React.useContext(CreateModalContext);
  const { colors, theme } = useTheme();

  const modalStyles = useMemo(() => StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    content: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      borderTopWidth: theme === 'dark' ? 1 : 0,
      borderTopColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 24,
      textAlign: 'center',
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    optionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
    optionDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 18 },
  }), [colors, theme]);

  return (
    <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
      <View style={modalStyles.modalOverlay}>
        <TouchableOpacity style={modalStyles.modalBackground} onPress={() => setShowCreateModal(false)} />
        <View style={modalStyles.content}>
          <Text style={modalStyles.title}>What would you like to create?</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { title: 'Create Story', desc: 'Combine clips, text and media', icon: 'images', color: '#3B82F6', route: 'CreateStory' },
              { title: 'Record Audio', desc: 'Record audio in your local language', icon: 'mic', color: '#FF8A00', route: 'RecordVoice', params: { mode: 'record' } },
              { title: 'Upload Audio', desc: 'Upload audio from your device', icon: 'cloud-upload', color: '#FF8A00', route: 'RecordVoice', params: { mode: 'upload' } },
              { title: 'Record Video', desc: 'Record video content', icon: 'videocam', color: '#8B5CF6', route: 'RecordVideo', params: { mode: 'record' } },
              { title: 'Go Live', desc: 'Start live streaming', icon: 'radio', color: '#EF4444', route: 'LiveStream', params: { isHost: true } },
              { title: 'Play TurnVerse', desc: 'Join language learning games', icon: 'game-controller', color: '#10B981', route: 'TurnVerse' },
            ].map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={modalStyles.option}
                onPress={() => { setShowCreateModal(false); navigation?.navigate(opt.route, opt.params); }}
              >
                <View style={[modalStyles.optionIcon, { backgroundColor: opt.color + '20' }]}>
                  <Ionicons name={opt.icon as any} size={24} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.optionTitle}>{opt.title}</Text>
                  <Text style={modalStyles.optionDesc}>{opt.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const MainTabs = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  // Use global notification context
  const { unreadMessages } = useNotifications();
  const insets = useSafeAreaInsets();

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <CreateModalContext.Provider value={{ showCreateModal, setShowCreateModal, navigation }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: any = focused ? 'home' : 'home-outline';
            if (route.name === 'Library') iconName = focused ? 'library' : 'library-outline';
            else if (route.name === 'Create') iconName = 'add';
            else if (route.name === 'Chat') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            else if (route.name === 'Menu') iconName = focused ? 'menu' : 'menu-outline';

            return <Ionicons name={iconName} size={28} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarBackground: undefined,
        })}
      >
        <Tab.Screen
          name="Home"
          component={ModernHomeScreen}
          listeners={{
            tabPress: () => triggerHaptic(),
          }}
        />
        <Tab.Screen
          name="Library"
          component={View}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              triggerHaptic();
              navigation.navigate('Library');
            },
          }}
        />
        <Tab.Screen
          name="Create"
          component={View}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
              }
              setShowCreateModal(true);
            },
          }}
          options={{
            tabBarIcon: ({ focused }) => (
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 4,
                elevation: 4,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}>
                <Ionicons name="add" size={30} color="#FFFFFF" />
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
        <Tab.Screen
          name="Chat"
          component={ChatListScreen}
          options={{ tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined }}
          listeners={{
            tabPress: () => triggerHaptic(),
          }}
        />
        <Tab.Screen
          name="Menu"
          component={MenuScreen}
          listeners={{
            tabPress: () => triggerHaptic(),
          }}
        />
      </Tab.Navigator>
      <CreateModal />
    </CreateModalContext.Provider>
  );
};

const AuthGate = () => {
  const { session, loading, supabaseSynced, profileVersion } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [hasSeenSlides, setHasSeenSlides] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSlides = async () => {
      const seen = await AsyncStorage.getItem('HAS_SEEN_ONBOARDING');
      setHasSeenSlides(seen === 'true');
    };
    checkSlides();
  }, []);

  useEffect(() => {
    if (!session || loading || !supabaseSynced) return;
    const check = async () => {
      try {
        let { data } = await supabase.from('profiles').select('has_completed_onboarding, interests').eq('id', session.user.id).maybeSingle();

        // If not found, try to migrate old user (legacy Supabase ID -> Clerk ID)
        if (!data) {
          const email = session.user.primaryEmailAddress?.emailAddress;
          if (email) {
            console.log("AuthGate: Profile not found, attempting migration for:", email);
            const { data: success } = await supabase.rpc('migrate_clerk_user', { user_email: email });
            if (success) {
              console.log("AuthGate: Migration successful!");
              // Fetch again with new ID
              const res = await supabase.from('profiles').select('has_completed_onboarding, interests').eq('id', session.user.id).maybeSingle();
              data = res.data as any;
            }
          }
        }

        setOnboardingComplete(!!(data?.has_completed_onboarding || (data?.interests?.length > 0)));
      } catch (e) {
        console.warn("AuthGate: Profile check failed", e);
        setOnboardingComplete(false); // Fallback
      }
    };
    check();

    // Listen for profile updates (e.g. finishing onboarding)
    const channel = supabase.channel(`profile-gate-${session.user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`
      }, (payload) => {
        const newData = payload.new as { has_completed_onboarding?: boolean; interests?: string[] } | null;
        if (newData && (newData.has_completed_onboarding || (newData.interests && newData.interests.length > 0))) {
          setOnboardingComplete(true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, loading, supabaseSynced, profileVersion]);

  // Debug logging for blank screen issues
  console.log('[AuthGate] State:', {
    loading,
    hasSession: !!session,
    onboardingComplete,
    supabaseSynced,
    hasSeenSlides
  });

  if (loading || (session && (onboardingComplete === null || !supabaseSynced)) || (!session && hasSeenSlides === null)) {
    console.log('[AuthGate] Showing loading state because:', {
      authLoading: loading,
      waitingForOnboarding: session && onboardingComplete === null,
      waitingForSupabaseSync: session && !supabaseSynced,
      waitingForSlideCheck: !session && hasSeenSlides === null
    });
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FF8A00" />
      </View>
    );
  }

  if (!session) {
    if (hasSeenSlides) {
      return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="ModernAuthLanding" component={ModernAuthLanding} /><Stack.Screen name="SignIn" component={SignInScreen} /><Stack.Screen name="SignUp" component={SignUpScreen} /></Stack.Navigator>;
    }
    return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="ModernOnboarding" component={ModernOnboarding} /><Stack.Screen name="ModernAuthLanding" component={ModernAuthLanding} /><Stack.Screen name="SignIn" component={SignInScreen} /><Stack.Screen name="SignUp" component={SignUpScreen} /></Stack.Navigator>;
  }

  if (onboardingComplete === false) return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="PermissionBridge" component={PermissionBridgeScreen} /><Stack.Screen name="ModernProfileSetup" component={ModernProfileSetup} /></Stack.Navigator>;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Library" component={LibraryScreen} />

      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="RecordVoice" component={RecordVoiceScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="RecordVideo" component={RecordVideoScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="TurnVerse" component={TurnVerseScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: true }} />

      {/* Monetization & Rewards */}
      <Stack.Screen name="Validation" component={ValidationScreen} />
      <Stack.Screen name="Rewards" component={RewardsScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Store" component={StoreScreen} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
      <Stack.Screen name="RemixHistory" component={RemixHistoryScreen} />
      <Stack.Screen name="DuetRecord" component={DuetRecordScreen} />

      {/* Communications */}
      <Stack.Screen name="VoiceCall" component={VoiceCallScreen} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} />
      <Stack.Screen name="IncomingCall" component={IncomingCallScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="GroupCall" component={GroupCallScreen} />
      <Stack.Screen name="LiveStream" component={LiveStreamingScreen} />
      <Stack.Screen name="LiveViewer" component={LiveViewerScreen} />
      <Stack.Screen name="LiveStreamSummary" component={LiveStreamSummaryScreen} />

      {/* Social & Discovery */}
      <Stack.Screen name="ContactDiscovery" component={ContactDiscoveryScreen} />
      <Stack.Screen name="Groups" component={GroupsScreen} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
      <Stack.Screen name="StoryView" component={StoryViewScreen} />
      <Stack.Screen name="TellStory" component={TellStoryScreen} />
      <Stack.Screen name="Invites" component={InvitesScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
      <Stack.Screen name="PaymentSettings" component={PaymentSettingsScreen} />
      <Stack.Screen name="AdminPayout" component={AdminPayoutScreen} />

      {/* Menu Screens */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SavedItems" component={SavedItemsScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="Ambassador" component={AmbassadorScreen} />
    </Stack.Navigator>
  );
};

const InnerApp = () => {
  const { theme, colors } = useTheme();
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const navigationRef = useNavigationContainerRef();

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: theme === 'dark',
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.notification
        },
        fonts: DefaultTheme.fonts,
      }}
    >
      <NotificationProvider navigationRef={navigationRef}>
        <CallProvider navigationRef={navigationRef}>
          <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
          <AuthGate />
          {!isSplashFinished && <SplashScreen onFinish={() => setIsSplashFinished(true)} />}
          <InAppNotificationBanner navigationRef={navigationRef} />
        </CallProvider>
      </NotificationProvider>
    </NavigationContainer>
  );
};

const queryClient = new QueryClient();
const asyncStoragePersister = createAsyncStoragePersister({ storage: AsyncStorage });

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

// Safely initialize PostHog - don't crash if API key is missing
let posthog: PostHog;
try {
  if (!POSTHOG_API_KEY || POSTHOG_API_KEY.includes('placeholder')) {
    console.warn('[App] PostHog API key not configured - analytics disabled');
    // Create dummy client that won't send events
    posthog = new PostHog('ph_disabled', { host: POSTHOG_HOST, disabled: true });
  } else {
    posthog = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST });
  }
  setPostHogClient(posthog);
} catch (error) {
  console.error('[App] PostHog initialization failed:', error);
  // Create fallback client
  posthog = new PostHog('ph_error', { host: POSTHOG_HOST, disabled: true });
}

export { posthog };

import { ClerkProvider, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { tokenCache } from './src/utils/tokenCache';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Validate Clerk key at module load to provide better error message
if (!CLERK_PUBLISHABLE_KEY) {
  console.error('[App] CRITICAL: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set!');
}

// Safely wait for Clerk with timeout fallback
const ClerkLoadedWithTimeout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded } = useClerkAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    console.log('[ClerkLoadedWithTimeout] isLoaded:', isLoaded);
    if (isLoaded) return;

    // Show loading for max 10 seconds, then show error
    const timeout = setTimeout(() => {
      console.warn('[ClerkLoadedWithTimeout] Clerk failed to load within 10s');
      setTimedOut(true);
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isLoaded]);

  if (isLoaded) {
    return <>{children}</>;
  }

  if (timedOut) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 20 }}>
        <Text style={{ color: '#FF8A00', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Connection Issue</Text>
        <Text style={{ color: '#FFF', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          Unable to connect to authentication service. Please check your internet connection and try again.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#FF8A00', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 }}
          onPress={() => {
            setTimedOut(false);
            setShowRetry(true);
            // Force re-render after 100ms
            setTimeout(() => setShowRetry(false), 100);
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading spinner while waiting for Clerk
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#FF8A00" />
      <Text style={{ color: '#FFF', marginTop: 16, fontSize: 14 }}>Loading...</Text>
    </View>
  );
};

export default function App() {
  useEffect(() => {
    // Register LiveKit globals after native modules are ready
    const initLiveKit = async () => {
      try {
        const { registerGlobals } = await import('@livekit/react-native');
        registerGlobals();
      } catch (e) {
        console.warn('LiveKit initialization skipped:', e);
      }
    };
    initLiveKit();

    async function prepare() {
      try {
        // SAFETY: Force splash screen to hide after 3s max, even if initialization hangs
        // This prevents the "stuck on splash screen" issue if SyncManager or other services deadlock
        const safetyTimeout = new Promise((resolve) => setTimeout(resolve, 3000));

        // await other initialization tasks here if needed in the future
        // e.g. await Font.loadAsync(...)

        // Race between normal initialization and safety timeout
        await Promise.race([
          Promise.resolve(), // Add actual async init tasks here in the future
          safetyTimeout
        ]);
      } catch (e) {
        console.warn('[App] Initialization error:', e);
      } finally {
        // ALWAYS hide splash screen
        console.log('[App] Hiding splash screen (prepare finished)');
        await ExpoSplashScreen.hideAsync().catch((e) => {
          console.warn('[App] Failed to hide splash screen:', e);
        });
      }
    }
    prepare();
  }, []);

  // Show error screen if Clerk key is missing
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 20 }}>
        <Text style={{ color: '#FF3B30', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Configuration Error</Text>
        <Text style={{ color: '#FFF', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Please check your environment configuration.
        </Text>
        <Text style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>
          This error occurs when the app is built without required environment variables.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <ClerkLoadedWithTimeout>
            <SafeAreaProvider>
              <PostHogProvider client={posthog}>
                <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
                  <ThemeProvider>
                    <AuthProvider>
                      <OfflineProvider>
                        <InnerApp />
                      </OfflineProvider>
                    </AuthProvider>
                  </ThemeProvider>
                </PersistQueryClientProvider>
              </PostHogProvider>
            </SafeAreaProvider>
          </ClerkLoadedWithTimeout>
        </ClerkProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}