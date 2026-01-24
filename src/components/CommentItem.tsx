import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { getPlayableAudioUrl } from '../utils/storage';
import { Comment, toggleCommentLike, deleteComment } from '../utils/interactions';
import { useAuth } from '../context/AuthProvider';

interface CommentItemProps {
  comment: Comment;
  onReply?: (comment: Comment) => void;
  onDelete?: (commentId: string) => void;
  showReplies?: boolean;
  onToggleReplies?: () => void;
  repliesCount?: number;
}

const formatTimeAgo = (dateString: string): string => {
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

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onDelete,
  showReplies = false,
  onToggleReplies,
  repliesCount = 0,
}) => {
  const { user: authUser } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(comment.likes_count);
  const [localIsLiked, setLocalIsLiked] = useState(comment.is_liked_by_current_user);
  const audioPlayer = useAudioPlayer();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const isOwnComment = authUser?.id === comment.user_id;

  const handleLike = async () => {
    if (!authUser) {
      Alert.alert('Error', 'Please sign in to like comments');
      return;
    }

    setIsLiking(true);
    try {
      const success = await toggleCommentLike(comment.id);
      if (success) {
        setLocalIsLiked(!localIsLiked);
        setLocalLikesCount(localIsLiked ? localLikesCount - 1 : localLikesCount + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to like comment');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const success = await deleteComment(comment.id);
              if (success) {
                onDelete?.(comment.id);
              } else {
                Alert.alert('Error', 'Failed to delete comment');
              }
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleReply = () => {
    if (!authUser) {
      Alert.alert('Error', 'Please sign in to reply to comments');
      return;
    }
    onReply?.(comment);
  };

  const togglePlay = async () => {
    try {
      if (!comment.audio_url) return;
      if (isPlaying) {
        if (audioPlayer.playing) {
          audioPlayer.pause();
        }
        setIsPlaying(false);
        return;
      }
      setIsLoadingAudio(true);
      const resolvedUrl = await getPlayableAudioUrl(comment.audio_url);
      if (!resolvedUrl) {
        setIsLoadingAudio(false);
        return;
      }
      audioPlayer.replace(resolvedUrl);
      audioPlayer.play();
      setIsPlaying(true);
      setIsLoadingAudio(false);
    } catch (e) {
      setIsLoadingAudio(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.commentHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {comment.user.avatar_url && comment.user.avatar_url.startsWith('http') ? (
              <Image source={{ uri: comment.user.avatar_url }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarEmoji}>{comment.user.avatar_url || '👤'}</Text>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{comment.user.full_name || comment.user.username}</Text>
            <Text style={styles.timestamp}>{formatTimeAgo(comment.created_at)}</Text>
          </View>
        </View>
        {isOwnComment && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.commentContent}>
        <Text style={styles.commentText}>{comment.content}</Text>
        {comment.audio_url && (
          <TouchableOpacity style={styles.audioContainer} onPress={togglePlay}>
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={20} color="#3B82F6" />
            )}
            <Text style={styles.audioDuration}>
              {comment.audio_duration ? `${comment.audio_duration}s` : 'Voice comment'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.commentActions}>
        <TouchableOpacity
          style={[styles.actionButton, localIsLiked && styles.likedButton]}
          onPress={handleLike}
          disabled={isLiking}
        >
          {isLiking ? (
            <ActivityIndicator size="small" color={localIsLiked ? "#EF4444" : "#6B7280"} />
          ) : (
            <Ionicons
              name={localIsLiked ? "heart" : "heart-outline"}
              size={16}
              color={localIsLiked ? "#EF4444" : "#6B7280"}
            />
          )}
          <Text style={[styles.actionText, localIsLiked && styles.likedText]}>
            {localLikesCount > 0 ? localLikesCount : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleReply}>
          <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>

        {repliesCount > 0 && (
          <TouchableOpacity style={styles.actionButton} onPress={onToggleReplies}>
            <Ionicons
              name={showReplies ? "chevron-up" : "chevron-down"}
              size={16}
              color="#6B7280"
            />
            <Text style={styles.actionText}>
              {showReplies ? 'Hide' : `${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  commentContent: {
    marginBottom: 8,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
  },
  audioDuration: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 6,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 4,
  },
  likedButton: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  likedText: {
    color: '#EF4444',
  },
});
