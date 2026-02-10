import { supabase, getSupabaseToken } from '../supabaseClient';
import * as FileSystem from 'expo-file-system/legacy';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UploadVideoResult extends UploadResult {
  thumbnailUrl?: string;
}

/**
 * Upload an audio file to Supabase Storage using native streaming
 * @param fileUri - Local file URI
 * @param userId - User ID
 * @param fileName - Optional filename
 * @param onProgress - Optional callback (0-100)
 */
export const uploadAudioFile = async (
  fileUri: string,
  userId: string,
  fileName?: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> => {
  try {
    const token = getSupabaseToken();
    if (!token) throw new Error('No authentication token found');

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const finalFileName = fileName || `audio_${timestamp}_${randomId}.m4a`;
    const storagePath = `${userId}/${finalFileName}`;

    // Construct the direct storage URL
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/voice-clips/${storagePath}`;

    // Normalize URI
    let sourceUri = fileUri;
    if (sourceUri?.startsWith('content://')) {
      const destPath = `${FileSystem.cacheDirectory}upload_${timestamp}_${randomId}.m4a`;
      await FileSystem.copyAsync({ from: sourceUri, to: destPath });
      sourceUri = destPath;
    }

    const task = FileSystem.createUploadTask(
      uploadUrl,
      sourceUri,
      {
        httpMethod: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'audio/m4a',
          'x-upsert': 'false',
        },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      },
      (data) => {
        if (onProgress) {
          const progress = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
          onProgress(progress);
        }
      }
    );

    const result = await task.uploadAsync();

    if (!result || result.status !== 200) {
      throw new Error(`Upload failed with status ${result?.status}: ${result?.body}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-clips')
      .getPublicUrl(storagePath);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('Error uploading audio:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Resolve a stored audio URL or storage path to a playable URL.
 * If given a full http(s) URL, it is returned as-is. If given a storage path,
 * we attempt to generate a public URL from the `voice-clips` bucket.
 * For private buckets, switch to createSignedUrl with an expiry as needed.
 */
export const getPlayableAudioUrl = async (
  storedUrlOrPath: string,
  expiresInSeconds: number = 60 * 60
): Promise<string | null> => {
  try {
    if (!storedUrlOrPath) return null;

    // If it's already a full URL, return as-is
    if (/^https?:\/\//i.test(storedUrlOrPath)) {
      return storedUrlOrPath;
    }

    // Otherwise, treat it as a storage path in the `voice-clips` bucket
    // By default, we try public URL. If the bucket is private, prefer signed URL.
    const { data: publicData } = supabase.storage
      .from('voice-clips')
      .getPublicUrl(storedUrlOrPath);

    if (publicData?.publicUrl) {
      return publicData.publicUrl;
    }

    // Fallback to signed URL (in case the bucket is private)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('voice-clips')
      .createSignedUrl(storedUrlOrPath, expiresInSeconds);

    if (signedError) {
      console.error('Error generating signed URL:', signedError);
      return null;
    }

    return signedData?.signedUrl || null;
  } catch (error) {
    console.error('Error resolving playable audio URL:', error);
    return null;
  }
};

/**
 * Delete an audio file from Supabase Storage
 * @param filePath - Storage path of the file to delete
 * @returns Promise<boolean>
 */
export const deleteAudioFile = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('voice-clips')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting audio file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting audio file:', error);
    return false;
  }
};

/**
 * Upload a video file to Supabase Storage (bucket: videos) using native streaming
 * @param fileUri - Local file URI
 * @param userId - User ID
 * @param fileName - Optional filename
 * @param contentType - Mime type
 * @param onProgress - Optional callback (0-100)
 */
export const uploadVideoFile = async (
  fileUri: string,
  userId: string,
  fileName?: string,
  contentType: string = 'video/mp4',
  onProgress?: (progress: number) => void
): Promise<UploadVideoResult> => {
  try {
    const token = getSupabaseToken();
    if (!token) throw new Error('No authentication token found');

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const finalFileName = fileName || `video_${timestamp}_${randomId}.mp4`;
    const storagePath = `${userId}/${finalFileName}`;

    // Construct the direct storage URL for videos bucket
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/videos/${storagePath}`;

    const task = FileSystem.createUploadTask(
      uploadUrl,
      fileUri,
      {
        httpMethod: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
          'x-upsert': 'false',
        },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      },
      (data) => {
        if (onProgress) {
          const progress = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
          onProgress(progress);
        }
      }
    );

    const result = await task.uploadAsync();

    if (!result || result.status !== 200) {
      throw new Error(`Video upload failed with status ${result?.status}: ${result?.body}`);
    }

    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(storagePath);
    return { success: true, url: urlData.publicUrl };
  } catch (e) {
    console.error('Error uploading video:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
};

export const getPlayableVideoUrl = async (
  storedUrlOrPath: string,
  expiresInSeconds: number = 60 * 60
): Promise<string | null> => {
  try {
    if (!storedUrlOrPath) return null;
    if (/^https?:\/\//i.test(storedUrlOrPath)) return storedUrlOrPath;
    const { data: publicData } = supabase.storage.from('videos').getPublicUrl(storedUrlOrPath);
    if (publicData?.publicUrl) return publicData.publicUrl;
    const { data: signedData, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(storedUrlOrPath, expiresInSeconds);
    if (error) return null;
    return signedData?.signedUrl || null;
  } catch (e) {
    return null;
  }
};
