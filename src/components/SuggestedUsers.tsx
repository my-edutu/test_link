import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSuggestedUsers, followUser, unfollowUser, type UserProfile } from '../utils/social';

interface SuggestedUsersProps {
  limit?: number;
  onUserPress?: (user: UserProfile) => void;
}

export const SuggestedUsers: React.FC<SuggestedUsersProps> = ({
  limit = 5,
  onUserPress
}) => {
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});
  const [isFollowing, setIsFollowing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSuggestedUsers();
  }, [limit]);

  const loadSuggestedUsers = async () => {
    try {
      setLoading(true);
      const users = await getSuggestedUsers(limit);
      setSuggestedUsers(users);
    } catch (error) {
      console.error('Error loading suggested users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (followLoading[userId]) return;

    setFollowLoading(prev => ({ ...prev, [userId]: true }));

    try {
      if (isFollowing[userId]) {
        // Unfollow
        const success = await unfollowUser(userId);
        if (success) {
          setIsFollowing(prev => ({ ...prev, [userId]: false }));
          // Remove from suggested users
          setSuggestedUsers(prev => prev.filter(user => user.id !== userId));
        }
      } else {
        // Follow
        const success = await followUser(userId);
        if (success) {
          setIsFollowing(prev => ({ ...prev, [userId]: true }));
          Alert.alert('Success', 'You are now following this user!');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to follow/unfollow user. Please try again.');
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const renderUserItem = ({ item: user }: { item: UserProfile }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => onUserPress?.(user)}
    >
      <View style={styles.userAvatar}>
        {user.avatar_url && user.avatar_url.startsWith('http') ? (
          <Image
            source={{ uri: user.avatar_url }}
            style={styles.avatarImage}
            onError={() => console.log('Failed to load user avatar image:', user.avatar_url)}
          />
        ) : (
          <Text style={styles.userAvatarEmoji}>{user.avatar_url || '👤'}</Text>
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.full_name || user.username}</Text>
        <Text style={styles.userUsername}>@{user.username}</Text>
        {user.primary_language && (
          <Text style={styles.userLanguage}>{user.primary_language}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.followButton,
          isFollowing[user.id] && styles.followingButton
        ]}
        onPress={() => handleFollow(user.id)}
        disabled={followLoading[user.id]}
      >
        {followLoading[user.id] ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={[
            styles.followButtonText,
            isFollowing[user.id] && styles.followingButtonText
          ]}>
            {isFollowing[user.id] ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Finding people to follow...</Text>
      </View>
    );
  }

  if (suggestedUsers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>No suggested users found</Text>
        <Text style={styles.emptySubtext}>Check back later for new suggestions</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suggested for you</Text>
        <TouchableOpacity onPress={loadSuggestedUsers}>
          <Ionicons name="refresh" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={suggestedUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarEmoji: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  userLanguage: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  followButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#F3F4F6',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },
});
