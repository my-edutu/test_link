import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { Colors, Gradients, Typography, Layout } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';

const { width } = Dimensions.get('window');

export default function PermissionBridgeScreen() {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);

    const requestPermissions = async () => {
        setLoading(true);
        try {
            // 1. Microphone (Required for recording)
            await Audio.requestPermissionsAsync();

            // 2. Camera (Required for stories/calls)
            await Camera.requestCameraPermissionsAsync();

            // 3. Notifications (Required for community)
            await Notifications.requestPermissionsAsync();

            // 4. Location (Optional but recommended for local dialects)
            await Location.requestForegroundPermissionsAsync();

            // Move to profile setup
            navigation.navigate('ModernProfileSetup');
        } catch (error) {
            console.warn('Permission request failed', error);
            navigation.navigate('ModernProfileSetup'); // Continue anyway, handle gracefully in features
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#1F0802', '#0D0200']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeIn.duration(1000)} style={styles.imageSection}>
                    <View style={styles.iconVibe}>
                        <MaterialIcons name="security" size={64} color={Colors.dark.primary} />
                        <View style={styles.vibeGlow} />
                    </View>
                </Animated.View>

                <Animated.View entering={SlideInDown.delay(300).duration(800)} style={styles.textSection}>
                    <Text style={styles.title}>Your Privacy, <Text style={{ color: Colors.dark.primary }}>Our Priority</Text></Text>
                    <Text style={styles.body}>
                        To preserve your heritage and connect with the community, LinguaLink needs access to some core features.
                    </Text>

                    <View style={styles.permissionList}>
                        <PermissionItem
                            icon="mic"
                            title="Microphone"
                            desc="To record your voice and preserve unique pronunciations."
                        />
                        <PermissionItem
                            icon="videocam"
                            title="Camera"
                            desc="To share stories and participate in video challenges."
                        />
                        <PermissionItem
                            icon="notifications"
                            title="Notifications"
                            desc="To keep you updated on community challenges and rewards."
                        />
                    </View>
                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={requestPermissions}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={Gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientBtn}
                    >
                        <Text style={styles.btnText}>{loading ? 'Setting up...' : 'Allow Access & Continue'}</Text>
                        {!loading && <MaterialIcons name="chevron-right" size={24} color="white" />}
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ModernProfileSetup')}>
                    <Text style={styles.skipText}>I'LL DO THIS LATER</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const PermissionItem = ({ icon, title, desc }: any) => (
    <GlassCard style={styles.card} intensity={20}>
        <View style={styles.cardRow}>
            <View style={styles.iconBox}>
                <MaterialIcons name={icon} size={24} color={Colors.dark.primary} />
            </View>
            <View style={styles.cardText}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemDesc}>{desc}</Text>
            </View>
        </View>
    </GlassCard>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0200' },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 80,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconVibe: {
        width: 120,
        height: 120,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 138, 0, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 138, 0, 0.2)',
    },
    vibeGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.dark.primary,
        opacity: 0.1,
        zIndex: -1,
    },
    textSection: {
        gap: 16,
    },
    title: {
        ...Typography.h1,
        color: 'white',
        textAlign: 'center',
    },
    body: {
        ...Typography.body,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        marginBottom: 20,
    },
    permissionList: {
        gap: 12,
    },
    card: {
        padding: 16,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardText: {
        flex: 1,
    },
    itemTitle: {
        ...Typography.h3,
        fontSize: 16,
        color: 'white',
        marginBottom: 4,
    },
    itemDesc: {
        ...Typography.caption,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        lineHeight: 18,
        textTransform: 'none',
    },
    footer: {
        padding: 24,
        paddingBottom: 40,
        alignItems: 'center',
        gap: 20,
    },
    actionBtn: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
    },
    gradientBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    btnText: {
        ...Typography.h3,
        color: 'white',
    },
    skipText: {
        ...Typography.caption,
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 2,
    }
});
