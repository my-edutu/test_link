import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import { Colors, Layout, Typography } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';

interface Contributor {
    id: string;
    name: string;
    username: string;
    avatar: string;
    points: number;
    contributions: number;
    badge: string;
    rank: number;
    isCurrentUser?: boolean;
}

const LeaderboardScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [selectedTimeframe, setSelectedTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly' | 'All Time'>('All Time');
    const [leaderboard, setLeaderboard] = useState<Contributor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLeaderboard = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, total_earned')
                .order('total_earned', { ascending: false })
                .limit(20);

            if (data) {
                const formatted = data.map((p, idx) => ({
                    id: p.id,
                    name: p.full_name || 'Anonymous',
                    username: p.username || 'user',
                    avatar: '👤', // Placeholder or use avatar_url
                    points: parseFloat(p.total_earned || '0'),
                    contributions: 0,
                    badge: idx === 0 ? 'Crown Champion' : 'Contributor',
                    rank: idx + 1,
                    isCurrentUser: p.id === user?.id
                }));
                setLeaderboard(formatted);
            }
        } catch (e) {
            console.error('Error fetching leaderboard:', e);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    const renderContributor = (contributor: Contributor) => (
        <GlassCard
            key={contributor.id}
            intensity={contributor.isCurrentUser ? 40 : 20}
            style={[
                styles.contributorCard,
                contributor.isCurrentUser && styles.currentUserCard
            ]}
        >
            <View style={styles.contributorRank}>
                {contributor.rank <= 3 ? (
                    <Text style={styles.rankEmoji}>
                        {contributor.rank === 1 ? '👑' : contributor.rank === 2 ? '🥈' : '🥉'}
                    </Text>
                ) : (
                    <Text style={[
                        styles.rankNumber,
                        contributor.isCurrentUser && styles.currentUserText
                    ]}>{contributor.rank}</Text>
                )}
            </View>

            <View style={styles.contributorAvatar}>
                <Text style={styles.avatarText}>{contributor.avatar}</Text>
            </View>

            <View style={styles.contributorInfo}>
                <View style={styles.nameRow}>
                    <Text style={[
                        styles.contributorName,
                        contributor.isCurrentUser && styles.currentUserText
                    ]}>
                        {contributor.name}
                    </Text>
                    {contributor.isCurrentUser && (
                        <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>YOU</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.contributorUsername}>@{contributor.username}</Text>
            </View>

            <View style={styles.contributorPoints}>
                <Text style={[
                    styles.pointsNumber,
                    contributor.isCurrentUser && styles.currentUserPoints
                ]}>${contributor.points.toLocaleString()}</Text>
                <Text style={styles.pointsLabel}>USD</Text>
            </View>
        </GlassCard>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Leaderboard</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
                {/* Timeframe Selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.timeframeSelector}
                >
                    {['Daily', 'Weekly', 'Monthly', 'All Time'].map((timeframe) => (
                        <TouchableOpacity
                            key={timeframe}
                            style={[
                                styles.timeframeButton,
                                selectedTimeframe === timeframe && styles.timeframeButtonActive
                            ]}
                            onPress={() => setSelectedTimeframe(timeframe as typeof selectedTimeframe)}
                        >
                            <Text style={[
                                styles.timeframeButtonText,
                                selectedTimeframe === timeframe && styles.timeframeButtonTextActive
                            ]}>
                                {timeframe}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Top 3 Highlighted */}
                <View style={styles.topThreeContainer}>
                    {leaderboard.slice(0, 3).map((contributor, index) => (
                        <View key={contributor.id} style={[
                            styles.topContributorCard,
                            index === 0 && styles.firstPlace,
                            index === 1 && styles.secondPlace,
                            index === 2 && styles.thirdPlace,
                        ]}>
                            <Text style={styles.topRankEmoji}>
                                {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                            </Text>
                            <View style={styles.topAvatar}>
                                <Text style={styles.topAvatarText}>{contributor.avatar}</Text>
                            </View>
                            <Text style={styles.topContributorName}>{contributor.name}</Text>
                            <Text style={styles.topContributorPoints}>
                                {contributor.points.toLocaleString()}
                            </Text>
                            <Text style={styles.topContributorBadge}>{contributor.badge}</Text>
                        </View>
                    ))}
                </View>

                {/* All Contributors List */}
                <View style={styles.allContributorsSection}>
                    <Text style={styles.sectionTitle}>Full Leaderboard</Text>
                    {leaderboard.map(renderContributor)}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A0800',
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
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...Typography.h2,
        color: '#FFFFFF',
    },
    content: {
        paddingBottom: 40,
    },
    // Leaderboard Specific Styles
    timeframeSelector: {
        flexGrow: 0,
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    timeframeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    timeframeButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    timeframeButtonText: {
        ...Typography.caption,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    timeframeButtonTextActive: {
        color: '#FFFFFF',
    },
    topThreeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: 32,
        paddingHorizontal: 20,
        height: 220,
    },
    topContributorCard: {
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        width: '30%',
        marginHorizontal: '1.5%',
    },
    firstPlace: {
        height: 200,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.5)',
        zIndex: 10,
    },
    secondPlace: {
        height: 170,
        backgroundColor: 'rgba(192, 192, 192, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(192, 192, 192, 0.3)',
    },
    thirdPlace: {
        height: 150,
        backgroundColor: 'rgba(205, 127, 50, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(205, 127, 50, 0.3)',
    },
    topRankEmoji: {
        fontSize: 24,
        marginBottom: 8,
    },
    topAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    topAvatarText: {
        fontSize: 24,
    },
    topContributorName: {
        ...Typography.caption,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
        textAlign: 'center',
    },
    topContributorPoints: {
        ...Typography.body,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 4,
    },
    topContributorBadge: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
    },
    allContributorsSection: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        ...Typography.h3,
        color: '#FFFFFF',
        marginBottom: 16,
    },
    contributorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    currentUserCard: {
        borderColor: Colors.primary,
        borderWidth: 1,
    },
    contributorRank: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
    },
    rankNumber: {
        ...Typography.h3,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    rankEmoji: {
        fontSize: 20,
    },
    contributorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
    },
    contributorInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    contributorName: {
        ...Typography.body,
        fontWeight: '600',
        color: '#FFFFFF',
        marginRight: 8,
    },
    currentUserText: {
        color: Colors.primary,
    },
    youBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    youBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    contributorUsername: {
        ...Typography.caption,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    contributorPoints: {
        alignItems: 'flex-end',
    },
    pointsNumber: {
        ...Typography.body,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    currentUserPoints: {
        color: Colors.primary,
    },
    pointsLabel: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
    },
});

export default LeaderboardScreen;
