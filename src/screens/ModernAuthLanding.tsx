import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthProvider';
import { Colors, Gradients, Typography, Layout } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';

const { width } = Dimensions.get('window');

export default function ModernAuthLanding() {
    const navigation = useNavigation<any>();
    const { signInWithGoogle, signInWithApple } = useAuth();

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#1F0802', '#0D0200']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialIcons name="chevron-left" size={28} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Animated.View
                    entering={FadeInUp && FadeInUp.delay ? FadeInUp.delay(200).duration(800) : undefined}
                    style={styles.heroSection}
                >
                    <View style={styles.iconBox}>
                        <MaterialIcons name="language" size={48} color={Colors.dark.primary} />
                        <View style={styles.iconGlow} />
                    </View>
                    <Text style={styles.title}>Join <Text style={{ color: Colors.dark.primary }}>Lingualink</Text></Text>
                    <Text style={styles.subtitle}>Secure your heritage and connect with your roots today.</Text>
                </Animated.View>

                <Animated.View
                    entering={FadeInDown && FadeInDown.delay ? FadeInDown.delay(400).duration(800) : undefined}
                    style={styles.authActions}
                >
                    <GlassCard style={styles.socialCard} intensity={25}>
                        <TouchableOpacity
                            style={styles.socialBtn}
                            onPress={async () => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                await signInWithGoogle();
                            }}
                        >
                            <Ionicons name="logo-google" size={24} color="white" />
                            <Text style={styles.socialText}>Continue with Google</Text>
                        </TouchableOpacity>
                    </GlassCard>

                    <GlassCard style={styles.socialCard} intensity={25}>
                        <TouchableOpacity
                            style={styles.socialBtn}
                            onPress={async () => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                await signInWithApple();
                            }}
                        >
                            <Ionicons name="logo-apple" size={24} color="white" />
                            <Text style={styles.socialText}>Continue with Apple</Text>
                        </TouchableOpacity>
                    </GlassCard>

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.dividerText}>OR USE EMAIL</Text>
                        <View style={styles.line} />
                    </View>

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.navigate('SignUp');
                        }}
                    >
                        <LinearGradient
                            colors={Gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnText}>Create Account</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="white" />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginContainer}
                        onPress={() => navigation.navigate('SignIn')}
                    >
                        <Text style={styles.loginText}>
                            Already have an account? <Text style={styles.loginHighlight}>Log In</Text>
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.legalText}>
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D0200' },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    content: {
        flex: 1,
        paddingHorizontal: 32,
        justifyContent: 'center',
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 48,
    },
    iconBox: {
        width: 88,
        height: 88,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 138, 0, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 138, 0, 0.2)',
        marginBottom: 24,
    },
    iconGlow: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.dark.primary,
        opacity: 0.1,
        zIndex: -1,
    },
    title: {
        ...Typography.h1,
        color: 'white',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        ...Typography.body,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        lineHeight: 24,
    },
    authActions: {
        gap: 20,
    },
    socialCard: {
        padding: 0,
        borderRadius: 28,
    },
    socialBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: 56,
    },
    socialText: {
        ...Typography.h3,
        fontSize: 16,
        color: 'white',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 10,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dividerText: {
        ...Typography.caption,
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.3)',
        letterSpacing: 1,
    },
    primaryBtn: {
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    btnText: {
        ...Typography.h3,
        fontSize: 18,
        color: 'white',
    },
    loginContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    loginText: {
        ...Typography.body,
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    loginHighlight: {
        color: Colors.dark.primary,
        fontWeight: '800',
    },
    footer: {
        padding: 32,
    },
    legalText: {
        ...Typography.caption,
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.3)',
        textAlign: 'center',
        lineHeight: 18,
    }
});
