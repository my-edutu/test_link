import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { authFetch, parseResponse } from '../services/authFetch';

const { width } = Dimensions.get('window');

const AdminModerationScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<'reports' | 'flags'>('reports');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'reports' ? '/moderation/admin/reports' : '/monetization/admin/flags';
            const response = await authFetch(endpoint);
            const result = await parseResponse<any[]>(response);
            setData(result);
        } catch (error: any) {
            console.error('Error fetching moderation data:', error?.message || error);
            Alert.alert('Error', 'Failed to load moderation items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const resolveItem = async (id: string, action: string) => {
        try {
            const endpoint = activeTab === 'reports'
                ? `/moderation/admin/reports/${id}/resolve`
                : `/monetization/admin/flags/${id}/resolve`;

            await authFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify({ action, notes: 'Resolved by admin via mobile app' }),
            });

            Alert.alert('Success', 'Item resolved');
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to resolve item');
        }
    };

    const renderReport = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Report against @{item.reportedUser?.username || 'user'}</Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>Reason: {item.reason}</Text>
            {item.additionalDetails && (
                <Text style={[styles.cardDetails, { color: colors.textSecondary }]}>{item.additionalDetails}</Text>
            )}
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.warnBtn} onPress={() => resolveItem(item.id, 'warn')}>
                    <Text style={styles.btnText}>Warn</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.banBtn} onPress={() => resolveItem(item.id, 'ban_user')}>
                    <Text style={styles.btnText}>Ban</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => resolveItem(item.id, 'dismiss')}>
                    <Text style={styles.btnTextSecondary}>Dismiss</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderFlag = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <Ionicons name="flag" size={20} color="#F59E0B" />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Clip Flagged: {item.voiceClipId.substring(0, 8)}</Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>Reason: {item.reason}</Text>
            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.hideBtn} onPress={() => resolveItem(item.id, 'resolved')}>
                    <Text style={styles.btnText}>Reject Clip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissBtn} onPress={() => resolveItem(item.id, 'dismissed')}>
                    <Text style={styles.btnTextSecondary}>Approve (Keep)</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Moderation Center</Text>
                <TouchableOpacity onPress={fetchData}>
                    <Ionicons name="refresh" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'reports' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                    onPress={() => setActiveTab('reports')}
                >
                    <Text style={[styles.tabText, activeTab === 'reports' && { color: colors.primary }]}>User Reports</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'flags' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                    onPress={() => setActiveTab('flags')}
                >
                    <Text style={[styles.tabText, activeTab === 'flags' && { color: colors.primary }]}>Clip Flags</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={activeTab === 'reports' ? renderReport : renderFlag}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="checkmark-done" size={64} color={colors.border} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No pending items!</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabText: { fontWeight: '600', color: '#999' },
    list: { padding: 16 },
    card: { borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#EF4444' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    cardTitle: { fontWeight: 'bold', fontSize: 16 },
    cardBody: { fontSize: 14, marginBottom: 4 },
    cardDetails: { fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    warnBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    banBtn: { backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    hideBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    dismissBtn: { borderWidth: 1, borderColor: '#DDD', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    btnTextSecondary: { color: '#666', fontWeight: 'bold', fontSize: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 }
});

export default AdminModerationScreen;
