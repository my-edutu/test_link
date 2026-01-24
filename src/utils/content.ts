import { supabase } from '../supabaseClient';

export interface VoiceClipWithUser {
  id: string;
  phrase: string;
  translation: string;
  audio_url: string;
  language: string;
  dialect?: string;
  duration: number;
  likes_count: number;
  comments_count: number;
  validations_count: number;
  is_validated: boolean;
  created_at: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    primary_language?: string;
  };
}

export interface ValidationData {
  id: string;
  voice_clip_id: string;
  validator_id: string;
  validation_type: 'pronunciation' | 'grammar' | 'meaning' | 'cultural';
  rating: number;
  feedback?: string;
  is_approved: boolean;
  created_at: string;
  validator: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface ValidationStats {
  total_validations: number;
  approved_validations: number;
  rejected_validations: number;
  average_rating: number;
  is_validated: boolean;
  last_validation_date?: string;
}

/**
 * Get voice clips for discovery (all clips, ordered by recent)
 * @param limit - Maximum number of clips to return
 * @param offset - Number of clips to skip (for pagination)
 * @param language - Filter by language (optional)
 * @param validatedOnly - Only return validated clips (optional)
 * @returns Promise<VoiceClipWithUser[]>
 */
export const getDiscoveryClips = async (
  limit: number = 20,
  offset: number = 0,
  language?: string,
  validatedOnly: boolean = false
): Promise<VoiceClipWithUser[]> => {
  try {
    let query = supabase
      .from('voice_clips')
      .select(`
        *,
        profiles!voice_clips_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          primary_language
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (language) {
      query = query.eq('language', language);
    }

    if (validatedOnly) {
      query = query.eq('is_validated', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting discovery clips:', error);
      return [];
    }

    return data?.map(clip => ({
      ...clip,
      user: clip.profiles
    })) || [];
  } catch (error) {
    console.error('Error getting discovery clips:', error);
    return [];
  }
};

/**
 * Get voice clips from users that the current user follows
 * @param limit - Maximum number of clips to return
 * @param offset - Number of clips to skip (for pagination)
 * @returns Promise<VoiceClipWithUser[]>
 */
export const getFollowingClips = async (
  limit: number = 20,
  offset: number = 0
): Promise<VoiceClipWithUser[]> => {
  try {
    const currentUserId = (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) return [];

      // First get the list of users the current user follows
  const { data: followingUsers, error: followingError } = await supabase
    .from('followers')
    .select('following_id')
    .eq('follower_id', currentUserId);

  if (followingError) {
    console.error('Error getting following users:', followingError);
    return [];
  }

  if (!followingUsers || followingUsers.length === 0) {
    return []; // No following users, return empty array
  }

  const followingIds = followingUsers.map(user => user.following_id);

  // Then get clips from those users
  const { data, error } = await supabase
    .from('voice_clips')
    .select(`
      *,
      profiles!voice_clips_user_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        primary_language
      )
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting following clips:', error);
      return [];
    }

    return data?.map(clip => ({
      ...clip,
      user: clip.profiles
    })) || [];
  } catch (error) {
    console.error('Error getting following clips:', error);
    return [];
  }
};

/**
 * Get trending voice clips (most validated/rated)
 * @param limit - Maximum number of clips to return
 * @param timeFrame - Time frame for trending (7d, 30d, all)
 * @returns Promise<VoiceClipWithUser[]>
 */
