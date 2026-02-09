import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
  Alert,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { getPlayableAudioUrl, getPlayableVideoUrl } from '../utils/storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import VideoPlayerModal from '../components/VideoPlayerModal';
import PostOptionsModal from '../components/PostOptionsModal';
import { useAudioPlayback } from '../hooks/useAudioPlayback';

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

// Helper to format large counts like 14500 -> 14.5K
const formatCount = (count: number): string => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(count % 1_000 === 0 ? 0 : 1)}K`;
  }
  return String(count);
};

// Helper to extract original prompt
const extractOriginalPrompt = (phrase: string) => {
  // If the phrase contains nested chain text, extract the original
  if (phrase.includes('"Create your own version of "') || phrase.includes('"Respond to "')) {
    // Find the innermost quoted text (the original prompt)
    const matches = phrase.match(/"([^"]*)"(?: by [^"]*)?$/);
    if (matches && matches[1]) {
      // Check if this is the actual original (not another nested layer)
      const extracted = matches[1];
      if (!extracted.includes('"Create your own version of "') && !extracted.includes('"Respond to "')) {
        return extracted;
      }
      // If it's still nested, try to find the deepest level
      return extractOriginalPrompt(extracted);
    }
  }
  // If no nested text found, return the phrase as-is
  return phrase;
};

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  avatarUrl?: string; // For real avatar URLs from Supabase
  language: string;
  isFollowing: boolean;
  followers: number;
  isVerified: boolean;
}

// Inside component, call hook to get badge count

// Unread notifications badge: fetch and subscribe
const useUnreadNotificationsCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      if (!user?.id) return;
      const { count: c } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (mounted && typeof c === 'number') setCount(c);
    };
    fetchCount();
    const channel = supabase
      .channel('notif-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, () => {
        setCount(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, (payload: any) => {
        // If is_read flipped true, decrement; if flipped false, increment
        const wasRead = payload.old?.is_read === true;
        const nowRead = payload.new?.is_read === true;
        if (!wasRead && nowRead) setCount(prev => Math.max(0, prev - 1));
        else if (wasRead && !nowRead) setCount(prev => prev + 1);
      })
      .subscribe();
    return () => { mounted = false; channel.unsubscribe(); };
  }, [user?.id]);

  return count;
};

interface Post {
  id: string;
  type: 'voice' | 'video' | 'story';
  user: User;
  content: {
    phrase?: string;
    translation?: string;
    audioWaveform?: number[];
    audioUrl?: string;
    videoThumbnail?: string;
    videoUrl?: string;
    storyTitle?: string;
    duration?: string;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    validations: number;
    reposts: number;
    duets?: number;
    remixes?: number;
  };
  actions: {
    isLiked: boolean;
    isValidated: boolean;
    isReposted: boolean;
    needsValidation: boolean;
  };
  timeAgo: string;
  isAIGenerated?: boolean;
  // Remix fields
  remixInfo?: {
    parentClipId: string;
    parentUsername: string;
    parentAvatarUrl?: string;
  };
}

interface LiveStream {
  id: string;
  streamer_id: string;
  streamer_name: string;
  streamer_avatar: string;
  title: string;
  language: string;
  viewer_count: number;
  thumbnail_url?: string;
  is_live: boolean;
  started_at: string;
}



const EnhancedHomeScreen: React.FC<any> = ({ navigation }) => {
  const { colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, theme), [colors, theme]);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Following' | 'Discover' | 'Trending' | 'Live'>('Following');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Audio playback hook
  const { currentPlayingId, isLoadingAudio, playAudio, stopAudio } = useAudioPlayback();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch live streams from database
  const fetchLiveStreams = useCallback(async () => {
    try {
      const { data: liveStreamsData, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          profiles!live_streams_streamer_id_fkey (
            id,
            full_name,
            username,
            avatar_url,
            primary_language
          )
        `)
        .eq('is_live', true)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching live streams:', error);
        return;
      }

      const formattedStreams: LiveStream[] = (liveStreamsData || []).map((stream) => {
        const streamer = stream.profiles;
        return {
          id: stream.id,
          streamer_id: stream.streamer_id,
          streamer_name: streamer?.full_name || 'Anonymous',
          streamer_avatar: streamer?.avatar_url ? '👤' : '👤', // Will be replaced with actual avatar
          title: stream.title,
          language: stream.language,
          viewer_count: stream.viewer_count || 0,
          thumbnail_url: stream.thumbnail_url,
          is_live: stream.is_live,
          started_at: stream.started_at,
        };
      });

      setLiveStreams(formattedStreams);
      console.log('Fetched live streams:', formattedStreams.length);
    } catch (error) {
      console.error('Error fetching live streams:', error);
    }
  }, [user]);

  // Fetch real voice and video clips with user information from database
  const fetchRealContent = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch voice clips with user information
      const { data: voiceClips, error: clipsError } = await supabase
        .from('voice_clips')
        .select(`
          *,
          profiles!voice_clips_user_id_fkey (
            id,
            full_name,
            username,
            primary_language,
            avatar_url,
            bio
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (clipsError) {
        console.error('Error fetching voice clips:', clipsError);
        return;
      }

      // Fetch video clips with user information
      const { data: videoClips, error: videosError } = await supabase
        .from('video_clips')
        .select(`
          *,
          profiles!video_clips_user_id_fkey (
            id,
            full_name,
            username,
            primary_language,
            avatar_url,
            bio
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (videosError) {
        console.error('Error fetching video clips:', videosError);
      }

      const voicePosts: Post[] = (voiceClips || []).map((clip) => {
        const user = clip.profiles;
        return {
          id: clip.id,
          type: 'voice' as const,
          user: {
            id: user?.id || 'unknown',
            name: user?.full_name || 'Anonymous',
            username: user?.username || 'user',
            avatar: '👤',
            avatarUrl: user?.avatar_url || undefined,
            language: user?.primary_language || 'English',
            isFollowing: false, // Will be updated below
            followers: Math.floor(Math.random() * 1000) + 10, // Random for demo
            isVerified: Math.random() > 0.7, // Random for demo
          },
          content: {
            phrase: clip.phrase || 'Audio clip',
            translation: clip.translation || '',
            audioWaveform: [20, 40, 60, 80, 60, 40, 70, 90, 50, 30, 60, 80, 40, 20, 50, 70], // Placeholder waveform
            audioUrl: clip.audio_url,
            duration: clip.duration ? `${Math.floor(clip.duration / 60)}:${(clip.duration % 60).toString().padStart(2, '0')}` : '0:00',
          },
          engagement: {
            likes: clip.likes_count || 0,
            comments: clip.comments_count || 0,
            shares: clip.shares_count || 0,
            validations: clip.validations_count || 0,
            reposts: 0,
            duets: clip.duets_count || 0,
            remixes: clip.remixes_count || 0,
          },
          actions: {
            isLiked: false, // Will be updated based on user's likes
            isValidated: clip.is_validated || false,
            isReposted: false, // Will be updated based on user's reposts
            needsValidation: !clip.is_validated,
          },
          timeAgo: getTimeAgo(clip.created_at),
          createdAt: clip.created_at as any,
          remixInfo: clip.original_clip_id ? {
            parentClipId: clip.original_clip_id,
            parentUsername: 'user', // Will need separate fetch if needed
            parentAvatarUrl: undefined
          } : undefined
        } as any;
      });

      const videoPosts: Post[] = (videoClips || []).map((clip) => {
        const user = clip.profiles;
        return {
          id: clip.id,
          type: 'video' as const,
          user: {
            id: user?.id || 'unknown',
            name: user?.full_name || 'Anonymous',
            username: user?.username || 'user',
            avatar: '👤',
            avatarUrl: user?.avatar_url || undefined,
            language: user?.primary_language || 'English',
            isFollowing: false,
            followers: Math.floor(Math.random() * 1000) + 10,
            isVerified: Math.random() > 0.7,
          },
          content: {
            phrase: clip.phrase || 'Video clip',
            translation: clip.translation || '',
            videoThumbnail: clip.thumbnail_url || '🎬',
            videoUrl: clip.video_url,
            duration: clip.duration ? `${Math.floor(clip.duration / 60)}:${(clip.duration % 60).toString().padStart(2, '0')}` : '0:00',
          },
          engagement: {
            likes: clip.likes_count || 0,
            comments: clip.comments_count || 0,
            shares: clip.shares_count || 0,
            validations: clip.validations_count || 0,
            reposts: 0,
            duets: clip.duets_count || 0,
            remixes: clip.remixes_count || 0,
          },
          actions: {
            isLiked: false,
            isValidated: clip.is_validated || false,
            isReposted: false,
            needsValidation: !clip.is_validated,
          },
          timeAgo: getTimeAgo(clip.created_at),
          createdAt: clip.created_at as any,
        } as any;
      });

      const combined: any[] = [...voicePosts, ...videoPosts];
      combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setPosts(combined as Post[]);
      console.log('Fetched posts:', combined.length, `(voice ${voicePosts.length}, video ${videoPosts.length})`);
    } catch (error) {
      console.error('Error in fetchRealContent:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRealContent();
  }, [fetchRealContent]);

  // Fetch live streams when Live tab is active
  useEffect(() => {
    if (activeTab === 'Live') {
      fetchLiveStreams();
    }
  }, [activeTab, fetchLiveStreams]);

  // Real-time updates for live streams
  useEffect(() => {
    if (activeTab !== 'Live') return;

    const channel = supabase
      .channel('live-streams-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        (payload) => {
          console.log('Live stream change detected:', payload);
          // Refresh live streams when changes occur
          fetchLiveStreams();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeTab, fetchLiveStreams]);

  // Refresh when screen comes into focus (user returns from recording)
  useFocusEffect(
    useCallback(() => {
      fetchRealContent(true);
    }, [fetchRealContent])
  );

  // Stop audio when navigating away
  useFocusEffect(
    useCallback(() => {
      return () => {
        stopAudio();
      };
    }, [stopAudio])
  );

  // Check follow status for current user
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || posts.length === 0) return;

      try {
        const { data: followData, error } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        if (error) {
          console.error('Error checking follow status:', error);
          return;
        }

        const followingIds = new Set(followData?.map(f => f.following_id) || []);

        // Update posts with correct follow status only if values change
        setPosts(prevPosts => {
          let changed = false;
          const updated = prevPosts.map(post => {
            const nextIsFollowing = followingIds.has(post.user.id);
            if (post.user.isFollowing !== nextIsFollowing) {
              changed = true;
              return {
                ...post,
                user: {
                  ...post.user,
                  isFollowing: nextIsFollowing,
                },
              } as typeof post;
            }
            return post;
          });
          return changed ? updated : prevPosts;
        });
      } catch (error) {
        console.error('Error in checkFollowStatus:', error);
      }
    };

    checkFollowStatus();
  }, [user, posts]);

  // Preload current user's likes to set isLiked
  useEffect(() => {
    const loadLikes = async () => {
      if (!user || posts.length === 0) return;
      try {
        const ids = posts.map(p => p.id);
        const { data, error } = await supabase
          .from('likes')
          .select('target_id')
          .eq('user_id', user.id)
          .eq('target_type', 'voice_clip')
          .in('target_id', ids);
        if (error) {
          console.error('Error loading likes:', error);
          return;
        }
        const likedIds = new Set((data || []).map(r => r.target_id));
        setPosts(prev => prev.map(post => ({
          ...post,
          actions: { ...post.actions, isLiked: likedIds.has(post.id) },
        })));
      } catch (e) {
        console.error('loadLikes exception:', e);
      }
    };
    loadLikes();
  }, [user, posts.length]);

  // Preload current user's validations to set isValidated
  useEffect(() => {
    const loadValidations = async () => {
      if (!user || posts.length === 0) return;
      try {
        const ids = posts.map(p => p.id);
        const { data, error } = await supabase
          .from('validations')
          .select('voice_clip_id')
          .eq('validator_id', user.id)
          .in('voice_clip_id', ids);
        if (error) {
          console.error('Error loading validations:', error);
          return;
        }
        const validatedIds = new Set((data || []).map(r => r.voice_clip_id));
        setPosts(prev => prev.map(post => ({
          ...post,
          actions: { ...post.actions, isValidated: validatedIds.has(post.id) },
        })));
      } catch (e) {
        console.error('loadValidations exception:', e);
      }
    };
    loadValidations();
  }, [user, posts.length]);

  // Live update counts and user state via realtime for visible clips
  useEffect(() => {
    if (posts.length === 0) return;
    const ids = posts.map(p => p.id);
    const channel = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        (payload) => {
          const newRow: any = (payload as any).new || {};
          const oldRow: any = (payload as any).old || {};
          const targetId = newRow.target_id || oldRow.target_id;
          const targetType = newRow.target_type || oldRow.target_type;
          if (targetType !== 'voice_clip') return;
          if (!targetId || !ids.includes(targetId)) return;
          setPosts(prev => prev.map(post => {
            if (post.id !== targetId) return post;
            const delta = payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0;
            return {
              ...post,
              engagement: {
                ...post.engagement,
                likes: Math.max(0, post.engagement.likes + delta),
              },
            };
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'voice_clips' },
        (payload) => {
          const newRow: any = (payload as any).new || {};
          if (newRow.clip_type !== 'duet' || !newRow.original_clip_id) return;
          const originalId = newRow.original_clip_id as string;
          if (!ids.includes(originalId)) return;
          setPosts(prev => prev.map(post => post.id === originalId
            ? { ...post, engagement: { ...post.engagement, duets: (post.engagement.duets || 0) + 1 } }
            : post
          ));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'validations' },
        (payload) => {
          const newRow: any = (payload as any).new || {};
          const clipId = newRow.voice_clip_id as string;
          if (!clipId || !ids.includes(clipId)) return;
          setPosts(prev => prev.map(post => {
            if (post.id !== clipId) return post;
            return {
              ...post,
              engagement: { ...post.engagement, validations: (post.engagement.validations || 0) + 1 },
              actions: { ...post.actions, isValidated: newRow.validator_id === user?.id ? true : post.actions.isValidated },
            };
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'validations' },
        (payload) => {
          const oldRow: any = (payload as any).old || {};
          const clipId = oldRow.voice_clip_id as string;
          if (!clipId || !ids.includes(clipId)) return;
          setPosts(prev => prev.map(post => {
            if (post.id !== clipId) return post;
            return {
              ...post,
              engagement: { ...post.engagement, validations: Math.max(0, (post.engagement.validations || 0) - 1) },
              actions: { ...post.actions, isValidated: oldRow.validator_id === user?.id ? false : post.actions.isValidated },
            };
          }));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [posts.map(p => p.id).join(',')]);

  const handleLike = async (postId: string) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to like posts');
      return;
    }

    // Find current state
    const targetPost = posts.find(p => p.id === postId);
    if (!targetPost) return;
    const currentlyLiked = targetPost.actions.isLiked;

    // Optimistic UI update
    setPosts(prev => prev.map(post =>
      post.id === postId
        ? {
          ...post,
          actions: { ...post.actions, isLiked: !currentlyLiked },
          engagement: {
            ...post.engagement,
            likes: !currentlyLiked ? post.engagement.likes + 1 : Math.max(0, post.engagement.likes - 1),
          },
        }
        : post
    ));

    try {
      if (!currentlyLiked) {
        // Like → insert
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            target_type: 'voice_clip',
            target_id: postId,
          });
        if (error) throw error;
      } else {
        // Unlike → delete
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_type', 'voice_clip')
          .eq('target_id', postId);
        if (error) throw error;
      }
    } catch (e) {
      console.error('Like toggle failed', e);
      // Revert optimistic UI on failure
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
            ...post,
            actions: { ...post.actions, isLiked: currentlyLiked },
            engagement: {
              ...post.engagement,
              likes: currentlyLiked ? post.engagement.likes + 1 : Math.max(0, post.engagement.likes - 1),
            },
          }
          : post
      ));
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handleValidate = async (postId: string, isCorrect: boolean) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to validate clips');
      return;
    }

    // Optimistic UI using functional update
    setPosts(prev => prev.map(post =>
      post.id === postId
        ? {
          ...post,
          actions: { ...post.actions, isValidated: true },
          engagement: {
            ...post.engagement,
            validations: post.engagement.validations + 1,
          },
        }
        : post
    ));

    try {
      const { error } = await supabase
        .from('validations')
        .insert({
          voice_clip_id: postId,
          validator_id: user.id,
          validation_type: 'pronunciation',
          rating: isCorrect ? 4 : 2,
          is_approved: isCorrect,
        });
      if (error) throw error;
    } catch (e) {
      // Revert on error
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
            ...post,
            actions: { ...post.actions, isValidated: false },
            engagement: {
              ...post.engagement,
              validations: Math.max(0, post.engagement.validations - 1),
            },
          }
          : post
      ));
      Alert.alert('Error', 'Failed to submit validation');
    }
  };

  const handleRepost = (postId: string) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? {
          ...post,
          actions: { ...post.actions, isReposted: !post.actions.isReposted },
          engagement: {
            ...post.engagement,
            reposts: post.actions.isReposted
              ? post.engagement.reposts - 1
              : post.engagement.reposts + 1
          }
        }
        : post
    ));

    Alert.alert('Reposted!', 'Post shared to your profile');
  };

  const handleAudioPlay = async (postId: string, audioUrl?: string, phrase?: string) => {
    if (!audioUrl) {
      Alert.alert('No Audio', 'This post does not have an audio file');
      return;
    }

    try {
      // Get playable URL
      const resolvedUrl = await getPlayableAudioUrl(audioUrl);
      if (!resolvedUrl) {
        Alert.alert('Error', 'Failed to load audio file');
        return;
      }

      // Use the hook to play audio
      await playAudio(postId, resolvedUrl);
      console.log('Playing audio:', resolvedUrl);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio file');
    }
  };

  const handleVideoPlay = async (postId: string, videoUrl?: string) => {
    if (!videoUrl) {
      Alert.alert('No Video', 'This post does not have a video file');
      return;
    }

    try {
      setIsLoadingVideo(postId);
      const resolvedUrl = await getPlayableVideoUrl(videoUrl);
      if (!resolvedUrl) {
        setIsLoadingVideo(null);
        Alert.alert('Error', 'Failed to load video file');
        return;
      }
      setCurrentVideoUrl(resolvedUrl);
      setShowVideoPlayer(true);
    } catch (error) {
      console.error('Error loading video:', error);
      Alert.alert('Error', 'Failed to play video file');
    } finally {
      setIsLoadingVideo(null);
    }
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setCurrentVideoUrl(null);
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to follow users');
      return;
    }

    try {
      // Update local state immediately for better UX
      setPosts(posts.map(post =>
        post.user.id === userId
          ? {
            ...post,
            user: {
              ...post.user,
              isFollowing: !post.user.isFollowing,
              followers: post.user.isFollowing
                ? post.user.followers - 1
                : post.user.followers + 1
            }
          }
          : post
      ));

      // Update database
      if (posts.find(p => p.user.id === userId)?.user.isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) {
          console.error('Error unfollowing:', error);
          // Revert local state on error
          setPosts(posts.map(post =>
            post.user.id === userId
              ? {
                ...post,
                user: {
                  ...post.user,
                  isFollowing: true,
                  followers: post.user.followers + 1
                }
              }
              : post
          ));
        }
      } else {
        // Follow
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: user.id,
            following_id: userId
          });

        if (error) {
          console.error('Error following:', error);
          // Revert local state on error
          setPosts(posts.map(post =>
            post.user.id === userId
              ? {
                ...post,
                user: {
                  ...post.user,
                  isFollowing: false,
                  followers: post.user.followers - 1
                }
              }
              : post
          ));
        }
      }
    } catch (error) {
      console.error('Error in handleFollow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const CreatePostModal = () => (
    <Modal
      visible={showCreateModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackground}
          onPress={() => setShowCreateModal(false)}
        />
        <View style={[styles.createModalContent, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.createModalTitle}>Create New Post</Text>

          <ScrollView
            style={styles.createModalScroll}
            contentContainerStyle={styles.createModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.createOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('CreateStory');
              }}
            >
              <View style={[styles.createOptionIcon, styles.blueIcon]}>
                <Ionicons name="images" size={24} color="#3B82F6" />
              </View>
              <View style={styles.createOptionContent}>
                <Text style={styles.createOptionTitle}>Create Story</Text>
                <Text style={styles.createOptionDescription}>Combine clips, text and media</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('RecordVoice', { mode: 'record' });
              }}
            >
              <View style={styles.createOptionIcon}>
                <Ionicons name="mic" size={24} color="#FF8A00" />
              </View>
              <View style={styles.createOptionContent}>
                <Text style={styles.createOptionTitle}>Record Audio</Text>
                <Text style={styles.createOptionDescription}>Record audio in your local language</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('RecordVoice', { mode: 'upload' });
              }}
            >
              <View style={styles.createOptionIcon}>
                <Ionicons name="cloud-upload" size={24} color="#FF8A00" />
              </View>
              <View style={styles.createOptionContent}>
                <Text style={styles.createOptionTitle}>Upload Audio</Text>
                <Text style={styles.createOptionDescription}>Upload audio from your device</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('RecordVideo', { mode: 'record' });
              }}
            >
              <View style={[styles.createOptionIcon, styles.purpleIcon]}>
                <Ionicons name="videocam" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.createOptionContent}>
                <Text style={styles.createOptionTitle}>Record Video</Text>
                <Text style={styles.createOptionDescription}>Record video content</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('RecordVideo', { mode: 'upload' });
              }}
            >
              <View style={[styles.createOptionIcon, styles.purpleIcon]}>
                <Ionicons name="cloud-upload" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.createOptionContent}>
                <Text style={styles.createOptionTitle}>Upload Video</Text>
                <Text style={styles.createOptionDescription}>Upload video from your device</Text>
              </View>
            </TouchableOpacity>



            <TouchableOpacity
              style={styles.createOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('LiveStream', { isHost: true });
              }}
            >
              <View style={[styles.createOptionIcon, styles.redIcon]}>
                <Ionicons name="radio" size={24} color="#EF4444" />
              </View>
              <View style={styles.createOptionContent}>
                <Text style={styles.createOptionTitle}>Go Live</Text>
                <Text style={styles.createOptionDescription}>Start live streaming</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('TurnVerse');
              }}
            >
              <View style={[styles.createOptionIcon, styles.greenIcon]}>
                <Ionicons name="game-controller" size={24} color="#10B981" />
              </View>
              <View style={styles.createOptionContent}>
                <Text style={styles.createOptionTitle}>Start TurnVerse</Text>
                <Text style={styles.createOptionDescription}>Create interactive language games (up to 6 players)</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const ShareModal = ({ postId }: { postId: string }) => (
    <Modal
      visible={showShareModal === postId}
      transparent
      animationType="fade"
      onRequestClose={() => setShowShareModal(null)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackground}
          onPress={() => setShowShareModal(null)}
        />
        <View style={[styles.shareModalContent, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.shareModalTitle}>Share Post</Text>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => {
              setShowShareModal(null);
              Alert.alert('Shared!', 'Post shared to your story');
            }}
          >
            <Ionicons name="add-circle" size={24} color="#10B981" />
            <Text style={styles.shareOptionText}>Add to Story</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => {
              setShowShareModal(null);
              navigation.navigate('ChatList');
            }}
          >
            <Ionicons name="paper-plane" size={24} color="#3B82F6" />
            <Text style={styles.shareOptionText}>Send in DM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => {
              setShowShareModal(null);
              Alert.alert('Shared!', 'Post shared to selected groups');
            }}
          >
            <Ionicons name="people" size={24} color="#8B5CF6" />
            <Text style={styles.shareOptionText}>Share to Group</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareOption}
            onPress={() => {
              setShowShareModal(null);
              Alert.alert('Copied!', 'Link copied to clipboard');
            }}
          >
            <Ionicons name="link" size={24} color="#6B7280" />
            <Text style={styles.shareOptionText}>Copy Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );



  const renderWaveform = (waveform: number[]) => (
    <View style={styles.waveformContainer}>
      {waveform.map((height, index) => (
        <View
          key={index}
          style={[
            styles.waveformBar,
            { height: height * 0.8 }
          ]}
        />
      ))}
    </View>
  );

  const renderPost = (post: Post) => (
    <View key={post.id} style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => {
            // Check if this is the authenticated user's own post
            if (user && post.user.id === user.id) {
              // Navigate to their own profile tab
              navigation.navigate('Profile');
            } else {
              // Navigate to other user's profile
              navigation.navigate('UserProfile', { userId: post.user.id });
            }
          }}
        >
          <View style={styles.avatar}>
            {post.user.avatarUrl ? (
              <Image
                source={{ uri: post.user.avatarUrl }}
                style={styles.avatarImage}
                defaultSource={{ uri: 'https://via.placeholder.com/40x40/FF8A00/FFFFFF?text=👤' }}
                onError={() => console.log('Failed to load avatar for user:', post.user.username)}
              />
            ) : (
              <Text style={styles.avatarText}>{post.user.avatar}</Text>
            )}
          </View>
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{post.user.name}</Text>
              {post.user.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              )}
              {/* Only show follow button if this is not the authenticated user's own post */}
              {user && post.user.id !== user.id && (
                <TouchableOpacity
                  style={!post.user.isFollowing ? styles.followButton : [styles.followButton, styles.followingButton]}
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent navigation when clicking follow button
                    handleFollow(post.user.id);
                  }}
                >
                  <Text style={!post.user.isFollowing ? styles.followButtonText : [styles.followButtonText, styles.followingButtonText]}>
                    {post.user.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.postMeta}>
              <View style={styles.languageTag}>
                <Text style={styles.languageText}>{post.user.language}</Text>
              </View>
              <Text style={styles.timeAgo}>• {post.timeAgo}</Text>
              {post.isAIGenerated && (
                <View style={styles.aiTag}>
                  <Ionicons name="sparkles" size={12} color="#8B5CF6" />
                  <Text style={styles.aiTagText}>AI</Text>
                </View>
              )}
            </View>
          </View>
          {post.remixInfo && (
            <View style={{ marginLeft: 10, justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, color: '#666', fontStyle: 'italic' }}>
                Remixed from @{post.remixInfo.parentUsername}
              </Text>
            </View>
          )}

        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowMoreOptions(post.id)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View >

      {/* Post Content */}
      < View style={styles.postContent} >
        {
          post.type === 'voice' && (
            <>
              <View style={styles.phraseContainer}>
                <Text
                  style={styles.phrase}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {extractOriginalPrompt(post.content.phrase || '')}
                </Text>
                <Text style={styles.translation}>{post.content.translation}</Text>
              </View>
              {post.content.audioWaveform && renderWaveform(post.content.audioWaveform)}
              <TouchableOpacity
                style={[styles.playButton, !post.content.audioUrl && styles.playButtonDisabled]}
                onPress={() => handleAudioPlay(post.id, post.content.audioUrl, post.content.phrase)}
                disabled={!post.content.audioUrl}
              >
                {isLoadingAudio === post.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : currentPlayingId === post.id ? (
                  <Ionicons
                    name="pause"
                    size={24}
                    color="#FFFFFF"
                  />
                ) : (
                  <Ionicons
                    name="play"
                    size={24}
                    color={post.content.audioUrl ? "#FFFFFF" : "#9CA3AF"}
                  />
                )}
              </TouchableOpacity>
            </>
          )
        }

        {
          post.type === 'video' && (
            <View style={styles.videoContainer}>
              <View style={styles.videoThumbnail}>
                {post.content.videoThumbnail && /^https?:\/\//i.test(post.content.videoThumbnail) ? (
                  <Image
                    source={{ uri: post.content.videoThumbnail }}
                    style={styles.videoThumbnailImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.videoThumbnailPlaceholder}>
                    <Text style={styles.videoThumbnailText}>{post.content.videoThumbnail || '🎬'}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.videoPlayButton}
                  onPress={() => handleVideoPlay(post.id, (post.content as any).videoUrl)}
                >
                  {isLoadingVideo === post.id ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="play" size={32} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <View style={styles.videoDuration}>
                  <Text style={styles.videoDurationText}>{post.content.duration}</Text>
                </View>
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoPhrase}>{extractOriginalPrompt(post.content.phrase || '')}</Text>
                <Text style={styles.videoTranslation}>{post.content.translation}</Text>
              </View>
            </View>
          )
        }

        {
          post.type === 'story' && (
            <View style={styles.storyContainer}>
              <View style={styles.storyThumbnail}>
                <Text style={styles.storyThumbnailText}>{post.content.videoThumbnail}</Text>
                <TouchableOpacity style={styles.storyPlayButton}>
                  <Ionicons name="play" size={32} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.storyDuration}>
                  <Text style={styles.storyDurationText}>{post.content.duration}</Text>
                </View>
              </View>
              <Text style={styles.storyTitle}>{post.content.storyTitle}</Text>
            </View>
          )
        }
      </View >

      {/* Likes summary */}
      {
        (post.engagement.likes > 0 || (post.engagement.duets ?? 0) > 0 || post.engagement.validations > 0) && (
          <View style={styles.likesSummaryRow}>
            {post.engagement.likes > 0 && (
              <View style={styles.summaryItem}>
                <Ionicons name="thumbs-up" size={14} color="#2563EB" />
                <Text style={styles.likesSummaryText}>{formatCount(post.engagement.likes)}</Text>
              </View>
            )}
            {(post.engagement.duets ?? 0) > 0 && (
              <View style={styles.summaryItem}>
                <Ionicons name="people" size={14} color="#374151" />
                <Text style={styles.likesSummaryText}>{formatCount(post.engagement.duets ?? 0)}</Text>
              </View>
            )}
            {post.engagement.validations > 0 && (
              <View style={styles.summaryItem}>
                <Ionicons name="checkmark-circle" size={14} color="#D97706" />
                <Text style={styles.likesSummaryText}>{formatCount(post.engagement.validations)}</Text>
              </View>
            )}
          </View>
        )
      }

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(post.id)}
        >
          <Ionicons
            name={post.actions.isLiked ? "thumbs-up" : "thumbs-up-outline"}
            size={20}
            color={post.actions.isLiked ? "#EF4444" : "#6B7280"}
          />
          <Text style={[styles.actionText, post.actions.isLiked && { color: "#EF4444" }]}>
            {formatCount(post.engagement.likes)}
          </Text>
        </TouchableOpacity>

        {/* Duet Action */}
        {post.type === 'voice' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              navigation.navigate('DuetRecord', {
                parentClipId: post.id,
                parentUsername: post.user.username,
                parentClipUrl: post.content.audioUrl,
                parentClipPhrase: post.content.phrase,
              });
            }}
          >
            <Ionicons name="git-branch-outline" size={20} color="#6B7280" />
            <Text style={styles.actionText}>
              {formatCount(post.engagement.duets || 0)}
            </Text>
          </TouchableOpacity>
        )}

        {
          (post.type === 'voice' || post.type === 'video') && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                navigation.navigate('Validation', {
                  clipId: post.id,
                  language: post.user.language,
                })
              }
            >
              <Ionicons
                name={post.actions.isValidated ? "checkmark-circle" : "checkmark-circle-outline"}
                size={20}
                color={post.actions.needsValidation ? "#F59E0B" : "#10B981"}
              />
              <Text style={styles.actionText}>Validate</Text>
            </TouchableOpacity>
          )
        }

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowShareModal(post.id)}
        >
          <Ionicons name="share-outline" size={20} color="#6B7280" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View >

      <PostOptionsModal
        visible={showMoreOptions === post.id}
        postId={post.id}
        postType={post.type}
        user={post.user}
        needsValidation={post.actions.needsValidation}
        onClose={() => setShowMoreOptions(null)}
        onFollow={handleFollow}
        onDuet={(postId) => {
          navigation.navigate('RecordVoice', {
            isDuet: true,
            originalClip: {
              id: postId,
              phrase: post.content.phrase,
              user: post.user.name,
              language: post.user.language
            }
          });
        }}
        onValidate={handleValidate}
        onNavigateValidation={(postId, language) => {
          navigation.navigate('Validation', {
            clipId: postId,
            language: language
          });
        }}
        userLanguage={post.user.language}
      />
      <ShareModal postId={post.id} />
    </View >
  );

  const badgeCount = 0; // Notifications disabled

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + height * 0.01 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Lingualink AI</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity>
              <Ionicons name="search" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <View style={{ position: 'relative' }}>
                <Ionicons name="notifications" size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          {['Following', 'Discover', 'Trending', 'Live'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab as any)}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {activeTab === 'Live' ? (
        <View style={styles.content}>
          <View style={styles.liveSection}>
            <View style={styles.liveSectionHeader}>
              <Text style={styles.liveSectionTitle}>Live Now</Text>
            </View>

            {liveStreams.length > 0 ? (
              <FlatList
                data={liveStreams}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.liveStreamCard}
                    onPress={() => navigation.navigate('LiveViewer', {
                      roomId: item.id
                    })}
                  >
                    <View style={styles.liveStreamContent}>
                      <View style={styles.liveStreamAvatar}>
                        <Text style={styles.liveStreamAvatarText}>{item.streamer_avatar}</Text>
                        <View style={styles.liveIndicator}>
                          <View style={styles.liveDot} />
                        </View>
                      </View>

                      <View style={styles.liveStreamInfo}>
                        <Text style={styles.liveStreamTitle}>{item.title}</Text>
                        <Text style={styles.liveStreamStreamer}>{item.streamer_name}</Text>
                        <View style={styles.liveStreamMeta}>
                          <Text style={styles.liveStreamLanguage}>{item.language}</Text>
                          <Text style={styles.liveStreamViewers}>{item.viewer_count} watching</Text>
                        </View>
                      </View>

                      <View style={styles.liveStreamActions}>
                        <View style={styles.liveStreamBadge}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveStreamBadgeText}>LIVE</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.liveStreamsList, { paddingBottom: insets.bottom + 100 }]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => fetchLiveStreams()}
                    colors={['#FF8A00']}
                    tintColor="#FF8A00"
                  />
                }
              />
            ) : (
              <View style={styles.noLiveStreams}>
                <Text style={styles.noLiveStreamsEmoji}>📺</Text>
                <Text style={styles.noLiveStreamsTitle}>No Live Streams</Text>
                <Text style={styles.noLiveStreamsDesc}>Be the first to go live!</Text>
                <TouchableOpacity
                  style={styles.startFirstLiveButton}
                  onPress={() => navigation.navigate('LiveStream', { isHost: true })}
                >
                  <Ionicons name="videocam" size={20} color="#FFFFFF" />
                  <Text style={styles.startFirstLiveButtonText}>Start Your Stream</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ) : (
        <FlatList
          style={styles.content}
          data={isLoading ? [] : posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderPost(item)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRealContent(true)}
              colors={['#FF8A00']}
              tintColor="#FF8A00"
            />
          }
          ListEmptyComponent={() => {
            if (isLoading) {
              return (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading posts...</Text>
                </View>
              );
            }
            if (posts.length === 0) {
              return (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No posts yet</Text>
                  <Text style={styles.emptySubtext}>Create your first post or follow users to see content</Text>
                </View>
              );
            }
            return null;
          }}
        />
      )}

      <VideoPlayerModal
        visible={showVideoPlayer}
        videoUrl={currentVideoUrl}
        onClose={handleCloseVideoPlayer}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  // Container & Layout
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },

  // Tabs
  tabsContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Post Cards
  postCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postContent: {
    marginVertical: 12,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // User Info
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },

  // Avatar
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 20,
  },

  // Phrase / Content
  phraseContainer: {
    marginBottom: 8,
  },
  phrase: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 22,
  },
  translation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Waveform
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
  },
  waveformBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // Play Buttons
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonDisabled: {
    opacity: 0.5,
  },

  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Follow Button
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followingButtonText: {
    color: colors.primary,
  },

  // Tags
  languageTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  languageText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  aiTag: {
    backgroundColor: '#8B5CF6' + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  aiTagText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '600',
  },

  // Video
  videoContainer: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  videoThumbnailText: {
    fontSize: 48,
  },
  videoPlayButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  videoDurationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  videoInfo: {
    padding: 12,
  },
  videoPhrase: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  videoTranslation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Story
  storyContainer: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  storyThumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyThumbnailText: {
    fontSize: 48,
  },
  storyPlayButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyDuration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  storyDurationText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  storyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    padding: 12,
  },

  // Summary / Engagement
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  likesSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  likesSummaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },

  // Live Section
  liveSection: {
    marginBottom: 16,
  },
  liveSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  liveSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },

  // Live Stream Cards
  liveStreamCard: {
    backgroundColor: colors.card,
    marginHorizontal: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  liveStreamContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveStreamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveStreamAvatarText: {
    fontSize: 24,
  },
  liveStreamInfo: {
    flex: 1,
    marginLeft: 12,
  },
  liveStreamStreamer: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  liveStreamTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  liveStreamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  liveStreamLanguage: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveStreamViewers: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  liveStreamActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveStreamBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveStreamBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  liveStreamsList: {
    paddingHorizontal: 8,
  },

  // No Live Streams
  noLiveStreams: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noLiveStreamsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  noLiveStreamsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  noLiveStreamsDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  startFirstLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  startFirstLiveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Create Modal
  createModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  createModalScroll: {
    maxHeight: 400,
  },
  createModalScrollContent: {
    gap: 12,
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createOptionContent: {
    flex: 1,
  },
  createOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  createOptionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Share Modal
  shareModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  shareOptionText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 16,
  },

  // Icon color variants
  purpleIcon: {
    backgroundColor: '#8B5CF6' + '20',
  },
  redIcon: {
    backgroundColor: '#EF4444' + '20',
  },
  greenIcon: {
    backgroundColor: '#10B981' + '20',
  },
  blueIcon: {
    backgroundColor: '#3B82F6' + '20',
  },

  // Loading & Empty states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default EnhancedHomeScreen;