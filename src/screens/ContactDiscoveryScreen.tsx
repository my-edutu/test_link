// src/screens/ContactDiscoveryScreen.tsx
import React, { useState } from 'react';
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
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  language: string;
  followers: number;
  mutualFriends: number;
  isFollowing: boolean;
  isVerified: boolean;
  bio: string;
  posts: number;
  reason: string;
  recentActivity: string;
}

interface InfluentialUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  language: string;
  followers: number;
  isFollowing: boolean;
  isVerified: boolean;
  specialty: string;
  engagement: number;
  weeklyViews: number;
}

const mockSuggestedUsers: SuggestedUser[] = [
  {
    id: '1',
    name: 'Chioma Adebayo',
    username: 'chioma_igbo',
    avatar: '👩🏾‍🏫',
    language: 'Igbo',
    followers: 2340,
    mutualFriends: 5,
    isFollowing: false,
    isVerified: true,
    bio: 'Igbo language teacher | Cultural enthusiast 🇳🇬',
    posts: 123,
    reason: 'Popular in your area',
    recentActivity: 'Posted 2 hours ago',
  },
  {
    id: '2',
    name: 'Tunde Yoruba',
    username: 'tunde_teacher',
    avatar: '👨🏾‍🎓',
    language: 'Yoruba',
    followers: 1890,
    mutualFriends: 3,
    isFollowing: false,
    isVerified: false,
    bio: 'Teaching Yoruba to the world 🌍',
    posts: 89,
    reason: 'Similar interests',
    recentActivity: 'Active yesterday',
  },
  {
    id: '3',
    name: 'Fatima Hassan',
    username: 'fatima_hausa',
    avatar: '👩🏾‍💼',
    language: 'Hausa',
    followers: 3240,
    mutualFriends: 8,
    isFollowing: false,
    isVerified: true,
    bio: 'Hausa storyteller | Northern Nigerian culture',
    posts: 156,
    reason: 'Followed by friends',
    recentActivity: 'Live now',
  },
];

const mockInfluentialUsers: InfluentialUser[] = [
  {
    id: '1',
    name: 'Dr. Ngozi Okafor',
    username: 'dr_ngozi',
    avatar: '👩🏾‍⚕️',
    language: 'Multi-language',
    followers: 45600,
    isFollowing: false,
    isVerified: true,
    specialty: 'Language Preservation',
    engagement: 89,
    weeklyViews: 125000,
  },
  {
    id: '2',
    name: 'Adekunle Gold',
    username: 'adekunle_musician',
    avatar: '👨🏾‍🎤',
    language: 'Yoruba',
    followers: 89400,
    isFollowing: false,
    isVerified: true,
    specialty: 'Music & Culture',
    engagement: 95,
    weeklyViews: 340000,
  },
];

