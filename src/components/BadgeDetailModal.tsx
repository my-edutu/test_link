import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Share,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export interface Badge {
    id: string;
    name: string;
    description: string;
    image_url: string;
    category: 'contributor' | 'validator' | 'game' | 'social';
    earned_at?: string;
    tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    criteria?: {
        unlock_reward?: string;
        motivation?: string;
    };
}

interface Props {
    visible: boolean;
    badge: Badge | null;
    onClose: () => void;
}

import CertificateModal from './CertificateModal';

const BadgeDetailModal: React.FC<Props> = ({ visible, badge, onClose }) => {
    const [showCertificate, setShowCertificate] = React.useState(false);

    if (!badge) return null;

    const handleShare = async () => {
        try {
            await Share.share({
                message: `I just earned the ${badge.name} badge on LinguaLink! ${badge.description}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDownload = async () => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to save the certificate.');
            return;
        }

        try {
            const fileUri = FileSystem.documentDirectory + badge.name.replace(/\s+/g, '_') + '.png';
            const { uri } = await FileSystem.downloadAsync(badge.image_url, fileUri);
            await MediaLibrary.createAssetAsync(uri);
            Alert.alert('Saved', 'Certificate saved to your gallery!');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save certificate.');
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not earned yet';
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getTierColor = (tier?: string) => {
        switch (tier?.toLowerCase()) {
            case 'gold': return ['#FFD700', '#FDB931'];
            case 'silver': return ['#E0E0E0', '#BDBDBD'];
            case 'bronze': return ['#CD7F32', '#A0522D'];
            case 'platinum': return ['#E5E4E2', '#A9A9A9'];
            case 'diamond': return ['#B9F2FF', '#00BFFF'];
            default: return ['#ff6d00', '#e65100'];
        }
    };

    const tierColors = getTierColor(badge.tier);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

                <View style={styles.container}>
                    <LinearGradient
                        colors={['rgba(28, 16, 34, 0.95)', 'rgba(20, 10, 25, 0.98)']}
                        style={styles.gradientContainer}
                    >
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <ScrollView contentContainerStyle={styles.content}>
                            <View style={styles.imageContainer}>
                                <View style={[styles.glow, { backgroundColor: tierColors[0] }]} />
                                <Image source={{ uri: badge.image_url }} style={styles.image} resizeMode="contain" />
                                {badge.tier && (
                                    <View style={[styles.tierBadge, { backgroundColor: tierColors[0] }]}>
                                        <Text style={styles.tierText}>{badge.tier.toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.title}>{badge.name}</Text>

                            <View style={styles.categoryBadge}>
                                <Text style={[styles.categoryText, { color: tierColors[0] }]}>
                                    {badge.category.toUpperCase()}
                                </Text>
                            </View>

                            <Text style={styles.description}>{badge.description}</Text>

                            {/* Motivation & Unlock Rewards */}
                            {badge.criteria && (
                                <View style={styles.rewardsContainer}>
                                    {badge.criteria.motivation && (
                                        <View style={styles.rewardItem}>
                                            <Ionicons name="sparkles" size={18} color="#FFD700" />
                                            <Text style={styles.rewardText}>"{badge.criteria.motivation}"</Text>
                                        </View>
                                    )}
                                    {badge.criteria.unlock_reward && (
                                        <View style={styles.rewardItem}>
                                            <Ionicons name="lock-open" size={18} color="#4ADE80" />
                                            <Text style={styles.rewardText}>Unlocks: {badge.criteria.unlock_reward}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={styles.divider} />

                            <View style={styles.footer}>
                                <Text style={styles.earnedLabel}>Earned on</Text>
                                <Text style={styles.earnedDate}>{formatDate(badge.earned_at)}</Text>
                            </View>

                            <View style={styles.actionButtons}>
                                <TouchableOpacity style={[styles.actionButton, { backgroundColor: tierColors[0] }]} onPress={handleShare}>
                                    <Ionicons name="share-social" size={20} color="#FFF" />
                                    <Text style={styles.actionText}>Share</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => setShowCertificate(true)}>
                                    <Ionicons name="document-text-outline" size={20} color="#FFF" />
                                    <Text style={styles.actionText}>View Certificate</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </LinearGradient>
                </View>
            </View>

            <CertificateModal
                visible={showCertificate}
                badge={badge}
                onClose={() => setShowCertificate(false)}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxHeight: '90%',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    gradientContainer: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        alignItems: 'center',
        padding: 32,
        paddingTop: 48,
    },
    imageContainer: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    glow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        opacity: 0.3,
        transform: [{ scale: 1.5 }],
        filter: 'blur(20px)',
    },
    image: {
        width: 120,
        height: 120,
    },
    tierBadge: {
        position: 'absolute',
        bottom: -10,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    tierText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    categoryBadge: {
        marginBottom: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    categoryText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    rewardsContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        gap: 12,
    },
    rewardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rewardText: {
        color: '#FFF',
        fontSize: 14,
        flex: 1,
        fontStyle: 'italic',
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 24,
    },
    footer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    earnedLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    earnedDate: {
        fontSize: 16,
        color: '#FFF',
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        elevation: 6,
    },
    secondaryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    actionText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 8,
    },
});

export default BadgeDetailModal;
