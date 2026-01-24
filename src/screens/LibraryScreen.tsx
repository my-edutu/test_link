// src/screens/LibraryScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../../App';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { getPlayableAudioUrl, getPlayableVideoUrl } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    <View key={clip.id} style={styles.videoCard}>
      <View style={styles.videoThumb}>
        <Text style={styles.videoThumbText}>🎬</Text>
        <View style={styles.videoDurationBadge}>
          <Text style={styles.videoDurationBadgeText}>
            {clip.duration ? `${Math.floor((clip.duration || 0) / 60)}:${(((clip.duration || 0) % 60) + '').padStart(2, '0')}` : '0:00'}
          </Text>
        </View>
      </View>
      <Text numberOfLines={1} style={styles.videoCaption}>{clip.phrase || 'Video'}</Text>
    </View>
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
        } catch {}
      }
    } catch (e) {
      console.error('Delete clip exception:', e);
      // Reload to be safe
      fetchVoiceClips();
    }
  };

  const renderVoiceClip = (clip: VoiceClip) => (
    <View key={clip.id} style={styles.clipCard}>
      <View style={styles.clipHeader}>
        <View style={styles.clipInfo}>
          <Text style={styles.clipPhrase}>{clip.phrase}</Text>
          {clip.translation && (
            <Text style={styles.clipTranslation}>{clip.translation}</Text>
          )}
          <Text style={styles.clipDate}>{getTimeAgo(clip.created_at)}</Text>
        </View>
        <View style={styles.clipStats}>
          <View style={styles.statItem}>
            <Ionicons name="thumbs-up" size={14} color="#6B7280" />
            <Text style={styles.statText}>{clip.likes_count}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={14} color="#6B7280" />
            <Text style={styles.statText}>{clip.comments_count}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={14} color={clip.is_validated ? "#10B981" : "#6B7280"} />
            <Text style={styles.statText}>{clip.validations_count}</Text>
          </View>
        </View>
      </View>

      {clip.audio_url && (
        <View style={styles.audioSection}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => handleAudioPlay(clip.id, clip.audio_url)}
          >
            {isLoadingAudio === clip.id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : currentPlayingId === clip.id ? (
              <Ionicons name="pause" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="play" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <Text style={styles.durationText}>
            {clip.duration ? `${Math.floor(clip.duration / 60)}:${(clip.duration % 60).toString().padStart(2, '0')}` : '0:00'}
          </Text>
        </View>
      )}

      <View style={styles.clipActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={16} color="#6B7280" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => confirmDeleteClip(clip)}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Library</Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'Voice Clips' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('Voice Clips')}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'Voice Clips' && styles.activeTabButtonText
            ]}>
              Voice Clips ({voiceClips.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'Video Clips' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('Video Clips')}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'Video Clips' && styles.activeTabButtonText
            ]}>
              Video Clips ({videoClips.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'AI Stories' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('AI Stories')}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'AI Stories' && styles.activeTabButtonText
            ]}>
              AI Stories (0)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {activeTab === 'Voice Clips' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Voice Contributions</Text>
            <Text style={styles.sectionDescription}>
              Voice clips you've shared to help preserve languages
            </Text>

            <TouchableOpacity
              style={styles.recordButton}
              onPress={() => navigation.navigate('RecordVoice')}
            >
              <Text style={styles.recordButtonText}>Record New Clip</Text>
            </TouchableOpacity>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF8A00" />
                <Text style={styles.loadingText}>Loading your voice clips...</Text>
              </View>
            ) : voiceClips.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="mic-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyStateTitle}>No voice clips yet</Text>
                <Text style={styles.emptyStateDescription}>
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

        {activeTab === 'Video Clips' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Video Clips</Text>
            <Text style={styles.sectionDescription}>
              Videos you've uploaded or recorded
            </Text>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF8A00" />
                <Text style={styles.loadingText}>Loading your videos...</Text>
              </View>
            ) : videoClips.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="videocam-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyStateTitle}>No videos yet</Text>
                <Text style={styles.emptyStateDescription}>
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

        {activeTab === 'AI Stories' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your AI Stories</Text>
            <Text style={styles.sectionDescription}>
              Stories you've created with AI animation
            </Text>

            <TouchableOpacity
              style={styles.createStoryButton}
              onPress={() => navigation.navigate('TellStory')}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              <Text style={styles.createStoryButtonText}>Create New Story</Text>
            </TouchableOpacity>

            {/* Empty State */}
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No AI stories yet</Text>
              <Text style={styles.emptyStateDescription}>
                Tell your first story and watch AI bring it to life
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FF8A00',
    paddingTop: height * 0.02,
    paddingBottom: height * 0.02,
    paddingHorizontal: width * 0.05,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  tabSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeTabButtonText: {
    color: '#FF8A00',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: width * 0.05,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#FF8A00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 40,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createStoryButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createStoryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 250,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  clipsContainer: {
    marginTop: 20,
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  videoCard: {
    width: (width * 0.9 - 12) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  videoThumb: {
    height: 100,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbText: { fontSize: 36 },
  videoDurationBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoDurationBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  videoCaption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  clipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clipInfo: {
    flex: 1,
    marginRight: 12,
  },
  clipPhrase: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  clipTranslation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  clipDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  clipStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  audioSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF8A00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  durationText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  clipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  actionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  deleteText: {
    color: '#EF4444',
  },
});

export default LibraryScreen;