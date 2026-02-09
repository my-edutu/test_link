// src/screens/RewardsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { monetizationApi } from '../services/monetizationApi';
import { Colors, Layout, Typography, Gradients } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

const { width } = Dimensions.get('window');

interface Props {
  navigation: any;
}

interface Transaction {
  id: string;
  type: 'earned' | 'spent' | 'received' | 'sent';
  amount: number;
  description: string;
  date: string;
  icon: string;
}

const RewardsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [currentUserPoints, setCurrentUserPoints] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validationReward, setValidationReward] = useState<number>(50);

  useEffect(() => {
    monetizationApi.getAppConfig<number>('validation_reward')
      .then(amount => {
        if (amount) setValidationReward(amount);
      });
  }, []);

  const fetchWalletData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Fetch Profile for Balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, total_earned')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUserPoints(parseFloat(profile.balance || '0'));
        setTotalEarned(parseFloat(profile.total_earned || '0'));
      }

      // 2. Fetch Transactions
      const { data: transData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transData) {
        setTransactions(transData.map(t => ({
          id: t.id,
          type: parseFloat(t.amount) > 0 ? 'earned' : 'spent',
          amount: parseFloat(t.amount),
          description: t.description || 'Transaction',
          date: new Date(t.created_at).toLocaleDateString(),
          icon: parseFloat(t.amount) > 0 ? 'checkmark-circle' : 'card'
        })) as any);
      }
    } catch (e) {
      console.error('Error fetching wallet data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWalletData();

    // Subscribe to balance changes
    const channel = supabase
      .channel('wallet-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user?.id}`
      }, (payload) => {
        setCurrentUserPoints(parseFloat(payload.new.balance));
        setTotalEarned(parseFloat(payload.new.total_earned));
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user?.id, fetchWalletData]);

  const renderTransaction = (transaction: Transaction) => (
    <GlassCard key={transaction.id} style={styles.transactionCard} intensity={isDark ? 15 : 60}>
      <View style={[
        styles.transactionIcon,
        { backgroundColor: transaction.amount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
      ]}>
        <Ionicons
          name={transaction.icon as any}
          size={18}
          color={transaction.amount > 0 ? '#10B981' : '#EF4444'}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionDescription, { color: colors.text }]}>{transaction.description}</Text>
        <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>{transaction.date}</Text>
      </View>
      <Text style={[
        styles.transactionAmount,
        { color: transaction.amount > 0 ? '#10B981' : '#EF4444' }
      ]}>
        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
      </Text>
    </GlassCard>
  );

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* User Points Card */}
        <GlassCard intensity={isDark ? 30 : 80} style={styles.userPointsCard}>
          <View style={styles.pointsMainSection}>
            <Text style={[styles.pointsBalanceLabel, { color: colors.textSecondary }]}>Available Balance</Text>
            <Text style={[styles.pointsValue, { color: colors.primary }]}>${currentUserPoints.toLocaleString()}</Text>
            <Text style={[styles.pointsSubtext, { color: colors.text }]}>USD</Text>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: 'rgba(255,138,0,0.2)' }]}
              onPress={() => navigation.navigate('Withdrawal')}
            >
              <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
              <Ionicons name="cash" size={18} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Withdraw Info</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View style={styles.walletSection}>
          {/* Wallet Stats Cards */}
          <View style={styles.walletStatsGrid}>
            <View style={[
              styles.walletStatCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.6)',
                borderColor: colors.borderLight
              }
            ]}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
              <Text style={[styles.walletStatValue, { color: colors.text }]}>${totalEarned.toLocaleString()}</Text>
              <Text style={[styles.walletStatLabel, { color: colors.textSecondary }]}>Total Earned</Text>
            </View>
          </View>

          {/* Recent Transactions */}
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {transactions.length > 0 ? (
              transactions.map(renderTransaction)
            ) : (
              <Text style={{ textAlign: 'center', color: colors.textSecondary, marginVertical: 20 }}>
                No transactions yet. Start validating to earn!
              </Text>
            )}
          </View>

          {/* Earning Opportunities */}
          <View style={styles.earningSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Earn More Points</Text>
            <View style={[
              styles.earningCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.6)',
                borderColor: colors.borderLight
              }
            ]}>
              <Ionicons name="mic" size={24} color="#FF8A00" />
              <View style={styles.earningInfo}>
                <Text style={[styles.earningTitle, { color: colors.text }]}>Record Voice Clips</Text>
                <Text style={[styles.earningDescription, { color: colors.textSecondary }]}>Earn {validationReward} points per validated clip</Text>
              </View>
              <TouchableOpacity style={styles.earningButton} onPress={() => navigation.navigate('RecordVoice')}>
                <Text style={styles.earningButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
            <View style={[
              styles.earningCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.6)',
                borderColor: colors.borderLight
              }
            ]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={styles.earningInfo}>
                <Text style={[styles.earningTitle, { color: colors.text }]}>Validate Recordings</Text>
                <Text style={[styles.earningDescription, { color: colors.textSecondary }]}>Earn 10 points per validation</Text>
              </View>
              <TouchableOpacity style={styles.earningButton} onPress={() => navigation.navigate('Validation')}>
                <Text style={styles.earningButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  userPointsCard: {
    padding: 24,
    borderRadius: Layout.radius.xl,
  },
  pointsMainSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pointsBalanceLabel: {
    ...Typography.caption,
    marginBottom: 8,
  },
  pointsValue: {
    ...Typography.hero,
    fontSize: 42,
  },
  pointsSubtext: {
    ...Typography.body,
    fontWeight: '700',
    marginTop: 4,
    opacity: 0.8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    height: 48,
    borderRadius: Layout.radius.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  quickActionText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  walletSection: {
    paddingHorizontal: 20,
  },
  walletStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  walletStatCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  walletStatValue: {
    ...Typography.h3,
    marginVertical: 4,
  },
  walletStatLabel: {
    fontSize: 12,
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
  sectionTitle: {
    ...Typography.h3,
  },
  seeAllText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
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
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    ...Typography.body,
    fontWeight: '700',
  },
  earningSection: {
    marginBottom: 24,
  },
  earningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  earningInfo: {
    flex: 1,
    marginLeft: 12,
  },
  earningTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  earningDescription: {
    fontSize: 12,
  },
  earningButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  earningButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default RewardsScreen;
