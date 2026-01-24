import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const BADGE_SIZE = (width - 64) / 3; // 3 columns with padding

export interface Badge {
    id: string;
    name: string;
    description: string;
    image_url: string;
    category: 'contributor' | 'validator' | 'game' | 'social';
    earned_at?: string;
}

interface TrophyCaseProps {
    badges: Badge[];
    onBadgePress?: (badge: Badge) => void;
    onViewAllPress?: () => void;
    maxDisplay?: number;
    showViewAll?: boolean;
}

const TrophyCase: React.FC<TrophyCaseProps> = ({
    badges,
    onBadgePress,
    onViewAllPress,
    maxDisplay = 6,
    showViewAll = true,
}) => {
    const displayBadges = maxDisplay > 0 ? badges.slice(0, maxDisplay) : badges;
    const hasMoreBadges = badges.length > maxDisplay;

    if (badges.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="trophy-outline" size={48} color="rgba(255,255,255,0.2)" />
                </View>
                <Text style={styles.emptyTitle}>No Badges Yet</Text>
                <Text style={styles.emptyDescription}>
                    Keep contributing to the community to earn badges!
                </Text>
            </View>
        );
    }

    const renderBadge = ({ item: badge }: { item: Badge }) => (
        <TouchableOpacity
            style={styles.badgeItem}
            onPress={() => onBadgePress?.(badge)}
            activeOpacity={0.7}
        >
            <View style={styles.badgeImageContainer}>
                <View style={styles.badgeGlow} />
                <Image
                    source={{ uri: badge.image_url }}
                    style={styles.badgeImage}
                    resizeMode="contain"
                />
            </View>
            <Text style={styles.badgeName} numberOfLines={1}>
                {badge.name}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="trophy" size={20} color="#ff6d00" />
                    <Text style={styles.headerTitle}>Trophy Case</Text>
                </View>
                <Text style={styles.badgeCount}>{badges.length} badges</Text>
            </View>

            {/* Badges Grid */}
            <FlatList
                data={displayBadges}
                renderItem={renderBadge}
                keyExtractor={(item) => item.id}
                numColumns={3}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContainer}
                columnWrapperStyle={styles.row}
            />

            {/* View All Link */}
            {showViewAll && hasMoreBadges && (
                <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={onViewAllPress}
                >
                    <Text style={styles.viewAllText}>
                        View All {badges.length} Badges
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#ff6d00" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    badgeCount: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
    gridContainer: {
        gap: 12,
    },
    row: {
        justifyContent: 'flex-start',
        gap: 12,
    },
    badgeItem: {
        width: BADGE_SIZE,
        alignItems: 'center',
    },
    badgeImageContainer: {
        width: BADGE_SIZE - 16,
        height: BADGE_SIZE - 16,
        borderRadius: (BADGE_SIZE - 16) / 2,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,109,0,0.3)',
        marginBottom: 8,
        position: 'relative',
    },
    badgeGlow: {
        position: 'absolute',
        width: '80%',
        height: '80%',
        borderRadius: 100,
        backgroundColor: '#ff6d00',
        opacity: 0.1,
    },
    badgeImage: {
        width: '60%',
        height: '60%',
    },
    badgeName: {
        fontSize: 11,
        color: '#FFF',
        textAlign: 'center',
        fontWeight: '500',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 4,
    },
    viewAllText: {
        fontSize: 14,
        color: '#ff6d00',
        fontWeight: '600',
    },
    // Empty state
    emptyContainer: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 32,
        marginHorizontal: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default TrophyCase;
