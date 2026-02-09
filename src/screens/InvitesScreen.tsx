import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { Colors, Typography, Gradients } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface Invitee {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

const InvitesScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Deriving the referral code from username synchronously
  // In the future, this could come from user.vanity_code
  const username = user?.username || user?.user_metadata?.username || 'user';
  const inviteLink = `https://lingualink.ai/invite/@${username.replace('@', '')}`;

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Direct query to profiles table for users referred by me
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, created_at')
        .eq('referred_by_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitees(data || []);
    } catch (e) {
      console.error('InvitesScreen fetchData error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const copyToClipboard = () => {
    Clipboard.setString(inviteLink);
    Alert.alert('Copied!', 'Invite link copied to clipboard.');
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Invite Friends</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderItem = ({ item }: { item: Invitee }) => {
    const name = item.full_name || item.username || 'New member';
    const date = new Date(item.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return (
      <GlassCard style={styles.inviteeCard} intensity={25}>
        <View style={styles.inviteeAvatar}>
          {item.avatar_url ? (
            <Image
              source={{ uri: item.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <LinearGradient colors={Gradients.primary} style={styles.avatarGradient}>
              <Text style={styles.avatarInitial}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
        </View>
        <View style={styles.inviteeInfo}>
          <Text style={styles.inviteeName}>{name}</Text>
          <Text style={styles.inviteeMeta}>Joined {date}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
          <Text style={styles.statusText}>Joined</Text>
        </View>
      </GlassCard>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />

      {renderHeader()}

      <View style={styles.mainContent}>
        {/* Invite Link Card */}
        <GlassCard style={styles.linkCard} intensity={40}>
          <View style={styles.iconCircle}>
            <Ionicons name="gift-outline" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.linkTitle}>Earn Rewards Together</Text>
          <Text style={styles.linkDesc}>
            Invite friends to LinguaLink and preserve languages together. They get a bonus, and you earn badges!
          </Text>

          <TouchableOpacity style={styles.copyBox} onPress={copyToClipboard} activeOpacity={0.8}>
            <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
            <View style={styles.copyButton}>
              <Ionicons name="copy-outline" size={18} color="#FFF" />
            </View>
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Invited</Text>
            <Text style={styles.statValue}>{invitees.length}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Referral History</Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : invitees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="paper-plane-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>No referrals yet.{'\n'}Share your link to get started!</Text>
          </View>
        ) : (
          <FlatList
            data={invitees}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0200',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerTitle: {
    ...Typography.h3,
    color: '#FFFFFF',
    fontSize: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  linkCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  linkTitle: {
    ...Typography.h2,
    fontSize: 22,
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  linkDesc: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  copyBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 6,
    paddingLeft: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  linkText: {
    flex: 1,
    color: Colors.primary,
    fontWeight: '600',
    marginRight: 10,
  },
  copyButton: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    ...Typography.h4,
    color: '#FFF',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  inviteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    borderRadius: 16,
  },
  inviteeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.h3,
    color: '#FFF',
    fontSize: 20,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  inviteeInfo: {
    flex: 1,
  },
  inviteeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  inviteeMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary, // Using primary for visual consistency or could be #10B981
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    marginTop: 16,
    lineHeight: 22,
  },
});

export default InvitesScreen;
