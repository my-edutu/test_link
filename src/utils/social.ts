import { supabase } from '../supabaseClient';

export interface FollowerCounts {
  followers_count: number;
  following_count: number;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  primary_language?: string;
  bio?: string;
  location?: string;
  created_at: string;
}

export interface FollowRelationship {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

/**
 * Follow a user
 * @param userId - ID of the user to follow
 * @returns Promise<boolean>
 */
export const followUser = async (userId: string): Promise<boolean> => {
  try {
    const currentUserId = (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) return false;

    const { error } = await supabase
      .from('followers')
      .insert({
        follower_id: currentUserId,
        following_id: userId,
      });

    if (error) {
      console.error('Error following user:', error);
      return false;
    }


    return true;
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
};

/**
 * Unfollow a user
 * @param userId - ID of the user to unfollow
 * @returns Promise<boolean>
 */
export const unfollowUser = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('following_id', userId);

    if (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
};

/**
 * Check if current user is following another user
 * @param userId - ID of the user to check
 * @returns Promise<boolean>
 */
export const isFollowingUser = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('following_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking follow status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

/**
 * Get follower counts for a user
 * @param userId - ID of the user
 * @returns Promise<FollowerCounts | null>
 */
export const getFollowerCounts = async (userId: string): Promise<FollowerCounts | null> => {
  try {
    const { data, error } = await supabase
      .from('follower_counts')
      .select('followers_count, following_count')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting follower counts:', error);
      return null;
    }

    return {
      followers_count: data.followers_count || 0,
      following_count: data.following_count || 0,
    };
  } catch (error) {
    console.error('Error getting follower counts:', error);
    return null;
  }
};

/**
 * Get list of users that a user is following
 * @param userId - ID of the user
 * @returns Promise<UserProfile[]>
 */
export const getFollowing = async (userId: string): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        following_id,
        profiles!followers_following_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          primary_language,
          bio,
          location,
          created_at
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting following:', error);
      return [];
    }

    return (data?.map(item => item.profiles).filter(Boolean) as unknown as UserProfile[]) || [];
  } catch (error) {
    console.error('Error getting following:', error);
    return [];
  }
};

/**
 * Get list of users following a user
 * @param userId - ID of the user
 * @returns Promise<UserProfile[]>
 */
export const getFollowers = async (userId: string): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        follower_id,
        profiles!followers_follower_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          primary_language,
          bio,
          location,
          created_at
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting followers:', error);
      return [];
    }

    return (data?.map(item => item.profiles).filter(Boolean) as unknown as UserProfile[]) || [];
  } catch (error) {
    console.error('Error getting followers:', error);
    return [];
  }
};

/**
 * Get suggested users to follow (users not currently following)
 * @param limit - Maximum number of suggestions
 * @returns Promise<UserProfile[]>
 */
export const getSuggestedUsers = async (limit: number = 10): Promise<UserProfile[]> => {
  try {
    const currentUserId = (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) return [];

    // Get users that the current user is not following
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        primary_language,
        bio,
        location,
        created_at
      `)
      .neq('id', currentUserId)
      .not('id', 'in', `(
        SELECT following_id
        FROM followers
        WHERE follower_id = '${currentUserId}'
      )`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting suggested users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting suggested users:', error);
    return [];
  }
};
