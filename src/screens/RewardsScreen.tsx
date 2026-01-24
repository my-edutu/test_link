// src/screens/RewardsScreen.tsx
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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

const { width, height } = Dimensions.get('window');

// Define the tab param list for this screen specifically
type TabParamList = {
  Home: undefined;
  Library: undefined;
  Create: undefined;
  Chat: undefined;
  Profile: undefined;
  Rewards: undefined;
};

type RewardsScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Profile'>;

interface Props {
  navigation: RewardsScreenNavigationProp;
}

interface Contributor {
  id: string;
  name: string;
  username: string;
  avatar: string;
  points: number;
  contributions: number;
  badge: string;
  rank: number;
  isCurrentUser?: boolean;
}

interface Transaction {
  id: string;
  type: 'earned' | 'spent' | 'received' | 'sent';
  amount: number;
  description: string;
  date: string;
  icon: string;
}

interface RewardItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
  category: string;
  available: boolean;
}

const mockContributors: Contributor[] = [
  {
    id: '1',
    name: 'Amara',
    username: 'Amara_Linguist',
    avatar: '🌱',
    points: 15420,
    contributions: 234,
    badge: 'Language MVP',
    rank: 1
  },
  {
    id: '2',
    name: 'Kofi Ghana',
    username: 'Kofi_Ghana',
    avatar: '👨🏾',
    points: 12890,
    contributions: 187,
    badge: 'Regional Star',
    rank: 2
  },
  {
    id: '3',
    name: 'Zara Naija',
    username: 'Zara_Naija',
    avatar: '👩🏾',
    points: 11650,
    contributions: 156,
    badge: 'Voice Champion',
    rank: 3
  },
  {
    id: '4',
    name: 'Bola Lagos',
    username: 'Bola_LG',
    avatar: '👨🏿',
    points: 9870,
    contributions: 134,
    badge: 'Rising Star',
    rank: 4
  },
  {
    id: '5',
    name: 'You',
    username: 'Onuh',
    avatar: '😊',
    points: 1250,
    contributions: 45,
    badge: 'Contributor',
    rank: 5,
    isCurrentUser: true
  },
  {
    id: '6',
    name: 'Kwame Accra',
    username: 'Kwame_GH',
    avatar: '👨🏾',
    points: 1180,
    contributions: 42,
    badge: 'Contributor',
    rank: 6
  },
  {
    id: '7',
    name: 'Fatima Kano',
    username: 'Fatima_KN',
    avatar: '👩🏾',
    points: 980,
    contributions: 38,
    badge: 'Active Member',
    rank: 7
  }
];

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'earned',
    amount: 50,
    description: 'Voice clip validated',
    date: '2 hours ago',
    icon: 'checkmark-circle'
  },
  {
    id: '2',
    type: 'earned',
    amount: 100,
    description: 'Daily contribution bonus',
    date: 'Today',
    icon: 'gift'
  },
  {
    id: '3',
    type: 'received',
    amount: 25,
    description: 'Tip from @Kofi_Ghana',
    date: 'Yesterday',
    icon: 'heart'
  },
  {
    id: '4',
    type: 'spent',
    amount: -200,
    description: 'Unlocked premium badge',
    date: '2 days ago',
    icon: 'ribbon'
  },
  {
    id: '5',
    type: 'earned',
    amount: 75,
    description: 'Story creation reward',
    date: '3 days ago',
    icon: 'book'
  }
];

const mockRewardItems: RewardItem[] = [
  {
    id: '1',
    title: 'Premium Badge Pack',
    description: 'Unlock exclusive badges',
    cost: 500,
    icon: '🏅',
    category: 'Badges',
    available: true
  },
  {
    id: '2',
    title: 'Voice Effects',
    description: 'Special voice filters',
    cost: 300,
    icon: '🎵',
    category: 'Features',
    available: true
  },
  {
    id: '3',
    title: 'Custom Avatar Frame',
    description: 'Personalize your profile',
    cost: 250,
    icon: '🖼️',
    category: 'Customization',
    available: true
  },
  {
    id: '4',
    title: 'Language Certificate',
    description: 'Official recognition',
    cost: 1000,
    icon: '🎓',
    category: 'Certificates',
    available: true
  }
];

const RewardsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Leaderboard' | 'Wallet' | 'Store'>('Leaderboard');
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly' | 'All Time'>('All Time');

  const currentUserPoints = 1250;
  const currentUserRank = 5;
  const totalEarned = 2450;
  const totalSpent = 1200;

  const renderContributor = (contributor: Contributor, index: number) => (
    <TouchableOpacity
      key={contributor.id}
      style={[
        styles.contributorCard,
        contributor.isCurrentUser && styles.currentUserCard
      ]}
    >
      <View style={styles.contributorRank}>
        {contributor.rank <= 3 ? (
          <Text style={styles.rankEmoji}>
            {contributor.rank === 1 ? '👑' : contributor.rank === 2 ? '🥈' : '🥉'}
          </Text>
        ) : (
          <Text style={[
            styles.rankNumber,
            contributor.isCurrentUser && styles.currentUserText
          ]}>{contributor.rank}</Text>
        )}
      </View>

      <View style={styles.contributorAvatar}>
        <Text style={styles.avatarText}>{contributor.avatar}</Text>
      </View>

      <View style={styles.contributorInfo}>
        <View style={styles.nameRow}>
          <Text style={[
            styles.contributorName,
            contributor.isCurrentUser && styles.currentUserText
          ]}>
            {contributor.name}
          </Text>
          {contributor.isCurrentUser && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>YOU</Text>
            </View>
          )}
        </View>
        <Text style={styles.contributorUsername}>@{contributor.username}</Text>
        <Text style={styles.contributorStats}>
          {contributor.contributions} contributions • {contributor.badge}
        </Text>
      </View>

      <View style={styles.contributorPoints}>
        <Text style={[
          styles.pointsNumber,
          contributor.isCurrentUser && styles.currentUserPoints
        ]}>{contributor.points.toLocaleString()}</Text>
        <Text style={styles.pointsLabel}>points</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTransaction = (transaction: Transaction) => (
    <View key={transaction.id} style={styles.transactionCard}>
      <View style={[
        styles.transactionIcon,
        { backgroundColor: transaction.type === 'earned' || transaction.type === 'received' ? '#ECFDF5' : '#FEF2F2' }
      ]}>
        <Ionicons
          name={transaction.icon as any}
          size={20}
          color={transaction.type === 'earned' || transaction.type === 'received' ? '#10B981' : '#EF4444'}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDescription}>{transaction.description}</Text>
        <Text style={styles.transactionDate}>{transaction.date}</Text>
      </View>
      <Text style={[
        styles.transactionAmount,
        { color: transaction.amount > 0 ? '#10B981' : '#EF4444' }
      ]}>
        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
      </Text>
    </View>
  );

  const renderRewardItem = (item: RewardItem) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.rewardCard,
        currentUserPoints < item.cost && styles.rewardCardDisabled
      ]}
      disabled={currentUserPoints < item.cost}
    >
      <View style={styles.rewardIcon}>
        <Text style={styles.rewardIconText}>{item.icon}</Text>
      </View>
      <View style={styles.rewardInfo}>
        <Text style={styles.rewardTitle}>{item.title}</Text>
        <Text style={styles.rewardDescription}>{item.description}</Text>
        <View style={styles.rewardCategory}>
          <Text style={styles.rewardCategoryText}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.rewardCost}>
        <Text style={styles.rewardCostNumber}>{item.cost}</Text>
        <Text style={styles.rewardCostLabel}>points</Text>
        {currentUserPoints >= item.cost && (
          <TouchableOpacity style={styles.redeemButton}>
            <Text style={styles.redeemButtonText}>Redeem</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + height * 0.02 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rewards & Wallet</Text>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* User Points Card */}
        <View style={styles.userPointsCard}>
          <View style={styles.pointsMainSection}>
            <Text style={styles.pointsBalanceLabel}>Total Balance</Text>
            <Text style={styles.pointsValue}>{currentUserPoints.toLocaleString()}</Text>
            <Text style={styles.pointsSubtext}>LinguaCoins</Text>
          </View>

          <View style={styles.pointsStatsRow}>
            <View style={styles.pointsStat}>
              <Ionicons name="trending-up" size={16} color="#10B981" />
              <Text style={styles.pointsStatLabel}>Earned</Text>
              <Text style={styles.pointsStatValue}>+{totalEarned}</Text>
            </View>
            <View style={styles.pointsDivider} />
            <View style={styles.pointsStat}>
              <Ionicons name="trending-down" size={16} color="#EF4444" />
              <Text style={styles.pointsStatLabel}>Spent</Text>
              <Text style={styles.pointsStatValue}>-{totalSpent}</Text>
            </View>
            <View style={styles.pointsDivider} />
            <View style={styles.pointsStat}>
              <Ionicons name="trophy" size={16} color="#FFD700" />
              <Text style={styles.pointsStatLabel}>Rank</Text>
              <Text style={styles.pointsStatValue}>#{currentUserRank}</Text>
            </View>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => setShowSendModal(true)}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="download" size={20} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Convert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['Leaderboard', 'Wallet', 'Store'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab as typeof activeTab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.activeTabText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {activeTab === 'Leaderboard' && (
          <View style={styles.leaderboardSection}>
            {/* Timeframe Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.timeframeSelector}
            >
              {['Daily', 'Weekly', 'Monthly', 'All Time'].map((timeframe) => (
                <TouchableOpacity
                  key={timeframe}
                  style={[
                    styles.timeframeButton,
                    selectedTimeframe === timeframe && styles.timeframeButtonActive
                  ]}
                  onPress={() => setSelectedTimeframe(timeframe as typeof selectedTimeframe)}
                >
                  <Text style={[
                    styles.timeframeButtonText,
                    selectedTimeframe === timeframe && styles.timeframeButtonTextActive
                  ]}>
                    {timeframe}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Top 3 Highlighted */}
            <View style={styles.topThreeContainer}>
              {mockContributors.slice(0, 3).map((contributor, index) => (
                <View key={contributor.id} style={[
                  styles.topContributorCard,
                  index === 0 && styles.firstPlace,
                  index === 1 && styles.secondPlace,
                  index === 2 && styles.thirdPlace,
                ]}>
                  <Text style={styles.topRankEmoji}>
                    {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                  </Text>
                  <View style={styles.topAvatar}>
                    <Text style={styles.topAvatarText}>{contributor.avatar}</Text>
                  </View>
                  <Text style={styles.topContributorName}>{contributor.name}</Text>
                  <Text style={styles.topContributorPoints}>
                    {contributor.points.toLocaleString()}
                  </Text>
                  <Text style={styles.topContributorBadge}>{contributor.badge}</Text>
                </View>
              ))}
            </View>

            {/* All Contributors List */}
            <View style={styles.allContributorsSection}>
              <Text style={styles.sectionTitle}>Full Leaderboard</Text>
              {mockContributors.map(renderContributor)}
            </View>
          </View>
        )}

        {activeTab === 'Wallet' && (
          <View style={styles.walletSection}>
            {/* Wallet Stats Cards */}
            <View style={styles.walletStatsGrid}>
              <View style={styles.walletStatCard}>
                <Ionicons name="trending-up" size={24} color="#10B981" />
                <Text style={styles.walletStatValue}>{totalEarned}</Text>
                <Text style={styles.walletStatLabel}>Total Earned</Text>
              </View>
              <View style={styles.walletStatCard}>
                <Ionicons name="wallet" size={24} color="#3B82F6" />
                <Text style={styles.walletStatValue}>{currentUserPoints}</Text>
                <Text style={styles.walletStatLabel}>Current Balance</Text>
              </View>
            </View>

            {/* Recent Transactions */}
            <View style={styles.transactionsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              {mockTransactions.map(renderTransaction)}
            </View>

            {/* Earning Opportunities */}
            <View style={styles.earningSection}>
              <Text style={styles.sectionTitle}>Earn More Points</Text>
              <View style={styles.earningCard}>
                <Ionicons name="mic" size={24} color="#FF8A00" />
                <View style={styles.earningInfo}>
                  <Text style={styles.earningTitle}>Record Voice Clips</Text>
                  <Text style={styles.earningDescription}>Earn 50 points per validated clip</Text>
                </View>
                <TouchableOpacity style={styles.earningButton}>
                  <Text style={styles.earningButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.earningCard}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <View style={styles.earningInfo}>
                  <Text style={styles.earningTitle}>Validate Recordings</Text>
                  <Text style={styles.earningDescription}>Earn 10 points per validation</Text>
                </View>
                <TouchableOpacity style={styles.earningButton}>
                  <Text style={styles.earningButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Store' && (
          <View style={styles.storeSection}>
            <View style={styles.storeBalance}>
              <Text style={styles.storeBalanceLabel}>Available Balance</Text>
              <Text style={styles.storeBalanceValue}>{currentUserPoints} points</Text>
            </View>

            <Text style={styles.sectionTitle}>Featured Rewards</Text>
            {mockRewardItems.map(renderRewardItem)}

            <View style={styles.comingSoonSection}>
              <Text style={styles.sectionTitle}>Coming Soon</Text>
              <View style={styles.comingSoonCard}>
                <Text style={styles.previewItem}>🎓 Language Certificates</Text>
                <Text style={styles.previewItem}>🎁 Cultural Merchandise</Text>
                <Text style={styles.previewItem}>📚 Premium Story Templates</Text>
                <Text style={styles.previewItem}>🏆 Exclusive NFT Badges</Text>
                <Text style={styles.previewItem}>💰 Cash Rewards</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Send Points Modal */}
      <Modal
        visible={showSendModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Points</Text>
              <TouchableOpacity onPress={() => setShowSendModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Recipient Username</Text>
              <TextInput
                style={styles.input}
                placeholder="@username"
                value={recipientUsername}
                onChangeText={setRecipientUsername}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={sendAmount}
                onChangeText={setSendAmount}
                keyboardType="numeric"
              />

              <View style={styles.balanceInfo}>
                <Text style={styles.balanceInfoText}>
                  Available: {currentUserPoints} points
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!sendAmount || !recipientUsername) && styles.sendButtonDisabled
                ]}
                disabled={!sendAmount || !recipientUsername}
              >
                <Text style={styles.sendButtonText}>Send Points</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FF8A00',
    paddingBottom: height * 0.02,
    paddingHorizontal: width * 0.05,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userPointsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
  },
  pointsMainSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsBalanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pointsSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  pointsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  pointsStat: {
    flex: 1,
    alignItems: 'center',
  },
  pointsStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  pointsStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  pointsDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickActionText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: width * 0.05,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF8A00',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FF8A00',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  leaderboardSection: {
    paddingTop: 16,
  },
  timeframeSelector: {
    paddingHorizontal: width * 0.05,
    marginBottom: 20,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeframeButtonActive: {
    backgroundColor: '#FF8A00',
    borderColor: '#FF8A00',
  },
  timeframeButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeframeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    marginBottom: 30,
  },
  topContributorCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  firstPlace: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  secondPlace: {
    borderColor: '#C0C0C0',
    borderWidth: 2,
  },
  thirdPlace: {
    borderColor: '#CD7F32',
    borderWidth: 2,
  },
  topRankEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  topAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  topAvatarText: {
    fontSize: 20,
  },
  topContributorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  topContributorPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8A00',
    marginBottom: 4,
  },
  topContributorBadge: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  allContributorsSection: {
    paddingHorizontal: width * 0.05,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  contributorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserCard: {
    backgroundColor: '#FEF3E2',
    borderWidth: 2,
    borderColor: '#FF8A00',
  },
  contributorRank: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  rankEmoji: {
    fontSize: 20,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  currentUserText: {
    color: '#FF8A00',
    fontWeight: '700',
  },
  contributorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  contributorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contributorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  youBadge: {
    backgroundColor: '#FF8A00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  youBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  contributorUsername: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  contributorStats: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  contributorPoints: {
    alignItems: 'flex-end',
  },
  pointsNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8A00',
    marginBottom: 2,
  },
  currentUserPoints: {
    fontSize: 18,
    color: '#FF8A00',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  walletSection: {
    paddingHorizontal: width * 0.05,
    paddingTop: 20,
  },
  walletStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  walletStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  walletStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginVertical: 8,
  },
  walletStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF8A00',
    fontWeight: '500',
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  earningSection: {
    marginBottom: 24,
  },
  earningCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  earningInfo: {
    flex: 1,
    marginLeft: 12,
  },
  earningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  earningDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  earningButton: {
    backgroundColor: '#FF8A00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  earningButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  storeSection: {
    paddingHorizontal: width * 0.05,
    paddingTop: 20,
    paddingBottom: 40,
  },
  storeBalance: {
    backgroundColor: '#FEF3E2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  storeBalanceLabel: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 4,
  },
  storeBalanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8A00',
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rewardCardDisabled: {
    opacity: 0.6,
  },
  rewardIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FEF3E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rewardIconText: {
    fontSize: 24,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  rewardDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  rewardCategory: {
    alignSelf: 'flex-start',
  },
  rewardCategoryText: {
    fontSize: 11,
    color: '#FF8A00',
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rewardCost: {
    alignItems: 'center',
  },
  rewardCostNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8A00',
  },
  rewardCostLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  redeemButton: {
    backgroundColor: '#FF8A00',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  redeemButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  comingSoonSection: {
    marginTop: 24,
  },
  comingSoonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  previewItem: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  balanceInfo: {
    backgroundColor: '#FEF3E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  balanceInfoText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: '#FF8A00',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default RewardsScreen;