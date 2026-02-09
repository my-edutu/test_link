import { supabase } from '../supabaseClient';
import * as FileSystem from 'expo-file-system/legacy';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UploadVideoResult extends UploadResult {
  thumbnailUrl?: string;
}

/**
 * Upload an audio file to Supabase Storage
 * @param fileUri - Local file URI from Expo AV recording
 * @param userId - User ID for organizing files
 * @param fileName - Optional custom filename
 * @returns Promise<UploadResult>
 */
export const uploadAudioFile = async (
  fileUri: string,
  userId: string,
  fileName?: string
): Promise<UploadResult> => {
  try {
    console.log('Starting audio file upload...');
    console.log('File URI:', fileUri);
    console.log('User ID:', userId);

    // Generate a unique filename if not provided
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const finalFileName = fileName || `audio_${timestamp}_${randomId}.m4a`;

    // Create the storage path
    const storagePath = `${userId}/${finalFileName}`;

    console.log('Storage path:', storagePath);

    // Normalize URI: if content://, copy to cache to obtain a file:// path
    let sourceUri = fileUri;
    if (sourceUri?.startsWith('content://')) {
      const destPath = `${(FileSystem as any).cacheDirectory}upload_${timestamp}_${randomId}.bin`;
      console.log('Copying content URI to cache:', destPath);
      await FileSystem.copyAsync({ from: sourceUri, to: destPath });
      sourceUri = destPath;
    }

    if (!sourceUri || !(sourceUri.startsWith('file://') || sourceUri.startsWith((FileSystem as any).cacheDirectory || ''))) {
      throw new Error('Invalid audio URI');
    }

    // Read the file as base64
    const base64Data = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: 'base64',
    });

    console.log('File read successfully, size:', base64Data.length);

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('voice-clips')
      .upload(storagePath, bytes, {
        contentType: 'audio/m4a',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('File uploaded successfully:', data);

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('voice-clips')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log('Public URL:', publicUrl);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error('Error uploading audio file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
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
 * Upload a video file to Supabase Storage (bucket: videos)
 */
export const uploadVideoFile = async (
  fileUri: string,
  userId: string,
  fileName?: string,
  contentType: string = 'video/mp4'
): Promise<UploadVideoResult> => {
  try {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const finalFileName = fileName || `video_${timestamp}_${randomId}.mp4`;
    const storagePath = `${userId}/${finalFileName}`;

    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    const { error } = await supabase.storage
      .from('videos')
      .upload(storagePath, bytes, { contentType, cacheControl: '3600', upsert: false });
    if (error) return { success: false, error: error.message };

    const { data: urlData } = supabase.storage.from('videos').getPublicUrl(storagePath);
    return { success: true, url: urlData.publicUrl };
  } catch (e) {
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
