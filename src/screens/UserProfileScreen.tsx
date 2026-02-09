// src/screens/UserProfileScreen.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import { submitValidation } from '../utils/content';
import ReportModal, { ReportReason } from '../components/ReportModal';
import { API_BASE_URL } from '../config';
import { Colors, Typography, Layout } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';

const { width, height } = Dimensions.get('window');

type UserProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: UserProfileScreenNavigationProp;
  route: {
    params: {
      userId: string;
    };
  };
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
  user_role?: 'user' | 'validator' | 'ambassador';
  total_validations_count?: number;
  accuracy_rating?: number;
  active_days_count?: number;
}

const UserProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'Clips' | 'Badges' | 'Rewards'>('Clips');
  const horizontalScrollRef = React.useRef<ScrollView>(null);

  // State for real data
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [voiceClips, setVoiceClips] = useState<VoiceClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow functionality state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [mutualFollowersCount, setMutualFollowersCount] = useState<number | null>(null);
  const [videoStoriesCount, setVideoStoriesCount] = useState(0);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);

  const targetUserId = route.params.userId;

  // Handle report submission
  const handleReportSubmit = async (reason: ReportReason, details?: string) => {
    if (!authUser?.id || !targetUserId) {
      throw new Error('Unable to submit report');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/moderation/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': authUser.id,
        },
        body: JSON.stringify({
          reportedUserId: targetUserId,
          reason,
          additionalDetails: details,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit report');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to submit report');
    }
  };

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
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
    return formatter.format(date);
  };

  // Fetch user profile from database
  const fetchUserProfile = async () => {
    if (!targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) {
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

  // Fetch user's voice clips from database
  const fetchVoiceClips = async () => {
    if (!targetUserId) return;

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
        .eq('user_id', targetUserId)
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
    if (!targetUserId) return;
    try {
      const { count, error } = await supabase
        .from('video_clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUserId);
      if (error) throw error;
      setVideoStoriesCount(count || 0);
    } catch (e) {
      console.error('Error fetching video stories count:', e);
    }
  };

  // Fetch follow status and counts
  const fetchFollowData = async () => {
    if (!authUser?.id || !targetUserId) return;

    try {
      // Check if current user is following target user
      const { data: followData, error: followError } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', authUser.id)
        .eq('following_id', targetUserId)
        .single();

      if (followError && followError.code !== 'PGRST116') {
        throw followError;
      }

      setIsFollowing(!!followData);

      // Get follower count
      const { count: followerCount, error: followerError } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      if (followerError) throw followerError;
      setFollowerCount(followerCount || 0);

      // Get following count
      const { count: followingCount, error: followingError } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      if (followingError) throw followingError;
      setFollowingCount(followingCount || 0);

      // Mutual followers between current viewer and target user
      const { data: mutualCount, error: mutualError } = await supabase
        .rpc('get_mutual_followers_count', { viewer: authUser.id, profile: targetUserId });
      if (mutualError) throw mutualError;
      setMutualFollowersCount(typeof mutualCount === 'number' ? mutualCount : 0);

    } catch (error) {
      console.error('Error fetching follow data:', error);
    }
  };

  // Follow/Unfollow functionality
  const toggleFollow = async () => {
    if (!authUser?.id || !targetUserId || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', authUser.id)
          .eq('following_id', targetUserId);

        if (error) throw error;
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        // Follow
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: authUser.id,
            following_id: targetUserId
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  // Quick validation functionality
  const handleQuickValidation = async (clipId: string, isCorrect: boolean) => {
    if (!authUser?.id) {
      Alert.alert('Error', 'Please sign in to validate clips');
      return;
    }

    try {
      const success = await submitValidation(
        clipId,
        'pronunciation', // Default to pronunciation validation
        isCorrect ? 4 : 2, // 4 for correct, 2 for needs improvement
        undefined, // No feedback for quick validation
        isCorrect
      );

      if (success) {
        // Update local state
        setVoiceClips(prevClips =>
          prevClips.map(clip =>
            clip.id === clipId
              ? {
                ...clip,
                validations: clip.validations + 1
              }
              : clip
          )
        );

        Alert.alert(
          'Validation Submitted',
          `Thank you for validating this pronunciation as ${isCorrect ? 'correct' : 'needs improvement'}.`
        );
      } else {
        Alert.alert('Error', 'Failed to submit validation. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting validation:', error);
      Alert.alert('Error', 'Failed to submit validation');
    }
  };

  // Duet functionality
  const handleDuet = (clip: VoiceClip) => {
    if (!authUser?.id) {
      Alert.alert('Error', 'Please sign in to create duets');
      return;
    }

    navigation.navigate('RecordVoice', {
      isDuet: true,
      originalClip: {
        id: clip.id,
        phrase: clip.phrase,
        user: userProfile?.full_name || 'User',
        language: userProfile?.primary_language || 'Unknown'
      }
    });
  };

  // Load all profile data
  const loadProfileData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchUserProfile(),
        fetchVoiceClips(),
        fetchFollowData(),
        fetchVideoStoriesCount()
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

  // Load data when component mounts
  useEffect(() => {
    if (targetUserId) {
      loadProfileData();
    }
  }, [targetUserId]);

  const renderVoiceClip = (clip: VoiceClip) => (
    <View key={clip.id} style={styles.clipCard}>
      <View style={styles.clipHeader}>
        <View style={styles.clipHeaderLeft}>
          <Text style={styles.clipPhrase}>{clip.phrase}</Text>
          {clip.clip_type === 'duet' && (
            <View style={styles.duetBadge}>
              <Ionicons name="people" size={12} color="#8B5CF6" />
              <Text style={styles.duetBadgeText}>Duet</Text>
            </View>
          )}
        </View>
        <Text style={styles.clipTime}>{clip.timeAgo}</Text>
      </View>
      <Text style={styles.clipLanguage}>{clip.language}</Text>

      {clip.clip_type === 'duet' && (
        <View style={styles.duetInfo}>
          <Text style={styles.duetInfoText}>
            This is a duet response
          </Text>
        </View>
      )}

      <View style={styles.clipStats}>
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={16} color="#FF8A00" />
          <Text style={styles.statText}>{clip.likes}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble" size={16} color="#6B7280" />
          <Text style={styles.statText}>{clip.comments}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.statText}>{clip.validations}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color="#8B5CF6" />
          <Text style={styles.statText}>{clip.duets}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.clipActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleQuickValidation(clip.id, true)}
        >
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.actionText}>Correct</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleQuickValidation(clip.id, false)}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
          <Text style={styles.actionText}>Needs Work</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDuet(clip)}
        >
          <Ionicons name="people" size={20} color="#8B5CF6" />
          <Text style={styles.actionText}>Duet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />
        <View style={[styles.header, { paddingTop: insets.top + height * 0.02 }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
        </View>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#FF8A00" />
          <Text style={[styles.emptyStateTitle, { marginTop: 16 }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />
        <View style={[styles.header, { paddingTop: insets.top + height * 0.02 }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
        </View>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="alert-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>{error}</Text>
          <TouchableOpacity style={styles.recordButton} onPress={loadProfileData}>
            <Text style={styles.recordButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      {isDark && (
        <LinearGradient
          colors={['#1F0800', '#0D0200']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.reportBtn}>
            <Ionicons name="flag-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        stickyHeaderIndices={[3]} // Make the Tab Container sticky (index 3 in the scrollview: 0=Profile, 1=FollowBtn, 2=Stats, 3=Tabs)
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.profileInfo}>
          <View style={styles.profileHeaderCompact}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                {userProfile?.avatar_url ? (
                  <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.text }]}>{userProfile?.username?.charAt(0)?.toUpperCase() || 'U'}</Text>
                )}
              </View>
            </View>

            <View style={styles.profileTextInfo}>
              <View style={styles.profileNameRow}>
                <Text style={[styles.profileName, { color: colors.text }]}>{userProfile?.full_name || 'User'}</Text>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={styles.verifiedIcon} />
              </View>
              <Text style={[styles.profileUsername, { color: colors.primary }]}>@{userProfile?.username || 'user'}</Text>

              {/* Role Badge */}
              <View style={[styles.roleBadge, { backgroundColor: isDark ? 'rgba(255, 138, 0, 0.15)' : 'rgba(255, 138, 0, 0.1)' }]}>
                <Ionicons
                  name={userProfile?.user_role === 'ambassador' ? 'star' : userProfile?.user_role === 'validator' ? 'ribbon' : 'person'}
                  size={12}
                  color={Colors.primary}
                />
                <Text style={styles.roleText}>
                  {userProfile?.user_role ? userProfile.user_role.charAt(0).toUpperCase() + userProfile.user_role.slice(1) : 'User'}
                </Text>
              </View>

              <View style={styles.metaRowCompact}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>{userProfile?.location || 'Global'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>Joined {formatJoinDate(userProfile?.created_at)}</Text>
                </View>
              </View>
            </View>
          </View>

          {!!userProfile?.bio && <Text style={[styles.bioText, { color: colors.textSecondary }]}>{userProfile.bio}</Text>}

          <View style={styles.followStats}>
            <TouchableOpacity style={styles.followStatItem}>
              <Text style={[styles.followStatNumber, { color: colors.text }]}>{followerCount}</Text>
              <Text style={[styles.followStatLabel, { color: colors.textSecondary }]}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.followStatItem}>
              <Text style={[styles.followStatNumber, { color: colors.text }]}>{followingCount}</Text>
              <Text style={[styles.followStatLabel, { color: colors.textSecondary }]}>Following</Text>
            </TouchableOpacity>
            {mutualFollowersCount !== null && mutualFollowersCount > 0 && (
              <View style={styles.followStatItem}>
                <Text style={[styles.followStatNumber, { color: colors.text }]}>{mutualFollowersCount}</Text>
                <Text style={[styles.followStatLabel, { color: colors.textSecondary }]}>Mutual</Text>
              </View>
            )}
          </View>
        </View>

        {/* Prominent Follow Button Area */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            onPress={toggleFollow}
            style={[styles.bigFollowBtn, isFollowing ? styles.bigFollowingBtn : styles.bigFollowBtnPrimary]}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={[styles.bigFollowBtnText, isFollowing && styles.bigFollowingBtnText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
                {!isFollowing && <Ionicons name="add" size={18} color="#000" style={{ marginLeft: 4 }} />}
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              if (!authUser?.id || !targetUserId) return;
              try {
                const { data, error } = await supabase.rpc('create_or_get_dm', { target: targetUserId });
                if (error) throw error;
                navigation.navigate('ChatDetail', {
                  contact: {
                    id: targetUserId,
                    name: userProfile?.full_name || 'User',
                    username: userProfile?.username || 'user',
                    avatar: (userProfile?.full_name || 'U').trim().charAt(0).toUpperCase(),
                    language: userProfile?.primary_language || '—',
                    isOnline: false,
                  },
                  conversationId: data,
                });
              } catch (e: any) {
                console.error('Error starting chat:', e);
                Alert.alert('Error', `Failed to start chat: ${e.message || 'Unknown error'}`);
              }
            }}
            style={styles.bigMessageBtn}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF" />
            <Text style={styles.bigMessageBtnText}>Message</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <GlassCard style={styles.smallStatCard}>
            <Text style={styles.statVal}>{voiceClips.length}</Text>
            <Text style={styles.statLab}>Clips</Text>
          </GlassCard>

          <GlassCard style={styles.smallStatCard}>
            <Text style={styles.statVal}>{voiceClips.reduce((sum, clip) => sum + clip.duets, 0)}</Text>
            <Text style={styles.statLab}>Duets</Text>
          </GlassCard>

          <GlassCard style={[styles.smallStatCard, { borderColor: Colors.primary }]}>
            <Text style={[styles.statVal, { color: Colors.primary }]}>
              {voiceClips.reduce((sum, clip) => sum + clip.validations, 0)}
            </Text>
            <Text style={styles.statLab}>Val'ns</Text>
          </GlassCard>

          <GlassCard style={styles.smallStatCard}>
            <Text style={styles.statVal}>{videoStoriesCount}</Text>
            <Text style={styles.statLab}>Stories</Text>
          </GlassCard>
        </View>

        {/* Tab Navigation */}
        <View style={{ backgroundColor: colors.background }}>
          <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
            {['Clips', 'Badges', 'Rewards'].map((tab, index) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && { borderBottomColor: colors.primary }
                ]}
                onPress={() => {
                  setActiveTab(tab as typeof activeTab);
                  horizontalScrollRef.current?.scrollTo({ x: index * width, animated: true });
                }}
              >
                <Text style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  activeTab === tab && { color: colors.text, fontWeight: '700' }
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Swipable Content */}
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(ev) => {
            const newIndex = Math.round(ev.nativeEvent.contentOffset.x / width);
            const tabs = ['Clips', 'Badges', 'Rewards'];
            if (tabs[newIndex] && tabs[newIndex] !== activeTab) {
              setActiveTab(tabs[newIndex] as any);
            }
          }}
          scrollEventThrottle={16}
        >
          {/* Page 1: Clips */}
          <View style={{ width, minHeight: 400 }}>
            <View style={styles.clipsSection}>
              {voiceClips.length > 0 ? (
                voiceClips.map(renderVoiceClip)
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="mic-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyStateTitle}>No clips yet</Text>
                  <Text style={styles.emptyStateDescription}>
                    This user hasn't shared any clips yet
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Page 2: Badges */}
          <View style={{ width, minHeight: 400 }}>
            <View style={styles.badgesSection}>
              {/* Promotion Progress (Only for Users) */}
              {userProfile?.user_role === 'user' && (
                <View style={[styles.progressCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressTitle, { color: colors.text }]}>Path to Validator</Text>
                    <Ionicons name="ribbon-outline" size={20} color={Colors.primary} />
                  </View>
                  <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
                    Unlock 1.4x rewards and validation tools
                  </Text>

                  {/* Validations Progress */}
                  <View style={styles.progressItem}>
                    <View style={styles.progressLabelRow}>
                      <Text style={[styles.progressLabel, { color: colors.text }]}>Validations</Text>
                      <Text style={[styles.progressValue, { color: colors.text }]}>
                        {userProfile?.total_validations_count || 0} / 200
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(((userProfile?.total_validations_count || 0) / 200) * 100, 100)}%` }
                        ]}
                      />
                    </View>
                  </View>

                  {/* Active Days Progress */}
                  <View style={styles.progressItem}>
                    <View style={styles.progressLabelRow}>
                      <Text style={[styles.progressLabel, { color: colors.text }]}>Active Days</Text>
                      <Text style={[styles.progressValue, { color: colors.text }]}>
                        {userProfile?.active_days_count || 0} / 10
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(((userProfile?.active_days_count || 0) / 10) * 100, 100)}%` }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.badgeCard}>
                <View style={styles.badgeIcon}>
                  <Ionicons name="sparkles" size={32} color="#FF8A00" />
                </View>
                <View style={styles.badgeContent}>
                  <Text style={styles.badgeTitle}>Language Pioneer</Text>
                  <Text style={styles.badgeDescription}>
                    Welcome to Lingualink AI! Ready to preserve languages.
                  </Text>
                  <Text style={styles.badgeDate}>Earned today</Text>
                </View>
              </View>

              <View style={styles.lockedBadgesContainer}>
                <Text style={styles.sectionTitle}>Locked Badges</Text>
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
                  <Text style={styles.lockedBadgeText}>First Recording</Text>
                </View>
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
                  <Text style={styles.lockedBadgeText}>Story Teller</Text>
                </View>
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
                  <Text style={styles.lockedBadgeText}>Community Helper</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Page 3: Rewards */}
          <View style={{ width, minHeight: 400 }}>
            <View style={styles.rewardsSection}>
              <View style={styles.emptyState}>
                <Ionicons name="gift-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyStateTitle}>No rewards yet</Text>
                <Text style={styles.emptyStateDescription}>
                  Earn points by contributing to unlock rewards
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        reportedUserName={userProfile?.full_name}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0200' },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF8A00',
  },
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 0, 0.2)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF8A00',
    borderRadius: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginLeft: 12 },
  headerActions: { flexDirection: 'row', gap: 12 },

  reportBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },

  profileInfo: { paddingHorizontal: 20, paddingVertical: 16 },
  profileHeaderCompact: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarContainer: { marginRight: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: Colors.primary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  profileTextInfo: { flex: 1, justifyContent: 'center' },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  verifiedIcon: { marginTop: 2 },
  profileUsername: { fontSize: 14, color: Colors.primary, fontWeight: '500', marginTop: 0 },
  metaRowCompact: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  bioText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginBottom: 16 },
  followStats: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  followStatItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  followStatNumber: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  followStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  // New Action Buttons
  actionButtonsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  bigFollowBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bigFollowBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bigFollowingBtn: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' },
  bigFollowBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },
  bigFollowingBtnText: { color: '#FFF' },
  bigMessageBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  bigMessageBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF', marginLeft: 8 },

  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 4 },
  smallStatCard: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 16 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  statLab: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tab: { marginRight: 24, paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  activeTabText: { color: '#FFF' },
  content: { flex: 1 },
  clipsSection: { padding: 20 },
  clipCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  clipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  clipHeaderLeft: { flex: 1 },
  clipPhrase: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  clipTime: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  clipLanguage: { fontSize: 13, color: Colors.primary, fontWeight: '500', marginBottom: 12 },
  duetBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  duetBadgeText: { fontSize: 10, color: '#8B5CF6', fontWeight: 'bold', marginLeft: 4 },
  duetInfo: { marginTop: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  duetInfoText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  clipStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  clipActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  badgesSection: { padding: 20 },
  badgeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 16 },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,138,0,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  badgeContent: { flex: 1 },
  badgeTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  badgeDescription: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  badgeDate: { fontSize: 11, color: Colors.primary, fontWeight: 'bold', marginTop: 4 },
  lockedBadgesContainer: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 16 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, marginBottom: 8, opacity: 0.6 },
  lockedBadgeText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 12 },
  rewardsSection: { padding: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginTop: 16 },
  emptyStateDescription: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 260 },
  recordButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 24 },
  recordButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});

export default UserProfileScreen;
