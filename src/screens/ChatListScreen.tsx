// src/screens/ChatListScreen.tsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatSync } from '../hooks/useChatSync';
import { useStories } from '../hooks/useStories';
import { StoriesRail } from '../components/StoriesRail';
import { ChatListItem } from '../components/chat/ChatListItem';
import { GameCarousel } from '../components/chat/GameCarousel';
import { ChatContact } from '../types/chat.types';
import { Colors, Typography, Layout, Gradients } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ChatListScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'Chats' | 'Groups' | 'Contacts' | 'Games'>('Chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTranslations, setShowTranslations] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Scroll Ref for Swipeable Tabs
  const horizontalScrollRef = useRef<ScrollView>(null);

  // Sync Tab Press with Scroll
  const handleTabPress = (tab: 'Chats' | 'Groups' | 'Contacts' | 'Games') => {
    setActiveTab(tab);
    const tabIndex = ['Chats', 'Groups', 'Contacts', 'Games'].indexOf(tab);
    horizontalScrollRef.current?.scrollTo({ x: tabIndex * SCREEN_WIDTH, animated: true });
  };

  // Sync Scroll with Tab State
  const handleMomentumScrollEnd = (event: any) => {
    const position = event.nativeEvent.contentOffset.x;
    const index = Math.round(position / SCREEN_WIDTH);
    const tabs: ('Chats' | 'Groups' | 'Contacts' | 'Games')[] = ['Chats', 'Groups', 'Contacts', 'Games'];
    if (tabs[index]) {
      setActiveTab(tabs[index]);
    }
  };

  // Custom hooks for data
  const { stories, fetchStories } = useStories();
  const {
    contacts,
    joinedGroups,
    mutuals,
    loadingChats,
    refreshing: chatsRefreshing,
    onRefresh: onRefreshChats,
  } = useChatSync();

  const onRefresh = async () => {
    await Promise.all([onRefreshChats(), fetchStories()]);
  };

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
        <GlassCard intensity={isDark ? 40 : 80} style={[styles.createModalContent, { backgroundColor: isDark ? undefined : colors.card }]}>
          <Text style={[styles.createModalTitle, { color: colors.text }]}>Create New</Text>

          <TouchableOpacity
            style={[styles.createOption, { borderBottomColor: colors.border }]}
            onPress={() => {
              setShowCreateModal(false);
              navigation.navigate('Groups');
            }}
          >
            <View style={[styles.createIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="people" size={20} color="#10B981" />
            </View>
            <View style={styles.createOptionText}>
              <Text style={[styles.createOptionTitle, { color: colors.text }]}>Create Group</Text>
              <Text style={[styles.createOptionDesc, { color: colors.textSecondary }]}>Start a language learning group</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createOption, { borderBottomColor: colors.border }]}
            onPress={() => {
              setShowCreateModal(false);
              navigation.navigate('CreateStory');
            }}
          >
            <View style={[styles.createIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="camera" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.createOptionText}>
              <Text style={[styles.createOptionTitle, { color: colors.text }]}>Post Story</Text>
              <Text style={[styles.createOptionDesc, { color: colors.textSecondary }]}>Share your language journey</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createOption, { borderBottomColor: 'transparent' }]}
            onPress={() => {
              setShowCreateModal(false);
              navigation.navigate('StartLive');
            }}
          >
            <View style={[styles.createIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="radio" size={20} color="#EF4444" />
            </View>
            <View style={styles.createOptionText}>
              <Text style={[styles.createOptionTitle, { color: colors.text }]}>Go Live</Text>
              <Text style={[styles.createOptionDesc, { color: colors.textSecondary }]}>Start live streaming or TurnVerse game</Text>
            </View>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </Modal>
  );

  const filteredContacts = useMemo(() => contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.language.toLowerCase().includes(searchQuery.toLowerCase())
  ), [contacts, searchQuery]);

  const filteredMutuals = useMemo(() => mutuals.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.language.toLowerCase().includes(searchQuery.toLowerCase())
  ), [mutuals, searchQuery]);

  const filteredGroups = useMemo(() => joinedGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.language.toLowerCase().includes(searchQuery.toLowerCase())
  ), [joinedGroups, searchQuery]);

  // Map stories to match StoriesRail expected interface
  const mappedStories = useMemo(() => stories.map(s => ({
    id: s.id,
    user_id: s.user.id,
    username: s.user.name || s.user.username,
    avatar_url: (s.user.avatar && s.user.avatar.length > 5) ? s.user.avatar : '',
    has_unseen: !s.viewed,
    media_url: s.mediaUrl,
    thumbnail_url: s.thumbnail,
    profiles: {
      avatar_url: (s.user.avatar && s.user.avatar.length > 5) ? s.user.avatar : ''
    }
  })), [stories]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.inputBackground, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          {(['Chats', 'Groups', 'Contacts', 'Games'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.segmentBtn,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
                activeTab === tab && { backgroundColor: Colors.primary }
              ]}
              onPress={() => handleTabPress(tab)}
            >
              <Text style={[
                styles.segmentText,
                { color: colors.textSecondary },
                activeTab === tab && { color: '#FFFFFF', fontWeight: '700' }
              ]}>
                {tab === 'Chats' ? 'Direct' : tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Swipeable Content */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{ width: SCREEN_WIDTH * 4 }}
        style={{ flex: 1 }}
      >
        {/* 1. Direct (Chats) Tab */}
        <View style={styles.pageContainer}>
          <View style={{ paddingTop: 10 }}>
            {stories && <StoriesRail stories={mappedStories} />}
          </View>
          <ScrollView
            style={styles.pageScroll}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={chatsRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
          >
            {loadingChats ? (
              <View style={styles.loadingContainer}><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading chats...</Text></View>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map(contact => (
                <ChatListItem
                  key={contact.id}
                  contact={contact}
                  navigation={navigation}
                  showTranslations={showTranslations}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No messages yet</Text></View>
            )}
          </ScrollView>
        </View>

        {/* 2. Groups Tab */}
        <View style={styles.pageContainer}>
          <ScrollView style={styles.pageScroll} contentContainerStyle={styles.listContainer}>
            <GlassCard
              style={[styles.actionCard, { backgroundColor: isDark ? undefined : colors.card }]}
              intensity={isDark ? 25 : 0}
            >
              <TouchableOpacity style={styles.actionCardBody} onPress={() => navigation.navigate('Groups')}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,138,0,0.1)' }]}>
                  <Ionicons name="people" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>Discover Groups</Text>
                  <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>Find communities to join</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </GlassCard>

            {filteredGroups.length > 0 ? (
              filteredGroups.map(group => (
                <ChatListItem
                  key={group.id}
                  contact={group}
                  navigation={navigation}
                  onPress={(g) => navigation.navigate('GroupChat', {
                    group: {
                      id: g.id,
                      name: g.name,
                      description: 'Language learning group',
                      avatar: g.avatar,
                      members: g.followers || 0,
                      language: g.language,
                      lastActivity: g.lastMessageTime,
                      isPrivate: false,
                      unreadCount: g.unreadCount,
                    }
                  })}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No groups joined</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* 3. Contacts Tab */}
        <View style={styles.pageContainer}>
          <ScrollView style={styles.pageScroll} contentContainerStyle={styles.listContainer}>
            {filteredMutuals.length > 0 ? (
              filteredMutuals.map(contact => (
                <ChatListItem
                  key={contact.id}
                  contact={contact}
                  navigation={navigation}
                  onPress={() => navigation.navigate('ChatDetail', {
                    conversationId: null, // Since it's a new chat potentially
                    otherUserId: contact.otherUserId,
                    name: contact.name,
                    username: contact.username,
                    avatar: contact.avatarUrl || '' // Ensure avatar string is passed
                  })}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contacts found</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* 4. Games Tab */}
        <View style={styles.pageContainer}>
          <GameCarousel navigation={navigation} />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <CreateModal />
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor handled by theme
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h2,
    // color handled by theme
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Layout.radius.m,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 20,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    ...Typography.body,
    // color handled by theme
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Layout.radius.l,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    ...Typography.h4,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  segmentTextActive: {
    // color handled by theme
    fontWeight: '700',
  },

  // Page Layouts
  pageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  pageScroll: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  createModalContent: {
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  createModalTitle: {
    ...Typography.h2,
    marginBottom: 24,
    textAlign: 'center',
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  createIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createOptionText: {
    marginLeft: 16,
    flex: 1,
  },
  createOptionTitle: {
    ...Typography.h4,
  },
  createOptionDesc: {
    ...Typography.body,
    fontSize: 12,
    marginTop: 2,
  },
  // Action Card (Groups)
  actionCard: {
    marginVertical: 16,
    borderRadius: Layout.radius.l,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTitle: {
    ...Typography.h4,
  },
  actionDesc: {
    ...Typography.body,
    fontSize: 12,
    marginTop: 2,
  },
});

export default ChatListScreen;