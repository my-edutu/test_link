// src/screens/ChatListScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  Modal,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface ChatContact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  avatarUrl?: string;
  otherUserId?: string;
  language: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  lastMessageTranslated?: string;
  isFollowing?: boolean;
  followers?: number;
  posts?: number;
}


interface Story {
  id: string;
  user: ChatContact;
  thumbnail: string;
  timestamp: string;
  viewed: boolean;
  mediaUrl?: string;
  created_at?: string;
}




const ChatListScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Chats' | 'Groups' | 'Contacts' | 'Games'>('Chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTranslations, setShowTranslations] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<ChatContact[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);

  // Helper
  const timeAgo = (dateIso?: string) => {
    if (!dateIso) return '';
    const date = new Date(dateIso);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const fetchChats = useCallback(async () => {
    if (!user?.id) return;
    try {
      if (!refreshing) setLoadingChats(true);
      const { data: convs, error } = await supabase.rpc('get_conversations_with_unread');
      if (error) throw error;
      const results: ChatContact[] = [];
      for (const c of (convs || [])) {
        // Only include individual chats, not groups
        if (c.is_group) continue;
        // Fetch the other participant via RPC to avoid RLS recursion
        let name = c.title || 'Conversation';
        let username = 'user';
        let language = '—';
        let avatar = name.trim().charAt(0).toUpperCase() || 'U';
        let avatarUrl: string | undefined = undefined;
        const { data: other } = await supabase.rpc('get_other_participant', { p_conversation_id: c.id });
        if (other && other.length > 0) {
          const p = other[0] as any;
          name = p.full_name || name;
          username = p.username || username;
          language = p.primary_language || language;
          avatarUrl = p.avatar_url || undefined;
          // Use avatar URL if available, otherwise use first letter of name
          if (!avatarUrl && name) {
            avatar = name.trim().charAt(0).toUpperCase();
          }
          // store other user's id for presence in detail screen
          (p as any)._uid = p.user_id;
          const otherUserId = p.user_id as string | undefined;
          results.push({
            id: c.id,
            name,
            username,
            avatar: avatar,
            avatarUrl,
            otherUserId,
            language,
            lastMessage: c.last_message_preview || '',
            lastMessageTime: timeAgo(c.last_message_at as any),
            unreadCount: (c.unread_count as number) || 0,
            isOnline: false,
          });
          continue;
        }
        results.push({
          id: c.id,
          name,
          username,
          avatar: avatar,
          avatarUrl,
          language,
          lastMessage: c.last_message_preview || '',
          lastMessageTime: timeAgo(c.last_message_at as any),
          unreadCount: (c.unread_count as number) || 0,
          isOnline: false,
        });
      }
      setContacts(results);
    } catch (e) {
      console.error('load chats failed', e);
    } finally {
      setLoadingChats(false);
      if (refreshing) setRefreshing(false);
    }
  }, [user?.id, refreshing]);

  // Fetch user's joined groups
  const fetchJoinedGroups = useCallback(async () => {
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
            last_message_preview,
            is_group
          )
        `)
        .eq('user_id', user.id)
        .eq('conversations.is_group', true);

      if (error) throw error;

      // Get member counts for user's groups
      const groupIds = memberships?.map(m => m.conversation_id) || [];
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

      const mappedGroups: ChatContact[] = (memberships || []).map((membership: any) => ({
        id: membership.conversation_id,
        name: membership.conversations?.title || 'Untitled Group',
        username: membership.conversations?.title?.toLowerCase().replace(/\s+/g, '_') || 'group',
        avatar: (membership.conversations?.title || 'G').trim().charAt(0).toUpperCase(),
        language: 'Multiple',
        lastMessage: membership.conversations?.last_message_preview || '',
        lastMessageTime: timeAgo(membership.conversations?.last_message_at),
        unreadCount: 0,
        isOnline: true,
        isFollowing: true,
        followers: memberCountMap[membership.conversation_id] || 0,
        posts: 0,
      }));

      setJoinedGroups(mappedGroups);
    } catch (error) {
      console.error('Error fetching joined groups:', error);
    }
  }, [user?.id]);

  // Load conversations → map to contact cards without changing UI
  useEffect(() => {
    fetchChats();
    fetchJoinedGroups();
    // Realtime: update last message & unread on new messages
    const channel = supabase
      .channel('chatlist-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const m = payload.new;
        setContacts(prev => {
          const updated = prev.map(c => c.id === m.conversation_id ? {
            ...c,
            lastMessage: m.text || (m.media_url ? '[media]' : c.lastMessage),
            lastMessageTime: timeAgo(m.created_at),
            unreadCount: c.unreadCount + 1,
          } : c);
          // move the updated conversation to top
          const idx = updated.findIndex(c => c.id === m.conversation_id);
          if (idx > 0) {
            const [item] = updated.splice(idx, 1);
            updated.unshift(item);
          }
          return [...updated];
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reads' }, (payload: any) => {
        const r = payload.new;
        // When current user reads, decrease unread for that conversation if we can map it
        if (r.user_id === user?.id) {
          // We need message->conversation mapping; do a lightweight fetch for that message id
          supabase.from('messages').select('conversation_id').eq('id', r.message_id).maybeSingle()
            .then(({ data }) => {
              if (data?.conversation_id) {
                setContacts(prev => prev.map(c => c.id === data.conversation_id ? {
                  ...c,
                  unreadCount: Math.max(0, c.unreadCount - 1),
                } : c));
              }
            });
        }
      })
      // Real-time group updates
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members' }, () => {
        fetchJoinedGroups();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'conversation_members' }, () => {
        fetchJoinedGroups();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user?.id, fetchChats, fetchJoinedGroups]);

  // Stories: initial load and realtime updates
  const fetchStories = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: rows, error } = await supabase
        .from('stories')
        .select('id, user_id, media_url, created_at, expires_at, is_public')
        .gt('expires_at', new Date().toISOString())
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      // Get story IDs to check view status
      const storyIds = (rows || []).map((r: any) => r.id);
      const userIds = Array.from(new Set((rows || []).map((r: any) => r.user_id)));

      // Fetch profiles and view status in parallel
      const [profilesResult, viewsResult] = await Promise.all([
        userIds.length > 0 ? supabase
          .from('profiles')
          .select('id, full_name, username, primary_language, avatar_url')
          .in('id', userIds) : Promise.resolve({ data: [] }),
        storyIds.length > 0 ? supabase
          .from('story_views')
          .select('story_id')
          .eq('user_id', user.id)
          .in('story_id', storyIds) : Promise.resolve({ data: [] })
      ]);

      const profilesMap: Record<string, any> = {};
      (profilesResult.data || []).forEach((p: any) => { profilesMap[p.id] = p; });

      const viewedStoryIds = new Set((viewsResult.data || []).map((v: any) => v.story_id));

      const mapped: Story[] = (rows || []).map((row: any) => {
        const p = profilesMap[row.user_id] || {};
        const name: string = p.full_name || p.username || 'User';
        const userAvatar = name ? name.trim().charAt(0).toUpperCase() : '👤';
        const contactUser: ChatContact = {
          id: row.user_id,
          name,
          username: p.username || 'user',
          avatar: userAvatar,
          language: p.primary_language || '—',
          lastMessage: '',
          lastMessageTime: '',
          unreadCount: 0,
          isOnline: false,
        };
        return {
          id: row.id,
          user: contactUser,
          thumbnail: '🎬',
          timestamp: '',
          viewed: viewedStoryIds.has(row.id),
          mediaUrl: row.media_url,
          created_at: row.created_at, // Add created_at for sorting
        };
      });

      // Sort stories: unviewed first (newest first), then viewed (newest first)
      const sortedStories = mapped.sort((a, b) => {
        // First sort by viewed status (unviewed first)
        if (a.viewed !== b.viewed) {
          return a.viewed ? 1 : -1;
        }
        // Then sort by creation date (newest first) within each group
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });

      setStories(sortedStories);
    } catch (e) {
      console.log('fetchStories error', e);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStories();
    if (!user?.id) return;
    const ch = supabase
      .channel('stories-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, (payload: any) => {
        const row = payload.new;
        if (row.is_public && new Date(row.expires_at).getTime() > Date.now()) {
          // Fetch profile for the new author (small follow-up query)
          supabase.from('profiles').select('full_name, username, primary_language').eq('id', row.user_id).maybeSingle()
            .then(({ data: prof }) => {
              const name: string = prof?.full_name || prof?.username || 'User';
              const userAvatar = name.trim().charAt(0).toUpperCase();
              const contactUser: ChatContact = {
                id: row.user_id,
                name,
                username: prof?.username || 'user',
                avatar: userAvatar,
                language: prof?.primary_language || '—',
                lastMessage: '',
                lastMessageTime: '',
                unreadCount: 0,
                isOnline: false,
              };
              setStories(prev => {
                const newStory = {
                  id: row.id,
                  user: contactUser,
                  thumbnail: '🎬',
                  timestamp: '',
                  viewed: false,
                  mediaUrl: row.media_url,
                  created_at: row.created_at
                };
                const updated = [newStory, ...prev];
                // Re-sort to maintain unviewed first order
                return updated.sort((a, b) => {
                  if (a.viewed !== b.viewed) {
                    return a.viewed ? 1 : -1;
                  }
                  const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                  const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                  return bTime - aTime;
                });
              });
            });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stories' }, (payload: any) => {
        const row = payload.new;
        setStories(prev => {
          // remove if expired or no longer public
          if (!row.is_public || new Date(row.expires_at).getTime() <= Date.now()) {
            return prev.filter(s => s.id !== row.id);
          }
          return prev;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, (payload: any) => {
        const row = payload.old;
        setStories(prev => prev.filter(s => s.id !== row.id));
      })
      // Real-time story view updates
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'story_views' }, (payload: any) => {
        const view = payload.new;
        if (view.user_id === user?.id) {
          // User viewed a story - mark it as viewed and re-sort
          setStories(prev => {
            const updated = prev.map(story =>
              story.id === view.story_id ? { ...story, viewed: true } : story
            );
            // Re-sort: unviewed first (newest first), then viewed (newest first)
            return updated.sort((a, b) => {
              if (a.viewed !== b.viewed) {
                return a.viewed ? 1 : -1;
              }
              // Sort by creation date within each group
              const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
              const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
              return bTime - aTime;
            });
          });
        }
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [user?.id, fetchStories]);

  const CreateModal = () => (
    <Modal
      visible={showCreateModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackground}
          onPress={() => setShowCreateModal(false)}
        />
        <View style={styles.createModalContent}>
          <Text style={styles.createModalTitle}>Create New</Text>

          <TouchableOpacity
            style={styles.createOption}
            onPress={() => {
              setShowCreateModal(false);
              navigation.navigate('Groups');
            }}
          >
            <Ionicons name="people" size={24} color="#10B981" />
            <View style={styles.createOptionText}>
              <Text style={styles.createOptionTitle}>Create Group</Text>
              <Text style={styles.createOptionDesc}>Start a language learning group</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createOption}
            onPress={() => {
              setShowCreateModal(false);
              navigation.navigate('CreateStory');
            }}
          >
            <Ionicons name="camera" size={24} color="#8B5CF6" />
            <View style={styles.createOptionText}>
              <Text style={styles.createOptionTitle}>Post Story</Text>
              <Text style={styles.createOptionDesc}>Share your language journey</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createOption}
            onPress={() => {
              setShowCreateModal(false);
              navigation.navigate('StartLive');
            }}
          >
            <Ionicons name="radio" size={24} color="#EF4444" />
            <View style={styles.createOptionText}>
              <Text style={styles.createOptionTitle}>Go Live</Text>
              <Text style={styles.createOptionDesc}>Start live streaming or TurnVerse game</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderStoryItem = ({ item }: { item: Story | { id: string; user: { name: string; }; thumbnail: string; } }) => {
    // Handle "Add Story" item
    if (item.id === 'add') {
      return (
        <TouchableOpacity
          style={styles.addStoryItem}
          onPress={() => navigation.navigate('CreateStory')}
        >
          <View style={styles.addStoryAvatar}>
            <Text style={styles.addStoryText}>➕</Text>
          </View>
          <Text style={styles.storyUsername}>Add Story</Text>
        </TouchableOpacity>
      );
    }

    // Handle regular story items
    const storyItem = item as Story;
    return (
      <TouchableOpacity
        style={[styles.storyItem, !storyItem.viewed && styles.unviewedStory]}
        onPress={() => navigation.navigate('StoryView', { story: storyItem })}
      >
        <View style={styles.storyAvatar}>
          <Text style={styles.storyAvatarText}>{storyItem.user.avatar}</Text>
          {!storyItem.viewed && <View style={styles.storyIndicator} />}
        </View>
        <Text style={styles.storyUsername} numberOfLines={1}>
          {storyItem.user.name.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderChatItem = (contact: ChatContact) => (
    <TouchableOpacity
      key={contact.id}
      style={styles.chatItem}
      onPress={() => {
        // Check if this is a group by checking if it's in the groups list
        const isGroup = joinedGroups.some(group => group.id === contact.id);
        if (isGroup) {
          navigation.navigate('GroupChat', {
            group: {
              id: contact.id,
              name: contact.name,
              description: 'Language learning group',
              avatar: contact.avatar,
              members: contact.followers || 0,
              language: contact.language,
              lastActivity: contact.lastMessageTime,
              isPrivate: false,
              unreadCount: contact.unreadCount,
            }
          });
        } else {
          navigation.navigate('ChatDetail', { contact, conversationId: contact.id });
        }
      }}
    >
      <View style={styles.chatItemLeft}>
        <View style={[styles.avatar, contact.isOnline && styles.onlineAvatar]}>
          {contact.avatarUrl ? (
            <Image
              source={{ uri: contact.avatarUrl }}
              style={styles.avatarImage}
              defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
            />
          ) : (
            <Text style={styles.avatarText}>{contact.avatar}</Text>
          )}
          {contact.isOnline && <View style={styles.onlineIndicator} />}
        </View>
      </View>

      <View style={styles.chatItemCenter}>
        <View style={styles.chatItemHeader}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <View style={styles.contactInfo}>
            <View style={styles.languageTag}>
              <Text style={styles.languageText}>{contact.language}</Text>
            </View>
            {contact.isFollowing && (
              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
            )}
          </View>
        </View>

        <Text style={styles.lastMessage} numberOfLines={1}>
          {contact.lastMessage}
        </Text>

        {showTranslations && contact.lastMessageTranslated && (
          <Text style={styles.translatedMessage} numberOfLines={1}>
            📝 {contact.lastMessageTranslated}
          </Text>
        )}

        <View style={styles.contactStats}>
          <Text style={styles.statsText}>{contact.followers} followers • {contact.posts} posts</Text>
        </View>
      </View>

      <View style={styles.chatItemRight}>
        <Text style={styles.lastMessageTime}>{contact.lastMessageTime}</Text>
        {contact.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{contact.unreadCount}</Text>
          </View>
        )}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('VoiceCall', { contact })}
          >
            <Ionicons name="call" size={14} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('VideoCall', { contact })}
          >
            <Ionicons name="videocam" size={14} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );


  const renderGameItem = () => (
    <View style={styles.gamesContainer}>
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => navigation.navigate('TurnVerse')}
      >
        <View style={styles.gameIcon}>
          <Ionicons name="game-controller" size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.gameTitle}>TurnVerse</Text>
        <Text style={styles.gameDescription}>Language learning game with live streaming</Text>
        <View style={styles.gameStats}>
          <View style={styles.gameStat}>
            <Ionicons name="people" size={12} color="#10B981" />
            <Text style={styles.gameStatText}>234 playing</Text>
          </View>
          <View style={styles.gameStat}>
            <Ionicons name="radio" size={12} color="#EF4444" />
            <Text style={styles.gameStatText}>12 live</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => navigation.navigate('WordChain')}
      >
        <View style={[styles.gameIcon, { backgroundColor: '#8B5CF6' }]}>
          <Ionicons name="link" size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.gameTitle}>Word Chain</Text>
        <Text style={styles.gameDescription}>Build vocabulary in your language</Text>
        <View style={styles.gameStats}>
          <View style={styles.gameStat}>
            <Ionicons name="people" size={12} color="#10B981" />
            <Text style={styles.gameStatText}>89 playing</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );


  const { colors: userTheme, theme: currentTheme } = useTheme();
  const styles = useMemo(() => createStyles(userTheme, currentTheme), [userTheme, currentTheme]);

  const getTabContent = () => {
    const filteredContacts = contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.language.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredGroups = joinedGroups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.language.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (activeTab) {
      case 'Chats':
        return (
          <>
            {stories.length > 0 && (
              <View style={styles.storiesSection}>
                <Text style={styles.sectionTitle}>Stories</Text>
                <FlatList
                  data={[{ id: 'add', user: { name: 'Add', avatar: '+' }, thumbnail: '+', viewed: false, timestamp: '' } as any, ...stories]}
                  renderItem={renderStoryItem}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storiesList}
                />
              </View>
            )}
            <View style={styles.listContainer}>
              {loadingChats ? (
                <View style={styles.loadingContainer}><Text style={styles.loadingText}>Loading chats...</Text></View>
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map(renderChatItem)
              ) : (
                <View style={styles.emptyContainer}><Text style={styles.emptyText}>No messages yet</Text></View>
              )}
            </View>
          </>
        );
      case 'Groups':
        return (
          <View style={styles.listContainer}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Groups')}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,138,0,0.1)' }]}>
                <Ionicons name="people" size={24} color={userTheme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Discover Groups</Text>
                <Text style={styles.actionDesc}>Find communities to join</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={userTheme.textSecondary} />
            </TouchableOpacity>

            {filteredGroups.length > 0 ? (
              filteredGroups.map(renderChatItem)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No groups joined</Text>
              </View>
            )}
          </View>
        );
      case 'Contacts':
        return (
          <View style={styles.listContainer}>
            {filteredContacts.map(renderChatItem)}
          </View>
        );
      case 'Games':
        return renderGameItem();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={currentTheme === 'dark' ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowTranslations(!showTranslations)}>
              <Ionicons name={showTranslations ? "language" : "language-outline"} size={22} color={userTheme.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.primaryBtn]} onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={userTheme.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={userTheme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          {(['Chats', 'Groups', 'Contacts', 'Games'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.segmentBtn, activeTab === tab && styles.segmentBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
                {tab === 'Chats' ? 'Direct' : tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChats(); fetchJoinedGroups(); }} tintColor={userTheme.primary} />}
      >
        {getTabContent()}
      </ScrollView>

      <CreateModal />

      {/* Invisible FlatList for consistent pull to refresh if needed, but ScrollView has it */}
    </View>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.text,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: colors.background, // Or white/gray depending on theme contrast
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  storiesSection: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 16,
    marginBottom: 12,
  },
  storiesList: {
    paddingHorizontal: 16,
  },
  // Story Items
  storyItem: { alignItems: 'center', marginRight: 16 },
  storyAvatar: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: colors.primary,
    padding: 2, // Space for border
    justifyContent: 'center', alignItems: 'center'
  },
  storyAvatarInner: {
    width: '100%', height: '100%', borderRadius: 30,
    backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center'
  },
  storyUser: {
    fontSize: 12, color: colors.text, marginTop: 4,
    width: 64, textAlign: 'center'
  },
  unviewedStory: { borderColor: colors.textSecondary }, // Just regular border if viewed? Logic implies unviewed gets highlighted

  // Reused styles from previous file content for StoryItem implementation details:
  addStoryItem: { alignItems: 'center', marginRight: 16 },
  addStoryAvatar: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.card,
  },

  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 16, fontWeight: 'bold', color: colors.text,
  },
  actionDesc: {
    fontSize: 12, color: colors.textSecondary,
  },

  // Chat Item
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border, // Divider
  },
  chatItemLeft: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  onlineIndicator: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2, borderColor: colors.background,
  },
  chatItemCenter: { flex: 1 },
  chatItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  contactName: { fontSize: 16, fontWeight: '600', color: colors.text },
  lastMessageTime: { fontSize: 12, color: colors.textSecondary },
  lastMessage: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
  translatedMessage: { fontSize: 13, color: colors.primary, fontStyle: 'italic' },
  unreadBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  unreadCount: { fontSize: 10, color: '#FFF', fontWeight: 'bold' },

  loadingContainer: { padding: 20, alignItems: 'center' },
  loadingText: { color: colors.textSecondary },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 16 },

  // Modal styles (basic adaptation)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackground: { ...StyleSheet.absoluteFillObject },
  createModalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  createModalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20, textAlign: 'center' },
  createOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  createOptionText: { marginLeft: 16 },
  createOptionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  createOptionDesc: { fontSize: 12, color: colors.textSecondary },

  // Games style
  gamesContainer: { paddingVertical: 10 },
  gameCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  gameIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  gameDescription: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 },
  gameStats: { flexDirection: 'row', gap: 16 },
  gameStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gameStatText: { fontSize: 12, color: colors.textSecondary },

});

export default ChatListScreen;