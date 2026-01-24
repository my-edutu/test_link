import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

interface Transaction {
    id: string;
    amount: string;
    type: string;
    category: string | null;
    description: string | null;
    created_at: string;
}

interface TransactionHistoryProps {
    userId: string;
    limit?: number;
}

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
    earning: { icon: 'arrow-down-circle', color: '#10B981' },
    withdrawal: { icon: 'arrow-up-circle', color: '#EF4444' },
    bonus: { icon: 'gift', color: '#8B5CF6' },
    penalty: { icon: 'warning', color: '#F59E0B' },
    refund: { icon: 'refresh-circle', color: '#3B82F6' },
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ userId, limit = 20 }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTransactions();
    }, [userId]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (fetchError) throw fetchError;
            setTransactions(data || []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchTransactions();
        setRefreshing(false);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const renderTransaction = ({ item }: { item: Transaction }) => {
        const typeConfig = TYPE_ICONS[item.type] || { icon: 'cash', color: '#6B7280' };
        const isPositive = item.type === 'earning' || item.type === 'bonus' || item.type === 'refund';
        const amount = parseFloat(item.amount);

        return (
            <View style={styles.transactionItem}>
                <View style={[styles.iconContainer, { backgroundColor: `${typeConfig.color}20` }]}>
                    <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
                </View>

                <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle} numberOfLines={1}>
                        {item.description || item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                    <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
                </View>

                <Text style={[styles.transactionAmount, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                    {isPositive ? '+' : '-'}${Math.abs(amount).toFixed(2)}
                </Text>
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator color="#FF8A00" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchTransactions} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (transactions.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                <Text style={styles.emptySubtitle}>Start validating clips to earn rewards!</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Recent Activity</Text>
                <TouchableOpacity>
                    <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8A00" />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginTop: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    seeAllText: {
        fontSize: 14,
        color: '#FF8A00',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    transactionInfo: {
        flex: 1,
        marginLeft: 12,
    },
    transactionTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFF',
    },
    transactionDate: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '600',
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    errorText: {
        color: '#EF4444',
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
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
        textAlign: 'center',
    },
});

export default TransactionHistory;