export const getTrendingClips = async (
  limit: number = 20,
  timeFrame: '7d' | '30d' | 'all' = '7d'
): Promise<VoiceClipWithUser[]> => {
  try {
    let query = supabase
      .from('voice_clips')
      .select(`
        *,
        profiles!voice_clips_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          primary_language
        )
      `)
      .order('validations_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (timeFrame !== 'all') {
      const days = timeFrame === '7d' ? 7 : 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query = query.gte('created_at', cutoffDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting trending clips:', error);
      return [];
    }

    return data?.map(clip => ({
      ...clip,
      user: clip.profiles
    })) || [];
  } catch (error) {
    console.error('Error getting trending clips:', error);
    return [];
  }
};

/**
 * Get clips that need validation (not validated yet)
 * @param limit - Maximum number of clips to return
 * @param language - Filter by language (optional)
 * @returns Promise<VoiceClipWithUser[]>
 */
export const getClipsNeedingValidation = async (
  limit: number = 20,
  language?: string
): Promise<VoiceClipWithUser[]> => {
  try {
    const currentUserId = (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) return [];

    let query = supabase
      .from('voice_clips')
      .select(`
        *,
        profiles!voice_clips_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          primary_language
        )
      `)
      .eq('is_validated', false)
      .neq('user_id', currentUserId) // Don't validate your own clips
      .order('created_at', { ascending: false })
      .limit(limit);

    if (language) {
      query = query.eq('language', language);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting clips needing validation:', error);
      return [];
    }

    return data?.map(clip => ({
      ...clip,
      user: clip.profiles
    })) || [];
  } catch (error) {
    console.error('Error getting clips needing validation:', error);
    return [];
  }
};

/**
 * Submit a validation for a voice clip
 * @param clipId - ID of the voice clip to validate
 * @param validationType - Type of validation
 * @param rating - Rating from 1-5
 * @param feedback - Optional feedback text
 * @param isApproved - Whether the validation approves the clip
 * @returns Promise<boolean>
 */
export const submitValidation = async (
  clipId: string,
  validationType: 'pronunciation' | 'grammar' | 'meaning' | 'cultural',
  rating: number,
  feedback?: string,
  isApproved: boolean = true
): Promise<boolean> => {
  try {
    const currentUserId = (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) return false;

    // Get clip details for notification
    const { data: clipData } = await supabase
      .from('voice_clips')
      .select('user_id, phrase')
      .eq('id', clipId)
      .single();

    if (!clipData) return false;

    // Check if user has already validated this clip with this type
    const { data: existingValidation } = await supabase
      .from('validations')
      .select('id')
      .eq('voice_clip_id', clipId)
      .eq('validator_id', currentUserId)
      .eq('validation_type', validationType)
      .single();

    if (existingValidation) {
      // Update existing validation
      const { error } = await supabase
        .from('validations')
        .update({
          rating,
          feedback,
          is_approved: isApproved,
          created_at: new Date().toISOString()
        })
        .eq('id', existingValidation.id);

      if (error) {
        console.error('Error updating validation:', error);
        return false;
      }
    } else {
      // Create new validation
      const { error } = await supabase
        .from('validations')
        .insert({
          voice_clip_id: clipId,
          validator_id: currentUserId,
          validation_type: validationType,
          rating,
          feedback,
          is_approved: isApproved
        });

      if (error) {
        console.error('Error creating validation:', error);
        return false;
      }

    }

    // Check if clip should be marked as validated (e.g., 3+ positive validations)
    const { data: validationStats } = await supabase
      .from('voice_clip_validation_stats')
      .select('approved_validations, total_validations')
      .eq('voice_clip_id', clipId)
      .single();

    if (validationStats && validationStats.approved_validations >= 3 && validationStats.total_validations >= 3) {
      // Mark clip as validated
      await supabase
        .from('voice_clips')
        .update({ is_validated: true })
        .eq('id', clipId);

    }

    return true;
  } catch (error) {
    console.error('Error submitting validation:', error);
    return false;
  }
};

/**
 * Get validation statistics for a voice clip
 * @param clipId - ID of the voice clip
 * @returns Promise<ValidationStats | null>
 */
export const getValidationStats = async (clipId: string): Promise<ValidationStats | null> => {
  try {
    const { data, error } = await supabase
      .from('voice_clip_validation_stats')
      .select('*')
      .eq('voice_clip_id', clipId)
      .single();

    if (error) {
      console.error('Error getting validation stats:', error);
      return null;
    }

    return {
      total_validations: data.total_validations || 0,
      approved_validations: data.approved_validations || 0,
      rejected_validations: data.rejected_validations || 0,
      average_rating: data.average_rating || 0,
      is_validated: data.is_validated || false,
      last_validation_date: data.last_validation_date
    };
  } catch (error) {
    console.error('Error getting validation stats:', error);
    return null;
  }
};

/**
 * Get all validations for a voice clip
 * @param clipId - ID of the voice clip
 * @returns Promise<ValidationData[]>
 */
export const getClipValidations = async (clipId: string): Promise<ValidationData[]> => {
  try {
    const { data, error } = await supabase
      .from('validations')
      .select(`
        *,
        profiles!validations_validator_id_fkey (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('voice_clip_id', clipId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting clip validations:', error);
      return [];
    }

    return data?.map(validation => ({
      ...validation,
      validator: validation.profiles
    })) || [];
  } catch (error) {
    console.error('Error getting clip validations:', error);
    return [];
  }
};

/**
 * Search voice clips by phrase or translation
 * @param searchTerm - Search term to look for
 * @param limit - Maximum number of results
 * @returns Promise<VoiceClipWithUser[]>
 */
export const searchVoiceClips = async (
  searchTerm: string,
  limit: number = 20
): Promise<VoiceClipWithUser[]> => {
  try {
    const { data, error } = await supabase
      .from('voice_clips')
      .select(`
        *,
        profiles!voice_clips_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          primary_language
        )
      `)
      .or(`phrase.ilike.%${searchTerm}%,translation.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching voice clips:', error);
      return [];
    }

    return data?.map(clip => ({
      ...clip,
      user: clip.profiles
    })) || [];
  } catch (error) {
    console.error('Error searching voice clips:', error);
    return [];
  }
};
