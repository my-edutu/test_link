import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing
} from 'react-native-reanimated';
import { Colors, Gradients, Layout } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';

interface PulseMicProps {
    onPress: () => void;
}

export const PulseMic: React.FC<PulseMicProps> = ({ onPress }) => {
    // Shared values for the pulse animation
    const scale = useSharedValue(1);

    useEffect(() => {
        // Create a continuous breathing effect
        scale.value = withRepeat(
            withTiming(1.1, {
                duration: 1500,
                easing: Easing.inOut(Easing.ease)
            }),
            -1, // Infinite
            true // Reverse (breathe in, breathe out)
        );
    }, []);

    const animatedRingStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: (scale.value - 1) * 3, // Opacity increases as it expands? No, let's keep it simple.
    }));

    // Better logic: Pulse the outer ring
    const ringScale = useSharedValue(1);
    const ringOpacity = useSharedValue(0.6);

    useEffect(() => {
        ringScale.value = withRepeat(
            withTiming(1.5, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1,
            false // Don't reverse, just restart
        );
        ringOpacity.value = withRepeat(
            withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
            -1,
            false
        );
    }, []);

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ringScale.value }],
        opacity: ringOpacity.value,
    }));

    return (
        <View style={styles.wrapper}>
            {/* Outer Ripple Ring */}
            <Animated.View style={[styles.ring, ringStyle]} />

            {/* Main Gradient Button */}
            <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.buttonContainer}>
                <LinearGradient
                    colors={Gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    <MaterialIcons name="mic" size={40} color="white" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
    },
    buttonContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        elevation: 8,
        shadowColor: Colors.dark.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    gradient: {
        width: '100%',
        height: '100%',
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    ring: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.dark.primary,
        zIndex: -1,
    }
});