const ContactDiscoveryScreen: React.FC<any> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'Suggested' | 'Influencers' | 'Search' | 'Sync'>('Suggested');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState(mockSuggestedUsers);
  const [influentialUsers, setInfluentialUsers] = useState(mockInfluentialUsers);
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);

  const handleFollow = (userId: string, type: 'suggested' | 'influential') => {
    if (type === 'suggested') {
      setSuggestedUsers(users =>
        users.map(user =>
          user.id === userId
            ? {
              ...user,
              isFollowing: !user.isFollowing,
              followers: user.isFollowing ? user.followers - 1 : user.followers + 1
            }
            : user
        )
      );
    } else {
      setInfluentialUsers(users =>
        users.map(user =>
          user.id === userId
            ? {
              ...user,
              isFollowing: !user.isFollowing,
              followers: user.isFollowing ? user.followers - 1 : user.followers + 1
            }
            : user
        )
      );
    }
  };

  const performSearch = () => {
    if (searchQuery.trim()) {
      // Simulate search results
      const results = mockSuggestedUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.language.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const syncContacts = () => {
    Alert.alert(
      'Sync Contacts',
      'Allow Lingualink AI to access your contacts to find friends who are already using the app?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Allow',
          onPress: () => {
            Alert.alert('Contacts Synced!', 'Found 12 friends on Lingualink AI');
          },
        },
      ]
    );
  };

  const renderSuggestedUser = ({ item }: { item: SuggestedUser }) => (
    <View style={[styles.userCard, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#000' }]}>
      <View style={styles.userHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('UserProfile', { user: item })}
        >
          <View style={[styles.avatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
            <Text style={styles.avatarText}>{item.avatar}</Text>
          </View>
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
              {item.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              )}
            </View>
            <Text style={[styles.userUsername, { color: colors.textSecondary }]}>@{item.username}</Text>
            <View style={styles.userMeta}>
              <View style={[styles.languageTag, { backgroundColor: isDark ? 'rgba(255, 138, 0, 0.15)' : '#FEF3E2' }]}>
                <Text style={styles.languageText}>{item.language}</Text>
              </View>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>• {item.followers.toLocaleString()} followers</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.followButton,
            { backgroundColor: colors.primary },
            item.isFollowing && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }
          ]}
          onPress={() => handleFollow(item.id, 'suggested')}
        >
          <Text style={[
            styles.followButtonText,
            { color: '#FFFFFF' },
            item.isFollowing && { color: colors.textSecondary }
          ]}>
            {item.isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.userBio, { color: colors.textSecondary }]}>{item.bio}</Text>

      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{item.posts}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{item.mutualFriends}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mutual</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.reasonText}>{item.reason}</Text>
          <Text style={[styles.activityText, { color: colors.textMuted }]}>{item.recentActivity}</Text>
        </View>
      </View>
    </View>
  );

  const renderInfluentialUser = ({ item }: { item: InfluentialUser }) => (
    <View style={[styles.influencerCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <View style={styles.influencerHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('UserProfile', { user: item })}
        >
          <View style={[styles.avatar, styles.influencerAvatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6', borderColor: colors.primary }]}>
            <Text style={styles.avatarText}>{item.avatar}</Text>
          </View>
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
              {item.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              )}
              <View style={[styles.influencerBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.influencerBadgeText}>TOP</Text>
              </View>
            </View>
            <Text style={[styles.userUsername, { color: colors.textSecondary }]}>@{item.username}</Text>
            <Text style={styles.specialtyText}>{item.specialty}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.followButton,
            { backgroundColor: colors.primary },
            item.isFollowing && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }
          ]}
          onPress={() => handleFollow(item.id, 'influential')}
        >
          <Text style={[
            styles.followButtonText,
            { color: '#FFFFFF' },
            item.isFollowing && { color: colors.textSecondary }
          ]}>
            {item.isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.influencerStats, { backgroundColor: colors.background }]}>
        <View style={styles.influencerStatItem}>
          <Text style={[styles.influencerStatNumber, { color: colors.text }]}>
            {item.followers > 1000 ? `${(item.followers / 1000).toFixed(1)}K` : item.followers}
          </Text>
          <Text style={[styles.influencerStatLabel, { color: colors.textSecondary }]}>Followers</Text>
        </View>
        <View style={styles.influencerStatItem}>
          <Text style={[styles.influencerStatNumber, { color: colors.text }]}>{item.engagement}%</Text>
          <Text style={[styles.influencerStatLabel, { color: colors.textSecondary }]}>Engagement</Text>
        </View>
        <View style={styles.influencerStatItem}>
          <Text style={[styles.influencerStatNumber, { color: colors.text }]}>
            {item.weeklyViews > 1000 ? `${(item.weeklyViews / 1000).toFixed(0)}K` : item.weeklyViews}
          </Text>
          <Text style={[styles.influencerStatLabel, { color: colors.textSecondary }]}>Weekly Views</Text>
        </View>
      </View>
    </View>
  );

  const renderSyncSection = () => (
    <View style={styles.syncSection}>
      <View style={[styles.syncCard, { backgroundColor: colors.card }]}>
        <Ionicons name="people" size={48} color={colors.primary} />
        <Text style={[styles.syncTitle, { color: colors.text }]}>Find Your Friends</Text>
        <Text style={[styles.syncDescription, { color: colors.textSecondary }]}>
          Sync your contacts to find friends who are already using Lingualink AI
        </Text>
        <TouchableOpacity style={[styles.syncButton, { backgroundColor: colors.primary }]} onPress={syncContacts}>
          <Text style={styles.syncButtonText}>Sync Contacts</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.syncCard, { backgroundColor: colors.card }]}>
        <Ionicons name="share-social" size={48} color="#10B981" />
        <Text style={[styles.syncTitle, { color: colors.text }]}>Invite Friends</Text>
        <Text style={[styles.syncDescription, { color: colors.textSecondary }]}>
          Invite your friends to join you on your language learning journey
        </Text>
        <TouchableOpacity style={[styles.syncButton, styles.inviteButton, { borderColor: colors.primary }]}>
          <Text style={[styles.syncButtonText, { color: colors.primary }]}>
            Send Invites
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.syncCard, { backgroundColor: colors.card }]}>
        <Ionicons name="scan" size={48} color="#8B5CF6" />
        <Text style={[styles.syncTitle, { color: colors.text }]}>QR Code</Text>
        <Text style={[styles.syncDescription, { color: colors.textSecondary }]}>
          Share your QR code or scan someone else's to connect instantly
        </Text>
        <TouchableOpacity style={[styles.syncButton, styles.qrButton, { borderColor: '#8B5CF6' }]}>
          <Text style={[styles.syncButtonText, { color: '#8B5CF6' }]}>
            My QR Code
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Discover People</Text>
          <TouchableOpacity>
            <Ionicons name="filter" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {['Suggested', 'Influencers', 'Search', 'Sync'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: colors.primary }
              ]}
              onPress={() => setActiveTab(tab as typeof activeTab)}
            >
              <Text style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === tab && { color: '#FFFFFF' }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Bar */}
        {activeTab === 'Search' && (
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name, username, or language..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={performSearch}
                placeholderTextColor={colors.textMuted}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={[styles.searchButton, { backgroundColor: colors.primary }]} onPress={performSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'Suggested' && (
            <View>
              <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested for You</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Based on your interests and activity
                </Text>
              </View>
              <FlatList
                data={suggestedUsers}
                renderItem={renderSuggestedUser}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.usersList}
              />
            </View>
          )}

          {activeTab === 'Influencers' && (
            <View>
              <View style={[styles.sectionHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Language Influencers</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  Follow the most influential language creators
                </Text>
              </View>
              <FlatList
                data={influentialUsers}
                renderItem={renderInfluentialUser}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.usersList}
              />
            </View>
          )}

          {activeTab === 'Search' && (
            <View>
              {searchResults.length > 0 ? (
                <View>
                  <Text style={[styles.searchResultsTitle, { color: colors.text }]}>
                    Search Results ({searchResults.length})
                  </Text>
                  <FlatList
                    data={searchResults}
                    renderItem={renderSuggestedUser}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.usersList}
                  />
                </View>
              ) : searchQuery.length > 0 ? (
                <View style={styles.noResults}>
                  <Ionicons name="search" size={48} color={colors.textSecondary} />
                  <Text style={[styles.noResultsTitle, { color: colors.textSecondary }]}>No results found</Text>
                  <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                    Try searching for a different name, username, or language
                  </Text>
                </View>
              ) : (
                <View style={styles.searchPrompt}>
                  <Ionicons name="search" size={48} color={colors.primary} />
                  <Text style={[styles.searchPromptTitle, { color: colors.text }]}>Discover New People</Text>
                  <Text style={[styles.searchPromptText, { color: colors.textSecondary }]}>
                    Search for users by name, username, or the language they speak
                  </Text>
                  <View style={styles.searchSuggestions}>
                    <Text style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>Popular searches:</Text>
                    {['Igbo', 'Yoruba', 'Hausa', 'teachers', 'storytellers'].map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion}
                        style={[styles.suggestionTag, { backgroundColor: colors.card }]}
                        onPress={() => {
                          setSearchQuery(suggestion);
                          performSearch();
                        }}
                      >
                        <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === 'Sync' && renderSyncSection()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: width * 0.05,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  searchButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  usersList: {
    paddingHorizontal: width * 0.05,
    paddingTop: 8,
  },
  userCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  influencerAvatar: {
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 24,
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 4,
  },
  userUsername: {
    fontSize: 14,
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  languageText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '500',
  },
  metaText: {
    fontSize: 12,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  userBio: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    textAlign: 'center',
  },
  activityText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  influencerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  influencerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  influencerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  influencerBadgeText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  specialtyText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  influencerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 12,
    paddingVertical: 12,
  },
  influencerStatItem: {
    alignItems: 'center',
  },
  influencerStatNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  influencerStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  syncSection: {
    padding: 16,
  },
  syncCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  syncTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  syncDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  syncButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  inviteButtonText: {},
  qrButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  qrButtonText: {},
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: width * 0.05,
    marginTop: 16,
    marginBottom: 8,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  searchPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  searchPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  searchPromptText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 20,
  },
  searchSuggestions: {
    width: '100%',
    alignItems: 'flex-start',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
  },
});

export default ContactDiscoveryScreen;