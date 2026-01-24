import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, Dimensions, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';

const { width, height } = Dimensions.get('window');

interface InviteeRow {
  id: string;
  referred_user_id: string;
  created_at: string;
  user_profile?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  } | null;
}

const InvitesScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string>('');
  const [invitees, setInvitees] = useState<InviteeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: codeRow } = await supabase
        .from('referral_codes')
        .select('id, code')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      setReferralCode(codeRow?.code || '');

      if (codeRow?.id) {
        const { data: rows } = await supabase
          .from('referrals')
          .select('id, referred_user_id, created_at')
          .eq('referral_code_id', codeRow.id)
          .order('created_at', { ascending: false });

        const ids = (rows || []).map(r => r.referred_user_id);
        let profiles: Record<string, InviteeRow['user_profile']> = {};
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, email')
            .in('id', ids);
          for (const p of (profs || [])) {
            profiles[p.id] = {
              full_name: p.full_name,
              username: p.username,
              avatar_url: p.avatar_url,
              email: p.email,
            };
          }
        }

        const withProfiles: InviteeRow[] = (rows || []).map(r => ({
          ...r,
          user_profile: profiles[r.referred_user_id] || null,
        }));
        setInvitees(withProfiles);
      } else {
        setInvitees([]);
      }
    } catch (e) {
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

  const renderItem = ({ item }: { item: InviteeRow }) => {
    const name = item.user_profile?.full_name || item.user_profile?.username || item.user_profile?.email || 'New user';
    const date = new Date(item.created_at).toLocaleDateString();
    return (
      <View style={styles.inviteeRow}>
        <View style={styles.inviteeAvatar}>
          <Ionicons name="person" size={18} color="#6B7280" />
        </View>
        <View style={styles.inviteeInfo}>
          <Text style={styles.inviteeName}>{name}</Text>
          <Text style={styles.inviteeMeta}>Joined {date}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Invites</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Your code</Text>
          <Text style={styles.summaryValue}>{referralCode || '—'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total invited</Text>
          <Text style={styles.summaryValue}>{invitees.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#FF8A00" />
        </View>
      ) : invitees.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="gift-outline" size={32} color="#9CA3AF" />
          <Text style={styles.emptyText}>No invites yet. Share your code to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={invitees}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: width * 0.05, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingTop: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 8,
  },
  inviteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 12,
  },
  inviteeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteeInfo: { flex: 1 },
  inviteeName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  inviteeMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});

export default InvitesScreen;


