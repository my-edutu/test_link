// src/screens/NativeFeatureUnavailable.tsx
// Placeholder screen shown when a native feature is not available in Expo Go

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Props {
    featureName: string;
    description?: string;
}

const NativeFeatureUnavailable: React.FC<Props> = ({
    featureName,
    description = 'This feature requires native code and is not available in Expo Go.'
}) => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="construct-outline" size={64} color="#F59E0B" />
                </View>

                <Text style={styles.title}>{featureName}</Text>
                <Text style={styles.subtitle}>Feature Not Available</Text>

                <Text style={styles.description}>{description}</Text>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                    <Text style={styles.infoText}>
                        To use this feature, you need to run a development build with native code support.
                    </Text>
                </View>

                <View style={styles.stepsContainer}>
                    <Text style={styles.stepsTitle}>How to enable:</Text>
                    <View style={styles.step}>
                        <Text style={styles.stepNumber}>1</Text>
                        <Text style={styles.stepText}>Run: npx expo prebuild</Text>
                    </View>
                    <View style={styles.step}>
                        <Text style={styles.stepNumber}>2</Text>
                        <Text style={styles.stepText}>Run: npx expo run:android</Text>
                    </View>
                    <View style={styles.step}>
                        <Text style={styles.stepNumber}>3</Text>
                        <Text style={styles.stepText}>Or use EAS Build for cloud builds</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// Pre-configured placeholder screens for specific features
export const VoiceCallUnavailable: React.FC = () => (
    <NativeFeatureUnavailable
        featureName="Voice Call"
        description="Real-time voice calls with LiveKit require native WebRTC support."
    />
);

export const VideoCallUnavailable: React.FC = () => (
    <NativeFeatureUnavailable
        featureName="Video Call"
        description="Video calls with LiveKit require native WebRTC and camera support."
    />
);

export const LiveStreamUnavailable: React.FC = () => (
    <NativeFeatureUnavailable
        featureName="Live Streaming"
        description="Live streaming with LiveKit requires native WebRTC support."
    />
);

export const LiveViewerUnavailable: React.FC = () => (
    <NativeFeatureUnavailable
        featureName="Live Viewer"
        description="Watching live streams requires native WebRTC support."
    />
);

export const GroupCallUnavailable: React.FC = () => (
    <NativeFeatureUnavailable
        featureName="Group Call"
        description="Group calls with LiveKit require native WebRTC support."
    />
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1F2937',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: width * 0.08,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#F59E0B',
        marginBottom: 16,
    },
    description: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#93C5FD',
        lineHeight: 20,
    },
    stepsContainer: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 32,
    },
    stepsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 12,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FF8A00',
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 24,
        fontSize: 12,
        fontWeight: '600',
    },
    stepText: {
        fontSize: 13,
        color: '#D1D5DB',
        fontFamily: 'monospace',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF8A00',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        gap: 8,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default NativeFeatureUnavailable;
