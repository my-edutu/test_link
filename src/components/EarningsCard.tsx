
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { monetizationApi } from '../services/monetizationApi';

interface EarningsCardProps {
    userId: string;
    onWithdrawPress?: () => void;
    onTopUpPress?: () => void;
}

interface EarningsData {
    balance: number;
    totalEarned: number;
    trustScore: number;
    validatorTier: string;
}

const TIER_COLORS: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
};

const TIER_ICONS: Record<string, string> = {
    bronze: 'shield-outline',
    silver: 'shield-half-outline',
    gold: 'shield-checkmark',
};

export const EarningsCard: React.FC<EarningsCardProps> = ({ userId, onWithdrawPress, onTopUpPress }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [earnings, setEarnings] = useState<EarningsData | null>(null);
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        fetchEarnings();
    }, [userId]);

    const fetchEarnings = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await monetizationApi.getEarningsSummary(userId);
            setEarnings(data);

            // Trigger pulse animation if balance > 0
            if (data.balance > 0) {
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 200, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                ]).start();
            }
        } catch (e: any) {
            setError(e?.message || 'Failed to load earnings');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.card}>
                <ActivityIndicator color="#FF8A00" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.card}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchEarnings} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const tierColor = TIER_COLORS[earnings?.validatorTier || 'bronze'];
    const tierIcon = TIER_ICONS[earnings?.validatorTier || 'bronze'] as any;

    return (
        <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
            {/* Balance Section */}
            <View style={styles.balanceSection}>
                <Text style={styles.balanceLabel}>Your Balance</Text>
                <View style={styles.balanceRow}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <Text style={styles.balanceAmount}>
                        {(earnings?.balance || 0).toFixed(2)}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <TouchableOpacity
                        style={[styles.withdrawButton, { marginTop: 0, backgroundColor: '#10B981' }]}
                        onPress={onTopUpPress}
                    >
                        <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                        <Text style={styles.withdrawText}>Top Up</Text>
                    </TouchableOpacity>

                    {earnings && earnings.balance >= 5 && (
                        <TouchableOpacity
                            style={[styles.withdrawButton, { marginTop: 0 }]}
                            onPress={onWithdrawPress}
                        >
                            <Ionicons name="wallet-outline" size={16} color="#FFF" />
                            <Text style={styles.withdrawText}>Withdraw</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {earnings && earnings.balance < 5 && (
                    <Text style={styles.minWithdrawText}>Min. $5.00 to withdraw</Text>
                )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>${(earnings?.totalEarned || 0).toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Total Earned</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                    <View style={styles.trustScoreRow}>
                        <Text style={styles.statValue}>{earnings?.trustScore || 100}</Text>
                        <Ionicons
                            name={earnings && earnings.trustScore >= 100 ? "trending-up" : "trending-down"}
                            size={14}
                            color={earnings && earnings.trustScore >= 100 ? "#10B981" : "#EF4444"}
                        />
                    </View>
                    <Text style={styles.statLabel}>Trust Score</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                    <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
                        <Ionicons name={tierIcon} size={14} color="#FFF" />
                        <Text style={styles.tierText}>
                            {(earnings?.validatorTier || 'bronze').charAt(0).toUpperCase() +
                                (earnings?.validatorTier || 'bronze').slice(1)}
                        </Text>
                    </View>
                    <Text style={styles.statLabel}>Validator Tier</Text>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255, 138, 0, 0.1)',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 138, 0, 0.3)',
    },
    balanceSection: {
        alignItems: 'center',
        marginBottom: 16,
    },
    balanceLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 4,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    currencySymbol: {
        fontSize: 24,
        color: '#FF8A00',
        fontWeight: '600',
        marginTop: 4,
    },
    balanceAmount: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: -1,
    },
    withdrawButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF8A00',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 12,
        gap: 6,
    },
    withdrawText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    minWithdrawText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 8,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
        textAlign: 'center',
    },
    trustScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    tierText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFF',
    },
    errorText: {
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 12,
    },
    retryButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    retryText: {
        color: '#FFF',
        fontSize: 14,
    },
});

export default EarningsCard;
