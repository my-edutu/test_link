// src/screens/ProfileScreen.tsx
import { useTheme } from '../context/ThemeContext';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { CompositeNavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import LanguagePicker from '../components/LanguagePicker';
import BadgeDetailModal, { Badge } from '../components/BadgeDetailModal';
import EditProfileModal from '../components/EditProfileModal'; // Added EditProfileModal import
import { badgesApi, BadgeProgressSummary } from '../services/badgesApi';
import TrophyCase from '../components/TrophyCase';
import EarningsCard from '../components/EarningsCard';
import TransactionHistory from '../components/TransactionHistory';
import PendingRewards from '../components/PendingRewards';
import AmbassadorScreen from './AmbassadorScreen';
import TopUpModal from '../components/TopUpModal';

const { width, height } = Dimensions.get('window');

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

interface VoiceClip {
  id: string;
  phrase: string;
  language: string;
  likes: number;
  comments: number;
  validations: number;
  duets: number;
  timeAgo: string;
  clip_type?: 'original' | 'duet';
  original_clip_id?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  primary_language: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  created_at: string;
}

interface Language {
  id: string;
  name: string;
  dialect?: string;
}

// THEME CONSTANTS - Modern Dark Theme
const THEME = {
  bg: '#1c1022',
  bgSecondary: '#2d1a36',
  primary: '#ff6d00',
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  card: 'rgba(255,255,255,0.05)',
  divider: 'rgba(255,255,255,0.1)',
  success: '#0bda76',
};

const AmbassadorSection = ({ navigation, user }: { navigation: any, user: UserProfile | null }) => {
  const username = user?.username || 'user';
  const referralCode = username.startsWith('@') ? username : `@${username}`;

  const { colors } = useTheme();

  const onShare = async () => {
    try {
      await Share.share({
        message: `Join LinguaLink with my code ${referralCode} and we both earn rewards! \n\nDownload now: https://lingualink.ai`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        style={{ borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20 }}
      >
        <Ionicons name="gift" size={48} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', top: 16, right: 16 }} />
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 8 }}>YOUR REFERRAL CODE</Text>
        <Text style={{ color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>{referralCode}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>
          Share this code. When friends join, you earn rewards set by the admin!
        </Text>

        <TouchableOpacity
          onPress={onShare}
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons name="share-social" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Share Code</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Quick link to full dashboard */}
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onPress={() => navigation.navigate('Ambassador')}
      >
        <Text style={{ color: colors.primary, fontWeight: 'bold', marginRight: 4 }}>View Full Ambassador Dashboard</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user: authUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'My Clips' | 'Badges' | 'Rewards' | 'Ambassador'>('My Clips');

  // State for real data
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [voiceClips, setVoiceClips] = useState<VoiceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoStoriesCount, setVideoStoriesCount] = useState(0);
  const horizontalScrollRef = React.useRef<ScrollView>(null);

  // Avatar editing state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Follow counts state
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Badge State
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgressSummary | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  // Language picker state
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | undefined>(undefined);

  // Profile editor state
  const [showEditProfile, setShowEditProfile] = useState(false); // Changed from showBioEditor

  // Location editor state - removed as part of EditProfileModal
  // const [showLocationEditor, setShowLocationEditor] = useState(false);
  // const [locationInput, setLocationInput] = useState('');

  // Wallet
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Helper function to format time ago
  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
  };

  const formatJoinDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
    return formatter.format(date);
  };

  // Fetch user profile from database
  const fetchUserProfile = async () => {
    if (!authUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...');
          await createUserProfile();
          return;
        }
        throw error;
      }

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load profile');
    }
  };

  // Create user profile if it doesn't exist
  const createUserProfile = async () => {
    if (!authUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'User',
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
          primary_language: authUser.user_metadata?.primary_language || 'English',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        console.log('Profile created successfully:', data);
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      setError('Failed to create profile');
    }
  };

  // Fetch user's voice clips from database
  const fetchVoiceClips = async () => {
    if (!authUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('voice_clips')
        .select(`
          id,
          phrase,
          language,
          dialect,
          likes_count,
          comments_count,
          validations_count,
          duets_count,
          clip_type,
          original_clip_id,
          created_at
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(20); // Optimize: Load only recent clips initially

      if (error) throw error;

      if (data) {
        // Transform database data to match our interface
        const transformedClips: VoiceClip[] = data.map(clip => ({
          id: clip.id,
          phrase: clip.phrase,
          language: clip.dialect ? `${clip.language} / ${clip.dialect}` : clip.language || 'Unknown',
          likes: clip.likes_count || 0,
          comments: clip.comments_count || 0,
          validations: clip.validations_count || 0,
          duets: clip.duets_count || 0,
          timeAgo: getTimeAgo(clip.created_at),
          clip_type: clip.clip_type || 'original',
          original_clip_id: clip.original_clip_id
        }));

        setVoiceClips(transformedClips);
      }
    } catch (error) {
      console.error('Error fetching voice clips:', error);
    }
  };

  // Fetch user's video stories count (from video_clips)
  const fetchVideoStoriesCount = async () => {
    if (!authUser?.id) return;

    try {
      const { count, error } = await supabase
        .from('video_clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id);

      if (error) throw error;
      setVideoStoriesCount(count || 0);
    } catch (error) {
      console.error('Error fetching video stories count:', error);
    }
  };

  // Fetch follower/following counts
  const fetchFollowCounts = async () => {
    if (!authUser?.id) return;

    try {
      // Get follower count (people following this user)
      const { count: followerCount, error: followerError } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', authUser.id);

      if (followerError) throw followerError;
      setFollowerCount(followerCount || 0);

      // Get following count (people this user is following)
      const { count: followingCount, error: followingError } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', authUser.id);

      if (followingError) throw followingError;
      setFollowingCount(followingCount || 0);

    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  // Fetch User Badges and Progress
  const fetchBadges = async () => {
    try {
      // Fetch earned badges
      const userBadges = await badgesApi.getMyBadges();

      // Transform backend UserBadge to UI Badge
      const formattedBadges: Badge[] = userBadges.map(ub => ({
        id: ub.id,
        name: ub.name,
        description: ub.description,
        image_url: ub.imageUrl, // Map imageUrl to image_url
        category: ub.category,
        earned_at: ub.earnedAt
      }));
      setBadges(formattedBadges);

      // Fetch progress
      const progress = await badgesApi.getMyBadgeProgress();
      setBadgeProgress(progress);
    } catch (e) {
      console.error('Error fetching badges:', e);
    }
  };

  // Handle language selection
  const handleLanguageSelect = async (language: Language) => {
    if (!authUser?.id) return;

    try {
      // Update the profile with the new primary language
      const { error } = await supabase
        .from('profiles')
        .update({
          primary_language: language.dialect ? `${language.name} / ${language.dialect}` : language.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id);

      if (error) throw error;

      // Update local state
      setUserProfile(prev => prev ? {
        ...prev,
        primary_language: language.dialect ? `${language.name} / ${language.dialect}` : language.name
      } : null);

      setShowLanguagePicker(false);
      Alert.alert('Success', 'Primary language updated successfully!');
    } catch (error) {
      console.error('Error updating primary language:', error);
      Alert.alert('Error', 'Failed to update primary language');
    }
  };




  // Load all profile data
  const loadProfileData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchUserProfile(),
        fetchVoiceClips(),
        fetchFollowCounts(),
        // Removed duplicate calls
        fetchVideoStoriesCount(),
        fetchBadges(),
      ]);
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  // Avatar editing functions
  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Show action sheet
      Alert.alert(
        'Select Avatar',
        'Choose how you want to set your avatar',
        [
          {
            text: 'Camera',
            onPress: () => openCamera(),
          },
          {
            text: 'Photo Library',
            onPress: () => openImageLibrary(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open image library');
    }
  };

  const uploadAvatar = async (imageUri: string) => {
    if (!authUser?.id) return;

    setUploadingAvatar(true);

    try {
      // Create a unique filename with user ID as folder
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      // Basic security: ensure only the user's folder is accessed
      const filePath = `${authUser.id}/${fileName}`;

      // Use fetch to get the blob directly (more robust than base64)
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) {
        console.error('Supabase storage error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setUserProfile(prev => prev ? {
        ...prev,
        avatar_url: urlData.publicUrl
      } : null);

      Alert.alert('Success', 'Avatar updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to upload avatar: ${errorMessage}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Share profile
  const handleShareProfile = async () => {
    if (!userProfile) return;
    try {
      await Share.share({
        message: `Check out ${userProfile.full_name || userProfile.username}'s profile on LinguaLink!`,
        title: 'Share Profile',
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const openBioEditor = () => setShowEditProfile(true);

  // Load data when component mounts
  useEffect(() => {
    if (authUser?.id) {
      loadProfileData();
    }
  }, [authUser?.id]);

  // Render methods matching new design
  const renderNewVoiceClip = (clip: VoiceClip) => (
    <View key={clip.id} style={styles.clipRow}>
      <View style={styles.clipThumbnailContainer}>
        <Image
          source={{ uri: clip.original_clip_id ? 'https://via.placeholder.com/150/FF8A00/FFFFFF?text=Duet' : 'https://via.placeholder.com/150/FF8A00/FFFFFF?text=Audio' }}
          style={styles.clipThumbnail}
        />
        <View style={styles.playIconOverlay}>
          <Ionicons name="play" size={20} color="#FFF" />
        </View>
      </View>

      <View style={styles.clipInfo}>
        <Text style={[styles.clipTitle, { color: userTheme.text }]} numberOfLines={1}>{clip.phrase}</Text>
        <Text style={[styles.clipMeta, { color: userTheme.textSecondary }]} numberOfLines={1}>
          {clip.likes} likes • {clip.timeAgo}
        </Text>
        <View style={styles.languageBadge}>
          <Text style={styles.languageBadgeText}>{clip.language.toUpperCase()}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.moreBtn}>
        <Ionicons name="ellipsis-vertical" size={20} color={userTheme.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const { colors: userTheme, theme: currentTheme } = useTheme(); // Rename to avoid conflict if necessary, or just use colors

  // Dynamic styles based on theme
  const styles = useMemo(() => createStyles(userTheme, currentTheme), [userTheme, currentTheme]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle={currentTheme === 'dark' ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={userTheme.primary} />
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={currentTheme === 'dark' ? "light-content" : "dark-content"} />
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={64} color={userTheme.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProfileData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={userTheme.text} />
          <Text style={[styles.headerTitle, { color: userTheme.text }]}>My Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color={userTheme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={userTheme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Profile Header */}
        <View style={styles.compactHeader}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={pickImage} style={styles.compactAvatarWrapper}>
              <Image
                source={{ uri: userProfile?.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.compactAvatar}
              />
              <View style={styles.editAvatarBadge}>
                <Ionicons name="camera" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.compactInfo}>
              <Text style={styles.compactName}>{userProfile?.full_name || 'User'}</Text>
              <Text style={styles.compactHandle}>@{userProfile?.username || 'user'}</Text>
              <View style={styles.compactBadgeRow}>
                <View style={styles.compactBadge}>
                  <Text style={styles.compactBadgeText}>{userProfile?.primary_language || 'Member'}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.compactEditBtn} onPress={() => setShowEditProfile(true)}>
              <Ionicons name="pencil" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Compact Stats */}
          <View style={styles.compactStatsRow}>
            <View style={styles.compactStat}>
              <Text style={styles.compactStatValue}>{followerCount}</Text>
              <Text style={styles.compactStatLabel}>Followers</Text>
            </View>
            <View style={styles.compactStatDivider} />
            <View style={styles.compactStat}>
              <Text style={styles.compactStatValue}>{followingCount}</Text>
              <Text style={styles.compactStatLabel}>Following</Text>
            </View>
            <View style={styles.compactStatDivider} />
            <View style={styles.compactStat}>
              <Text style={styles.compactStatValue}>{voiceClips.length + videoStoriesCount}</Text>
              <Text style={styles.compactStatLabel}>Clips</Text>
            </View>
          </View>

          {!!userProfile?.bio && (
            <Text style={styles.compactBio} numberOfLines={2}>{userProfile.bio}</Text>
          )}
        </View>

        {/* Colorful Cards Navigation (Horizontal Scroll) */}
        <View style={{ height: 90, marginBottom: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {/* Clips Card */}
            <TouchableOpacity
              style={[styles.navCard, activeTab === 'My Clips' && styles.navCardActive, { backgroundColor: '#FF8A00', width: 100, height: 70, marginBottom: 0 }]}
              onPress={() => {
                setActiveTab('My Clips');
                horizontalScrollRef.current?.scrollTo({ x: 0, animated: true });
              }}
            >
              <LinearGradient colors={['#FF8A00', '#FF5500']} style={StyleSheet.absoluteFill} />
              <Ionicons name="mic" size={20} color="#FFF" />
              <Text style={[styles.navCardLabel, { fontSize: 12, marginTop: 4 }]} numberOfLines={1}>Clips</Text>
            </TouchableOpacity>

            {/* Badges Card */}
            <TouchableOpacity
              style={[styles.navCard, activeTab === 'Badges' && styles.navCardActive, { backgroundColor: '#8B5CF6', width: 100, height: 70, marginBottom: 0 }]}
              onPress={() => {
                setActiveTab('Badges');
                horizontalScrollRef.current?.scrollTo({ x: width, animated: true });
              }}
            >
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={StyleSheet.absoluteFill} />
              <Ionicons name="trophy" size={20} color="#FFF" />
              <Text style={[styles.navCardLabel, { fontSize: 12, marginTop: 4 }]} numberOfLines={1}>Badges</Text>
            </TouchableOpacity>

            {/* Rewards Card */}
            <TouchableOpacity
              style={[styles.navCard, activeTab === 'Rewards' && styles.navCardActive, { backgroundColor: '#10B981', width: 100, height: 70, marginBottom: 0 }]}
              onPress={() => {
                setActiveTab('Rewards');
                horizontalScrollRef.current?.scrollTo({ x: width * 2, animated: true });
              }}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={StyleSheet.absoluteFill} />
              <Ionicons name="wallet" size={20} color="#FFF" />
              <Text style={[styles.navCardLabel, { fontSize: 12, marginTop: 4 }]} numberOfLines={1}>Rewards</Text>
            </TouchableOpacity>

            {/* Ambassador Card */}
            <TouchableOpacity
              style={[styles.navCard, activeTab === 'Ambassador' && styles.navCardActive, { backgroundColor: '#3B82F6', width: 100, height: 70, marginBottom: 0 }]}
              onPress={() => {
                setActiveTab('Ambassador');
                horizontalScrollRef.current?.scrollTo({ x: width * 3, animated: true });
              }}
            >
              <LinearGradient colors={['#3B82F6', '#2563EB']} style={StyleSheet.absoluteFill} />
              <Ionicons name="people" size={20} color="#FFF" />
              <Text style={[styles.navCardLabel, { fontSize: 12, marginTop: 4 }]} numberOfLines={1}>Ambassador</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content Area - Swipable */}
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(ev) => {
            const newIndex = Math.round(ev.nativeEvent.contentOffset.x / width);
            const tabs = ['My Clips', 'Badges', 'Rewards', 'Ambassador'];
            if (tabs[newIndex] && tabs[newIndex] !== activeTab) {
              setActiveTab(tabs[newIndex] as any);
            }
          }}
          scrollEventThrottle={16}
        >
          {/* Page 1: My Clips */}
          <View style={{ width, minHeight: 400 }}>
            <View style={{ paddingHorizontal: 0 }}>
              <Text style={[styles.sectionHeaderTitle, { color: userTheme.text }]}>My Voice & Video Clips</Text>
              {voiceClips.length > 0 ? (
                voiceClips.map(renderNewVoiceClip)
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="mic-outline" size={48} color={userTheme.textMuted} />
                  <Text style={[styles.emptyText, { color: userTheme.textSecondary }]}>No clips shared yet.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Page 2: Badges */}
          <View style={{ width, minHeight: 400 }}>
            <View style={{ paddingHorizontal: 0 }}>
              <Text style={[styles.sectionHeaderTitle, { color: userTheme.text }]}>Achievements</Text>
              <TrophyCase
                badges={badges}
                onBadgePress={(badge) => {
                  setSelectedBadge(badge);
                  setShowBadgeModal(true);
                }}
                showViewAll={false}
                maxDisplay={0}
              />
            </View>
          </View>

          {/* Page 3: Rewards */}
          <View style={{ width, minHeight: 400 }}>
            <View style={{ paddingHorizontal: 0 }}>
              <Text style={[styles.sectionHeaderTitle, { color: userTheme.text }]}>Earnings & Transactions</Text>
              <View style={{ padding: 16 }}>
                <EarningsCard
                  userId={userProfile?.id || ''}
                  onTopUpPress={() => setShowTopUpModal(true)}
                />
                <View style={{ height: 20 }} />
                <PendingRewards userId={userProfile?.id || ''} />
                <View style={{ height: 20 }} />
                <TransactionHistory userId={userProfile?.id || ''} />
              </View>
            </View>
          </View>

          {/* Page 4: Ambassador */}
          <View style={{ width, minHeight: 400 }}>
            <View style={{ paddingHorizontal: 0 }}>
              <Text style={[styles.sectionHeaderTitle, { color: userTheme.text }]}>Ambassador Program</Text>
              <AmbassadorSection navigation={navigation} user={userProfile} />
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Modals reuse existing state */}
      <TopUpModal
        visible={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
      />

      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        currentProfile={userProfile}
        onUpdate={onRefresh}
      />

      <BadgeDetailModal
        visible={showBadgeModal}
        badge={selectedBadge}
        onClose={() => setShowBadgeModal(false)}
      />

    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: colors.textSecondary, marginTop: 16 },
  errorText: { color: colors.textSecondary, marginVertical: 16, textAlign: 'center' },
  retryBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginLeft: 12,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primary,
    overflow: 'hidden',
    zIndex: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  avatarGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: colors.primary,
    opacity: 0.2,
    transform: [{ scale: 1.2 }],
  },
  masterBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 3,
    borderWidth: 2,
    borderColor: colors.background,
    gap: 4,
  },
  masterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  profileHandle: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 12,
    fontWeight: '500',
  },
  profileBio: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 16,
  },
  editBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3c2348', // Dark purple from design
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  shareBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shareBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  glassCard: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  },
  activeStatCard: {
    backgroundColor: 'rgba(255, 138, 0, 0.1)', // Orange tint
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 0, 0.2)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  activeStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabContainer: {
    backgroundColor: 'rgba(28, 16, 34, 0.95)',
    zIndex: 10,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabRow: {
    paddingHorizontal: 16,
    flexDirection: 'row', // Ensure row direction for scrollview content
    minWidth: '100%',
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
  },
  listContainer: {
    // Removed padding, handled by pages
  },
  rewardsContainer: {
    flex: 1,
  },
  clipRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  clipThumbnailContainer: {
    position: 'relative',
    marginRight: 16,
  },
  clipThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  clipInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  clipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  clipMeta: {
    fontSize: 14,
    color: '#b792c9',
    marginBottom: 6,
  },
  languageBadge: {
    backgroundColor: 'rgba(255, 138, 0, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  languageBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  moreBtn: {
    padding: 8,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30, // Above bottom tabs
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  fab: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 32,
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.background, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 16 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, color: '#FFF', height: 120, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: 12 },
  cancelText: { color: colors.textSecondary },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  saveText: { color: '#FFF', fontWeight: 'bold' },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  badgeItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeImage: {
    width: '60%',
    height: '60%',
    marginBottom: 8,
    resizeMode: 'contain',
  },
  badgeName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  statItemCompact: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumberCompact: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabelCompact: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },

  // New Stats Cards
  statsCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  statsCardWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  statsCardGradient: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
  },
  statsCardIcon: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
  },
  statsCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  statsCardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },

  // NEW STYLES for Compact Profile & Colorful Cards
  compactHeader: {
    padding: 16,
    paddingTop: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  compactAvatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 16,
    position: 'relative',
  },
  compactAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#333',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  compactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  compactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  compactHandle: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 4,
  },
  compactBadgeRow: {
    flexDirection: 'row',
  },
  compactBadge: {
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  compactBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  compactEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  compactStat: {
    flex: 1,
    alignItems: 'center',
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  compactStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  compactStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  compactBio: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Colorful Navigation Cards
  cardsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  navCard: {
    width: 100,
    height: 70,
    borderRadius: 12,
    padding: 8,
    marginRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // Removed overflow: hidden to allow shadows to show
    // Removed borderWidth to avoid clipping issues
  },
  navCardActive: {
    transform: [{ scale: 1.05 }],
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  navCardLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },

  contentArea: {
    minHeight: 400,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
});

export default ProfileScreen;