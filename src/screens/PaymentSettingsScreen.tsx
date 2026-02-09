import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Alert,
    ScrollView,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { monetizationApi } from '../services/monetizationApi';
import { BankItem, LinkedBank, BankResolveResult } from '../types/monetization.types';

const PaymentSettingsScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    // ... existing state ...

    const [banks, setBanks] = useState<BankItem[]>([]);
    const [linkedBank, setLinkedBank] = useState<LinkedBank | null>(null);
    const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);
    const [accountNumber, setAccountNumber] = useState('');

    const [resolvedAccount, setResolvedAccount] = useState<BankResolveResult | null>(null);

    // Manual Entry State
    const [manualMode, setManualMode] = useState(false);
    const [manualBankName, setManualBankName] = useState('');
    const [manualAccountName, setManualAccountName] = useState('');

    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showBankPicker, setShowBankPicker] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [bankList, linked] = await Promise.all([
                monetizationApi.getBankList(),
                monetizationApi.getLinkedBank()
            ]);
            setBanks(bankList || []);
            if (linked) setLinkedBank(linked);

            if (!bankList || bankList.length === 0) {
                setError('Unable to load bank list. Please check your internet connection and try again.');
            }
        } catch (error) {
            console.error('Error fetching payment data:', error);
            setError('Failed to load payment data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedBank || accountNumber.length !== 10) return;
        setResolving(true);
        try {
            const result = await monetizationApi.resolveBank(accountNumber, selectedBank.code);
            // resolveBank returns BankResolveResult directly (accountNumber, accountName, etc.)
            if (result && result.accountName) {
                setResolvedAccount(result);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not verify account details');
        } finally {
            setResolving(false);
        }
    };

    const handleSave = async () => {
        if (!manualMode && (!resolvedAccount || !selectedBank)) return;
        if (manualMode && (!manualBankName || !manualAccountName || !accountNumber)) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setSubmitting(true);
        try {
            await monetizationApi.linkBank(
                accountNumber,
                manualMode ? 'MANUAL' : (selectedBank?.code || ''),
                manualMode ? { bankName: manualBankName, accountName: manualAccountName } : undefined
            );
            Alert.alert('Success', manualMode ? 'Account submitted for admin approval' : 'Payment account linked successfully');
            fetchData();
            setResolvedAccount(null);
            setAccountNumber('');
            setSelectedBank(null);
            setManualMode(false);
            setManualBankName('');
            setManualAccountName('');
        } catch (error) {
            Alert.alert('Error', 'Failed to save account details');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Settings</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Error Message */}
                {error && (
                    <View style={[styles.errorCard, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                        <Ionicons name="alert-circle" size={24} color="#DC2626" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ color: '#DC2626', fontWeight: '600' }}>Unable to Load Banks</Text>
                            <Text style={{ color: '#991B1B', fontSize: 13, marginTop: 4 }}>{error}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setManualMode(true)} style={[styles.retryBtn, { backgroundColor: colors.card, marginLeft: 8 }]}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Enter Manually</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Linked Bank Card */}
                {linkedBank ? (
                    <View style={[styles.linkedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="card" size={24} color={colors.primary} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Linked Bank Account</Text>
                        </View>
                        <View style={styles.bankDetailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Bank</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{linkedBank.bankName}</Text>
                        </View>
                        <View style={styles.bankDetailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Name</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{linkedBank.accountName}</Text>
                        </View>
                        <View style={styles.bankDetailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Account Number</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>****{linkedBank.accountNumberLast4}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.changeBtn}
                            onPress={() => setLinkedBank(null)}
                        >
                            <Text style={[styles.changeBtnText, { color: colors.primary }]}>Change Account</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.form}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Link Bank Account</Text>
                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                            This account will be used to process your withdrawals. Please ensure the name matches your ID.
                        </Text>

                        {/* Manual Toggle */}
                        <TouchableOpacity onPress={() => setManualMode(!manualMode)} style={{ alignSelf: 'flex-end', marginBottom: 10 }}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>{manualMode ? 'Switch to Automatic' : 'Enter Manually'}</Text>
                        </TouchableOpacity>

                        {manualMode ? (
                            <>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                                    placeholder="Bank Name"
                                    placeholderTextColor={colors.textSecondary}
                                    value={manualBankName}
                                    onChangeText={setManualBankName}
                                />
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                                    placeholder="Account Name"
                                    placeholderTextColor={colors.textSecondary}
                                    value={manualAccountName}
                                    onChangeText={setManualAccountName}
                                />
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                                    placeholder="Account Number"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    maxLength={20}
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                />
                                <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' }}>
                                    * Manual entries require admin approval (approx. 24h).
                                </Text>
                            </>
                        ) : (
                            <>
                                {/* Bank Selection */}
                                <TouchableOpacity
                                    style={[styles.input, { borderColor: colors.border }]}
                                    onPress={() => setShowBankPicker(!showBankPicker)}
                                >
                                    <Text style={{ color: selectedBank ? colors.text : colors.textSecondary }}>
                                        {selectedBank ? selectedBank.name : 'Select Bank'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>

                                {showBankPicker && (
                                    <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                                        {banks.map((bank, index) => (
                                            <TouchableOpacity
                                                key={`${bank.code}-${index}`}
                                                style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                                                onPress={() => {
                                                    setSelectedBank(bank);
                                                    setShowBankPicker(false);
                                                }}
                                            >
                                                <Text style={{ color: colors.text }}>{bank.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {/* Account Number */}
                                <TextInput
                                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                                    placeholder="Account Number (10 digits)"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    maxLength={10}
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                    onBlur={handleResolve}
                                />

                                {resolving && <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />}

                                {resolvedAccount && (
                                    <View style={[styles.resolvedBox, { backgroundColor: colors.primary + '10' }]}>
                                        <Text style={[styles.resolvedLabel, { color: colors.textSecondary }]}>Verified Name</Text>
                                        <Text style={[styles.resolvedName, { color: colors.text }]}>{resolvedAccount.accountName}</Text>
                                    </View>
                                )}
                            </>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.saveBtn,
                                { backgroundColor: (resolvedAccount && !submitting) ? colors.primary : colors.border }
                            ]}
                            disabled={submitting || (!manualMode && !resolvedAccount) || (manualMode && (!manualBankName || !manualAccountName || !accountNumber))}
                            onPress={handleSave}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Account Details</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20 },
    linkedCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    cardTitle: { fontSize: 18, fontWeight: 'bold' },
    bankDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    detailLabel: { fontSize: 14 },
    detailValue: { fontSize: 14, fontWeight: '600' },
    changeBtn: { marginTop: 8, alignSelf: 'center' },
    changeBtnText: { fontWeight: 'bold' },
    form: { gap: 16 },
    sectionTitle: { fontSize: 22, fontWeight: 'bold' },
    helperText: { fontSize: 14, marginBottom: 10 },
    input: { height: 55, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    pickerContainer: { borderRadius: 12, borderWidth: 1, maxHeight: 200, overflow: 'hidden' },
    pickerItem: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    resolvedBox: { padding: 16, borderRadius: 12, gap: 4 },
    resolvedLabel: { fontSize: 12, textTransform: 'uppercase' },
    resolvedName: { fontSize: 16, fontWeight: 'bold' },
    saveBtn: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
    retryBtn: { padding: 8 }
});

export default PaymentSettingsScreen;
