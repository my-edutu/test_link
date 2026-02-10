import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import { Colors, Layout, Typography, Gradients } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';

interface RewardItem {
    id: string;
    title: string;
    description: string;
    cost: number;
    icon: string;
    category: string;
    available: boolean;
}

const mockRewardItems: RewardItem[] = [
    {
        id: '1',
        title: 'Premium Badge Pack',
        description: 'Unlock exclusive badges',
        cost: 500,
        icon: '🏅',
        category: 'Badges',
        available: true
    },
    {
        id: '2',
        title: 'Voice Effects',
        description: 'Special voice filters',
        cost: 300,
        icon: '🎵',
        category: 'Features',
        available: true
    },
    {
        id: '3',
        title: 'Custom Avatar Frame',
        description: 'Personalize your profile',
        cost: 250,
        icon: '🖼️',
        category: 'Customization',
        available: true
    },
    {
        id: '4',
        title: 'Language Certificate',
        description: 'Official recognition',
        cost: 1000,
        icon: '🎓',
        category: 'Certificates',
        available: true
    }
];

const StoreScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        const fetchBalance = async () => {
            if (!user?.id) return;
            const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
            if (data) setBalance(parseFloat(data.balance || '0'));
        };
        fetchBalance();
    }, [user?.id]);

    const renderRewardItem = (item: RewardItem) => (
        <GlassCard
            key={item.id}
            style={[
                styles.rewardCard,
                {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.card,
                    borderColor: colors.borderLight
                },
                balance < item.cost && styles.rewardCardDisabled
            ]}
            intensity={isDark ? 20 : 0}
        >
            <View style={[styles.rewardIcon, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                <Text style={styles.rewardIconText}>{item.icon}</Text>
            </View>
            <View style={styles.rewardInfo}>
                <Text style={[styles.rewardTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.rewardDescription, { color: colors.textSecondary }]}>{item.description}</Text>
                <View style={[styles.rewardCategory, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                    <Text style={[styles.rewardCategoryText, { color: colors.textSecondary }]}>{item.category}</Text>
                </View>
            </View>
            <View style={styles.rewardCost}>
                <Text style={[styles.rewardCostNumber, { color: colors.primary }]}>${item.cost}</Text>
                <Text style={[styles.rewardCostLabel, { color: colors.textSecondary }]}>USD</Text>
                {balance >= item.cost && (
                    <TouchableOpacity style={styles.redeemButton}>
                        <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
                        <Text style={styles.redeemButtonText}>Get</Text>
                    </TouchableOpacity>
                )}
            </View>
        </GlassCard>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Store</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
                <View style={[
                    styles.storeBalance,
                    {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.card,
                        borderColor: colors.borderLight
                    }
                ]}>
                    <Text style={[styles.storeBalanceLabel, { color: colors.textSecondary }]}>Available Balance</Text>
                    <Text style={[styles.storeBalanceValue, { color: colors.primary }]}>${balance.toLocaleString()}</Text>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured Rewards</Text>
                {mockRewardItems.map(renderRewardItem)}

                <View style={styles.comingSoonSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Coming Soon</Text>
                    <View style={[
                        styles.comingSoonCard,
                        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.card }
                    ]}>
                        <Text style={[styles.previewItem, { color: colors.textSecondary }]}>🎓 Language Certificates</Text>
                        <Text style={[styles.previewItem, { color: colors.textSecondary }]}>🎁 Cultural Merchandise</Text>
                        <Text style={[styles.previewItem, { color: colors.textSecondary }]}>📚 Premium Story Templates</Text>
                        <Text style={[styles.previewItem, { color: colors.textSecondary }]}>🏆 Exclusive NFT Badges</Text>
                        <Text style={[styles.previewItem, { color: colors.textSecondary }]}>💰 Cash Rewards</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...Typography.h2,
    },
    content: {
        paddingHorizontal: 20,
    },
    storeBalance: {
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 24,
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    storeBalanceLabel: {
        ...Typography.caption,
        marginBottom: 8,
    },
    storeBalanceValue: {
        ...Typography.h1,
    },
    sectionTitle: {
        ...Typography.h3,
        marginBottom: 16,
    },
    rewardCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    rewardCardDisabled: {
        opacity: 0.6,
    },
    rewardIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rewardIconText: {
        fontSize: 28,
    },
    rewardInfo: {
        flex: 1,
    },
    rewardTitle: {
        ...Typography.body,
        fontWeight: '700',
        marginBottom: 4,
    },
    rewardDescription: {
        ...Typography.caption,
        marginBottom: 8,
    },
    rewardCategory: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    rewardCategoryText: {
        fontSize: 10,
        textTransform: 'uppercase',
    },
    rewardCost: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    rewardCostNumber: {
        ...Typography.body,
        fontWeight: '700',
    },
    rewardCostLabel: {
        fontSize: 10,
        marginBottom: 8,
    },
    redeemButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
    },
    redeemButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    comingSoonSection: {
        marginTop: 24,
    },
    comingSoonCard: {
        borderRadius: 16,
        padding: 20,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    previewItem: {
        ...Typography.body,
    },
});

export default StoreScreen;
