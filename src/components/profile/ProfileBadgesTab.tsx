import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Theme';
import { GlassCard } from '../GlassCard';
import BadgeDetailModal from '../BadgeDetailModal';

const { width } = Dimensions.get('window');

interface ProfileBadgesTabProps {
    userProfile: any;
    userBadges: any[];
    nextMilestone: {
        badge: string;
        remaining: number;
        type: 'followers' | 'validations';
    } | null;
    followerCount: number;
    isDark: boolean;
    colors: any;
}

const ProfileBadgesTab: React.FC<ProfileBadgesTabProps> = ({
    userProfile,
    userBadges,
    nextMilestone,
    followerCount,
    isDark,
    colors,
}) => {
    const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
    const [showBadgeModal, setShowBadgeModal] = useState(false);

    return (
        <View style={{ width, minHeight: 400 }}>
            <View style={styles.badgesSection}>
                {/* Next Milestone Card */}
                {nextMilestone && (
                    <GlassCard style={styles.milestoneCard}>
                        <View style={styles.milestoneHeader}>
                            <View>
                                <Text style={[styles.milestoneTitle, { color: colors.text }]}>Next Milestone</Text>
                                <Text style={[styles.milestoneBadgeName, { color: Colors.primary }]}>{nextMilestone.badge}</Text>
                            </View>
                            <Ionicons name="trophy-outline" size={24} color={Colors.primary} />
                        </View>
                        <Text style={[styles.milestoneSubtitle, { color: colors.textSecondary }]}>
                            {nextMilestone.remaining} more {nextMilestone.type} to unlock
                        </Text>
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${Math.max(0, Math.min(100, ((nextMilestone.type === 'followers' ? followerCount : 0) / (nextMilestone.type === 'followers' ? (followerCount + nextMilestone.remaining) : 100)) * 100))}%` }
                                ]}
                            />
                        </View>
                    </GlassCard>
                )}

                {/* Promotion Progress (Only for Users) */}
                {userProfile?.user_role === 'user' && !nextMilestone && (
                    <View style={[styles.progressCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}>
                        <View style={styles.progressHeader}>
                            <Text style={[styles.progressTitle, { color: colors.text }]}>Path to Validator</Text>
                            <Ionicons name="ribbon-outline" size={20} color={Colors.primary} />
                        </View>
                        <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
                            Unlock 1.4x rewards and validation tools
                        </Text>

                        {/* Validations Progress */}
                        <View style={styles.progressItem}>
                            <View style={styles.progressLabelRow}>
                                <Text style={[styles.progressLabel, { color: colors.text }]}>Validations</Text>
                                <Text style={[styles.progressValue, { color: colors.text }]}>
                                    {userProfile?.total_validations_count || 0} / 200
                                </Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${Math.min(((userProfile?.total_validations_count || 0) / 200) * 100, 100)}%` }
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Active Days Progress */}
                        <View style={styles.progressItem}>
                            <View style={styles.progressLabelRow}>
                                <Text style={[styles.progressLabel, { color: colors.text }]}>Active Days</Text>
                                <Text style={[styles.progressValue, { color: colors.text }]}>
                                    {userProfile?.active_days_count || 0} / 10
                                </Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${Math.min(((userProfile?.active_days_count || 0) / 10) * 100, 100)}%` }
                                    ]}
                                />
                            </View>
                        </View>
                    </View>
                )}

                {/* Badges Grid */}
                <View style={styles.badgesGrid}>
                    {userBadges.map((badge) => (
                        <TouchableOpacity
                            key={badge.id}
                            style={styles.badgeItem}
                            onPress={() => {
                                setSelectedBadge(badge);
                                setShowBadgeModal(true);
                            }}
                        >
                            <Image source={{ uri: badge.image_url || badge.imageUrl }} style={styles.badgeImage} />
                            <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>{badge.name}</Text>
                            {badge.tier && (
                                <View style={[styles.tierTag, {
                                    backgroundColor:
                                        badge.tier === 'gold' ? '#FFD700' :
                                            badge.tier === 'silver' ? '#C0C0C0' :
                                                badge.tier === 'bronze' ? '#CD7F32' :
                                                    badge.tier === 'platinum' ? '#E5E4E2' :
                                                        badge.tier === 'diamond' ? '#B9F2FF' : Colors.primary
                                }]}>
                                    <Text style={[styles.tierTagText, { color: '#000' }]}>{badge.tier.toUpperCase()}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                    {userBadges.length === 0 && (
                        <View style={styles.emptyBadges}>
                            <Ionicons name="medal-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.noBadgesText, { color: colors.textSecondary }]}>No badges earned yet.</Text>
                        </View>
                    )}
                </View>

                <BadgeDetailModal
                    visible={showBadgeModal}
                    badge={selectedBadge}
                    onClose={() => setShowBadgeModal(false)}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    badgesSection: { padding: 20 },
    milestoneCard: { padding: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,138,0,0.3)' },
    milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    milestoneTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600', opacity: 0.7 },
    milestoneBadgeName: { fontSize: 18, fontWeight: 'bold', marginTop: 2 },
    milestoneSubtitle: { fontSize: 13, marginBottom: 12 },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(150, 150, 150, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FF8A00',
        borderRadius: 3,
    },
    progressCard: {
        marginHorizontal: 0, // Adjusted from 16 to 0 as it's inside padding
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 138, 0, 0.2)',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    progressSubtitle: {
        fontSize: 12,
        marginBottom: 16,
    },
    progressItem: {
        marginBottom: 12,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    progressValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    badgeItem: { width: (width - 52) / 3, aspectRatio: 0.8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    badgeImage: { width: 48, height: 48, marginBottom: 8 },
    badgeName: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
    tierTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    tierTagText: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
    emptyBadges: { width: '100%', alignItems: 'center', paddingVertical: 32, gap: 12 },
    noBadgesText: { fontSize: 14, fontStyle: 'italic' },
});

export default ProfileBadgesTab;
