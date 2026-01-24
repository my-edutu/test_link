import React, { useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Image,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const LiveStreamSummaryScreen: React.FC<any> = ({ navigation, route }) => {
    const { summary } = route.params || {};
    const { colors: userTheme, theme: currentTheme } = useTheme();
    const styles = useMemo(() => createStyles(userTheme, currentTheme), [userTheme, currentTheme]);

    const stats = [
        { label: 'Total Viewers', value: summary?.viewers || 0, icon: 'eye' },
        { label: 'New Followers', value: summary?.newFollowers || 0, icon: 'people' },
        { label: 'Points Earned', value: summary?.points || 0, icon: 'star' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={userTheme.background} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header Banner */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Stream Ended</Text>
                    <Text style={styles.headerDate}>{new Date().toLocaleDateString()} • {summary?.duration || '00:00'}</Text>
                </View>

                {/* Streamer Profile */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Text style={{ fontSize: 40 }}>👤</Text>
                        {/* Use Image if avatar_url is available: <Image source={{uri: user.avatar}} style={styles.avatar} /> */}
                    </View>
                    <Text style={styles.streamTitle}>{summary?.title || 'Live Stream'}</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <View key={index} style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <Ionicons name={stat.icon as any} size={24} color={userTheme.primary} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Rewards Unlocked */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Rewards Unlocked</Text>
                    <View style={styles.rewardCard}>
                        <LinearGradient
                            colors={[userTheme.primary, '#FFD700']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.rewardIcon}
                        >
                            <Ionicons name="trophy" size={32} color="#FFF" />
                        </LinearGradient>
                        <View style={styles.rewardInfo}>
                            <Text style={styles.rewardName}>Stream Master</Text>
                            <Text style={styles.rewardDesc}>Hosted a stream for over 30 mins</Text>
                        </View>
                        <View style={styles.rewardBadge}>
                            <Text style={styles.rewardBadgeText}>+50 XP</Text>
                        </View>
                    </View>
                </View>

                {/* Top Supporters */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top Supporters</Text>
                    {summary?.topSupporters && summary.topSupporters.length > 0 ? (
                        summary.topSupporters.map((viewer: any, index: number) => (
                            <View key={index} style={styles.supporterItem}>
                                <Text style={styles.rank}>{index + 1}</Text>
                                <View style={styles.supporterAvatar}>
                                    <Text>{viewer.avatar}</Text>
                                </View>
                                <Text style={styles.supporterName}>{viewer.name}</Text>
                                <View style={styles.contribution}>
                                    <Ionicons name="heart" size={14} color={userTheme.primary} />
                                    <Text style={styles.contributionText}>{100 - (index * 20)}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={{ color: userTheme.textSecondary, textAlign: 'center', marginVertical: 10 }}>No supporters yet!</Text>
                    )}
                </View>

            </ScrollView>

            {/* Footer Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
                    <Text style={styles.homeBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    headerDate: {
        fontSize: 14,
        color: colors.textSecondary,
    },

    profileSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        width: 80, height: 80,
        borderRadius: 40,
        backgroundColor: colors.card,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2, borderColor: colors.primary,
    },
    streamTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },

    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 4,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    statIconContainer: {
        marginBottom: 8,
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,138,0,0.1)',
        justifyContent: 'center', alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },

    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
    },

    rewardCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    rewardIcon: {
        width: 50, height: 50,
        borderRadius: 25,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 16,
    },
    rewardInfo: {
        flex: 1,
    },
    rewardName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    rewardDesc: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    rewardBadge: {
        backgroundColor: 'rgba(255,215,0,0.2)',
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8,
    },
    rewardBadgeText: {
        color: '#D4AF37', // Gold
        fontSize: 12, fontWeight: 'bold',
    },

    supporterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: colors.card,
        padding: 12,
        borderRadius: 12,
    },
    rank: {
        fontSize: 16, fontWeight: 'bold', color: colors.textSecondary,
        width: 30, textAlign: 'center',
        marginRight: 8,
    },
    supporterAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#EEE',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    supporterName: {
        flex: 1,
        fontSize: 14, fontWeight: '600', color: colors.text,
    },
    contribution: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    contributionText: {
        fontSize: 12, fontWeight: 'bold', color: colors.primary,
    },

    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.background,
        padding: 24,
        borderTopWidth: 1, borderTopColor: colors.border,
    },
    homeBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    homeBtnText: {
        color: '#FFF',
        fontSize: 16, fontWeight: 'bold',
    },
});

export default LiveStreamSummaryScreen;
