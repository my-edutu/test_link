/**
 * Offline-aware content creation service
 * Handles saving content locally when offline and syncing when online
 */

import * as Network from 'expo-network';
import { supabase } from '../../supabaseClient';
import { uploadAudioFile, uploadVideoFile } from '../../utils/storage';
import { addUploadToQueue, UploadMetadata } from './uploadQueue';
import { addInteractionToQueue, getPendingLikeState, TargetType } from './interactionQueue';
import { syncManager } from './SyncManager';
import * as FileSystem from 'expo-file-system/legacy';

export interface SaveVoiceClipParams {
  userId: string;
  audioUri: string;
  phrase: string;
  translation?: string;
  language: string;
  dialect?: string;
  duration: number;
  clipType?: 'original' | 'duet';
  originalClipId?: string;
}

export interface SaveVideoClipParams {
  userId: string;
  videoUri: string;
  phrase: string;
  language: string;
  dialect?: string;
  thumbnailUri?: string;
}

export interface SaveStoryParams {
  userId: string;
  mediaUri: string;
  caption?: string;
  contentType: string;
}

export interface SaveResult {
  success: boolean;
  isOffline: boolean;
  queuedId?: string;
  error?: string;
}

/**
 * Check if device is online
 */
async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected ?? false;
  } catch {
    return false;
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(uri: string, defaultType: string = 'application/octet-stream'): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    'm4a': 'audio/m4a',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
  };
  return mimeMap[ext || ''] || defaultType;
}

/**
 * Get file extension from URI
 */
function getFileExtension(uri: string): string {
  const parts = uri.split('?')[0].split('.');
  return parts[parts.length - 1]?.toLowerCase() || 'bin';
}

/**
 * Save a voice clip - handles both online and offline scenarios
 */
export async function saveVoiceClip(params: SaveVoiceClipParams): Promise<SaveResult> {
  const online = await isOnline();

  if (online) {
    // Try to save directly
    try {
      const uploadResult = await uploadAudioFile(params.audioUri, params.userId);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      const { error } = await supabase
        .from('voice_clips')
        .insert({
          user_id: params.userId,
          phrase: params.phrase,
          translation: params.translation || '',
          audio_url: uploadResult.url,
          language: params.language,
          dialect: params.dialect || null,
          duration: params.duration,
          clip_type: params.clipType || 'original',
          original_clip_id: params.originalClipId || null,
        });

      if (error) throw error;

      return { success: true, isOffline: false };
    } catch (error) {
      console.log('[OfflineContent] Online save failed, queueing for later:', error);
      // Fall through to offline save
    }
  }

  // Save offline
  try {
    const ext = getFileExtension(params.audioUri);
    const metadata: UploadMetadata = {
      phrase: params.phrase,
      translation: params.translation,
      language: params.language,
      dialect: params.dialect,
      duration: params.duration,
      clip_type: params.clipType || 'original',
      original_clip_id: params.originalClipId,
      content_type: getMimeType(params.audioUri, 'audio/m4a'),
      file_extension: ext,
    };

    const queuedId = await addUploadToQueue({
      user_id: params.userId,
      upload_type: 'voice_clip',
      local_file_path: params.audioUri,
      metadata,
    });

    console.log('[OfflineContent] Voice clip queued for later upload:', queuedId);
    return { success: true, isOffline: true, queuedId };
  } catch (error) {
    console.error('[OfflineContent] Failed to queue voice clip:', error);
    return { 
      success: false, 
      isOffline: !online, 
      error: error instanceof Error ? error.message : 'Failed to save' 
    };
  }
}

/**
 * Save a video clip - handles both online and offline scenarios
 */
export async function saveVideoClip(params: SaveVideoClipParams): Promise<SaveResult> {
  const online = await isOnline();

  if (online) {
    try {
      const uploadResult = await uploadVideoFile(params.videoUri, params.userId);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Upload thumbnail if provided
      let thumbnailUrl = null;
      if (params.thumbnailUri) {
        const thumbResult = await uploadVideoFile(params.thumbnailUri, params.userId, undefined, 'image/jpeg');
        if (thumbResult.success) {
          thumbnailUrl = thumbResult.url;
        }
      }

      const { error } = await supabase
        .from('video_clips')
        .insert({
          user_id: params.userId,
          phrase: params.phrase,
          video_url: uploadResult.url,
          thumbnail_url: thumbnailUrl,
          language: params.language,
          dialect: params.dialect || null,
          clip_type: 'original',
        });

      if (error) throw error;

      return { success: true, isOffline: false };
    } catch (error) {
      console.log('[OfflineContent] Online save failed, queueing for later:', error);
    }
  }

  // Save offline
  try {
    const ext = getFileExtension(params.videoUri);
    const metadata: UploadMetadata = {
      phrase: params.phrase,
      language: params.language,
      dialect: params.dialect,
      clip_type: 'original',
      content_type: getMimeType(params.videoUri, 'video/mp4'),
      file_extension: ext,
    };

    const queuedId = await addUploadToQueue({
      user_id: params.userId,
      upload_type: 'video_clip',
      local_file_path: params.videoUri,
      thumbnail_path: params.thumbnailUri,
      metadata,
    });

    console.log('[OfflineContent] Video clip queued for later upload:', queuedId);
    return { success: true, isOffline: true, queuedId };
  } catch (error) {
    console.error('[OfflineContent] Failed to queue video clip:', error);
    return { 
      success: false, 
      isOffline: !online, 
      error: error instanceof Error ? error.message : 'Failed to save' 
    };
  }
}

