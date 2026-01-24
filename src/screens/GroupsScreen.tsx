// src/screens/GroupsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateGroupModal from '../components/CreateGroupModal';

const { width, height } = Dimensions.get('window');

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  members: number;
  language: string;
  lastActivity: string;
  isPrivate: boolean;
  unreadCount: number;
  created_by: string;
  created_at: string;
  isJoined?: boolean;
}

interface GroupCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const groupCategories: GroupCategory[] = [
  { id: 'language_learning', name: 'Language Learning', icon: 'book', color: '#3B82F6' },
  { id: 'cultural_exchange', name: 'Cultural Exchange', icon: 'globe', color: '#10B981' },
  { id: 'practice_partners', name: 'Practice Partners', icon: 'people', color: '#8B5CF6' },
  { id: 'grammar_help', name: 'Grammar Help', icon: 'school', color: '#F59E0B' },
  { id: 'pronunciation', name: 'Pronunciation', icon: 'mic', color: '#EF4444' },
  { id: 'general_chat', name: 'General Chat', icon: 'chatbubbles', color: '#6B7280' },
];

const GroupsScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Discover' | 'My Groups' | 'Created'>('Discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Helper function to get time ago
  const timeAgo = (dateIso?: string) => {
    if (!dateIso) return '';
    const date = new Date(dateIso);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  };

  // Fetch all groups (for discovery)
  const fetchGroups = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          created_by,
          created_at,
          last_message_at,
          is_group
        `)
        .eq('is_group', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get member counts for each group
      const groupIds = conversations?.map(c => c.id) || [];
      const memberCounts = await Promise.all(
        groupIds.map(async (groupId) => {
          const { count } = await supabase
            .from('conversation_members')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', groupId);
          return { groupId, count: count || 0 };
        })
      );

      const memberCountMap = memberCounts.reduce((acc, { groupId, count }) => {
        acc[groupId] = count;
        return acc;
      }, {} as Record<string, number>);

      // Check which groups user has joined
      const { data: joinedGroups } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id)
        .in('conversation_id', groupIds);

      const joinedGroupIds = new Set(joinedGroups?.map(j => j.conversation_id) || []);

      const mappedGroups: Group[] = (conversations || []).map((conv: any) => ({
        id: conv.id,
        name: conv.title || 'Untitled Group',
        description: 'Join us for language learning!',
        avatar: '👥',
        members: memberCountMap[conv.id] || 0,
        language: 'Multiple',
        lastActivity: timeAgo(conv.last_message_at),
        isPrivate: false,
        unreadCount: 0,
        created_by: conv.created_by,
        created_at: conv.created_at,
        isJoined: joinedGroupIds.has(conv.id),
      }));

      setGroups(mappedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch user's joined groups
  const fetchMyGroups = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: memberships, error } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          conversations (
            id,
            title,
            created_by,
            created_at,
            last_message_at,
            is_group
          )
        `)
        .eq('user_id', user.id)
        .eq('conversations.is_group', true);

      if (error) throw error;

      const myGroupIds = memberships?.map(m => m.conversation_id) || [];

      // Get member counts for user's groups
      const memberCounts = await Promise.all(
        myGroupIds.map(async (groupId) => {
          const { count } = await supabase
            .from('conversation_members')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', groupId);
          return { groupId, count: count || 0 };
        })
      );

      const memberCountMap = memberCounts.reduce((acc, { groupId, count }) => {
        acc[groupId] = count;
        return acc;
      }, {} as Record<string, number>);

      const mappedMyGroups: Group[] = (memberships || []).map((membership: any) => ({
        id: membership.conversation_id,
        name: membership.conversations?.title || 'Untitled Group',
        description: 'Join us for language learning!',
        avatar: '👥',
        members: memberCountMap[membership.conversation_id] || 0,
        language: 'Multiple',
        lastActivity: timeAgo(membership.conversations?.last_message_at),
        isPrivate: false,
        unreadCount: 0,
        created_by: membership.conversations?.created_by,
        created_at: membership.conversations?.created_at,
        isJoined: true,
      }));

      setMyGroups(mappedMyGroups);
    } catch (error) {
      console.error('Error fetching my groups:', error);
    }
  }, [user?.id]);

  // Join a group
  const joinGroup = async (groupId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('conversation_members')
        .insert({
          conversation_id: groupId,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;

      // Update local state
      setGroups(prev => prev.map(group =>
        group.id === groupId ? { ...group, isJoined: true, members: group.members + 1 } : group
      ));

      Alert.alert('Success', 'You have joined the group!');
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group. Please try again.');
    }
  };

  // Leave a group
  const leaveGroup = async (groupId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setGroups(prev => prev.map(group =>
        group.id === groupId ? { ...group, isJoined: false, members: Math.max(0, group.members - 1) } : group
      ));
      setMyGroups(prev => prev.filter(group => group.id !== groupId));

      Alert.alert('Success', 'You have left the group.');
    } catch (error) {
      console.error('Error leaving group:', error);
      Alert.alert('Error', 'Failed to leave group. Please try again.');
    }
  };

  // Handle group creation completion
  const handleGroupCreated = async () => {
    // Refresh groups when a new group is created
    await fetchGroups();
    await fetchMyGroups();
  };

  // Filter groups based on search and category
  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || group.language.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const filteredMyGroups = myGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Load data on mount
  useEffect(() => {
    fetchGroups();
    fetchMyGroups();
  }, [fetchGroups, fetchMyGroups]);

  // Real-time subscription for group changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('groups-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: 'is_group=eq.true'
      }, () => {
        fetchGroups();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_members'
      }, () => {
        fetchGroups();
        fetchMyGroups();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'conversation_members'
      }, () => {
        fetchGroups();
        fetchMyGroups();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, fetchGroups, fetchMyGroups]);

  const renderGroupItem = (group: Group) => (
    <TouchableOpacity
      key={group.id}
      style={styles.groupItem}
      onPress={() => {
        // Navigate to group chat
        navigation.navigate('GroupChat', {
          group: {
            id: group.id,
            name: group.name,
            description: group.description,
            avatar: group.avatar,
            members: group.members,
            language: group.language,
            lastActivity: group.lastActivity,
            isPrivate: group.isPrivate,
            unreadCount: group.unreadCount,
          }
        });
      }}
    >
      <View style={styles.groupAvatar}>
        <Text style={styles.groupAvatarText}>{group.avatar}</Text>
        {group.isPrivate && (
          <View style={styles.privateIndicator}>
            <Ionicons name="lock-closed" size={8} color="#FFFFFF" />
          </View>
        )}
      </View>

      <View style={styles.groupInfo}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.groupActivity}>{group.lastActivity}</Text>
        </View>

        <Text style={styles.groupDescription} numberOfLines={2}>{group.description}</Text>

        <View style={styles.groupMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="people" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{group.members} members</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="language" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{group.language}</Text>
          </View>
        </View>
      </View>

      <View style={styles.groupActions}>
        {group.isJoined ? (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => leaveGroup(group.id)}
          >
            <Text style={styles.joinButtonText}>Leave</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.joinButton, styles.joinButtonActive]}
            onPress={() => joinGroup(group.id)}
          >
            <Text style={[styles.joinButtonText, styles.joinButtonTextActive]}>Join</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCategoryItem = (category: GroupCategory) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryItem,
        selectedCategory === category.id && styles.categoryItemActive
      ]}
      onPress={() => setSelectedCategory(
        selectedCategory === category.id ? null : category.id
      )}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
        <Ionicons name={category.icon as any} size={20} color="#FFFFFF" />
      </View>
      <Text style={[
        styles.categoryText,
        selectedCategory === category.id && styles.categoryTextActive
      ]}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );


  const getCurrentGroups = () => {
    switch (activeTab) {
      case 'Discover':
        return filteredGroups.filter(group => !group.isJoined);
      case 'My Groups':
        return filteredMyGroups;
      case 'Created':
        return filteredMyGroups.filter(group => group.created_by === user?.id);
      default:
        return [];
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Groups</Text>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={styles.createHeaderButton}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {groupCategories.map(renderCategoryItem)}
        </ScrollView>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['Discover', 'My Groups', 'Created'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([fetchGroups(), fetchMyGroups()]);
              setRefreshing(false);
            }}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        ) : (
          <>
            {getCurrentGroups().length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>
                  {activeTab === 'Discover' ? 'No groups found' :
                   activeTab === 'My Groups' ? 'You haven\'t joined any groups yet' :
                   'You haven\'t created any groups yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'Discover' ? 'Try adjusting your search or filters' :
                   activeTab === 'My Groups' ? 'Browse and join groups to get started' :
                   'Create your first group to bring people together'}
                </Text>
                {activeTab === 'Created' && (
                  <TouchableOpacity
                    style={styles.createFirstButton}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Text style={styles.createFirstButtonText}>Create Group</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              getCurrentGroups().map(renderGroupItem)
            )}
          </>
        )}
      </ScrollView>

      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FF8A00',
    paddingHorizontal: width * 0.05,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createHeaderButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingRight: width * 0.05,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryItemActive: {
    backgroundColor: '#FFFFFF',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FF8A00',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  activeTabText: {
    color: '#FF8A00',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: width * 0.1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  createFirstButton: {
    backgroundColor: '#FF8A00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createFirstButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  groupAvatarText: {
    fontSize: 24,
  },
  privateIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  groupActivity: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  groupActions: {
    alignItems: 'center',
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  joinButtonActive: {
    backgroundColor: '#FF8A00',
    borderColor: '#FF8A00',
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  joinButtonTextActive: {
    color: '#FFFFFF',
  },
});

export default GroupsScreen;
