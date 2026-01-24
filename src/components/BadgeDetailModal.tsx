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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

export interface Badge {
    id: string;
    name: string;
    description: string;
    image_url: string;
    category: 'contributor' | 'validator' | 'game' | 'social';
    earned_at?: string;
}

interface Props {
    visible: boolean;
    badge: Badge | null;
    onClose: () => void;
}

const BadgeDetailModal: React.FC<Props> = ({ visible, badge, onClose }) => {
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

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

                <View style={styles.container}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.content}>
                        <View style={styles.imageContainer}>
                            <View style={styles.glow} />
                            <Image source={{ uri: badge.image_url }} style={styles.image} resizeMode="contain" />
                        </View>

                        <Text style={styles.title}>{badge.name}</Text>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{badge.category.toUpperCase()}</Text>
                        </View>

                        <Text style={styles.description}>{badge.description}</Text>

                        <View style={styles.divider} />

                        <View style={styles.footer}>
                            <Text style={styles.earnedLabel}>Earned on</Text>
                            <Text style={styles.earnedDate}>{formatDate(badge.earned_at)}</Text>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                                <Ionicons name="share-social" size={20} color="#FFF" />
                                <Text style={styles.actionText}>Share</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleDownload}>
                                <Ionicons name="download-outline" size={20} color="#FFF" />
                                <Text style={styles.actionText}>Save Certificate</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.85,
        backgroundColor: '#1c1022',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
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
    },
    imageContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    glow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#ff6d00',
        opacity: 0.2,
        transform: [{ scale: 1.5 }],
    },
    image: {
        width: 100,
        height: 100,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(255,109,0,0.15)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,109,0,0.3)',
        marginBottom: 16,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ff6d00',
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 24,
    },
    footer: {
        alignItems: 'center',
        marginBottom: 24,
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
        backgroundColor: '#ff6d00',
        paddingVertical: 14,
        borderRadius: 30,
        elevation: 6,
    },
    secondaryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    actionText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 8,
    },
});

export default BadgeDetailModal;
