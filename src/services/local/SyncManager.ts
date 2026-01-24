import * as Network from 'expo-network';
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

type SyncEventCallback = (event: SyncEvent) => void;

export interface SyncEvent {
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'item_processed' | 'item_failed' | 'connection_changed';
  data?: {
    total?: number;
    processed?: number;
    failed?: number;
    isConnected?: boolean;
    itemId?: string;
    error?: string;
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

  private constructor() {}

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

    // Set up network monitoring
    this.startNetworkMonitoring();

    // Set up app state monitoring
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // Initial network check
    const state = await Network.getNetworkStateAsync();
    this.wasOffline = !(state.isConnected ?? false);

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
          this.processQueue();
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
        this.processQueue();
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

  async processQueue(): Promise<void> {
    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress, skipping');
      return;
    }

    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      console.log('[SyncManager] Offline, skipping sync');
      return;
    }

    const queue = await getQueue();
    if (queue.length === 0) {
      console.log('[SyncManager] Queue is empty, nothing to sync');
      return;
    }

    this.isSyncing = true;
    let processed = 0;
    let failed = 0;

    this.emit({
      type: 'sync_started',
      data: { total: queue.length },
    });

    console.log(`[SyncManager] Starting sync, ${queue.length} items in queue`);

    for (const item of queue) {
      try {
        await markAsProcessing(item.id);
        await this.processItem(item);
        await removeFromQueue(item.id);
        processed++;

        this.emit({
          type: 'item_processed',
          data: { itemId: item.id, processed, total: queue.length },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await markAsFailed(item.id, errorMessage);
        failed++;

        this.emit({
          type: 'item_failed',
          data: { itemId: item.id, error: errorMessage, failed },
        });

        console.error(`[SyncManager] Failed to process item ${item.id}:`, error);
      }
    }

    this.isSyncing = false;

    this.emit({
      type: 'sync_completed',
      data: { total: queue.length, processed, failed },
    });

    console.log(`[SyncManager] Sync completed: ${processed} processed, ${failed} failed`);
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

  async getStatus(): Promise<{
    isSyncing: boolean;
    pendingCount: number;
    isConnected: boolean;
  }> {
    const pendingCount = await getQueueCount();
    const state = await Network.getNetworkStateAsync();

    return {
      isSyncing: this.isSyncing,
      pendingCount,
      isConnected: state.isConnected ?? false,
    };
  }

  async forcSync(): Promise<void> {
    await resetFailedItems();
    await this.processQueue();
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
