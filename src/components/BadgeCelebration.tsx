import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Image,
    Animated,
    Easing,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface BadgeCelebrationProps {
    visible: boolean;
    badgeName: string;
    badgeDescription: string;
    badgeImageUrl: string;
    onClose: () => void;
}

const BadgeCelebration: React.FC<BadgeCelebrationProps> = ({
    visible,
    badgeName,
    badgeDescription,
    badgeImageUrl,
    onClose,
}) => {
    // Animation values
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(
        Array.from({ length: 20 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            rotate: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    useEffect(() => {
        if (visible) {
            // Reset animations
            scaleAnim.setValue(0);
            rotateAnim.setValue(0);
            opacityAnim.setValue(0);

            // Badge entrance animation
            Animated.sequence([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.parallel([
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 4,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 600,
                        easing: Easing.out(Easing.back(1.5)),
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();

            // Confetti animation
            confettiAnims.forEach((anim, index) => {
                const delay = index * 50;
                const randomX = (Math.random() - 0.5) * width;
                const randomY = height * 0.6 + Math.random() * 200;

                anim.x.setValue(0);
                anim.y.setValue(0);
                anim.rotate.setValue(0);
                anim.opacity.setValue(1);

                Animated.parallel([
                    Animated.timing(anim.x, {
                        toValue: randomX,
                        duration: 1500,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.y, {
                        toValue: randomY,
                        duration: 1500,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.rotate, {
                        toValue: Math.random() * 10,
                        duration: 1500,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.opacity, {
                        toValue: 0,
                        duration: 1500,
                        delay: delay + 1000,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }
    }, [visible]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const confettiColors = ['#ff6d00', '#FFD700', '#00E676', '#2196F3', '#E91E63', '#9C27B0'];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

                {/* Confetti */}
                <View style={styles.confettiContainer} pointerEvents="none">
                    {confettiAnims.map((anim, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.confetti,
                                {
                                    backgroundColor: confettiColors[index % confettiColors.length],
                                    transform: [
                                        { translateX: anim.x },
                                        { translateY: anim.y },
                                        {
                                            rotate: anim.rotate.interpolate({
                                                inputRange: [0, 10],
                                                outputRange: ['0deg', '3600deg'],
                                            }),
                                        },
                                    ],
                                    opacity: anim.opacity,
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* Badge Content */}
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: opacityAnim,
                            transform: [
                                { scale: scaleAnim },
                            ],
                        },
                    ]}
                >
                    {/* Close button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>

                    {/* Celebration Text */}
                    <Text style={styles.celebrationText}>Congratulations!</Text>

                    {/* Badge Image */}
                    <Animated.View
                        style={[
                            styles.badgeContainer,
                            {
                                transform: [{ rotate: spin }],
                            },
                        ]}
                    >
                        <View style={styles.badgeGlow} />
                        <View style={styles.badgeRing}>
                            <Image
                                source={{ uri: badgeImageUrl }}
                                style={styles.badgeImage}
                                resizeMode="contain"
                            />
                        </View>
                    </Animated.View>

                    {/* Badge Info */}
                    <Text style={styles.badgeName}>{badgeName}</Text>
                    <Text style={styles.badgeDescription}>{badgeDescription}</Text>

                    {/* Action Button */}
                    <TouchableOpacity style={styles.viewButton} onPress={onClose}>
                        <Text style={styles.viewButtonText}>View Badge</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    confettiContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 100,
    },
    confetti: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    content: {
        width: width * 0.85,
        backgroundColor: '#1c1022',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,109,0,0.3)',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    celebrationText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFD700',
        marginBottom: 24,
        textAlign: 'center',
    },
    badgeContainer: {
        position: 'relative',
        width: 150,
        height: 150,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    badgeGlow: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#ff6d00',
        opacity: 0.3,
    },
    badgeRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#FFD700',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    badgeImage: {
        width: 80,
        height: 80,
    },
    badgeName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    badgeDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    viewButton: {
        backgroundColor: '#ff6d00',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 25,
        shadowColor: '#ff6d00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    viewButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default BadgeCelebration;
