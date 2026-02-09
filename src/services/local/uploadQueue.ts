import { getDatabase } from './db';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

export type UploadType = 'voice_clip' | 'video_clip' | 'story';

export interface UploadMetadata {
  // Common fields
  language?: string;
  dialect?: string;
  phrase?: string;
  caption?: string;
  duration?: number;
  
  // Voice clip specific
  translation?: string;
  clip_type?: 'original' | 'duet';
  original_clip_id?: string;
  
  // Story specific
  expires_at?: string;
  
  // File info
  content_type?: string;
  file_extension?: string;
}

export interface QueuedUpload {
  id: string;
  user_id: string;
  upload_type: UploadType;
  local_file_path: string;
  thumbnail_path?: string | null;
  metadata: UploadMetadata;
  created_at: number;
  status: 'pending' | 'processing' | 'failed';
  retry_count: number;
  last_error?: string | null;
}

export interface QueueUploadInput {
  user_id: string;
  upload_type: UploadType;
  local_file_path: string;
  thumbnail_path?: string;
  metadata: UploadMetadata;
}

const OFFLINE_UPLOADS_DIR = `${FileSystem.documentDirectory}offline_uploads/`;

async function generateId(): Promise<string> {
  const uuid = await Crypto.randomUUID();
  return uuid;
}

/**
 * Ensure the offline uploads directory exists
 */
export async function ensureOfflineDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(OFFLINE_UPLOADS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(OFFLINE_UPLOADS_DIR, { intermediates: true });
    console.log('[UploadQueue] Created offline uploads directory');
  }
}

/**
 * Copy a file to the offline uploads directory for persistence
 */
export async function copyToOfflineStorage(sourceUri: string, fileName: string): Promise<string> {
  await ensureOfflineDir();
  const destPath = `${OFFLINE_UPLOADS_DIR}${fileName}`;
  
  // Handle content:// URIs on Android
  let sourceToUse = sourceUri;
  if (sourceUri.startsWith('content://')) {
    const tempPath = `${FileSystem.cacheDirectory}temp_${Date.now()}_${fileName}`;
    await FileSystem.copyAsync({ from: sourceUri, to: tempPath });
    sourceToUse = tempPath;
  }
  
  await FileSystem.copyAsync({ from: sourceToUse, to: destPath });
  console.log(`[UploadQueue] Copied file to offline storage: ${destPath}`);
  return destPath;
}

/**
 * Delete a file from offline storage
 */
export async function deleteFromOfflineStorage(filePath: string): Promise<void> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      console.log(`[UploadQueue] Deleted file from offline storage: ${filePath}`);
    }
  } catch (error) {
    console.error('[UploadQueue] Error deleting file:', error);
  }
}

/**
 * Add an upload to the offline queue
 */
export async function addUploadToQueue(input: QueueUploadInput): Promise<string> {
  const db = await getDatabase();
  const id = await generateId();
  const created_at = Date.now();
  
  // Copy the file to offline storage
  const fileExt = input.metadata.file_extension || input.local_file_path.split('.').pop() || 'bin';
  const offlineFileName = `${id}_${Date.now()}.${fileExt}`;
  const offlineFilePath = await copyToOfflineStorage(input.local_file_path, offlineFileName);
  
  // Copy thumbnail if provided
  let offlineThumbnailPath: string | null = null;
  if (input.thumbnail_path) {
    const thumbFileName = `${id}_thumb_${Date.now()}.jpg`;
    offlineThumbnailPath = await copyToOfflineStorage(input.thumbnail_path, thumbFileName);
  }
  
  await db.runAsync(
    `INSERT INTO offline_uploads (id, user_id, upload_type, local_file_path, thumbnail_path, metadata, created_at, status, retry_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
    [
      id,
      input.user_id,
      input.upload_type,
      offlineFilePath,
      offlineThumbnailPath,
      JSON.stringify(input.metadata),
      created_at,
    ]
  );
  
  console.log(`[UploadQueue] Added upload to queue: ${id} - ${input.upload_type}`);
  return id;
}

/**
 * Get all pending uploads
 */
export async function getPendingUploads(): Promise<QueuedUpload[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: string;
    user_id: string;
    upload_type: string;
    local_file_path: string;
    thumbnail_path: string | null;
    metadata: string;
    created_at: number;
    status: string;
    retry_count: number;
    last_error: string | null;
  }>(`SELECT * FROM offline_uploads WHERE status = 'pending' ORDER BY created_at ASC`);
  
  return results.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    upload_type: row.upload_type as UploadType,
    local_file_path: row.local_file_path,
    thumbnail_path: row.thumbnail_path,
    metadata: JSON.parse(row.metadata),
    created_at: row.created_at,
    status: row.status as QueuedUpload['status'],
    retry_count: row.retry_count,
    last_error: row.last_error,
  }));
}

/**
 * Get count of pending uploads
 */
export async function getUploadQueueCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM offline_uploads WHERE status = 'pending'`
  );
  return result?.count ?? 0;
}

