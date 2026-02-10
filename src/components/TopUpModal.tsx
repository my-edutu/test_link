import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthProvider';
import { monetizationApi } from '../services/monetizationApi';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface TopUpModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ visible, onClose, onSuccess }) => {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTopUp = async () => {
        if (!user) return;

        const amountNum = parseFloat(amount);
        if (!amount || isNaN(amountNum) || amountNum < 1) {
            Alert.alert('Invalid Amount', 'Minimum top-up is $1.00');
            return;
        }

        setLoading(true);
        try {
            const result = await monetizationApi.initializeTopUp(
                amountNum,
                user.email || 'user@example.com' // Fallback if email is missing (should be there)
            );

            if (result?.authorization_url) {
                // Open Paystack Checkout
                await WebBrowser.openBrowserAsync(result.authorization_url);

                // After browser closes (or user returns)
                Alert.alert(
                    'Transaction Processing',
                    'If you completed the payment, your balance will be updated shortly.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setAmount('');
                                onClose();
                                onSuccess?.();
                            }
                        }
                    ]
                );
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error.message || 'Failed to initialize payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                style={[styles.overlay, { backgroundColor: colors.overlay }]}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[styles.modalContainer, { backgroundColor: colors.card }]}
                    >
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.text }]}>Top Up Wallet</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.description, { color: colors.textSecondary }]}>
                            Add funds to your wallet to support creators and unlock premium features.
                        </Text>

                        <View style={[
                            styles.inputContainer,
                            {
                                backgroundColor: colors.inputBackground,
                                borderColor: colors.border
                            }
                        ]}>
                            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="0.00"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={setAmount}
                                autoFocus={true}
                            />
                        </View>

                        <View style={styles.presetsContainer}>
                            {[5, 10, 20, 50].map((val) => (
                                <TouchableOpacity
                                    key={val}
                                    style={[
                                        styles.presetButton,
                                        {
                                            backgroundColor: colors.inputBackground,
                                            borderColor: colors.border
                                        }
                                    ]}
                                    onPress={() => setAmount(val.toString())}
                                >
                                    <Text style={[styles.presetText, { color: colors.textSecondary }]}>${val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.payButton,
                                { backgroundColor: colors.primary },
                                loading && styles.payButtonDisabled
                            ]}
                            onPress={handleTopUp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.payButtonText}>Pay Now</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.secureBadge}>
                            <Ionicons name="lock-closed" size={12} color={colors.textSecondary} />
                            <Text style={[styles.secureText, { color: colors.textSecondary }]}>Secured by Paystack</Text>
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        width: width,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    description: {
        fontSize: 14,
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: '600',
    },
    input: {
        flex: 1,
        fontSize: 32,
        fontWeight: '700',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    presetsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    presetButton: {
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    presetText: {
        fontSize: 16,
        fontWeight: '600',
    },
    payButton: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    payButtonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
    },
    payButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        gap: 4
    },
    secureText: {
        fontSize: 12,
    }
});

export default TopUpModal;
