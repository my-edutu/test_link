import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  toggleVoiceClipLike,
  getInteractionStats,
  InteractionStats
} from '../utils/interactions';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';

interface VoiceClipInteractionsProps {
  clipId: string;
  onCommentPress?: () => void;
  showCommentButton?: boolean;
}

export const VoiceClipInteractions: React.FC<VoiceClipInteractionsProps> = ({
  clipId,
  onCommentPress,
  showCommentButton = true,
}) => {
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<InteractionStats | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const interactionStats = await getInteractionStats(clipId);
      setStats(interactionStats);
    } catch (error) {
      console.error('Error loading interaction stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [clipId]);

  // Realtime: refresh on voice clip or likes changes
  useEffect(() => {
    const channel = supabase
      .channel(`voice-clip-interactions-${clipId}`)
      // Voice clip counters updated
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'voice_clips',
        filter: `id=eq.${clipId}`,
      }, async () => {
        await loadStats();
      })
      // Likes created/deleted for this clip (we filter in handler)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
      }, async (payload: any) => {
        const target = payload.new || payload.old;
        if (target && target.target_type === 'voice_clip' && target.target_id === clipId) {
          await loadStats();
        }
      })
      // Comments created for this clip (refresh counts)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
      }, async (payload: any) => {
        const row = payload.new;
        if (row && row.voice_clip_id === clipId) {
          await loadStats();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clipId]);

  const handleLike = async () => {
    if (!authUser) {
      Alert.alert('Error', 'Please sign in to like voice clips');
      return;
    }

    setIsLiking(true);
    try {
      const success = await toggleVoiceClipLike(clipId);
      if (success) {
        // Optimistic toggle; realtime/refresh will reconcile
        setStats(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            is_liked_by_current_user: !prev.is_liked_by_current_user,
            likes_count: prev.is_liked_by_current_user
              ? prev.likes_count - 1
              : prev.likes_count + 1,
          };
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to like voice clip');
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = () => {
    if (!authUser) {
      Alert.alert('Error', 'Please sign in to comment');
      return;
    }
    onCommentPress?.();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.actionButton, stats.is_liked_by_current_user && styles.likedButton]}
        onPress={handleLike}
        disabled={isLiking}
      >
        {isLiking ? (
          <ActivityIndicator size="small" color={stats.is_liked_by_current_user ? "#EF4444" : "#6B7280"} />
        ) : (
          <Ionicons
            name={stats.is_liked_by_current_user ? "heart" : "heart-outline"}
            size={20}
            color={stats.is_liked_by_current_user ? "#EF4444" : "#6B7280"}
          />
        )}
        <Text style={[styles.actionText, stats.is_liked_by_current_user && styles.likedText]}>
          {stats.likes_count > 0 ? stats.likes_count : ''}
        </Text>
      </TouchableOpacity>

      {showCommentButton && (
        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
          <Text style={styles.actionText}>
            {stats.comments_count > 0 ? stats.comments_count : ''}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  likedButton: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  likedText: {
    color: '#EF4444',
  },
});
