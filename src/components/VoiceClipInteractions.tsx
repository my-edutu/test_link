import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Dimensions,
  Share as RNShare,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import {
  toggleVoiceClipLike,
  getInteractionStats,
  InteractionStats
} from '../utils/interactions';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import { Colors } from '../constants/Theme';

const { width } = Dimensions.get('window');

interface VoiceClipInteractionsProps {
  clipId: string;
  targetType?: 'voice' | 'video' | 'story';
  onCommentPress?: () => void;
  showCommentButton?: boolean;
}

export const VoiceClipInteractions: React.FC<VoiceClipInteractionsProps> = ({
  clipId,
  targetType = 'voice',
  onCommentPress,
  showCommentButton = true, // Maintained for backward compat, but we render our own set
}) => {
  const { user: authUser } = useAuth();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<InteractionStats | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const loadStats = async () => {
    try {
      const interactionStats = await getInteractionStats(clipId, targetType);
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

  // Realtime: refresh on clip or likes changes
  useEffect(() => {
    const table = targetType === 'voice' ? 'voice_clips' : targetType === 'video' ? 'video_clips' : 'stories';
    const channel = supabase
      .channel(`interactions-${targetType}-${clipId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: table,
        filter: `id=eq.${clipId}`,
      }, async () => {
        await loadStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
      }, async (payload: any) => {
        const target = payload.new || payload.old;
        const mappedTargetType = targetType === 'voice' ? 'voice_clip' : targetType === 'video' ? 'video_clip' : 'story';
        if (target && target.target_type === mappedTargetType && target.target_id === clipId) {
          await loadStats();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clipId, targetType]);

  const handleLike = async () => {
    if (!authUser) {
      Alert.alert('Error', 'Please sign in to like clips');
      return;
    }

    setIsLiking(true);
    try {
      const success = await toggleVoiceClipLike(clipId, targetType);
      if (success) {
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
      Alert.alert('Error', 'Failed to like clip');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDuet = () => {
    if (!authUser) {
      Alert.alert('Sign In', 'Please sign in to duet');
      return;
    }
    // Navigate to record screen with reply context
    navigation.navigate('Record', { replyToId: clipId, mode: 'duet' });
  };

  const handleValidate = () => {
    if (!authUser) {
      Alert.alert('Sign In', 'Please sign in to validate');
      return;
    }
    // Navigate to validation screen
    navigation.navigate('ValidateClip', { clipId });
  };

  const handleSharePress = () => {
    setShareModalVisible(true);
  };

  const handleShareAction = async (action: 'story' | 'dm' | 'group' | 'copy') => {
    setShareModalVisible(false);

    switch (action) {
      case 'story':
        navigation.navigate('CreateStory', { sharedClipId: clipId });
        break;
      case 'dm':
        navigation.navigate('ChatList', { shareContent: `Look at this clip due: ${clipId}` });
        break;
      case 'group':
        navigation.navigate('Community', { shareContent: clipId });
        break;
      case 'copy':
        const link = `https://lingualink.app/clip/${clipId}`;
        await Clipboard.setStringAsync(link);
        Alert.alert('Link Copied', 'Clip link copied to clipboard');
        // Or specific OS share
        if (Platform.OS !== 'web') {
          // RNShare.share({ message: link }); // Optional: uncomment to trigger native share sheet
        }
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#FF8A00" />
      </View>
    );
  }

  if (!stats) return null;

  return (
    <>
      <View style={styles.container}>
        {/* Like */}
        <TouchableOpacity
          style={[styles.actionButton, stats.is_liked_by_current_user && styles.likedButton]}
          onPress={handleLike}
          disabled={isLiking}
        >
          {isLiking ? (
            <ActivityIndicator size="small" color={stats.is_liked_by_current_user ? "#EF4444" : "#FFF"} />
          ) : (
            <Ionicons
              name={stats.is_liked_by_current_user ? "heart" : "heart-outline"}
              size={22}
              color={stats.is_liked_by_current_user ? "#EF4444" : "rgba(255, 255, 255, 0.9)"}
            />
          )}
          <Text style={[styles.actionText, stats.is_liked_by_current_user && styles.likedText]}>
            {stats.likes_count > 0 ? stats.likes_count : ''}
          </Text>
        </TouchableOpacity>

        {/* Duet */}
        <TouchableOpacity style={styles.actionButton} onPress={handleDuet}>
          <Ionicons name="mic-outline" size={22} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.actionText}>Duet</Text>
        </TouchableOpacity>

        {/* Validate */}
        <TouchableOpacity style={styles.actionButton} onPress={handleValidate}>
          <Ionicons name="checkmark-circle-outline" size={22} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.actionText}>Valid</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionButton} onPress={handleSharePress}>
          <Ionicons name="share-social-outline" size={22} color="rgba(255, 255, 255, 0.9)" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Share Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shareModalVisible}
        onRequestClose={() => setShareModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShareModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share via</Text>
              <View style={styles.modalIndicator} />
            </View>

            <View style={styles.shareGrid}>
              <TouchableOpacity style={styles.shareItem} onPress={() => handleShareAction('story')}>
                <View style={[styles.shareIconCtx, { backgroundColor: '#A855F7' }]}>
                  <Ionicons name="add-circle-outline" size={28} color="#FFF" />
                </View>
                <Text style={styles.shareLabel}>Add to Story</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareItem} onPress={() => handleShareAction('dm')}>
                <View style={[styles.shareIconCtx, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#FFF" />
                </View>
                <Text style={styles.shareLabel}>Send in DM</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareItem} onPress={() => handleShareAction('group')}>
                <View style={[styles.shareIconCtx, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="people-outline" size={28} color="#FFF" />
                </View>
                <Text style={styles.shareLabel}>Share to Group</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shareItem} onPress={() => handleShareAction('copy')}>
                <View style={[styles.shareIconCtx, { backgroundColor: '#6B7280' }]}>
                  <Ionicons name="link-outline" size={28} color="#FFF" />
                </View>
                <Text style={styles.shareLabel}>Copy Link</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={() => setShareModalVisible(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  likedButton: {
    // optional active background for like
  },
  actionText: {
    fontSize: 12, // slightly smaller to fit 4 items
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  likedText: {
    color: '#EF4444',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 40,
    backgroundColor: 'rgba(30, 30, 30, 0.9)', // Fallback if BlurView fails
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 20,
  },
  shareItem: {
    alignItems: 'center',
    width: '20%',
  },
  shareIconCtx: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareLabel: {
    color: '#FFF',
    fontSize: 11,
    textAlign: 'center',
  },
  closeButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    width: '90%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: '600',
  }
});
