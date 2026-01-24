import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { monetizationApi } from '../services/monetizationApi';

interface Bank {
    name: string;
    code: string;
    slug: string;
}

interface LinkedBank {
    bankName: string | null;
    bankCode: string | null;
    accountNumberLast4: string | null;
    accountName: string | null;
}

interface BalanceSummary {
    availableBalance: number;
    pendingBalance: number;
    totalBalance: number;
}

interface ResolvedAccount {
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
}

const WithdrawalScreen: React.FC = () => {
    const navigation = useNavigation();

    // State
    const [banks, setBanks] = useState<Bank[]>([]);
    const [linkedBank, setLinkedBank] = useState<LinkedBank | null>(null);
    const [balance, setBalance] = useState<BalanceSummary | null>(null);
    const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [resolvedAccount, setResolvedAccount] = useState<ResolvedAccount | null>(null);

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
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Enter Bank Details</Text>
            <Text style={styles.stepDescription}>
                Select your bank and enter your account number
            </Text>

            {linkedBank && linkedBank.bankCode && (
                <View style={styles.linkedBankCard}>
                    <View style={styles.linkedBankHeader}>
                        <Ionicons name="card" size={20} color="#10B981" />
                        <Text style={styles.linkedBankTitle}>Saved Bank Account</Text>
                    </View>
                    <Text style={styles.linkedBankName}>{linkedBank.accountName}</Text>
                    <Text style={styles.linkedBankDetails}>
                        {linkedBank.bankName} - ****{linkedBank.accountNumberLast4}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={styles.bankSelector}
                onPress={() => setShowBankPicker(true)}
            >
                <Text style={selectedBank ? styles.bankSelectorText : styles.bankSelectorPlaceholder}>
                    {selectedBank ? selectedBank.name : 'Select Bank'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            <TextInput
                style={styles.input}
                placeholder="Account Number (10 digits)"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={10}
                value={accountNumber}
                onChangeText={setAccountNumber}
            />

            <TouchableOpacity
                style={[
                    styles.primaryButton,
                    (!selectedBank || accountNumber.length !== 10) && styles.buttonDisabled,
                ]}
                onPress={resolveAccount}
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
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Enter Amount</Text>

            {resolvedAccount && (
                <View style={styles.verifiedCard}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    <View style={styles.verifiedInfo}>
                        <Text style={styles.verifiedName}>{resolvedAccount.accountName}</Text>
                        <Text style={styles.verifiedBank}>
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

            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>
                    ${balance?.availableBalance.toFixed(2) || '0.00'}
                </Text>
                {balance && balance.pendingBalance > 0 && (
                    <Text style={styles.pendingBalance}>
                        ${balance.pendingBalance.toFixed(2)} pending
                    </Text>
                )}
            </View>

            <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                />
            </View>

            <Text style={styles.minWithdrawal}>Minimum withdrawal: $5.00</Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setStep('bank')}
                >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        styles.flexButton,
                        (!amount || parseFloat(amount) < 5) && styles.buttonDisabled,
                    ]}
                    onPress={handleAmountSubmit}
                    disabled={!amount || parseFloat(amount) < 5}
                >
                    <Text style={styles.primaryButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderConfirmStep = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Confirm Withdrawal</Text>

            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount</Text>
                    <Text style={styles.summaryValue}>${parseFloat(amount).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Bank</Text>
                    <Text style={styles.summaryValue}>{resolvedAccount?.bankName}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Account</Text>
                    <Text style={styles.summaryValue}>{resolvedAccount?.accountNumber}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Account Name</Text>
                    <Text style={styles.summaryValue}>{resolvedAccount?.accountName}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>You will receive</Text>
                    <Text style={styles.summaryTotal}>${parseFloat(amount).toFixed(2)}</Text>
                </View>
            </View>

            <Text style={styles.disclaimer}>
                By confirming, your funds will be locked and sent to the account above.
                Processing may take 1-3 business days.
            </Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setStep('amount')}
                >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.primaryButton, styles.flexButton]}
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
        <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Select Bank</Text>
                    <TouchableOpacity onPress={() => setShowBankPicker(false)}>
                        <Ionicons name="close" size={24} color="#1F2937" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.bankList}>
                    {banks.map((bank) => (
                        <TouchableOpacity
                            key={bank.code}
                            style={styles.bankItem}
                            onPress={() => {
                                setSelectedBank(bank);
                                setShowBankPicker(false);
                            }}
                        >
                            <Text style={styles.bankItemText}>{bank.name}</Text>
                            {selectedBank?.code === bank.code && (
                                <Ionicons name="checkmark" size={20} color="#FF8A00" />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );

    if (loadingBanks || loadingBalance) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF8A00" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Withdraw Funds</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Progress indicator */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressDot, step === 'bank' && styles.progressDotActive]} />
                        <View style={styles.progressLine} />
                        <View style={[styles.progressDot, step === 'amount' && styles.progressDotActive]} />
                        <View style={styles.progressLine} />
                        <View style={[styles.progressDot, step === 'confirm' && styles.progressDotActive]} />
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
        backgroundColor: '#F9FAFB',
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
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
        backgroundColor: '#E5E7EB',
    },
    progressDotActive: {
        backgroundColor: '#FF8A00',
    },
    progressLine: {
        width: 40,
        height: 2,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 8,
    },
    stepContainer: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    stepDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    linkedBankCard: {
        backgroundColor: '#ECFDF5',
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
        color: '#1F2937',
    },
    linkedBankDetails: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    bankSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    bankSelectorText: {
        fontSize: 16,
        color: '#1F2937',
    },
    bankSelectorPlaceholder: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        marginBottom: 16,
    },
    primaryButton: {
        backgroundColor: '#FF8A00',
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
        backgroundColor: '#D1D5DB',
    },
    secondaryButton: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        minWidth: 100,
    },
    secondaryButtonText: {
        color: '#6B7280',
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
        backgroundColor: '#ECFDF5',
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
        color: '#1F2937',
    },
    verifiedBank: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    linkText: {
        color: '#FF8A00',
        fontWeight: '600',
    },
    balanceCard: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    balanceAmount: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1F2937',
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
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: '600',
        color: '#6B7280',
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        color: '#1F2937',
        padding: 16,
    },
    minWithdrawal: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 16,
        textAlign: 'center',
    },
    summaryCard: {
        backgroundColor: '#F3F4F6',
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
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
    },
    summaryTotal: {
        fontSize: 18,
        fontWeight: '700',
        color: '#10B981',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    disclaimer: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 18,
    },
    pickerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        backgroundColor: '#FFF',
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
        borderBottomColor: '#E5E7EB',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
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
        borderBottomColor: '#F3F4F6',
    },
    bankItemText: {
        fontSize: 16,
        color: '#1F2937',
    },
});

export default WithdrawalScreen;
