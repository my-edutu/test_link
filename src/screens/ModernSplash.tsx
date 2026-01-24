import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function ModernSplash() {
    const navigation = useNavigation<any>();
    const pulseAnim = useRef(new Animated.Value(1)).current;
    // Loading bar animation value (0 to 1)
    const progressAnim = useRef(new Animated.Value(0)).current;

    const { colors, theme } = useTheme();

    const styles = useMemo(() => createStyles(colors), [colors]);

    useEffect(() => {
        // Pulse animation loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();

        // Progress bar animation
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 3000, // 3 seconds load time
            useNativeDriver: false, // width change requires false
        }).start();

        // Navigate after 3 seconds
        const timer = setTimeout(() => {
            navigation.replace('ModernOnboarding');
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <StatusBar style={theme === 'dark' ? "light" : "dark"} />

            {/* Background Decor */}
            <View style={[styles.glowBlob, { top: -100, left: -100, backgroundColor: colors.primary }]} />
            <View style={[styles.glowBlob, { bottom: -100, right: -100, backgroundColor: colors.secondary }]} />

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <View style={styles.iconBox}>
                        <MaterialIcons name="language" size={48} color={colors.primary} />
                        <View style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: colors.primary,
                                opacity: 0.2,
                                borderRadius: 24,
                                zIndex: -1
                            }
                        ]} />
                    </View>
                    <Text style={styles.title}>Lingua<Text style={styles.titleHigh}>Link</Text></Text>
                </View>

                {/* Animated Waveform */}
                <View style={styles.waveformContainer}>
                    {[0.4, 0.7, 0.5, 1.0, 0.6, 0.8, 0.5].map((h, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.bar,
                                {
                                    height: 60 * h,
                                    transform: [{ scaleY: pulseAnim }],
                                    backgroundColor: i % 2 === 0 ? colors.primary : colors.secondary
                                }
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.footer}>
                    <View style={styles.progressLabel}>
                        <Text style={styles.loadingText}>Initializing heritage engine...</Text>
                    </View>

                    {/* Actual Loading Bar Container */}
                    <View style={styles.progressBarBg}>
                        <Animated.View style={{ width: progressWidth, height: '100%', borderRadius: 4, overflow: 'hidden' }}>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>
                    </View>

                    <View style={styles.iconsRow}>
                        <MaterialIcons name="graphic-eq" size={14} color={colors.textSecondary} />
                        <MaterialIcons name="translate" size={14} color={colors.textSecondary} />
                        <MaterialIcons name="mic" size={14} color={colors.textSecondary} />
                    </View>
                </View>
            </View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
    glowBlob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.15 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 80, paddingHorizontal: 20 },
    logoContainer: { alignItems: 'center', gap: 16 },
    iconBox: {
        width: 80, height: 80,
        backgroundColor: colors.secondary,
        borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    title: { fontSize: 32, fontWeight: 'bold', color: colors.text, letterSpacing: -1 },
    titleHigh: { color: colors.primary },
    waveformContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 60 },
    bar: { width: 6, borderRadius: 3 },

    footer: { width: '100%', maxWidth: 300, gap: 12 },
    progressLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    loadingText: { fontSize: 12, color: colors.textSecondary, fontFamily: 'System' },
    progressBarBg: {
        height: 6,
        backgroundColor: colors.card,
        borderRadius: 3,
        overflow: 'hidden',
    },
    iconsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8, opacity: 0.5 },
});