/**
 * Save a story - handles both online and offline scenarios
 */
export async function saveStory(params: SaveStoryParams): Promise<SaveResult> {
  const online = await isOnline();

  if (online) {
    try {
      const ext = getFileExtension(params.mediaUri);
      const path = `${params.userId}/${Date.now()}.${ext}`;

      // Read and upload
      const base64Data = await FileSystem.readAsStringAsync(params.mediaUri, { encoding: 'base64' });
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: upErr } = await supabase.storage
        .from('stories')
        .upload(path, bytes, { 
          contentType: params.contentType, 
          cacheControl: '3600', 
          upsert: false 
        });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('stories').getPublicUrl(path);
      const mediaUrl = pub?.publicUrl ?? `stories/${path}`;

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: insErr } = await supabase.from('stories').insert({
        user_id: params.userId,
        media_url: mediaUrl,
        caption: params.caption || '',
        expires_at: expiresAt,
      });

      if (insErr) throw insErr;

      return { success: true, isOffline: false };
    } catch (error) {
      console.log('[OfflineContent] Online save failed, queueing for later:', error);
    }
  }

  // Save offline
  try {
    const ext = getFileExtension(params.mediaUri);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const metadata: UploadMetadata = {
      caption: params.caption,
      expires_at: expiresAt,
      content_type: params.contentType,
      file_extension: ext,
    };

    const queuedId = await addUploadToQueue({
      user_id: params.userId,
      upload_type: 'story',
      local_file_path: params.mediaUri,
      metadata,
    });

    console.log('[OfflineContent] Story queued for later upload:', queuedId);
    return { success: true, isOffline: true, queuedId };
  } catch (error) {
    console.error('[OfflineContent] Failed to queue story:', error);
    return { 
      success: false, 
      isOffline: !online, 
      error: error instanceof Error ? error.message : 'Failed to save' 
    };
  }
}

/**
 * Toggle like on content - handles both online and offline scenarios
 */
export async function toggleLike(
  userId: string,
  targetId: string,
  targetType: 'voice' | 'video' | 'story' | 'comment',
  currentlyLiked: boolean
): Promise<{ success: boolean; isOffline: boolean; newLikedState: boolean }> {
  const online = await isOnline();
  const newLikedState = !currentlyLiked;

  const mappedTargetType: TargetType = 
    targetType === 'voice' ? 'voice_clip' 
    : targetType === 'video' ? 'video_clip' 
    : targetType === 'story' ? 'story' 
    : 'comment';

  if (online) {
    try {
      if (newLikedState) {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: userId,
            target_type: mappedTargetType,
            target_id: targetId,
          });

        if (error && !error.message.includes('duplicate')) throw error;
      } else {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', mappedTargetType)
          .eq('target_id', targetId);

        if (error) throw error;
      }

      return { success: true, isOffline: false, newLikedState };
    } catch (error) {
      console.log('[OfflineContent] Online like toggle failed, queueing:', error);
    }
  }

  // Queue offline
  try {
    await addInteractionToQueue({
      user_id: userId,
      interaction_type: newLikedState ? 'like' : 'unlike',
      target_id: targetId,
      target_type: mappedTargetType,
      action: newLikedState ? 'add' : 'remove',
    });

    return { success: true, isOffline: true, newLikedState };
  } catch (error) {
    console.error('[OfflineContent] Failed to queue like toggle:', error);
    return { success: false, isOffline: !online, newLikedState: currentlyLiked };
  }
}

/**
 * Toggle follow on a user - handles both online and offline scenarios
 */
export async function toggleFollow(
  userId: string,
  targetUserId: string,
  currentlyFollowing: boolean
): Promise<{ success: boolean; isOffline: boolean; newFollowState: boolean }> {
  const online = await isOnline();
  const newFollowState = !currentlyFollowing;

  if (online) {
    try {
      if (newFollowState) {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: userId,
            following_id: targetUserId,
          });

        if (error && !error.message.includes('duplicate')) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', targetUserId);

        if (error) throw error;
      }

      return { success: true, isOffline: false, newFollowState };
    } catch (error) {
      console.log('[OfflineContent] Online follow toggle failed, queueing:', error);
    }
  }

  // Queue offline
  try {
    await addInteractionToQueue({
      user_id: userId,
      interaction_type: newFollowState ? 'follow' : 'unfollow',
      target_id: targetUserId,
      target_type: 'user',
      action: newFollowState ? 'add' : 'remove',
    });

    return { success: true, isOffline: true, newFollowState };
  } catch (error) {
    console.error('[OfflineContent] Failed to queue follow toggle:', error);
    return { success: false, isOffline: !online, newFollowState: currentlyFollowing };
  }
}

/**
 * Get the effective like state considering pending offline changes
 */
export async function getEffectiveLikeState(
  userId: string,
  targetId: string,
  targetType: 'voice' | 'video' | 'story' | 'comment',
  serverLikeState: boolean
): Promise<boolean> {
  const mappedTargetType: TargetType = 
    targetType === 'voice' ? 'voice_clip' 
    : targetType === 'video' ? 'video_clip' 
    : targetType === 'story' ? 'story' 
    : 'comment';

  const pendingState = await getPendingLikeState(userId, targetId, mappedTargetType);
  
  if (pendingState === 'liked') return true;
  if (pendingState === 'unliked') return false;
  
  return serverLikeState;
}

/**
 * Trigger a manual sync
 */
export async function triggerSync(): Promise<void> {
  await syncManager.forcSync();
}
