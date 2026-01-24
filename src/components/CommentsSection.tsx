import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import { getComments, getCommentReplies, subscribeToComments, Comment } from '../utils/interactions';
import { useAuth } from '../context/AuthProvider';

interface CommentsSectionProps {
  clipId: string;
  onClose?: () => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  clipId,
  onClose,
}) => {
  const { user: authUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<{ [commentId: string]: Comment[] }>({});
  const [showReplies, setShowReplies] = useState<{ [commentId: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const loadComments = useCallback(async (isRefresh = false) => {
    try {
      const currentOffset = isRefresh ? 0 : offset;
      const newComments = await getComments(clipId, limit, currentOffset);

      if (isRefresh) {
        setComments(newComments);
        setOffset(limit);
      } else {
        setComments(prev => [...prev, ...newComments]);
        setOffset(prev => prev + limit);
      }

      setHasMore(newComments.length === limit);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    }
  }, [clipId, offset]);

  const loadReplies = useCallback(async (commentId: string) => {
    try {
      const commentReplies = await getCommentReplies(commentId, 10, 0);
      setReplies(prev => ({
        ...prev,
        [commentId]: commentReplies,
      }));
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadComments(true);
    setRefreshing(false);
  }, [loadComments]);

  const handleCommentAdded = useCallback(() => {
    // Refresh comments to show the new comment
    loadComments(true);
    setReplyingTo(null);
  }, [loadComments]);

  const handleReply = useCallback((comment: Comment) => {
    setReplyingTo(comment);
  }, []);

  const handleDeleteComment = useCallback((commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    setReplies(prev => {
      const newReplies = { ...prev };
      delete newReplies[commentId];
      return newReplies;
    });
  }, []);

  const handleToggleReplies = useCallback((commentId: string) => {
    setShowReplies(prev => {
      const newShowReplies = { ...prev };
      newShowReplies[commentId] = !newShowReplies[commentId];
      return newShowReplies;
    });

    // Load replies if not already loaded
    if (!replies[commentId] && !showReplies[commentId]) {
      loadReplies(commentId);
    }
  }, [replies, showReplies, loadReplies]);

  const handleNewComment = useCallback((newComment: Comment) => {
    console.log('Handling comment event:', newComment);

    // Check if this is a deletion event
    if ((newComment as any)._deleted) {
      console.log('Removing deleted comment:', newComment.id);
      setComments(prev => prev.filter(c => c.id !== newComment.id));
      return;
    }

    // Check if this comment already exists (for updates)
    setComments(prev => {
      const existingIndex = prev.findIndex(c => c.id === newComment.id);
      if (existingIndex >= 0) {
        // Update existing comment
        console.log('Updating existing comment:', newComment.id);
        const updated = [...prev];
        updated[existingIndex] = newComment;
        return updated;
      } else {
        // Add new comment at the top
        console.log('Adding new comment:', newComment.id);
        return [newComment, ...prev];
      }
    });
  }, []);

  useEffect(() => {
    loadComments(true);
  }, [loadComments]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      try {
        // Only set up subscription if user is authenticated
        if (!authUser?.id) {
          console.log('User not authenticated, skipping comment subscription');
          return;
        }

        console.log('Setting up comment subscription for clip:', clipId, 'user:', authUser.id);
        unsubscribe = await subscribeToComments(clipId, handleNewComment);
        console.log('Comment subscription set up successfully');
      } catch (error) {
        console.error('Error setting up comment subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        console.log('Cleaning up comment subscription for clip:', clipId);
        unsubscribe();
      }
    };
  }, [clipId, handleNewComment, authUser?.id]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const renderComment = ({ item: comment }: { item: Comment }) => {
    const commentReplies = replies[comment.id] || [];
    const isShowingReplies = showReplies[comment.id] || false;

    return (
      <View>
        <CommentItem
          comment={comment}
          onReply={handleReply}
          onDelete={handleDeleteComment}
          showReplies={isShowingReplies}
          onToggleReplies={() => handleToggleReplies(comment.id)}
          repliesCount={comment.replies_count}
        />

        {isShowingReplies && commentReplies.length > 0 && (
          <View style={styles.repliesContainer}>
            {commentReplies.map((reply) => (
              <View key={reply.id} style={styles.replyItem}>
                <CommentItem
                  comment={reply}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={48} color="#9CA3AF" />
      <Text style={styles.emptyStateTitle}>No comments yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Be the first to share your thoughts!
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading more comments...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comments</Text>
        {onClose && (
          <Ionicons
            name="close"
            size={24}
            color="#6B7280"
            onPress={onClose}
            style={styles.closeButton}
          />
        )}
      </View>

      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        style={styles.commentsList}
        contentContainerStyle={styles.commentsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={() => {
          if (hasMore && !refreshing) {
            loadComments();
          }
        }}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
      />

      {replyingTo && (
        <View style={styles.replyContainer}>
          <View style={styles.replyHeader}>
            <Text style={styles.replyText}>
              Replying to {replyingTo.user.full_name || replyingTo.user.username}
            </Text>
            <Ionicons
              name="close"
              size={20}
              color="#6B7280"
              onPress={() => setReplyingTo(null)}
            />
          </View>
          <CommentInput
            clipId={clipId}
            parentCommentId={replyingTo.id}
            placeholder="Write a reply..."
            onCommentAdded={handleCommentAdded}
            onCancel={() => setReplyingTo(null)}
            isReply={true}
          />
        </View>
      )}

      {!replyingTo && (
        <CommentInput
          clipId={clipId}
          placeholder="Add a comment..."
          onCommentAdded={handleCommentAdded}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: 16,
  },
  repliesContainer: {
    marginLeft: 40,
    marginTop: 8,
  },
  replyItem: {
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  replyContainer: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});
