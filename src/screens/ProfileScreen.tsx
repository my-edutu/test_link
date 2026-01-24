
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { CompositeNavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import LanguagePicker from '../components/LanguagePicker';
import BadgeDetailModal, { Badge } from '../components/BadgeDetailModal';
import TrophyCase from '../components/TrophyCase';
import EarningsCard from '../components/EarningsCard';
import TransactionHistory from '../components/TransactionHistory';
import PendingRewards from '../components/PendingRewards';
import AmbassadorScreen from './AmbassadorScreen';
import TopUpModal from '../components/TopUpModal';

const { width, height } = Dimensions.get('window');

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

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

  // Avatar editing state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Follow counts state
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Badge State
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  // Language picker state
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | undefined>(undefined);

  // Bio editor state
  const [showBioEditor, setShowBioEditor] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const BIO_CHAR_LIMIT = 200;

  // Location editor state
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [locationInput, setLocationInput] = useState('');

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
        .order('created_at', { ascending: false });

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

  // Fetch User Badges
  const fetchBadges = async () => {
    if (!authUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          earned_at,
          badge:badges (
            id,
            name,
            description,
            image_url,
            category
          )
        `)
        .eq('user_id', authUser.id);

      if (error) throw error;

      if (data) {
        // Flatten the structure
        const formattedBadges: Badge[] = data.map((item: any) => ({
          ...item.badge,
          earned_at: item.earned_at
        }));
        setBadges(formattedBadges);
      }
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

  // Open bio editor prefilled
  const openBioEditor = () => {
    setBioInput(userProfile?.bio || '');
    setShowBioEditor(true);
  };

  // Save bio to Supabase and local state
  const saveBio = async () => {
    if (!authUser?.id) return;
    const input = bioInput.trim();
    if (input.length > BIO_CHAR_LIMIT) {
      Alert.alert('Bio too long', `Please keep it under ${BIO_CHAR_LIMIT} characters.`);
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: input, updated_at: new Date().toISOString() })
        .eq('id', authUser.id);
      if (error) throw error;
      setUserProfile(prev => prev ? { ...prev, bio: input } : prev);
      setShowBioEditor(false);
    } catch (e) {
      console.error('Error saving bio:', e);
      Alert.alert('Error', 'Failed to save bio. Please try again.');
    }
  };

  // Open location editor prefilled
  const openLocationEditor = () => {
    setLocationInput(userProfile?.location || '');
    setShowLocationEditor(true);
  };

  // Save location
  const saveLocation = async () => {
    if (!authUser?.id) return;
    const input = locationInput.trim();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ location: input || null, updated_at: new Date().toISOString() })
        .eq('id', authUser.id);
      if (error) throw error;
      setUserProfile(prev => prev ? { ...prev, location: input || undefined } : prev);
      setShowLocationEditor(false);
    } catch (e) {
      console.error('Error saving location:', e);
      Alert.alert('Error', 'Failed to save location. Please try again.');
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
        fetchVoiceClips(),
        fetchFollowCounts(),
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
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;

      // Read file as base64 using FileSystem
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, bytes, {
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
        <Text style={styles.clipTitle} numberOfLines={1}>{clip.phrase}</Text>
        <Text style={styles.clipMeta} numberOfLines={1}>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-sharp" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={userTheme.primary} />}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGlow} />
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
              <Image
                source={{ uri: userProfile?.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <View style={styles.masterBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#FFF" />
              <Text style={styles.masterBadgeText}>Language Master</Text>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userProfile?.full_name || 'User'}</Text>
            <Text style={styles.profileHandle}>@{userProfile?.username || 'user'} • Top 1% Contributor</Text>
            <TouchableOpacity onPress={openBioEditor}>
              <Text style={styles.profileBio}>
                {userProfile?.bio || "Preserving the mother tongue, one proverb at a time. #RepYourRegion"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={openBioEditor}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn}>
              <Ionicons name="share-social" size={18} color="#FFF" />
              <Text style={styles.shareBtnText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.glassCard]}>
            <Text style={styles.statNumber}>{followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={[styles.statCard, styles.glassCard]}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={[styles.statCard, styles.activeStatCard]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.activeStatNumber}>42</Text>
              <Ionicons name="flame" size={18} color={userTheme.primary} />
            </View>
            <Text style={[styles.statLabel, { color: userTheme.primary }]}>Day Streak</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <View style={styles.tabRow}>
            {['My Clips', 'Badges', 'Rewards', 'Ambassador'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab as any)}
                style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              >
                <Text style={[styles.tabText, activeTab === tab ? [styles.tabTextActive, { color: '#FFF' }] : { color: userTheme.textSecondary }]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content List */}
        <View style={styles.listContainer}>
          {activeTab === 'My Clips' && (
            voiceClips.length > 0 ? (
              voiceClips.map(renderNewVoiceClip)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No clips yet.</Text>
              </View>
            )
          )}
          {activeTab === 'Badges' && (
            <TrophyCase
              badges={badges}
              onBadgePress={(badge) => {
                setSelectedBadge(badge);
                setShowBadgeModal(true);
              }}
              showViewAll={false}
              maxDisplay={0}
            />
          )}
          {activeTab === 'Rewards' && authUser?.id && (
            <View style={styles.rewardsContainer}>
              <EarningsCard
                userId={authUser.id}
                onWithdrawPress={() => navigation.navigate('Withdrawal')}
                onTopUpPress={() => setShowTopUpModal(true)}
              />

              {/* Royalty / Remix Earnings Section */}
              <TouchableOpacity
                style={[styles.statCard, { marginHorizontal: 0, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => navigation.navigate('RemixHistory')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="musical-notes" size={20} color="#FFF" />
                  </View>
                  <View>
                    <Text style={[styles.statNumber, { fontSize: 16 }]}>Remix Royalties</Text>
                    <Text style={styles.statLabel}>View earnings from your clips</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={userTheme.textSecondary} />
              </TouchableOpacity>

              <PendingRewards userId={authUser.id} />
              <TransactionHistory userId={authUser.id} />
            </View>
          )}
          {activeTab === 'Ambassador' && (
            <AmbassadorScreen />
          )}
        </View>

      </ScrollView>

      {/* Floating Record Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('RecordVoice')}>
          <Ionicons name="videocam" size={24} color="#FFF" />
          <Text style={styles.fabText}>Record New Clip</Text>
        </TouchableOpacity>
      </View>

      {/* Modals reuse existing state */}
      <TopUpModal
        visible={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
      />
      <Modal visible={showBioEditor} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Bio</Text>
            <TextInput
              style={styles.modalInput}
              value={bioInput}
              onChangeText={setBioInput}
              multiline
              maxLength={BIO_CHAR_LIMIT}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowBioEditor(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBio} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    backgroundColor: 'rgba(28, 16, 34, 0.8)', // Semi-transparent dark
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    color: '#FFF',
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
    color: '#b792c9', // From design
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeStatCard: {
    backgroundColor: 'rgba(255, 138, 0, 0.1)', // Orange tint
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 0, 0.2)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
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
    color: '#b792c9', // Muted purple text
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabContainer: {
    backgroundColor: 'rgba(28, 16, 34, 0.95)',
    zIndex: 10,
    paddingTop: 16,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFF',
  },
  listContainer: {
    paddingTop: 8,
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
});

export default ProfileScreen;