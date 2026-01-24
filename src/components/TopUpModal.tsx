
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

const { width } = Dimensions.get('window');

interface TopUpModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ visible, onClose, onSuccess }) => {
    const { user } = useAuth();
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
                user.id,
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
                style={styles.overlay}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.modalContainer}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Top Up Wallet</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#1F2937" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.description}>
                            Add funds to your wallet to support creators and unlock premium features.
                        </Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#9CA3AF"
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
                                    style={styles.presetButton}
                                    onPress={() => setAmount(val.toString())}
                                >
                                    <Text style={styles.presetText}>${val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.payButton, loading && styles.payButtonDisabled]}
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
                            <Ionicons name="lock-closed" size={12} color="#6B7280" />
                            <Text style={styles.secureText}>Secured by Paystack</Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFF',
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
        color: '#1F2937',
    },
    closeButton: {
        padding: 4,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: '600',
        color: '#6B7280',
    },
    input: {
        flex: 1,
        fontSize: 32,
        fontWeight: '700',
        color: '#1F2937',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    presetsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    presetButton: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    presetText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    payButton: {
        backgroundColor: '#FF8A00',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#FF8A00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    payButtonDisabled: {
        backgroundColor: '#D1D5DB',
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
        color: '#6B7280'
    }
});

export default TopUpModal;
