import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Share,
    StatusBar,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { authFetch, parseResponse } from '../services/authFetch';
import { Colors, Typography, Layout, Gradients } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from '../components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface AmbassadorStats {
    totalReferrals: number;
    totalConversions: number;
    totalEarnings: number;
}

interface LeaderboardEntry {
    ambassadorId: string;
    totalConversions: number;
    totalEarnings: number;
}

const AmbassadorScreen: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AmbassadorStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    // The username is the referral code, always prefixed with @
    // Prioritize username from metadata if top-level username is missing or default
    const effectiveUsername = user?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'user';
    const referralCode = effectiveUsername.startsWith('@') ? effectiveUsername : `@${effectiveUsername}`;

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch stats from backend
            const statsResponse = await authFetch('/ambassador/stats');
            const statsData = await parseResponse<{ stats: AmbassadorStats }>(statsResponse);
            if (statsData.stats) {
                setStats(statsData.stats);
            }

            // Fetch leaderboard
            const lbResponse = await authFetch('/ambassador/leaderboard', { requireAuth: false });
            const lbData = await parseResponse<{ leaderboard: LeaderboardEntry[] }>(lbResponse);
            setLeaderboard(lbData.leaderboard || []);

            setLoading(false);
        } catch (e) {
            console.error('AmbassadorScreen fetchData error:', e);
            setLoading(false);
        }
    };

    const onShare = async () => {
        try {
            await Share.share({
                message: `Join LinguaLink with my code ${referralCode} and we both earn rewards! \n\nDownload now: https://lingualink.ai`,
            });
        } catch (error) {
            console.log('Share error:', error);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <TouchableOpacity
                style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Ambassador Program</Text>
            <TouchableOpacity style={styles.helpButton} onPress={fetchData}>
                <Ionicons name="refresh-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
        </View>
    );

    if (loading && !stats) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

            {renderHeader()}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <GlassCard style={styles.heroCard} intensity={isDark ? 30 : 80}>
                    <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Your Referral Code</Text>
                    <Text style={[styles.heroCode, { color: colors.primary }]}>{referralCode}</Text>
                    <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>
                        Share this code with friends. When they join and start validating clips, you earn percentage-based rewards!
                    </Text>
                    <TouchableOpacity style={styles.shareButton} onPress={onShare}>
                        <LinearGradient
                            colors={Gradients.primary}
                            style={styles.shareButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="share-social" size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.shareButtonText}>Share My Code</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </GlassCard>

                <View style={styles.statsGrid}>
                    <GlassCard style={styles.statCard} intensity={isDark ? 20 : 60}>
                        <Ionicons name="people-outline" size={24} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalReferrals || 0}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Referrals</Text>
                    </GlassCard>

                    <GlassCard style={styles.statCard} intensity={isDark ? 20 : 60}>
                        <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalConversions || 0}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conversions</Text>
                    </GlassCard>

                    <GlassCard style={styles.statCard} intensity={isDark ? 20 : 60}>
                        <Ionicons name="wallet-outline" size={24} color="#FFD700" />
                        <Text style={[styles.statValue, { color: colors.success }]}>
                            ${stats?.totalEarnings?.toFixed(2) || '0.00'}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Earnings</Text>
                    </GlassCard>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Ambassador Leaderboard</Text>
                    <Ionicons name="trophy-outline" size={20} color={colors.primary} />
                </View>

                {leaderboard.length === 0 ? (
                    <GlassCard style={styles.emptyCard} intensity={isDark ? 20 : 60}>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No top ambassadors yet. Be the first!</Text>
                    </GlassCard>
                ) : (
                    <GlassCard style={styles.leaderboardCard} intensity={isDark ? 20 : 60}>
                        {leaderboard.map((entry, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.leaderboardItem,
                                    index === leaderboard.length - 1 && { borderBottomWidth: 0 },
                                    { borderBottomColor: colors.borderLight }
                                ]}
                            >
                                <View style={styles.rankBadge}>
                                    <Text style={[
                                        styles.rankText,
                                        index < 3 ? { color: colors.primary } : { color: colors.textMuted }
                                    ]}>
                                        {index + 1}
                                    </Text>
                                </View>
                                <View style={styles.lbInfo}>
                                    <Text style={[styles.lbName, { color: colors.text }]}>
                                        Ambassador {entry.ambassadorId.substring(0, 8)}...
                                    </Text>
                                    <Text style={[styles.lbSubtext, { color: colors.textSecondary }]}>Top Contributor</Text>
                                </View>
                                <View style={styles.lbStats}>
                                    <Text style={[styles.lbScore, { color: colors.success }]}>{entry.totalConversions}</Text>
                                    <Text style={[styles.lbSubtext, { color: colors.textSecondary }]}>converts</Text>
                                </View>
                            </View>
                        ))}
                    </GlassCard>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
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
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        zIndex: 10,
    },
    headerTitle: {
        ...Typography.h3,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    heroCard: {
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    heroLabel: {
        ...Typography.caption,
        marginBottom: 8,
    },
    heroCode: {
        ...Typography.hero,
        fontSize: 40,
        marginBottom: 16,
    },
    heroSubtext: {
        ...Typography.body,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
    },
    shareButton: {
        width: '100%',
        borderRadius: Layout.radius.m,
        overflow: 'hidden',
    },
    shareButtonGradient: {
        flexDirection: 'row',
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareButtonText: {
        ...Typography.h4,
        color: '#FFFFFF',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statCard: {
        width: (width - 60) / 3,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        ...Typography.h3,
        marginTop: 8,
    },
    statLabel: {
        ...Typography.caption,
        fontSize: 10,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        ...Typography.h3,
        marginRight: 8,
    },
    emptyCard: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
    },
    leaderboardCard: {
        paddingVertical: 8,
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    rankBadge: {
        width: 32,
        alignItems: 'flex-start',
    },
    rankText: {
        ...Typography.h4,
    },
    lbInfo: {
        flex: 1,
    },
    lbName: {
        ...Typography.h4,
        fontSize: 15,
    },
    lbSubtext: {
        ...Typography.caption,
        fontSize: 11,
        textTransform: 'none',
    },
    lbStats: {
        alignItems: 'flex-end',
    },
    lbScore: {
        ...Typography.h4,
    },
});

export default AmbassadorScreen;
