
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { ThemeProvider } from '../context/ThemeContext'; // Assuming correct path

interface RemixEvent {
    id: string;
    created_at: string;
    remixer: {
        username: string;
        avatar_url: string;
    };
    original_clip: {
        phrase: string;
    };
    earnings: number; // Placeholder, assuming we calculate or store this
}

export const RemixHistoryScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalRemixes: 0, totalEarnings: 0 });
    const [remixes, setRemixes] = useState<RemixEvent[]>([]);

    useEffect(() => {
        fetchRemixHistory();
    }, [user]);

    const fetchRemixHistory = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch Stats
            // For now, we'll calculate from the list or use a placeholder if endpoint not ready
            // The controller has /monetization/remix/stats but let's query directly for the list first.

            // Get clips that are children of my clips
            const { data, error } = await supabase
                .from('voice_clips')
                .select(`
                    id,
                    created_at,
                    phrase,
                    user:profiles!voice_clips_user_id_fkey(username, avatar_url),
                    parent_clip:voice_clips!voice_clips_parent_clip_id_fkey(
                        phrase,
                        user_id
                    )
                `)
                .eq('parent_clip.user_id', user.id) // This filter needs correct relationship logic or two-step
                .not('parent_clip_id', 'is', null)
                .order('created_at', { ascending: false });

            // Postgrest on relational filter is tricky if relationship not named well.
            // Alternative: Get my clip IDs first.

            const { data: myClips } = await supabase.from('voice_clips').select('id').eq('user_id', user.id);
            const myClipIds = myClips?.map(c => c.id) || [];

            if (myClipIds.length > 0) {
                const { data: remixData, error: remixError } = await supabase
                    .from('voice_clips')
                    .select(`
                        id,
                        created_at,
                        phrase,
                        user:profiles!voice_clips_user_id_fkey(username, avatar_url),
                        parent_clip:voice_clips!voice_clips_parent_clip_id_fkey(phrase)
                    `)
                    .in('parent_clip_id', myClipIds)
                    .order('created_at', { ascending: false });

                if (remixError) throw remixError;

                const events: RemixEvent[] = remixData.map((r: any) => ({
                    id: r.id,
                    created_at: r.created_at,
                    remixer: {
                        username: r.user?.username || 'Unknown',
                        avatar_url: r.user?.avatar_url
                    },
                    original_clip: {
                        phrase: r.parent_clip?.phrase || 'Deleted Clip'
                    },
                    earnings: 0.05 // Mock earning per remix
                }));

                setRemixes(events);
                setStats({
                    totalRemixes: events.length,
                    totalEarnings: events.length * 0.05
                });
            }

        } catch (e) {
            console.error('Error fetching remix history:', e);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: RemixEvent }) => (
        <View style={styles.item}>
            <View style={styles.iconContainer}>
                <Ionicons name="git-branch" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>
                    <Text style={{ fontWeight: 'bold' }}>@{item.remixer.username}</Text> remixed "{item.original_clip.phrase}"
                </Text>
                <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.itemEarnings}>
                <Text style={styles.earningText}>+${item.earnings.toFixed(2)}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Remix History</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{stats.totalRemixes}</Text>
                    <Text style={styles.statLabel}>Total Remixes</Text>
                </View>
                <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#EEE' }]}>
                    <Text style={[styles.statValue, { color: '#10B981' }]}>${stats.totalEarnings.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Est. Earnings</Text>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#FF8A00" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={remixes}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No remixes yet. Keep creating!</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF' },
    title: { fontSize: 18, fontWeight: 'bold' },
    statsContainer: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, margin: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
    statBox: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    statLabel: { color: '#666', marginTop: 4 },
    listContent: { padding: 16 },
    item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
    iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    itemContent: { flex: 1 },
    itemTitle: { fontSize: 14, color: '#333', lineHeight: 20 },
    itemDate: { fontSize: 12, color: '#999', marginTop: 4 },
    itemEarnings: { alignItems: 'flex-end' },
    earningText: { fontWeight: 'bold', color: '#10B981' },
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#999' }
});
