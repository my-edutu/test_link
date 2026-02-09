import * as Network from 'expo-network';
import * as FileSystem from 'expo-file-system/legacy';
import { AppState, AppStateStatus } from 'react-native';
import {
  getQueue,
  removeFromQueue,
  markAsProcessing,
  markAsFailed,
  resetFailedItems,
  getQueueCount,
  QueuedRequest,
} from './queue';
import {
  getPendingUploads,
  removeUploadFromQueue,
  markUploadAsProcessing,
  markUploadAsFailed,
  resetFailedUploads,
  getUploadQueueCount,
  QueuedUpload,
} from './uploadQueue';
import {
  getPendingInteractions,
  removeInteractionFromQueue,
  markInteractionAsProcessing,
  markInteractionAsFailed,
  resetFailedInteractions,
  getInteractionQueueCount,
  QueuedInteraction,
} from './interactionQueue';
import { supabase } from '../../supabaseClient';

type SyncEventCallback = (event: SyncEvent) => void;

export interface SyncEvent {
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'item_processed' | 'item_failed' | 'connection_changed' | 'upload_progress';
  data?: {
    total?: number;
    processed?: number;
    failed?: number;
    isConnected?: boolean;
    itemId?: string;
    itemType?: 'request' | 'upload' | 'interaction';
    error?: string;
    progress?: number;
    uploadType?: string;
  };
}

class SyncManager {
  private static instance: SyncManager;
  private isSyncing = false;
  private listeners: Set<SyncEventCallback> = new Set();
  private networkCheckInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private wasOffline = false;
  private isInitialized = false;

  private constructor() { }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set up network monitoring
      this.startNetworkMonitoring();

      // Set up app state monitoring
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

      // Initial network check
      const state = await Network.getNetworkStateAsync();
      this.wasOffline = !(state.isConnected ?? false);

