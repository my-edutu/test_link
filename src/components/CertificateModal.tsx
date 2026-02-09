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
import { LinearGradient } from 'expo-linear-gradient';
import { Badge } from './BadgeDetailModal';
import { useAuth } from '../context/AuthProvider';

const { width, height } = Dimensions.get('window');

interface Props {
    visible: boolean;
    badge: Badge | null;
    onClose: () => void;
}

const CertificateModal: React.FC<Props> = ({ visible, badge, onClose }) => {
    const { user } = useAuth();
    const userName = user?.user_metadata?.full_name || 'LinguaLink Member';
    const date = badge?.earned_at ? new Date(badge.earned_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }) : new Date().toLocaleDateString();

    if (!badge) return null;

    const handleShare = async () => {
        try {
            await Share.share({
                message: `I have been certified as a ${badge.name} on LinguaLink AI! 🎓 Check out my achievement.`,
                title: 'LinguaLink Certificate',
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

                <View style={styles.certificateContainer}>
                    {/* Gold Border Frame */}
                    <LinearGradient
                        colors={['#C5A059', '#E6C682', '#C5A059']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.borderGradient}
                    >
                        <View style={styles.certificateContent}>
                            {/* Background Watermark */}
                            <View style={styles.watermarkContainer}>
                                <Ionicons name="school" size={200} color="rgba(0,0,0,0.03)" />
                            </View>

                            {/* Header */}
                            <View style={styles.header}>
                                <Image
                                    source={require('../../assets/icon.png')} // Fallback if logo invalid, but assuming it exists
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                                <Text style={styles.appTitle}>LINGUALINK AI</Text>
                                <Text style={styles.certificateTitle}>CERTIFICATE OF ACHIEVEMENT</Text>
                            </View>

                            <Text style={styles.presentText}>This certifies that</Text>

                            {/* User Name */}
                            <Text style={styles.nameText}>{userName}</Text>

                            <View style={styles.divider} />

                            <Text style={styles.bodyText}>Has successfully demonstrated excellence and dedication by earning the prestigious badge</Text>

                            {/* Badge Highlight */}
                            <View style={styles.badgeHighlight}>
                                <Image source={{ uri: badge.image_url }} style={styles.badgeImage} resizeMode="contain" />
                                <Text style={styles.badgeName}>{badge.name}</Text>
                            </View>

                            {/* Footer / Signatures */}
                            <View style={styles.footer}>
                                <View style={styles.signatureBlock}>
                                    <Text style={styles.dateText}>{date}</Text>
                                    <View style={styles.line} />
                                    <Text style={styles.label}>Date Certified</Text>
                                </View>

                                {/* Simulated Signature */}
                                <View style={styles.signatureBlock}>
                                    <Text style={styles.signatureText}>LinguaLink</Text>
                                    <View style={styles.line} />
                                    <Text style={styles.label}>Authorized Signature</Text>
                                </View>
                            </View>

                            {/* Seal */}
                            <View style={styles.seal}>
                                <Ionicons name="ribbon" size={50} color="#C5A059" />
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                        <LinearGradient
                            colors={['#FF8A00', '#FF5500']}
                            style={StyleSheet.absoluteFill}
                        />
                        <Ionicons name="share-social" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.shareButtonText}>Share Certificate</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 20,
    },
    certificateContainer: {
        width: '100%',
        aspectRatio: 0.75, // Portrait certificate
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    borderGradient: {
        flex: 1,
        padding: 3, // Border width
        borderRadius: 12,
    },
    certificateContent: {
        flex: 1,
        backgroundColor: '#FAF9F6', // Off-white paper color
        padding: 24,
        borderRadius: 9, // Inner radius
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    watermarkContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
    header: {
        alignItems: 'center',
        marginTop: 10,
    },
    logo: {
        width: 40,
        height: 40,
        marginBottom: 8,
    },
    appTitle: {
        fontSize: 14,
        letterSpacing: 3,
        fontWeight: '600',
        color: '#555',
        marginBottom: 20,
    },
    certificateTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1c1022',
        fontFamily: 'serif',
        textAlign: 'center',
        letterSpacing: 1,
    },
    presentText: {
        fontSize: 14,
        color: '#666',
        marginTop: 20,
        fontStyle: 'italic',
    },
    nameText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#C5A059',
        marginVertical: 10,
        textAlign: 'center',
        fontFamily: 'serif',
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: '#C5A059',
        marginVertical: 10,
    },
    bodyText: {
        fontSize: 14,
        color: '#444',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    badgeHighlight: {
        alignItems: 'center',
        marginVertical: 15,
    },
    badgeImage: {
        width: 70,
        height: 70,
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1c1022',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
        alignItems: 'flex-end',
        gap: 20,
    },
    signatureBlock: {
        alignItems: 'center',
        flex: 1,
    },
    dateText: {
        fontSize: 14,
        marginBottom: 4,
        color: '#000',
        fontWeight: '600',
    },
    signatureText: {
        fontSize: 16,
        fontFamily: 'serif',
        fontStyle: 'italic',
        marginBottom: 4,
        color: '#000',
    },
    line: {
        width: '100%',
        height: 1,
        backgroundColor: '#999',
        marginBottom: 4,
    },
    label: {
        fontSize: 10,
        color: '#888',
        textTransform: 'uppercase',
    },
    seal: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        opacity: 0.2,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 30,
        width: '100%',
        justifyContent: 'space-between',
        maxWidth: 400,
        gap: 16,
    },
    closeButton: {
        flex: 1,
        padding: 16,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    closeButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    shareButton: {
        flex: 2,
        padding: 16,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        overflow: 'hidden',
    },
    shareButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CertificateModal;
