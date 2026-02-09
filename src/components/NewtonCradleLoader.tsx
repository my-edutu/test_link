import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { Colors } from '../constants/Theme';

interface Props {
    size?: number;
    color?: string;
}

export const NewtonCradleLoader: React.FC<Props> = ({
    size = 50,
    color = Colors.primary
}) => {
    const swing1 = useRef(new Animated.Value(0)).current;
    const swing2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const duration = 1200;

        const animation = Animated.loop(
            Animated.sequence([
                // Dot 1 swings out
                Animated.timing(swing1, {
                    toValue: 1,
                    duration: duration / 4,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                // Dot 1 swings back
                Animated.timing(swing1, {
                    toValue: 0,
                    duration: duration / 4,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
                // Dot 4 swings out
                Animated.timing(swing2, {
                    toValue: 1,
                    duration: duration / 4,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                // Dot 4 swings back
                Animated.timing(swing2, {
                    toValue: 0,
                    duration: duration / 4,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );

        animation.start();
        return () => animation.stop();
    }, [swing1, swing2]);

    const dotSize = size * 0.25;
    const rotation1 = swing1.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '70deg'],
    });
    const rotation2 = swing2.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-70deg'],
    });

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Dot 1 */}
            <Animated.View
                style={[
                    styles.dotContainer,
                    { width: dotSize, transform: [{ rotate: rotation1 }] }
                ]}
            >
                <View style={[styles.dot, { backgroundColor: color, height: dotSize }]} />
            </Animated.View>

            {/* Dot 2 */}
            <View style={[styles.dotContainer, { width: dotSize }]}>
                <View style={[styles.dot, { backgroundColor: color, height: dotSize }]} />
            </View>

            {/* Dot 3 */}
            <View style={[styles.dotContainer, { width: dotSize }]}>
                <View style={[styles.dot, { backgroundColor: color, height: dotSize }]} />
            </View>

            {/* Dot 4 */}
            <Animated.View
                style={[
                    styles.dotContainer,
                    { width: dotSize, transform: [{ rotate: rotation2 }] }
                ]}
            >
                <View style={[styles.dot, { backgroundColor: color, height: dotSize }]} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotContainer: {
        height: '100%',
        alignItems: 'center',
        // transform-origin: top in CSS is effectively the top of the container
    },
    dot: {
        width: '100%',
        borderRadius: 100,
        position: 'absolute',
        bottom: 0, // This puts the dot at the bottom of the "string"
    },
});

export default NewtonCradleLoader;