/**
 * Get all uploads (including failed)
 */
export async function getAllUploads(): Promise<QueuedUpload[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: string;
    user_id: string;
    upload_type: string;
    local_file_path: string;
    thumbnail_path: string | null;
    metadata: string;
    created_at: number;
    status: string;
    retry_count: number;
    last_error: string | null;
  }>(`SELECT * FROM offline_uploads ORDER BY created_at DESC`);
  
  return results.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    upload_type: row.upload_type as UploadType,
    local_file_path: row.local_file_path,
    thumbnail_path: row.thumbnail_path,
    metadata: JSON.parse(row.metadata),
    created_at: row.created_at,
    status: row.status as QueuedUpload['status'],
    retry_count: row.retry_count,
    last_error: row.last_error,
  }));
}

/**
 * Remove an upload from the queue and delete associated files
 */
export async function removeUploadFromQueue(id: string): Promise<void> {
  const db = await getDatabase();
  
  // Get the upload to delete associated files
  const upload = await db.getFirstAsync<{
    local_file_path: string;
    thumbnail_path: string | null;
  }>(`SELECT local_file_path, thumbnail_path FROM offline_uploads WHERE id = ?`, [id]);
  
  if (upload) {
    await deleteFromOfflineStorage(upload.local_file_path);
    if (upload.thumbnail_path) {
      await deleteFromOfflineStorage(upload.thumbnail_path);
    }
  }
  
  await db.runAsync(`DELETE FROM offline_uploads WHERE id = ?`, [id]);
  console.log(`[UploadQueue] Removed upload from queue: ${id}`);
}

/**
 * Update upload status
 */
export async function updateUploadStatus(
  id: string,
  status: QueuedUpload['status'],
  error?: string
): Promise<void> {
  const db = await getDatabase();
  
  if (error) {
    await db.runAsync(
      `UPDATE offline_uploads SET status = ?, last_error = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [status, error, id]
    );
  } else {
    await db.runAsync(`UPDATE offline_uploads SET status = ? WHERE id = ?`, [status, id]);
  }
  
  console.log(`[UploadQueue] Updated upload status: ${id} -> ${status}`);
}

/**
 * Mark upload as processing
 */
export async function markUploadAsProcessing(id: string): Promise<void> {
  await updateUploadStatus(id, 'processing');
}

/**
 * Mark upload as failed
 */
export async function markUploadAsFailed(id: string, error: string): Promise<void> {
  await updateUploadStatus(id, 'failed', error);
}

/**
 * Reset failed uploads for retry
 */
export async function resetFailedUploads(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE offline_uploads SET status = 'pending' WHERE status = 'failed' AND retry_count < 5`
  );
  console.log('[UploadQueue] Reset failed uploads for retry');
}

/**
 * Clear all uploads
 */
export async function clearUploadQueue(): Promise<void> {
  const db = await getDatabase();
  
  // Get all uploads to delete files
  const uploads = await getAllUploads();
  for (const upload of uploads) {
    await deleteFromOfflineStorage(upload.local_file_path);
    if (upload.thumbnail_path) {
      await deleteFromOfflineStorage(upload.thumbnail_path);
    }
  }
  
  await db.runAsync(`DELETE FROM offline_uploads`);
  console.log('[UploadQueue] Upload queue cleared');
}

/**
 * Get a specific upload by ID
 */
export async function getUploadById(id: string): Promise<QueuedUpload | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    user_id: string;
    upload_type: string;
    local_file_path: string;
    thumbnail_path: string | null;
    metadata: string;
    created_at: number;
    status: string;
    retry_count: number;
    last_error: string | null;
  }>(`SELECT * FROM offline_uploads WHERE id = ?`, [id]);
  
  if (!row) return null;
  
  return {
    id: row.id,
    user_id: row.user_id,
    upload_type: row.upload_type as UploadType,
    local_file_path: row.local_file_path,
    thumbnail_path: row.thumbnail_path,
    metadata: JSON.parse(row.metadata),
    created_at: row.created_at,
    status: row.status as QueuedUpload['status'],
    retry_count: row.retry_count,
    last_error: row.last_error,
  };
}
