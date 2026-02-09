import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '../context/NotificationProvider';
import { getNavigationFromNotification, NotificationData } from '../services/notifications';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 80;
const ANIMATION_DURATION = 300;
const DISPLAY_DURATION = 4000;

interface BannerNotification {
    id: string;
    title: string;
    body: string;
    data?: NotificationData;
}

interface InAppNotificationBannerProps {
    navigationRef?: any;
}

const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({ navigationRef }) => {
    const [bannerNotification, setBannerNotification] = useState<BannerNotification | null>(null);
    const translateY = useRef(new Animated.Value(-BANNER_HEIGHT - 50)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const insets = useSafeAreaInsets();
    const { notification } = useNotifications();

    // Listen for foreground notifications
    useEffect(() => {
        if (notification) {
            const content = notification.request.content;
            showBanner({
                id: notification.request.identifier,
                title: content.title || 'Notification',
                body: content.body || '',
                data: content.data as NotificationData,
            });
        }
    }, [notification]);

    const showBanner = (notif: BannerNotification) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setBannerNotification(notif);

        // Animate in
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: ANIMATION_DURATION,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: ANIMATION_DURATION,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-hide after duration
        timeoutRef.current = setTimeout(() => {
            hideBanner();
        }, DISPLAY_DURATION);
    };

    const hideBanner = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -BANNER_HEIGHT - 50,
                duration: ANIMATION_DURATION,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: ANIMATION_DURATION,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setBannerNotification(null);
        });
    };

    const handlePress = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (bannerNotification?.data && navigationRef?.isReady?.()) {
            const navigationTarget = getNavigationFromNotification(bannerNotification.data);
            if (navigationTarget) {
                hideBanner();
                try {
                    navigationRef.navigate(navigationTarget.screen, navigationTarget.params);
                } catch (error) {
                    console.error('Navigation error from banner:', error);
                }
            } else {
                hideBanner();
            }
        } else {
            hideBanner();
        }
    };

    const handleDismiss = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        hideBanner();
    };

    const getCategoryIcon = (data?: NotificationData): keyof typeof Ionicons.glyphMap => {
        const screen = data?.screen;
        switch (screen) {
            case 'chat':
                return 'chatbubble';
            case 'wallet':
                return 'wallet';
            case 'clip':
                return 'musical-notes';
            case 'profile':
                return 'person';
            default:
                return 'notifications';
        }
    };

    const getCategoryColor = (data?: NotificationData): string => {
        const screen = data?.screen;
        switch (screen) {
            case 'chat':
                return '#3B82F6';
            case 'wallet':
                return '#10B981';
            case 'clip':
                return '#FF8A00';
            case 'profile':
                return '#8B5CF6';
            default:
                return '#FF8A00';
        }
    };

    if (!bannerNotification) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY }],
                    opacity,
                    paddingTop: insets.top + 8,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.banner}
                onPress={handlePress}
                activeOpacity={0.9}
            >
                <View
                    style={[
                        styles.iconContainer,
                        { backgroundColor: getCategoryColor(bannerNotification.data) + '20' },
                    ]}
                >
                    <Ionicons
                        name={getCategoryIcon(bannerNotification.data)}
                        size={24}
                        color={getCategoryColor(bannerNotification.data)}
                    />
                </View>

                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={1}>
                        {bannerNotification.title}
                    </Text>
                    <Text style={styles.body} numberOfLines={2}>
                        {bannerNotification.body}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleDismiss}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 12,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    body: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    closeButton: {
        padding: 4,
    },
});

export default InAppNotificationBanner;
