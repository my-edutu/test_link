// src/screens/LibraryScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NewtonCradleLoader } from '../components/NewtonCradleLoader';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../../App';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { getPlayableAudioUrl, getPlayableVideoUrl } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Layout, Gradients } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Helper function to format time ago
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
};

interface VoiceClip {
  id: string;
  phrase: string;
  translation?: string;
  audio_url?: string;
  duration?: number;
  created_at: string;
  likes_count: number;
  comments_count: number;
  validations_count: number;
  is_validated: boolean;
}

interface VideoClip {
  id: string;
  phrase: string;
  translation?: string;
  video_url?: string;
  thumbnail_url?: string | null;
  duration?: number | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

type LibraryScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Library'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: LibraryScreenNavigationProp;
}

const LibraryScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'Voice Clips' | 'Video Clips' | 'AI Stories'>('Voice Clips');
  const insets = useSafeAreaInsets();
  const [voiceClips, setVoiceClips] = useState<VoiceClip[]>([]);
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<string | null>(null);
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  // Fetch user's voice clips
  const fetchVoiceClips = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data: clips, error } = await supabase
        .from('voice_clips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice clips:', error);
        return;
      }

      setVoiceClips(clips || []);

      // Fetch user's video clips
      const { data: vids, error: vidsErr } = await supabase
        .from('video_clips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (vidsErr) {
        console.error('Error fetching video clips:', vidsErr);
      }
      setVideoClips(vids || []);
    } catch (error) {
      console.error('Error in fetchVoiceClips:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    fetchVoiceClips();
  }, [fetchVoiceClips]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchVoiceClips();
    }, [fetchVoiceClips])
  );

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handleAudioPlay = async (clipId: string, audioUrl?: string) => {
    if (!audioUrl) {
      Alert.alert('No Audio', 'This clip does not have an audio file');
      return;
    }

    try {
      // If this clip is already playing, stop it
      if (currentPlayingId === clipId && sound) {
        await sound.stopAsync();
        setCurrentPlayingId(null);
        return;
      }

      // Stop any currently playing audio
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      setIsLoadingAudio(clipId);

      // Get playable URL
      const resolvedUrl = await getPlayableAudioUrl(audioUrl);
      if (!resolvedUrl) {
        setIsLoadingAudio(null);
        Alert.alert('Error', 'Failed to load audio file');
        return;
      }

      // Create and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: resolvedUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setCurrentPlayingId(clipId);
      setIsLoadingAudio(null);

      // Set up cleanup when audio finishes
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setCurrentPlayingId(null);
          setSound(null);
        }
      });

      console.log('Playing audio:', resolvedUrl);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoadingAudio(null);
      Alert.alert('Error', 'Failed to play audio file');
    }
  };

  const renderVideoClip = (clip: VideoClip) => (
    <GlassCard intensity={15} key={clip.id} style={styles.videoCard}>
      <View style={styles.videoThumb}>
        <Ionicons name="videocam" size={32} color="rgba(255, 255, 255, 0.2)" />
        <View style={styles.videoDurationBadge}>
          <Text style={styles.videoDurationBadgeText}>
            {clip.duration ? `${Math.floor((clip.duration || 0) / 60)}:${(((clip.duration || 0) % 60) + '').padStart(2, '0')}` : '0:00'}
          </Text>
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text numberOfLines={1} style={[styles.videoCaption, { color: colors.text }]}>{clip.phrase || 'Video'}</Text>
        <Text style={[styles.clipDate, { color: colors.textSecondary }]}>{getTimeAgo(clip.created_at)}</Text>
      </View>
    </GlassCard>
  );

  const confirmDeleteClip = (clip: VoiceClip) => {
    Alert.alert(
      'Delete Clip',
      'Are you sure you want to delete this clip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteClip(clip) },
      ]
    );
  };

  const handleDeleteClip = async (clip: VoiceClip) => {
    if (!user) return;

    try {
      // Optimistic UI: remove locally first
      setVoiceClips(prev => prev.filter(c => c.id !== clip.id));

      // Delete DB row
      const { error } = await supabase
        .from('voice_clips')
        .delete()
        .eq('id', clip.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting voice clip:', error);
        // Revert UI on failure
        setVoiceClips(prev => [clip, ...prev]);
        Alert.alert('Error', 'Failed to delete clip');
        return;
      }

      // Attempt storage cleanup if path-like audio_url is present
      if (clip.audio_url && !/^https?:\/\//i.test(clip.audio_url)) {
        try {
          // best-effort; ignore failure
          await supabase.storage.from('voice-clips').remove([clip.audio_url]);
        } catch { }
      }
    } catch (e) {
      console.error('Delete clip exception:', e);
      // Reload to be safe
      fetchVoiceClips();
    }
  };

  const renderVoiceClip = (clip: VoiceClip) => (
    <GlassCard intensity={15} key={clip.id} style={styles.clipCard}>
      <View style={styles.clipHeader}>
        <View style={styles.clipInfo}>
          <Text style={[styles.clipPhrase, { color: colors.text }]}>{clip.phrase}</Text>
          {clip.translation && (
            <Text style={styles.clipTranslation}>{clip.translation}</Text>
          )}
          <Text style={[styles.clipDate, { color: colors.textSecondary }]}>{getTimeAgo(clip.created_at)}</Text>
        </View>
        <View style={styles.clipStats}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={14} color="rgba(255, 255, 255, 0.4)" />
            <Text style={styles.statText}>{clip.likes_count}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={14} color={clip.is_validated ? "#10B981" : "rgba(255, 255, 255, 0.4)"} />
            <Text style={styles.statText}>{clip.validations_count}</Text>
          </View>
        </View>
      </View>

      {clip.audio_url && (
        <View style={styles.audioSection}>
          <TouchableOpacity
            style={styles.voicePlayButton}
            onPress={() => handleAudioPlay(clip.id, clip.audio_url)}
          >
            <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
            {isLoadingAudio === clip.id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : currentPlayingId === clip.id ? (
              <Ionicons name="pause" size={18} color="#FFFFFF" />
            ) : (
              <Ionicons name="play" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <View style={styles.waveformContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.waveformBar,
                  {
                    height: Math.random() * 16 + 4,
                    backgroundColor: currentPlayingId === clip.id ? Colors.primary : 'rgba(255, 255, 255, 0.2)'
                  }
                ]}
              />
            ))}
          </View>
          <Text style={styles.durationText}>
            {clip.duration ? `${Math.floor(clip.duration / 60)}:${(clip.duration % 60).toString().padStart(2, '0')}` : '0:03'}
          </Text>
        </View>
      )}

      <View style={[styles.clipActions, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
          <Ionicons name="share-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}
          onPress={() => confirmDeleteClip(clip)}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );

  // Create a ref for the horizontal FlatList
  const pagerRef = React.useRef<FlatList>(null);
  const tabs = ['Voice Clips', 'Video Clips', 'AI Stories'] as const;

  const handleTabPress = (tab: typeof tabs[number], index: number) => {
    setActiveTab(tab);
    pagerRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleMomentumScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    const newTab = tabs[index];
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  const renderContentItem = ({ item }: { item: typeof tabs[number] }) => {
    return (
      <View style={{ width, flex: 1 }}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && voiceClips.length > 0}
              onRefresh={fetchVoiceClips}
              tintColor="#FFFFFF"
            />
          }
        >
          {item === 'Voice Clips' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Voice Contributions</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Voice clips you've shared to help preserve languages
              </Text>

              <TouchableOpacity
                style={styles.recordButton}
                onPress={() => navigation.navigate('RecordVoice')}
              >
                <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
                <Ionicons name="mic" size={20} color="#FFFFFF" />
                <Text style={styles.recordButtonText}>Record New Clip</Text>
              </TouchableOpacity>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <NewtonCradleLoader color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading your voice clips...</Text>
                </View>
              ) : voiceClips.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="mic-outline" size={64} color={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"} />
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No voice clips yet</Text>
                  <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>
                    Start recording to build your personal language archive
                  </Text>
                </View>
              ) : (
                <View style={styles.clipsContainer}>
                  {voiceClips.map(renderVoiceClip)}
                </View>
              )}
            </View>
          )}

          {item === 'Video Clips' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Video Clips</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Videos you've uploaded or recorded
              </Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <NewtonCradleLoader color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading your videos...</Text>
                </View>
              ) : videoClips.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="videocam-outline" size={64} color={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"} />
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No videos yet</Text>
                  <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>
                    Record or upload a video from the Create tab
                  </Text>
                </View>
              ) : (
                <View style={styles.videoGrid}>
                  {videoClips.map(renderVideoClip)}
                </View>
              )}
            </View>
          )}

          {item === 'AI Stories' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your AI Stories</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Stories you've created with AI animation
              </Text>

              <TouchableOpacity
                style={styles.createStoryButton}
                onPress={() => navigation.navigate('TellStory')}
              >
                <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={StyleSheet.absoluteFill} />
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.createStoryButtonText}>Create New Story</Text>
              </TouchableOpacity>

              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={64} color={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No AI stories yet</Text>
                <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>
                  Tell your first story and watch AI bring it to life
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Library</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <BlurView intensity={20} tint={isDark ? "light" : "dark"} style={styles.tabBlur}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabSelector}
            >
              {tabs.map((tab, index) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabButton,
                    activeTab === tab && styles.activeTabButton
                  ]}
                  onPress={() => handleTabPress(tab, index)}
                >
                  <Text style={[
                    styles.tabButtonText,
                    { color: colors.textSecondary },
                    activeTab === tab && { color: colors.primary }
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </BlurView>
        </View>
      </View>

      {/* Swipeable Content */}
      <FlatList
        ref={pagerRef}
        data={tabs}
        renderItem={renderContentItem}
        keyExtractor={(item: string) => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        initialScrollIndex={tabs.indexOf(activeTab)}
        getItemLayout={(_: any, index: number) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor handled by theme
  },
  header: {
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    ...Typography.h2,
    // color handled by theme
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    paddingHorizontal: 20,
  },
  tabBlur: {
    borderRadius: 25,
    overflow: 'hidden',
    padding: 4,
  },
  tabSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 21,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 138, 0, 0.2)',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    // color handled by theme
  },
  activeTabButtonText: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: 8,
  },
  sectionDescription: {
    ...Typography.body,
    // color handled by theme
    marginBottom: 24,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Layout.radius.m,
    alignSelf: 'flex-start',
    marginBottom: 32,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createStoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Layout.radius.m,
    alignSelf: 'flex-start',
    marginBottom: 32,
    overflow: 'hidden',
  },
  createStoryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    ...Typography.h3,
    // color handled by theme
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateDescription: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    // color handled by theme
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    ...Typography.body,
    marginTop: 20,
    // color handled by theme
  },
  clipsContainer: {
    gap: 16,
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  videoCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  videoThumb: {
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDurationBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoDurationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  videoInfo: {
    padding: 12,
  },
  videoCaption: {
    ...Typography.h4,
    fontSize: 14,
    marginBottom: 4,
    // color handled by theme
  },
  clipCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  clipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  clipInfo: {
    flex: 1,
    marginRight: 12,
  },
  clipPhrase: {
    ...Typography.h4,
    marginBottom: 4,
    // color handled by theme
  },
  clipTranslation: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  clipDate: {
    fontSize: 11,
    // color handled by theme
  },
  clipStats: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    // color handled by theme
  },
  audioSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  voicePlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    // color handled by theme
  },
  clipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    // borderTopColor applied inline with theme
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    // backgroundColor applied inline with theme
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    // color handled by theme
  },
});

export default LibraryScreen;