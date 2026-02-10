import React, { useState, useEffect, useCallback } from 'react';
import { NewtonCradleLoader } from '../components/NewtonCradleLoader';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { monetizationApi } from '../services/monetizationApi';
import {
    BankItem,
    LinkedBank,
    BalanceSummary,
    BankResolveResult
} from '../types/monetization.types';
import { useTheme } from '../context/ThemeContext';

const WithdrawalScreen: React.FC = () => {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();

    // State
    const [banks, setBanks] = useState<BankItem[]>([]);
    const [linkedBank, setLinkedBank] = useState<LinkedBank | null>(null);
    const [balance, setBalance] = useState<BalanceSummary | null>(null);
    const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [resolvedAccount, setResolvedAccount] = useState<BankResolveResult | null>(null);

    // Loading states
    const [loadingBanks, setLoadingBanks] = useState(true);
    const [loadingBalance, setLoadingBalance] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // UI state
    const [showBankPicker, setShowBankPicker] = useState(false);
    const [step, setStep] = useState<'bank' | 'amount' | 'confirm'>('bank');

    // Fetch data on mount
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        await Promise.all([
            fetchBanks(),
            fetchLinkedBank(),
            fetchBalance(),
        ]);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchInitialData();
        setRefreshing(false);
    }, []);

    const fetchBanks = async () => {
        try {
            const data = await monetizationApi.getBankList();
            setBanks(data);
        } catch (error) {
            console.error('Failed to fetch banks:', error);
        } finally {
            setLoadingBanks(false);
        }
    };

    const fetchLinkedBank = async () => {
        try {
            const data = await monetizationApi.getLinkedBank();
            if (data) {
                setLinkedBank(data);
            }
        } catch (error) {
            console.error('Failed to fetch linked bank:', error);
        }
    };

    const fetchBalance = async () => {
        try {
            const data = await monetizationApi.getBalanceSummary();
            if (data?.data) {
                setBalance(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        } finally {
            setLoadingBalance(false);
        }
    };

    const resolveAccount = async () => {
        if (!selectedBank || accountNumber.length !== 10) {
            Alert.alert('Error', 'Please select a bank and enter a valid 10-digit account number');
            return;
        }

        setResolving(true);
        try {
            const data = await monetizationApi.resolveBank(accountNumber, selectedBank.code);
            setResolvedAccount(data);
            setStep('amount');
        } catch (error: any) {
            Alert.alert('Verification Failed', error.message || 'Could not verify account. Please check the details.');
        } finally {
            setResolving(false);
        }
    };

    const handleAmountSubmit = () => {
        const amountNum = parseFloat(amount);

        if (isNaN(amountNum) || amountNum < 5) {
            Alert.alert('Invalid Amount', 'Minimum withdrawal amount is $5.00');
            return;
        }

        if (balance && amountNum > balance.availableBalance) {
            Alert.alert('Insufficient Balance', `Your available balance is $${balance.availableBalance.toFixed(2)}`);
            return;
        }

        setStep('confirm');
    };

    const submitWithdrawal = async () => {
        if (!resolvedAccount) return;

        setSubmitting(true);
        try {
            const data = await monetizationApi.requestWithdrawal(
                parseFloat(amount),
                resolvedAccount.bankCode,
                resolvedAccount.accountNumber,
                resolvedAccount.accountName,
            );

            Alert.alert(
                'Withdrawal Submitted',
                `Your withdrawal of $${amount} has been submitted. Reference: ${data.data?.reference || 'N/A'}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit withdrawal. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const linkBankAccount = async () => {
        if (!resolvedAccount) return;

        try {
            await monetizationApi.linkBank(
                resolvedAccount.accountNumber,
                resolvedAccount.bankCode,
            );
            Alert.alert('Success', 'Bank account linked successfully');
            fetchLinkedBank();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to link bank account');
        }
    };

    const renderBankStep = () => (
        <View style={[styles.stepContainer, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#000' }]}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Enter Bank Details</Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                Select your bank and enter your account number
            </Text>

            {linkedBank && linkedBank.bankCode && (
                <View style={[styles.linkedBankCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5' }]}>
                    <View style={styles.linkedBankHeader}>
                        <Ionicons name="card" size={20} color="#10B981" />
                        <Text style={styles.linkedBankTitle}>Saved Bank Account</Text>
                    </View>
                    <Text style={[styles.linkedBankName, { color: colors.text }]}>{linkedBank.accountName}</Text>
                    <Text style={[styles.linkedBankDetails, { color: colors.textSecondary }]}>
                        {linkedBank.bankName} - ****{linkedBank.accountNumberLast4}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.bankSelector, { backgroundColor: colors.inputBackground }]}
                onPress={() => setShowBankPicker(true)}
            >
                <Text style={selectedBank ? [styles.bankSelectorText, { color: colors.text }] : [styles.bankSelectorPlaceholder, { color: colors.textMuted }]}>
                    {selectedBank ? selectedBank.name : 'Select Bank'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                placeholder="Account Number (10 digits)"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={10}
                value={accountNumber}
                onChangeText={setAccountNumber}
            />

            <TouchableOpacity
                style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    (!selectedBank || accountNumber.length !== 10) && styles.buttonDisabled,
                ]}
                onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    resolveAccount();
                }}
                disabled={!selectedBank || accountNumber.length !== 10 || resolving}
            >
                {resolving ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.primaryButtonText}>Verify Account</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderAmountStep = () => (
        <View style={[styles.stepContainer, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#000' }]}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Enter Amount</Text>

            {resolvedAccount && (
                <View style={[styles.verifiedCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <View style={styles.verifiedInfo}>
                        <Text style={[styles.verifiedName, { color: colors.text }]}>{resolvedAccount.accountName}</Text>
                        <Text style={[styles.verifiedBank, { color: colors.textSecondary }]}>
                            {resolvedAccount.bankName} - {resolvedAccount.accountNumber}
                        </Text>
                    </View>
                    {!linkedBank?.bankCode && (
                        <TouchableOpacity onPress={linkBankAccount}>
                            <Text style={styles.linkText}>Save</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <View style={[styles.balanceCard, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Available Balance</Text>
                <Text style={[styles.balanceAmount, { color: colors.text }]}>
                    ${balance?.availableBalance.toFixed(2) || '0.00'}
                </Text>
                {balance && balance.pendingBalance > 0 && (
                    <Text style={styles.pendingBalance}>
                        ${balance.pendingBalance.toFixed(2)} pending
                    </Text>
                )}
            </View>

            <View style={[styles.amountInputContainer, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                />
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.secondaryButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}
                    onPress={() => setStep('bank')}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        styles.flexButton,
                        { backgroundColor: colors.primary },
                        (!amount || parseFloat(amount) < 5) && styles.buttonDisabled,
                    ]}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        handleAmountSubmit();
                    }}
                    disabled={!amount || parseFloat(amount) < 5}
                >
                    <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderConfirmStep = () => (
        <View style={[styles.stepContainer, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#000' }]}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Confirm Withdrawal</Text>
            <Text style={[styles.minWithdrawal, { color: colors.textMuted }]}>Minimum withdrawal: $5.00</Text>

            <View style={[styles.summaryCard, { backgroundColor: colors.inputBackground }]}>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Amount</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>${parseFloat(amount).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Bank</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{resolvedAccount?.bankName}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Account</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{resolvedAccount?.accountNumber}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Account Name</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{resolvedAccount?.accountName}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>You will receive</Text>
                    <Text style={styles.summaryTotal}>${parseFloat(amount).toFixed(2)}</Text>
                </View>
            </View>

            <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
                By confirming, your funds will be sent to the account above.
                Payment comes in 24 hours (1 working day).
            </Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.secondaryButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}
                    onPress={() => setStep('amount')}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.primaryButton, styles.flexButton, { backgroundColor: colors.primary }]}
                    onPress={submitWithdrawal}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Confirm Withdrawal</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderBankPicker = () => (
        <View style={[styles.pickerOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
                <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Bank</Text>
                    <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.bankList}>
                    {banks.map((bank, index) => (
                        <TouchableOpacity
                            key={`${bank.code}-${index}`}
                            style={[styles.bankItem, { borderBottomColor: colors.border }]}
                            onPress={() => {
                                setSelectedBank(bank);
                                setShowBankPicker(false);
                            }}
                        >
                            <Text style={[styles.bankItemText, { color: colors.text }]}>{bank.name}</Text>
                            {selectedBank?.code === bank.code && (
                                <Ionicons name="checkmark" size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );

    if (loadingBanks || loadingBalance) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <NewtonCradleLoader />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <View style={[styles.header, { backgroundColor: colors.card, paddingTop: 10 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Withdraw Funds</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
                    }
                >
                    {/* Progress indicator */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressDot, { backgroundColor: colors.border }, step === 'bank' && { backgroundColor: colors.primary }]} />
                        <View style={[styles.progressLine, { backgroundColor: colors.border }]} />
                        <View style={[styles.progressDot, { backgroundColor: colors.border }, step === 'amount' && { backgroundColor: colors.primary }]} />
                        <View style={[styles.progressLine, { backgroundColor: colors.border }]} />
                        <View style={[styles.progressDot, { backgroundColor: colors.border }, step === 'confirm' && { backgroundColor: colors.primary }]} />
                    </View>

                    {step === 'bank' && renderBankStep()}
                    {step === 'amount' && renderAmountStep()}
                    {step === 'confirm' && renderConfirmStep()}
                </ScrollView>

                {showBankPicker && renderBankPicker()}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardAvoid: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginLeft: 12,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    progressLine: {
        width: 40,
        height: 2,
        marginHorizontal: 8,
    },
    stepContainer: {
        borderRadius: 16,
        padding: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    stepDescription: {
        fontSize: 14,
        marginBottom: 20,
    },
    linkedBankCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    linkedBankHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    linkedBankTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#10B981',
        marginLeft: 8,
    },
    linkedBankName: {
        fontSize: 16,
        fontWeight: '600',
    },
    linkedBankDetails: {
        fontSize: 14,
        marginTop: 4,
    },
    bankSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    bankSelectorText: {
        fontSize: 16,
    },
    bankSelectorPlaceholder: {
        fontSize: 16,
    },
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 16,
    },
    primaryButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    secondaryButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        minWidth: 100,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    flexButton: {
        flex: 1,
    },
    verifiedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    verifiedInfo: {
        flex: 1,
        marginLeft: 12,
    },
    verifiedName: {
        fontSize: 16,
        fontWeight: '600',
    },
    verifiedBank: {
        fontSize: 14,
        marginTop: 2,
    },
    linkText: {
        color: '#FF8A00',
        fontWeight: '600',
    },
    balanceCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 14,
    },
    balanceAmount: {
        fontSize: 32,
        fontWeight: '700',
        marginTop: 4,
    },
    pendingBalance: {
        fontSize: 14,
        color: '#F59E0B',
        marginTop: 4,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: '600',
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        padding: 16,
    },
    minWithdrawal: {
        fontSize: 12,
        marginBottom: 16,
        textAlign: 'center',
    },
    summaryCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    summaryTotal: {
        fontSize: 18,
        fontWeight: '700',
        color: '#10B981',
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    pickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    bankList: {
        padding: 16,
    },
    bankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    bankItemText: {
        fontSize: 16,
    },
});

export default WithdrawalScreen;
