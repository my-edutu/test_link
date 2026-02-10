// src/screens/GroupsScreen.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { NewtonCradleLoader } from '../components/NewtonCradleLoader';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateGroupModal from '../components/CreateGroupModal';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { Colors, Layout, Typography } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

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
  const { colors, isDark } = useTheme();
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
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      zIndex: 10,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginLeft: 12,
    },
    createHeaderButton: {
      overflow: 'hidden',
      borderRadius: 20,
    },
    createButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      gap: 4,
    },
    createButtonText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 14,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      paddingHorizontal: 12,
      marginBottom: 16,
      height: 50,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.inputBackground,
      borderWidth: isDark ? 0 : 1,
      borderColor: isDark ? 'transparent' : colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 12,
    },
    categoriesContent: {
      paddingRight: 16,
      gap: 10,
      alignItems: 'center',
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.card,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border,
      gap: 8,
    },
    categoryText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
    tabsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.card,
      borderRadius: 16,
      padding: 4,
      marginTop: 8,
      borderWidth: isDark ? 0 : 1,
      borderColor: isDark ? 'transparent' : colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
    },
    activeTab: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : colors.primary + '20',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? 'rgba(255, 255, 255, 0.6)' : colors.textSecondary,
    },
    activeTabText: {
      color: isDark ? '#FFFFFF' : colors.primary,
      fontWeight: '700',
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
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 30,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    groupItem: {
      padding: 16,
      borderRadius: 20,
      backgroundColor: isDark ? undefined : colors.card,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
    },
    groupAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      position: 'relative',
    },
    groupAvatarText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFF',
    },
    privateIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: Colors.error,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    groupInfo: {
      flex: 1,
      marginRight: 8,
    },
    groupHeader: { // Row for name + activity
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    groupName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    groupActivity: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    groupDescription: {
      fontSize: 14,
      color: isDark ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    groupMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      gap: 4,
      borderWidth: isDark ? 0 : 1,
      borderColor: colors.border,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    groupActions: {
      justifyContent: 'center',
      paddingLeft: 8,
    },
    leaveButton: {
      padding: 8,
    },
    joinButton: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.primary + '20',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    joinButtonText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 14,
    },
  }), [colors, isDark]);

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
      fetchMyGroups(); // Refresh my groups

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

  const renderGroupItem = (group: Group) => (
    <GlassCard key={group.id} style={styles.groupItem} intensity={isDark ? 30 : 0}>
      <TouchableOpacity
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
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          style={styles.groupAvatar}
        >
          <Text style={styles.groupAvatarText}>{group.name.charAt(0).toUpperCase()}</Text>
          {group.isPrivate && (
            <View style={styles.privateIndicator}>
              <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>

        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            {group.lastActivity && <Text style={styles.groupActivity}>{group.lastActivity}</Text>}
          </View>

          <Text style={styles.groupDescription} numberOfLines={2}>{group.description}</Text>

          <View style={styles.groupMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="people" size={12} color={colors.textSecondary} />
              <Text style={styles.metaText}>{group.members} members</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="language" size={12} color={colors.textSecondary} />
              <Text style={styles.metaText}>{group.language}</Text>
            </View>
          </View>
        </View>

        <View style={styles.groupActions}>
          {group.isJoined ? (
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={() => leaveGroup(group.id)}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => joinGroup(group.id)}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </GlassCard>
  );

  const renderCategoryItem = (category: GroupCategory) => {
    const isActive = selectedCategory === category.id;
    return (
      <TouchableOpacity
        key={category.id}
        onPress={() => setSelectedCategory(isActive ? null : category.id)}
        style={[
          styles.categoryItem,
          isActive && { backgroundColor: Colors.primary, borderColor: Colors.primary }
        ]}
      >
        <Ionicons name={category.icon as any} size={16} color={isActive ? '#FFF' : colors.text} />
        <Text style={[styles.categoryText, isActive && { color: '#FFF' }]}>
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
            <Text style={styles.headerTitle}>Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={styles.createHeaderButton}
          >
            <LinearGradient
              colors={[Colors.primary, '#FF5F00']}
              style={styles.createButtonGradient}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Category Filters */}
        <View style={{ height: 50, marginBottom: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {groupCategories.map(renderCategoryItem)}
          </ScrollView>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['Discover', 'My Groups', 'Created'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab
              ]}
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([fetchGroups(), fetchMyGroups()]);
              setRefreshing(false);
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <NewtonCradleLoader />
            <Text style={[styles.loadingText, { marginTop: 12 }]}>Loading groups...</Text>
          </View>
        ) : (
          <>
            {getCurrentGroups().length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={isDark ? "rgba(255,255,255,0.2)" : colors.textSecondary} />
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
                    onPress={() => setShowCreateModal(true)}
                    style={{ marginTop: 24 }}
                  >
                    <LinearGradient
                      colors={[Colors.primary, '#FF5F00']}
                      style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Create Group</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {getCurrentGroups().map(renderGroupItem)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </View>
  );
};

export default GroupsScreen;
