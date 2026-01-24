// types/navigation.ts - Centralized navigation types
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabScreenProps, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, CompositeNavigationProp } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

// Define shared interfaces
export interface Contact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  language: string;
  isOnline: boolean;
}

export interface SocialUserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  primary_language?: string;
  bio?: string;
  location?: string;
  created_at: string;
}

export interface Group {
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

export interface Story {
  id: string;
  user: Contact;
  thumbnail: string;
  timestamp: string;
  viewed: boolean;
  created_at?: string; // Optional for sorting
}

// Define navigation parameter lists
export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  MainTabs: undefined;
  RecordVoice: {
    isDuet?: boolean;
    originalClip?: {
      id: string;
      phrase: string;
      user: string;
      language: string;
    };
  } | undefined;
  RecordVideo: {
    isDuet?: boolean;
    originalClip?: {
      id: string;
      phrase: string;
      user: string;
      language: string;
    };
  } | undefined;
  TellStory: undefined;
  Settings: undefined;
  Validation: {
    clipId?: string;
    language?: string;
  } | undefined;

  // Chat routes
  ChatDetail: {
    contact: Contact;
  };
  Groups: undefined;
  VoiceCall: {
    contact: Contact;
  };
  VideoCall: {
    contact: Contact;
  };
  GroupChat: {
    group: Group;
  };
  GroupCall: {
    group: Group;
  };

  // New feature routes
  TurnVerse: undefined;
  WordChain: undefined;
  StartLive: undefined;
  LiveStream: {
    isHost?: boolean;
    roomId?: string;
  };
  CreateGroup: undefined;
  CreateStory: undefined;
  StoryView: {
    story: Story;
  };
  ContactDiscovery: undefined;
  UserProfile: {
    user: Contact | SocialUserProfile;
  };
  Invites: undefined;
};

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Create: undefined;
  Chat: undefined;
  Profile: undefined;
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  BottomTabScreenProps<TabParamList, T>;

// Combined navigation props for nested navigators
export type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type ChatListNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Chat'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Individual screen navigation and route props
export type ChatDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChatDetail'>;
export type ChatDetailRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;

export type VoiceCallNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VoiceCall'>;
export type VoiceCallRouteProp = RouteProp<RootStackParamList, 'VoiceCall'>;

export type VideoCallNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VideoCall'>;
export type VideoCallRouteProp = RouteProp<RootStackParamList, 'VideoCall'>;

export type GroupChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupChat'>;
export type GroupChatRouteProp = RouteProp<RootStackParamList, 'GroupChat'>;

export type GroupCallNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupCall'>;
export type GroupCallRouteProp = RouteProp<RootStackParamList, 'GroupCall'>;

export type RecordVoiceNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RecordVoice'>;
export type RecordVoiceRouteProp = RouteProp<RootStackParamList, 'RecordVoice'>;

export type TellStoryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TellStory'>;
export type TellStoryRouteProp = RouteProp<RootStackParamList, 'TellStory'>;

export type ValidationNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Validation'>;
export type ValidationRouteProp = RouteProp<RootStackParamList, 'Validation'>;

export type LiveStreamNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LiveStream'>;
export type LiveStreamRouteProp = RouteProp<RootStackParamList, 'LiveStream'>;

export type ContactDiscoveryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ContactDiscovery'>;
export type ContactDiscoveryRouteProp = RouteProp<RootStackParamList, 'ContactDiscovery'>;

export type UserProfileNavigationProp = NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;
export type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export type StoryViewNavigationProp = NativeStackNavigationProp<RootStackParamList, 'StoryView'>;
export type StoryViewRouteProp = RouteProp<RootStackParamList, 'StoryView'>;

// For backward compatibility
export type AppRootStackParamList = RootStackParamList;
export type AppTabParamList = TabParamList;
export type AppRootStackScreenProps<T extends keyof RootStackParamList> = RootStackScreenProps<T>;
export type AppTabScreenProps<T extends keyof TabParamList> = TabScreenProps<T>;