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
    Modal,
    TextInput,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { authFetch, parseResponse } from '../services/authFetch';
import * as Haptics from 'expo-haptics';

interface PayoutRequest {
    id: string;
    userId: string;
    amount: string;
    bankCode: string;
    accountNumber: string; // Masked
    accountName: string;
    status: string;
    createdAt: string;
}

const AdminPayoutScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal State
    const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [fullAccountNumber, setFullAccountNumber] = useState('');
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Action Modal
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [actionType, setActionType] = useState<'process' | 'complete' | 'reject' | 'paystack'>('process');
    const [bankReference, setBankReference] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const fetchPayouts = async () => {
        try {
            const response = await authFetch('/admin/payouts/pending');
            const data = await parseResponse<{ payouts: PayoutRequest[] }>(response);
            setPayouts(data.payouts || []);
        } catch (error) {
            Alert.alert('Error', 'Failed to load payouts');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPayouts();
    };

    const handleViewDetails = (payout: PayoutRequest) => {
        setSelectedPayout(payout);
        setDetailsModalVisible(true);
        setFullAccountNumber('');
        setAdminPassword('');
    };

    const handleDecrypt = async () => {
        if (!selectedPayout || !adminPassword) return;
        setLoadingDetails(true);
        try {
            const response = await authFetch(`/admin/payouts/${selectedPayout.id}/details`, {
                method: 'POST',
                body: JSON.stringify({ adminPassword }),
            });
            const data = await parseResponse<{ fullAccountNumber: string }>(response);
            setFullAccountNumber(data.fullAccountNumber);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Alert.alert('Access Denied', error.message || 'Invalid password');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleAction = (payout: PayoutRequest, action: 'process' | 'complete' | 'reject' | 'paystack') => {
        setSelectedPayout(payout);
        setActionType(action);
        setActionModalVisible(true);
        setAdminPassword('');
        setBankReference('');
        setRejectReason('');
    };

    const executeAction = async () => {
        if (!selectedPayout) return;
        setProcessing(true);
        try {
            let endpoint = '';
            let body: any = { adminPassword };

            switch (actionType) {
                case 'process':
                    endpoint = `/admin/payouts/${selectedPayout.id}/process`;
                    body.payoutRequestId = selectedPayout.id;
                    break;
                case 'complete':
                    endpoint = `/admin/payouts/${selectedPayout.id}/complete`;
                    body.bankReference = bankReference;
                    break;
                case 'reject':
                    endpoint = `/admin/payouts/${selectedPayout.id}/reject`;
                    body.reason = rejectReason;
                    break;
                case 'paystack':
                    endpoint = `/admin/payouts/${selectedPayout.id}/paystack-transfer`;
                    break;
            }

            const response = await authFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            await parseResponse(response);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const message = actionType === 'paystack'
                ? 'Paystack transfer initiated! Status will update automatically.'
                : `Payout ${actionType === 'reject' ? 'rejected' : actionType === 'complete' ? 'completed' : 'processing'}`;
            Alert.alert('Success', message);
            setActionModalVisible(false);
            fetchPayouts();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Action failed');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setProcessing(false);
        }
    };

    const renderPayout = ({ item }: { item: PayoutRequest }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={[styles.amount, { color: colors.primary }]}>${parseFloat(item.amount).toFixed(2)}</Text>
                    <Text style={[styles.accountName, { color: colors.text }]}>{item.accountName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.statusText, { color: colors.primary }]}>{item.status.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.detailRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Account:</Text>
                <Text style={[styles.value, { color: colors.text }]}>{item.accountNumber}</Text>
                <TouchableOpacity onPress={() => handleViewDetails(item)}>
                    <Ionicons name="eye-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Bank:</Text>
                <Text style={[styles.value, { color: colors.text }]}>{item.bankCode}</Text>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleAction(item, 'paystack')}
                >
                    <Text style={styles.actionBtnText}>⚡ Auto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleAction(item, 'process')}
                >
                    <Text style={styles.actionBtnText}>Manual</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleAction(item, 'complete')}
                >
                    <Text style={styles.actionBtnText}>Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleAction(item, 'reject')}
                >
                    <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Payout Management</Text>
                <TouchableOpacity onPress={onRefresh}>
                    <Ionicons name="refresh" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={payouts}
                renderItem={renderPayout}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="checkmark-done-circle" size={64} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending payouts</Text>
                    </View>
                }
            />

            {/* Details Modal */}
            <Modal visible={detailsModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>🔒 Secure Account Details</Text>
                            <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {!fullAccountNumber ? (
                            <>
                                <Text style={[styles.securityNote, { color: colors.textSecondary }]}>
                                    Enter your admin password to view the full account number. This action is logged.
                                </Text>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                                    placeholder="Admin Password"
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry
                                    value={adminPassword}
                                    onChangeText={setAdminPassword}
                                />
                                <TouchableOpacity
                                    style={[styles.decryptBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleDecrypt}
                                    disabled={loadingDetails}
                                >
                                    {loadingDetails ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.decryptBtnText}>Decrypt Account Number</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={[styles.decryptedBox, { backgroundColor: colors.primary + '10' }]}>
                                <Text style={[styles.decryptedLabel, { color: colors.textSecondary }]}>FULL ACCOUNT NUMBER</Text>
                                <Text style={[styles.decryptedValue, { color: colors.text }]}>{fullAccountNumber}</Text>
                                <Text style={[styles.decryptedName, { color: colors.text }]}>{selectedPayout?.accountName}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Action Modal */}
            <Modal visible={actionModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {actionType === 'paystack' ? '⚡ Auto Paystack Transfer' : actionType === 'process' ? '⏳ Manual Process' : actionType === 'complete' ? '✅ Complete Payout' : '❌ Reject Payout'}
                            </Text>
                            <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {actionType === 'complete' && (
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                                placeholder="Bank Transfer Reference"
                                placeholderTextColor={colors.textSecondary}
                                value={bankReference}
                                onChangeText={setBankReference}
                            />
                        )}

                        {actionType === 'reject' && (
                            <TextInput
                                style={[styles.input, { borderColor: colors.border, color: colors.text, height: 100 }]}
                                placeholder="Rejection Reason"
                                placeholderTextColor={colors.textSecondary}
                                value={rejectReason}
                                onChangeText={setRejectReason}
                                multiline
                            />
                        )}

                        {(actionType === 'reject' || actionType === 'process' || actionType === 'paystack') && (
                            <>
                                {actionType === 'paystack' && (
                                    <Text style={[styles.securityNote, { color: colors.textSecondary }]}>
                                        This will automatically transfer funds to the user's bank account via Paystack.
                                        The transfer status will be updated automatically via webhook.
                                    </Text>
                                )}
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                                    placeholder="Admin Password"
                                    placeholderTextColor={colors.textSecondary}
                                    secureTextEntry
                                    value={adminPassword}
                                    onChangeText={setAdminPassword}
                                />
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.decryptBtn, {
                                backgroundColor: actionType === 'reject' ? '#EF4444' : actionType === 'paystack' ? '#3B82F6' : colors.primary
                            }]}
                            onPress={executeAction}
                            disabled={processing}
                        >
                            {processing ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.decryptBtnText}>Confirm {actionType.charAt(0).toUpperCase() + actionType.slice(1)}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    list: { padding: 16 },
    card: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    amount: { fontSize: 24, fontWeight: 'bold' },
    accountName: { fontSize: 14, marginTop: 4 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    label: { fontSize: 14, width: 70 },
    value: { flex: 1, fontSize: 14, fontWeight: '500' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
    actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingTop: 100 },
    emptyText: { marginTop: 16, fontSize: 16 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    securityNote: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
    input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
    decryptBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    decryptBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    decryptedBox: { padding: 20, borderRadius: 12, alignItems: 'center' },
    decryptedLabel: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
    decryptedValue: { fontSize: 24, fontWeight: 'bold', letterSpacing: 2 },
    decryptedName: { marginTop: 8, fontSize: 14 },
});

export default AdminPayoutScreen;
