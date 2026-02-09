
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const { colors, theme } = useTheme();
    const isDark = theme === 'dark';
    const [displayText, setDisplayText] = useState('');
    const fullText = "Lingualink AI";
    const [showCursor, setShowCursor] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current; // Opacity for fade out

    useEffect(() => {
        console.log('[SplashScreen] Starting...');
        let currentIndex = 0;
        const typingInterval = setInterval(() => {
            if (currentIndex <= fullText.length) {
                setDisplayText(fullText.slice(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(typingInterval);
                console.log('[SplashScreen] Typing complete, waiting 1s before finish...');
                // Text typed, wait a bit then finish
                setTimeout(() => {
                    console.log('[SplashScreen] Calling handleFinish...');
                    handleFinish();
                }, 1000); // Wait 1s after typing
            }
        }, 100); // Type speed

        const cursorInterval = setInterval(() => {
            setShowCursor(prev => !prev);
        }, 500);

        // Safety timeout - finish after 5 seconds max
        const safetyTimeout = setTimeout(() => {
            console.log('[SplashScreen] Safety timeout triggered');
            onFinish();
        }, 5000);

        return () => {
            clearInterval(typingInterval);
            clearInterval(cursorInterval);
            clearTimeout(safetyTimeout);
        };
    }, []);

    const handleFinish = () => {
        console.log('[SplashScreen] Starting fade out animation...');
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
        }).start(() => {
            console.log('[SplashScreen] Animation complete, calling onFinish');
            onFinish();
        });
    };

    return (
        <Animated.View style={[
            styles.container,
            {
                backgroundColor: colors.background,
                opacity: fadeAnim
            }
        ]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={styles.textContainer}>
                <Text style={[styles.text, { color: colors.primary }]}>{displayText}</Text>
                <Text style={[styles.cursor, { color: colors.text, opacity: showCursor ? 1 : 0 }]}>|</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    textContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: 1,
    },
    cursor: {
        fontSize: 32,
        fontWeight: '800',
        marginLeft: 2,
    },
});

export default SplashScreen;
