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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const SLIDES = [
    {
        id: '1',
        headerTitle: 'AMPLIFY YOUR VOICE',
        headline: 'Preserve Our',
        highlight: 'Heritage',
        body: 'Your voice is powerful. Join thousands of Nigerians preserving our local languages for the future.',
        image: require('../../assets/sketch_mic.png'),
        showHeaderHelp: true,
        showSkip: false,
    },
    {
        id: '2',
        headerTitle: '',
        headline: 'Connect with',
        highlight: 'Your People',
        body: 'Find friends who speak your dialect. Challenge them, share recordings, and celebrate your roots.',
        image: require('../../assets/sketch_community.png'),
        tag: 'COMMUNITY & CULTURE',
        showSkip: true,
    },
    {
        id: '3',
        headerTitle: 'LinguaLink',
        headline: 'Get',
        highlight: 'Rewarded',
        body: 'Climb the leaderboards, earn points for every recording, and unlock exclusive rewards.',
        image: require('../../assets/sketch_reward.png'),
        showBack: true,
    }
];

export default function ModernOnboarding() {
    const navigation = useNavigation<any>();
    const { colors, theme } = useTheme();
    const { width } = useWindowDimensions();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const styles = useMemo(() => createStyles(colors, width), [colors, width]);

    const handleScroll = useCallback((event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
            setCurrentIndex(index);
        }
    }, [width, currentIndex]);

    const goToSlide = useCallback((index: number) => {
        scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
        setCurrentIndex(index);
    }, [width]);

    const nextSlide = useCallback(() => {
        console.log('Next button pressed, currentIndex:', currentIndex);
        if (currentIndex < SLIDES.length - 1) {
            goToSlide(currentIndex + 1);
        } else {
            navigation.navigate('ModernAuthLanding');
        }
    }, [currentIndex, goToSlide, navigation]);

    const prevSlide = useCallback(() => {
        if (currentIndex > 0) {
            goToSlide(currentIndex - 1);
        }
    }, [currentIndex, goToSlide]);

    const currentSlide = SLIDES[currentIndex];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style={theme === 'dark' ? "light" : "dark"} />

            {/* Dynamic Header */}
            <View style={styles.header}>
                {currentSlide.showBack ? (
                    <TouchableOpacity onPress={prevSlide} style={styles.iconBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}

                <Text style={styles.headerTitle}>{currentSlide.headerTitle}</Text>

                {currentSlide.showHeaderHelp && (
                    <TouchableOpacity style={styles.iconBtn}>
                        <MaterialIcons name="help-outline" size={20} color={colors.text} />
                    </TouchableOpacity>
                )}

                {currentSlide.showSkip && (
                    <TouchableOpacity onPress={() => navigation.navigate('ModernAuthLanding')} style={styles.skipBtn}>
                        <Text style={styles.skipText}>SKIP</Text>
                    </TouchableOpacity>
                )}

                {!currentSlide.showHeaderHelp && !currentSlide.showSkip && (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {/* Slides using ScrollView instead of FlatList for better web support */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={{ flex: 1 }}
                contentContainerStyle={{ width: width * SLIDES.length }}
            >
                {SLIDES.map((item, index) => (
                    <View key={item.id} style={[styles.slide, { width }]}>
                        <View style={styles.imageContainer}>
                            <Image
                                source={item.image}
                                style={styles.heroImage}
                                resizeMode="contain"
                            />
                            <View style={styles.glow} />
                        </View>

                        <View style={styles.textContainer}>
                            <Text style={styles.headline}>
                                {item.headline} <Text style={{ color: colors.primary }}>{item.highlight}</Text>
                            </Text>
                            <Text style={styles.body}>
                                {item.body}
                            </Text>

                            {item.tag && (
                                <View style={styles.tagContainer}>
                                    <MaterialIcons name="verified" size={16} color={colors.primary} />
                                    <Text style={styles.tagText}>{item.tag}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.dots}>
                    {SLIDES.map((_, index) => (
                        <TouchableOpacity
                            key={index}
                            onPress={() => goToSlide(index)}
                            style={[
                                styles.dot,
                                currentIndex === index && styles.activeDot,
                                { backgroundColor: currentIndex === index ? colors.primary : colors.border }
                            ]}
                        />
                    ))}
                </View>

                {/* Main Action Button */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.btn, currentIndex === SLIDES.length - 1 && styles.btnGradient]}
                    onPress={nextSlide}
                >
                    {currentIndex === SLIDES.length - 1 ? (
                        <LinearGradient
                            colors={[colors.primary, '#FFD700']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientBtn}
                        >
                            <Text style={styles.btnText}>Get Started</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="white" />
                        </LinearGradient>
                    ) : (
                        <View style={styles.nextBtnContent}>
                            <Text style={styles.btnText}>Next</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="white" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Sign In Link */}
                {currentIndex === 0 && (
                    <TouchableOpacity onPress={() => navigation.navigate('ModernAuthLanding')} style={{ marginTop: 10 }}>
                        <Text style={styles.subText}>Already have an account? <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Sign In</Text></Text>
                    </TouchableOpacity>
                )}
                {currentIndex !== 0 && (
                    <View style={{ height: 28 }} />
                )}
            </View>
        </SafeAreaView>
    );
}

const createStyles = (colors: any, width: number) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, height: 60 },
    headerTitle: { color: colors.text, fontSize: 14, fontWeight: 'bold', letterSpacing: 1, textAlign: 'center', flex: 1 },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    skipBtn: { paddingHorizontal: 16, paddingVertical: 8 },
    skipText: { color: colors.primary, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },

    slide: { flex: 1, justifyContent: 'space-between', paddingBottom: 10 },

    imageContainer: { flex: 1.2, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    heroImage: { width: width * 0.6, height: width * 0.6, zIndex: 10 },
    glow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: colors.primary, opacity: 0.1 },

    textContainer: {
        paddingHorizontal: 32,
        alignItems: 'center',
        gap: 12,
        marginTop: 10,
        justifyContent: 'flex-end',
        flex: 0.8
    },
    headline: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
    body: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, paddingBottom: 16 },

    tagContainer: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, marginBottom: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    tagText: { color: colors.textSecondary, fontSize: 10, letterSpacing: 1, fontWeight: 'bold' },

    footer: { padding: 24, paddingBottom: 30, gap: 16, alignItems: 'center', justifyContent: 'flex-end' },
    dots: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    activeDot: { width: 28 },

    btn: {
        backgroundColor: colors.primary,
        height: 56, width: '100%',
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    nextBtnContent: {
        flex: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    btnGradient: {
        backgroundColor: 'transparent',
    },
    gradientBtn: {
        flex: 1, width: '100%', height: '100%',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    subText: { color: colors.textSecondary, textAlign: 'center', fontSize: 14 }
});
