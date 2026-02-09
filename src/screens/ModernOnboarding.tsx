import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    useWindowDimensions,
    Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';

import { Colors, Gradients, Typography, Layout } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from '../components/GlassCard';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Share Your',
        highlight: 'Voice',
        content: 'Record and share phrases in your native language or dialect.',
        icon: 'mic-outline',
        color: '#FF8A00'
    },
    {
        id: '2',
        title: 'Create AI',
        highlight: 'Stories',
        content: 'Turn your voice into animated stories and cultural tales.',
        icon: 'sparkles-outline',
        color: '#FF8A00'
    },
    {
        id: '3',
        title: 'Preserve',
        highlight: 'Culture',
        content: 'Help build the world\'s largest archive of living languages.',
        icon: 'globe-outline',
        color: '#FF8A00'
    },
    {
        id: '4',
        title: 'Earn and',
        highlight: 'Learn',
        content: 'Get rewarded for contributions and discover new languages.',
        icon: 'gift-outline',
        color: '#FF8A00'
    }
];

export default function ModernOnboarding() {
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();
    const { colors, isDark } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useSharedValue(0);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleScroll = (event: any) => {
        scrollX.value = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollX.value / width);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

    const nextSlide = async () => {
        if (currentIndex < SLIDES.length - 1) {
            scrollViewRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
        } else {
            await AsyncStorage.setItem('HAS_SEEN_ONBOARDING', 'true');
            navigation.navigate('ModernAuthLanding');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />

            {isDark && (
                <LinearGradient
                    colors={['#1F0802', '#0D0200']}
                    style={StyleSheet.absoluteFill}
                />
            )}

            <View style={styles.topCurve}>
                <LinearGradient
                    colors={Gradients.glow}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            <View style={{ position: 'absolute', top: 60, width: '100%', alignItems: 'center', zIndex: 10 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 2 }}>
                    Lingualink <Text style={{ color: colors.primary }}>AI</Text>
                </Text>
            </View>

            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ width: width * SLIDES.length }}
            >
                {SLIDES.map((slide, index) => (
                    <Slide key={slide.id} slide={slide} index={index} scrollX={scrollX} width={width} themeColors={colors} />
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.pagination}>
                    {SLIDES.map((_, i) => {
                        const dotStyle = useAnimatedStyle(() => {
                            const dotWidth = interpolate(
                                scrollX.value,
                                [(i - 1) * width, i * width, (i + 1) * width],
                                [10, 30, 10],
                                Extrapolate.CLAMP
                            );
                            const opacity = interpolate(
                                scrollX.value,
                                [(i - 1) * width, i * width, (i + 1) * width],
                                [0.3, 1, 0.3],
                                Extrapolate.CLAMP
                            );
                            return { width: dotWidth, opacity };
                        });
                        return <Animated.View key={i} style={[styles.dot, dotStyle, { backgroundColor: colors.primary }]} />;
                    })}
                </View>

                <TouchableOpacity activeOpacity={0.9} onPress={nextSlide} style={[styles.nextButton, { shadowColor: colors.primary }]}>
                    <LinearGradient
                        colors={Gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.buttonText}>
                            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                        <MaterialIcons
                            name={currentIndex === SLIDES.length - 1 ? 'rocket-launch' : 'arrow-forward'}
                            size={20}
                            color="white"
                        />
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={async () => {
                        await AsyncStorage.setItem('HAS_SEEN_ONBOARDING', 'true');
                        navigation.navigate('ModernAuthLanding');
                    }}
                    style={styles.skipContainer}
                >
                    <Text style={[styles.skipText, { color: colors.textMuted }]}>SKIP TO LOGIN</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const Slide = ({ slide, index, scrollX, width, themeColors }: any) => {
    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollX.value,
            [(index - 0.5) * width, index * width, (index + 0.5) * width],
            [0, 1, 0],
            Extrapolate.CLAMP
        );
        const scale = interpolate(
            scrollX.value,
            [(index - 1) * width, index * width, (index + 1) * width],
            [0.8, 1, 0.8],
            Extrapolate.CLAMP
        );
        return { opacity, transform: [{ scale }] };
    });

    return (
        <View style={[styles.slide, { width }]}>
            <Animated.View style={[styles.visualContainer, animatedStyle]}>
                <View style={styles.iconCircle}>
                    <Ionicons name={slide.icon} size={80} color={themeColors.primary} />
                    <View style={[styles.iconGlow, { backgroundColor: themeColors.primary }]} />
                </View>
            </Animated.View>

            <GlassCard style={styles.textCard} intensity={30} borderColor={themeColors.glassBorder}>
                <Text style={[styles.title, { color: themeColors.text }]}>
                    {slide.title} <Text style={{ color: themeColors.primary }}>{slide.highlight}</Text>
                </Text>
                <Text style={[styles.body, { color: themeColors.textSecondary }]}>{slide.content}</Text>
            </GlassCard>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topCurve: {
        position: 'absolute',
        top: -100,
        left: 0,
        right: 0,
        height: 400,
        opacity: 0.2,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    visualContainer: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255, 138, 0, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 138, 0, 0.2)',
    },
    iconGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        opacity: 0.1,
        zIndex: -1,
    },
    textCard: {
        padding: 32,
        width: '100%',
        marginTop: 20,
    },
    title: {
        ...Typography.h1,
        textAlign: 'center',
        marginBottom: 16,
    },
    body: {
        ...Typography.body,
        textAlign: 'center',
        lineHeight: 26,
    },
    footer: {
        padding: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row',
        height: 10,
        marginBottom: 32,
        gap: 8,
    },
    dot: {
        height: 10,
        borderRadius: 5,
    },
    nextButton: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    buttonText: {
        ...Typography.h3,
        color: 'white',
    },
    skipContainer: {
        marginTop: 20,
    },
    skipText: {
        ...Typography.caption,
        letterSpacing: 2,
    }
});
