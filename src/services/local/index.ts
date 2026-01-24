// Local services for offline sync
export { getDatabase, closeDatabase, clearDatabase } from './db';
export {
  addToQueue,
  getQueue,
  getQueueCount,
  removeFromQueue,
  updateQueueItemStatus,
  markAsProcessing,
  markAsFailed,
  resetFailedItems,
  clearQueue,
  getFailedItems,
  type QueuedRequest,
  type QueueRequestInput,
} from './queue';
export { syncManager, type SyncEvent } from './SyncManager';
export { api, offlineAwareRequest, type ApiResponse, type RequestOptions } from './api';
