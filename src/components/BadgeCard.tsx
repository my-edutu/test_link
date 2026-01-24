import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeCardProps {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    tier?: BadgeTier;
    earnedAt?: string;
    onPress?: () => void;
}

const TIER_COLORS: Record<BadgeTier, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
};

const BadgeCard: React.FC<BadgeCardProps> = ({
    name,
    description,
    imageUrl,
    tier,
    earnedAt,
    onPress,
}) => {
    const tierColor = tier ? TIER_COLORS[tier] : '#ff6d00';

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <TouchableOpacity
            style={[styles.container, { borderColor: tierColor }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Badge Image with Tier Ring */}
            <View style={styles.imageContainer}>
                <View style={[styles.tierRing, { borderColor: tierColor }]}>
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>
                {tier && (
                    <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
                        <Text style={styles.tierText}>{tier.toUpperCase()}</Text>
                    </View>
                )}
            </View>

            {/* Badge Info */}
            <View style={styles.infoContainer}>
                <Text style={styles.name} numberOfLines={1}>
                    {name}
                </Text>
                <Text style={styles.description} numberOfLines={2}>
                    {description}
                </Text>
                {earnedAt && (
                    <Text style={styles.earnedDate}>
                        Earned {formatDate(earnedAt)}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    imageContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    tierRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    image: {
        width: 48,
        height: 48,
    },
    tierBadge: {
        position: 'absolute',
        bottom: -4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    tierText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#1c1022',
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 16,
        marginBottom: 8,
    },
    earnedDate: {
        fontSize: 10,
        color: '#ff6d00',
        fontWeight: '600',
    },
});

export default BadgeCard;