      // SANITIZATION: Remove any invalid localhost requests that might be persisted from dev sessions
      // This is critical to prevent "Failed to connect to 127.0.0.1" errors on production startup
      try {
        const removedCount = await require('./queue').removeInvalidQueueItems();
        if (removedCount > 0) {
          console.log(`[SyncManager] Sanitize: Removed ${removedCount} invalid items from offline queue`);
        }
      } catch (sanitizeError) {
        console.warn('[SyncManager] Failed to sanitize queue (non-fatal):', sanitizeError);
      }
    } catch (error) {
      console.error('[SyncManager] Initialization error:', error);
      // Assume offline on failure - app continues working
      this.wasOffline = true;
    }

    this.isInitialized = true;
    console.log('[SyncManager] Initialized');
  }

  private startNetworkMonitoring(): void {
    // Poll network status every 5 seconds
    this.networkCheckInterval = setInterval(async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const isConnected = state.isConnected ?? false;

        // Detect transition from offline to online
        if (this.wasOffline && isConnected) {
          console.log('[SyncManager] Connection restored, triggering sync');
          this.emit({
            type: 'connection_changed',
            data: { isConnected: true },
          });
          this.processAllQueues();
        }

        this.wasOffline = !isConnected;
      } catch (error) {
        console.error('[SyncManager] Network check error:', error);
      }
    }, 5000);
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    if (nextAppState === 'active') {
      console.log('[SyncManager] App became active, checking for pending sync');
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected) {
        // Reset any failed items for retry when app becomes active
        await resetFailedItems();
        await resetFailedUploads();
        await resetFailedInteractions();
        this.processAllQueues();
      }
    }
  };

  subscribe(callback: SyncEventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(event: SyncEvent): void {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('[SyncManager] Listener error:', error);
      }
    });
  }

  /**
   * Process all queues: requests, uploads, and interactions
   */
  async processAllQueues(): Promise<void> {
    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress, skipping');
      return;
    }

    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      console.log('[SyncManager] Offline, skipping sync');
      return;
    }

    this.isSyncing = true;

    // Get counts from all queues
    const requestQueue = await getQueue();
    const uploadQueue = await getPendingUploads();
    const interactionQueue = await getPendingInteractions();

    const totalItems = requestQueue.length + uploadQueue.length + interactionQueue.length;

    if (totalItems === 0) {
      console.log('[SyncManager] All queues are empty, nothing to sync');
      this.isSyncing = false;
      return;
    }

    let processed = 0;
    let failed = 0;

    this.emit({
      type: 'sync_started',
      data: { total: totalItems },
    });

    console.log(`[SyncManager] Starting sync, ${totalItems} total items in queues`);

    // Process interactions first (likes, comments, follows) - they're quick
    for (const interaction of interactionQueue) {
      try {
        await markInteractionAsProcessing(interaction.id);
        await this.processInteraction(interaction);
        await removeInteractionFromQueue(interaction.id);
        processed++;

        this.emit({
          type: 'item_processed',
          data: { itemId: interaction.id, itemType: 'interaction', processed, total: totalItems },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await markInteractionAsFailed(interaction.id, errorMessage);
        failed++;

        this.emit({
          type: 'item_failed',
          data: { itemId: interaction.id, itemType: 'interaction', error: errorMessage, failed },
        });

        console.error(`[SyncManager] Failed to process interaction ${interaction.id}:`, error);
      }
    }

    // Process regular API requests
    for (const item of requestQueue) {
      try {
        await markAsProcessing(item.id);
        await this.processItem(item);
        await removeFromQueue(item.id);
        processed++;

        this.emit({
          type: 'item_processed',
          data: { itemId: item.id, itemType: 'request', processed, total: totalItems },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await markAsFailed(item.id, errorMessage);
        failed++;

        this.emit({
          type: 'item_failed',
          data: { itemId: item.id, itemType: 'request', error: errorMessage, failed },
        });

        console.error(`[SyncManager] Failed to process item ${item.id}:`, error);
      }
    }

    // Process uploads last (they take longer)
    for (const upload of uploadQueue) {
      try {
        await markUploadAsProcessing(upload.id);
        await this.processUpload(upload);
        await removeUploadFromQueue(upload.id);
        processed++;

        this.emit({
          type: 'item_processed',
          data: {
            itemId: upload.id,
            itemType: 'upload',
            uploadType: upload.upload_type,
            processed,
            total: totalItems
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await markUploadAsFailed(upload.id, errorMessage);
        failed++;

        this.emit({
          type: 'item_failed',
          data: {
            itemId: upload.id,
            itemType: 'upload',
            uploadType: upload.upload_type,
            error: errorMessage,
            failed
          },
        });

        console.error(`[SyncManager] Failed to process upload ${upload.id}:`, error);
      }
    }

    this.isSyncing = false;

    this.emit({
      type: 'sync_completed',
      data: { total: totalItems, processed, failed },
    });

    console.log(`[SyncManager] Sync completed: ${processed} processed, ${failed} failed`);
  }

  // Legacy method for backward compatibility
  async processQueue(): Promise<void> {
    return this.processAllQueues();
  }

  private async processItem(item: QueuedRequest): Promise<void> {
    const response = await fetch(item.endpoint, {
      method: item.method,
      headers: {
        'Content-Type': 'application/json',
        ...(item.headers || {}),
      },
      body: item.payload ? JSON.stringify(item.payload) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log(`[SyncManager] Successfully processed: ${item.method} ${item.endpoint}`);
  }

  private async processInteraction(interaction: QueuedInteraction): Promise<void> {
    const { interaction_type, target_id, target_type, action, metadata, user_id } = interaction;

    switch (interaction_type) {
      case 'like':
      case 'unlike': {
        const mappedTargetType = target_type === 'voice_clip' ? 'voice_clip'
          : target_type === 'video_clip' ? 'video_clip'
            : target_type === 'story' ? 'story'
              : 'comment';

        if (action === 'add' || interaction_type === 'like') {
          // Add like
          const { error } = await supabase
            .from('likes')
            .insert({
              user_id,
              target_type: mappedTargetType,
              target_id,
            });

          if (error && !error.message.includes('duplicate')) {
            throw error;
          }
        } else {
          // Remove like
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('user_id', user_id)
            .eq('target_type', mappedTargetType)
            .eq('target_id', target_id);

          if (error) throw error;
        }
        break;
      }

      case 'follow':
      case 'unfollow': {
        if (action === 'add' || interaction_type === 'follow') {
          const { error } = await supabase
            .from('follows')
            .insert({
              follower_id: user_id,
              following_id: target_id,
            });

          if (error && !error.message.includes('duplicate')) {
            throw error;
          }
        } else {
          const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user_id)
            .eq('following_id', target_id);

          if (error) throw error;
        }
        break;
      }

      case 'comment': {
        if (metadata?.content) {
          const { error } = await supabase
            .from('comments')
            .insert({
              voice_clip_id: target_id,
              user_id,
              content: metadata.content,
              audio_url: metadata.audio_url || null,
              audio_duration: metadata.audio_duration || null,
              parent_comment_id: metadata.parent_comment_id || null,
            });

          if (error) throw error;
        }
        break;
      }
    }

    console.log(`[SyncManager] Successfully processed interaction: ${interaction_type} on ${target_type}`);
  }

  private async processUpload(upload: QueuedUpload): Promise<void> {
    const { upload_type, local_file_path, thumbnail_path, metadata, user_id } = upload;

    // Read the file
    const fileInfo = await FileSystem.getInfoAsync(local_file_path);
    if (!fileInfo.exists) {
      throw new Error('Local file not found');
    }

    const base64Data = await FileSystem.readAsStringAsync(local_file_path, {
      encoding: 'base64',
    });

    // Convert to bytes
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload based on type
    switch (upload_type) {
      case 'voice_clip': {
        const ext = metadata.file_extension || 'm4a';
        const storagePath = `${user_id}/${Date.now()}_${upload.id}.${ext}`;

        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('voice-clips')
          .upload(storagePath, bytes, {
            contentType: metadata.content_type || 'audio/m4a',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('voice-clips')
          .getPublicUrl(storagePath);

        // Insert record
        const { error: insertError } = await supabase
          .from('voice_clips')
          .insert({
            user_id,
            phrase: metadata.phrase || '',
            translation: metadata.translation || '',
            audio_url: urlData.publicUrl,
            language: metadata.language || '',
            dialect: metadata.dialect || null,
            duration: metadata.duration || 0,
            clip_type: metadata.clip_type || 'original',
            original_clip_id: metadata.original_clip_id || null,
          });

        if (insertError) throw insertError;
        break;
      }

      case 'video_clip': {
        const ext = metadata.file_extension || 'mp4';
        const storagePath = `${user_id}/${Date.now()}_${upload.id}.${ext}`;

        // Upload video
        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(storagePath, bytes, {
            contentType: metadata.content_type || 'video/mp4',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('videos')
          .getPublicUrl(storagePath);

        // Upload thumbnail if exists
        let thumbnailUrl = null;
        if (thumbnail_path) {
          const thumbInfo = await FileSystem.getInfoAsync(thumbnail_path);
          if (thumbInfo.exists) {
            const thumbBase64 = await FileSystem.readAsStringAsync(thumbnail_path, {
              encoding: 'base64',
            });
            const thumbBinary = atob(thumbBase64);
            const thumbBytes = new Uint8Array(thumbBinary.length);
            for (let i = 0; i < thumbBinary.length; i++) {
              thumbBytes[i] = thumbBinary.charCodeAt(i);
            }

            const thumbPath = `${user_id}/thumb_${Date.now()}_${upload.id}.jpg`;
            const { error: thumbError } = await supabase.storage
              .from('videos')
              .upload(thumbPath, thumbBytes, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false,
              });

            if (!thumbError) {
              const { data: thumbUrl } = supabase.storage
                .from('videos')
                .getPublicUrl(thumbPath);
              thumbnailUrl = thumbUrl.publicUrl;
            }
          }
        }

        // Insert record
        const { error: insertError } = await supabase
          .from('video_clips')
          .insert({
            user_id,
            phrase: metadata.phrase || '',
            video_url: urlData.publicUrl,
            thumbnail_url: thumbnailUrl,
            language: metadata.language || '',
            dialect: metadata.dialect || null,
            clip_type: metadata.clip_type || 'original',
          });

        if (insertError) throw insertError;
        break;
      }

      case 'story': {
        const ext = metadata.file_extension || 'jpg';
        const storagePath = `${user_id}/${Date.now()}_${upload.id}.${ext}`;

        // Upload to stories bucket
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(storagePath, bytes, {
            contentType: metadata.content_type || 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('stories')
          .getPublicUrl(storagePath);

        // Calculate expiry
        const expiresAt = metadata.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Insert record
        const { error: insertError } = await supabase
          .from('stories')
          .insert({
            user_id,
            media_url: urlData.publicUrl,
            caption: metadata.caption || '',
            expires_at: expiresAt,
          });

        if (insertError) throw insertError;
        break;
      }
    }

    console.log(`[SyncManager] Successfully processed upload: ${upload_type}`);
  }

  async getStatus(): Promise<{
    isSyncing: boolean;
    pendingCount: number;
    pendingUploads: number;
    pendingInteractions: number;
    isConnected: boolean;
  }> {
    const pendingCount = await getQueueCount();
    const pendingUploads = await getUploadQueueCount();
    const pendingInteractions = await getInteractionQueueCount();
    const state = await Network.getNetworkStateAsync();

    return {
      isSyncing: this.isSyncing,
      pendingCount,
      pendingUploads,
      pendingInteractions,
      isConnected: state.isConnected ?? false,
    };
  }

  async forcSync(): Promise<void> {
    await resetFailedItems();
    await resetFailedUploads();
    await resetFailedInteractions();
    await this.processAllQueues();
  }

  destroy(): void {
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.listeners.clear();
    this.isInitialized = false;

    console.log('[SyncManager] Destroyed');
  }
}

export const syncManager = SyncManager.getInstance();
export default syncManager;
