import { supabase } from '../supabaseClient';
import { getOptionalCurrentUserId } from '../services/authFetch';
import { toggleLike as offlineToggleLike, getEffectiveLikeState } from '../services/local/offlineContent';
import * as Network from 'expo-network';

export interface Comment {
  id: string;
  voice_clip_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  audio_url?: string;
  audio_duration?: number;
  likes_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  is_liked_by_current_user?: boolean;
}

export interface Like {
  id: string;
  user_id: string;
  target_type: 'voice_clip' | 'comment';
  target_id: string;
  created_at: string;
}

export interface InteractionStats {
  likes_count: number;
  comments_count: number;
  is_liked_by_current_user: boolean;
}

/**
 * Get comments for a voice clip
 * @param clipId - ID of the voice clip
 * @param limit - Maximum number of comments to return
 * @param offset - Number of comments to skip (for pagination)
 * @param parentCommentId - Parent comment ID for replies (optional)
 * @returns Promise<Comment[]>
 */
export const getComments = async (
  clipId: string,
  limit: number = 20,
  offset: number = 0,
  parentCommentId?: string
): Promise<Comment[]> => {
  try {
    const currentUserId = getOptionalCurrentUserId();

    let query = supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('voice_clip_id', clipId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (parentCommentId) {
      query = query.eq('parent_comment_id', parentCommentId);
    } else {
      query = query.is('parent_comment_id', null); // Only top-level comments
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting comments:', error);
      return [];
    }

    // Check if current user liked each comment
    const commentsWithLikes = await Promise.all(
      (data || []).map(async (comment) => {
        if (!currentUserId) {
          return { ...comment, user: comment.profiles, is_liked_by_current_user: false };
        }

        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('target_type', 'comment')
          .eq('target_id', comment.id)
          .single();

        return {
          ...comment,
          user: comment.profiles,
          is_liked_by_current_user: !!likeData,
        };
      })
    );

    return commentsWithLikes;
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
};

/**
 * Create a new comment
 * @param clipId - ID of the voice clip
 * @param content - Comment text content
 * @param parentCommentId - Parent comment ID for replies (optional)
 * @param audioUrl - Audio URL for voice comments (optional)
 * @param audioDuration - Audio duration in seconds (optional)
 * @returns Promise<Comment | null>
 */
export const createComment = async (
  clipId: string,
  content: string,
  parentCommentId?: string,
  audioUrl?: string,
  audioDuration?: number
): Promise<Comment | null> => {
  try {
    const currentUserId = getOptionalCurrentUserId();
    if (!currentUserId) return null;

    // Get clip details for notification
    const { data: clipData } = await supabase
      .from('voice_clips')
      .select('user_id, phrase')
      .eq('id', clipId)
      .single();

    if (!clipData) return null;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        voice_clip_id: clipId,
        user_id: currentUserId,
        parent_comment_id: parentCommentId || null,
        content,
        audio_url: audioUrl || null,
        audio_duration: audioDuration || null,
      })
      .select(`
        *,
        profiles!comments_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return null;
    }


    return {
      ...data,
      user: data.profiles,
      is_liked_by_current_user: false,
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    return null;
  }
};

/**
 * Update a comment
 * @param commentId - ID of the comment to update
 * @param content - New comment content
 * @returns Promise<boolean>
 */
export const updateComment = async (
  commentId: string,
  content: string
): Promise<boolean> => {
  try {
    const currentUserId = getOptionalCurrentUserId();
    if (!currentUserId) return false;

    const { error } = await supabase
      .from('comments')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', currentUserId);

    if (error) {
      console.error('Error updating comment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating comment:', error);
    return false;
  }
};

/**
 * Delete a comment
 * @param commentId - ID of the comment to delete
 * @returns Promise<boolean>
 */
export const deleteComment = async (commentId: string): Promise<boolean> => {
  try {
    const currentUserId = getOptionalCurrentUserId();
    if (!currentUserId) return false;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentUserId);

    if (error) {
      console.error('Error deleting comment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
};

/**
 * Like or unlike a feed item with offline support
 * @param targetId - ID of the item
 * @param targetType - Type of the item ('voice' | 'video' | 'story')
 * @param currentlyLiked - Optional: current like state for optimistic updates
 * @returns Promise<{ success: boolean; newLikedState?: boolean; isOffline?: boolean }>
 */
export const toggleVoiceClipLike = async (
  targetId: string,
  targetType: 'voice' | 'video' | 'story' = 'voice',
  currentlyLiked?: boolean
): Promise<boolean> => {
  try {
    const currentUserId = getOptionalCurrentUserId();
    if (!currentUserId) return false;

    // If we know the current state, use offline-aware toggle
    if (currentlyLiked !== undefined) {
      const result = await offlineToggleLike(
        currentUserId,
        targetId,
        targetType,
        currentlyLiked
      );
      return result.success;
    }

    // Legacy behavior: check online status and current like state
    const networkState = await Network.getNetworkStateAsync();
    const isOnline = networkState.isConnected ?? false;

    const mappedTargetType = targetType === 'voice' ? 'voice_clip' : targetType === 'video' ? 'video_clip' : 'story';

    // Check if already liked
    let isLiked = false;
    if (isOnline) {
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('target_type', mappedTargetType)
        .eq('target_id', targetId)
        .single();
      
      isLiked = !!existingLike;
    }

    // Use offline-aware toggle
    const result = await offlineToggleLike(
      currentUserId,
      targetId,
      targetType,
      isLiked
    );

    return result.success;
  } catch (error) {
    console.error(`Error toggling ${targetType} like:`, error);
    return false;
  }
};

/**
 * Get the like state considering pending offline changes
 */
export const getLikeStateWithOffline = async (
  targetId: string,
  targetType: 'voice' | 'video' | 'story' | 'comment',
  serverLikeState: boolean
): Promise<boolean> => {
  const currentUserId = getOptionalCurrentUserId();
  if (!currentUserId) return serverLikeState;
  
  return getEffectiveLikeState(currentUserId, targetId, targetType, serverLikeState);
};

/**
 * Like or unlike a comment
 * @param commentId - ID of the comment
 * @returns Promise<boolean>
 */
export const toggleCommentLike = async (commentId: string): Promise<boolean> => {
  try {
    const currentUserId = getOptionalCurrentUserId();
    if (!currentUserId) return false;

    // Get comment details for notification
    const { data: commentData } = await supabase
      .from('comments')
      .select('user_id, content')
      .eq('id', commentId)
      .single();

    if (!commentData) return false;

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('target_type', 'comment')
      .eq('target_id', commentId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (error) {
        console.error('Error unliking comment:', error);
        return false;
      }
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: currentUserId,
          target_type: 'comment',
          target_id: commentId,
        });

      if (error) {
        console.error('Error liking comment:', error);
        return false;
      }

    }

    return true;
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return false;
  }
};

/**
 * Get interaction stats for a feed item
 * @param targetId - ID of the item
 * @param targetType - Type of the item ('voice' | 'video' | 'story')
 * @returns Promise<InteractionStats | null>
 */
export const getInteractionStats = async (
  targetId: string,
  targetType: 'voice' | 'video' | 'story' = 'voice'
): Promise<InteractionStats | null> => {
  try {
    const currentUserId = getOptionalCurrentUserId();

    const mappedTargetType = targetType === 'voice' ? 'voice_clip' : targetType === 'video' ? 'video_clip' : 'story';
    const table = targetType === 'voice' ? 'voice_clips' : targetType === 'video' ? 'video_clips' : 'stories';

    let likesCount = 0;
    let commentsCount = 0;

    // For stories, we might not have counters in the table
    if (targetType === 'story') {
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('target_type', 'story')
        .eq('target_id', targetId);
      likesCount = count || 0;
    } else {
      const { data } = await supabase
        .from(table)
        .select('likes_count, comments_count')
        .eq('id', targetId)
        .single();

      likesCount = data?.likes_count || 0;
      commentsCount = data?.comments_count || 0;
    }

    // Check if current user liked the item
    let isLikedByCurrentUser = false;
    if (currentUserId) {
      const { data: likeData } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('target_type', mappedTargetType)
        .eq('target_id', targetId)
        .single();

      isLikedByCurrentUser = !!likeData;
    }

    return {
      likes_count: likesCount,
      comments_count: commentsCount,
      is_liked_by_current_user: isLikedByCurrentUser,
    };
  } catch (error) {
    console.error(`Error getting ${targetType} interaction stats:`, error);
    return null;
  }
};

/**
 * Get replies for a comment
 * @param commentId - ID of the parent comment
 * @param limit - Maximum number of replies to return
 * @param offset - Number of replies to skip (for pagination)
 * @returns Promise<Comment[]>
 */
export const getCommentReplies = async (
  commentId: string,
  limit: number = 10,
  offset: number = 0
): Promise<Comment[]> => {
  try {
    const currentUserId = getOptionalCurrentUserId();

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting comment replies:', error);
      return [];
    }

    // Check if current user liked each reply
    const repliesWithLikes = await Promise.all(
      (data || []).map(async (reply) => {
        if (!currentUserId) {
          return { ...reply, user: reply.profiles, is_liked_by_current_user: false };
        }

        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('target_type', 'comment')
          .eq('target_id', reply.id)
          .single();

        return {
          ...reply,
          user: reply.profiles,
          is_liked_by_current_user: !!likeData,
        };
      })
    );

    return repliesWithLikes;
  } catch (error) {
    console.error('Error getting comment replies:', error);
    return [];
  }
};

/**
 * Subscribe to real-time comments for a voice clip
 * @param clipId - ID of the voice clip
 * @param onComment - Callback function when new comment is received
 * @returns Promise<() => void> - Unsubscribe function
 */
export const subscribeToComments = async (
  clipId: string,
  onComment: (comment: Comment) => void
): Promise<() => void> => {
  try {
    console.log('Setting up comment subscription for clip:', clipId);

    const subscription = supabase
      .channel(`comments-${clipId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'comments',
          // Temporarily remove filter to test if basic subscription works
          // filter: `voice_clip_id=eq.${clipId}`,
        },
        async (payload) => {
          console.log('Comment change received:', payload.eventType, payload);
          console.log('Payload details:', {
            new: payload.new,
            old: payload.old,
            table: payload.table,
            schema: payload.schema,
            commit_timestamp: payload.commit_timestamp
          });

          // Check if this comment is for our clip
          const comment = (payload.new || payload.old) as Comment;
          if (comment && comment.voice_clip_id !== clipId) {
            console.log('Ignoring comment for different clip:', comment.voice_clip_id, 'expected:', clipId);
            return;
          }

          if (payload.eventType === 'INSERT') {
            const newComment = payload.new as Comment;
            console.log('Processing INSERT for comment:', newComment.id, 'by user:', newComment.user_id);

            // Get user profile for the comment
            const { data: userProfile, error: profileError } = await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .eq('id', newComment.user_id)
              .single();

            if (profileError) {
              console.error('Error fetching user profile:', profileError);
            }

            const fullComment: Comment = {
              ...newComment,
              user: userProfile || { id: newComment.user_id, username: 'Unknown', full_name: 'Unknown' },
              is_liked_by_current_user: false,
            };

            console.log('Calling onComment with full comment:', fullComment);
            onComment(fullComment);
          } else if (payload.eventType === 'UPDATE') {
            // Handle comment updates (like count changes, content edits, etc.)
            const updatedComment = payload.new as Comment;
            const oldComment = payload.old as Comment;
            console.log('Processing UPDATE for comment:', updatedComment.id);

            // Get user profile for the updated comment
            const { data: userProfile, error: profileError } = await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .eq('id', updatedComment.user_id)
              .single();

            if (profileError) {
              console.error('Error fetching user profile for update:', profileError);
            }

            const fullComment: Comment = {
              ...updatedComment,
              user: userProfile || { id: updatedComment.user_id, username: 'Unknown', full_name: 'Unknown' },
              is_liked_by_current_user: false, // Will be updated by the UI
            };

            console.log('Calling onComment with updated comment:', fullComment);
            onComment(fullComment);
          } else if (payload.eventType === 'DELETE') {
            // Handle comment deletion
            const deletedComment = payload.old as Comment;
            console.log('Processing DELETE for comment:', deletedComment.id);
            onComment({ ...deletedComment, _deleted: true } as any);
          }
        }
      )
      .subscribe((status) => {
        console.log('Comment subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to comments for clip:', clipId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error for comments subscription on clip:', clipId);
        } else if (status === 'TIMED_OUT') {
          console.error('Subscription timed out for comments on clip:', clipId);
        }
      });

    return () => {
      console.log('Unsubscribing from comments for clip:', clipId);
      subscription.unsubscribe();
    };
  } catch (error) {
    console.error('Error subscribing to comments:', error);
    return () => { };
  }
};
