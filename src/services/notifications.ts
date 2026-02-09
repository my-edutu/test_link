import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { API_BASE_URL as API_URL } from '../config';

// const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    } as Notifications.NotificationBehavior),
});

export interface NotificationData {
    screen?: string;
    clipId?: string;
    conversationId?: string;
    userId?: string;
    [key: string]: unknown;
}

/**
 * Register for push notifications and get the Expo push token.
 * Returns the token string or null if registration failed.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Check if running on a physical device
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
    }

    // Check if running in Expo Go for SDK 53+
    if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
        console.log('Push notifications are not supported in Expo Go on Android (SDK 53+)');
        return null;
    }

    // Check for Android-specific channel setup
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF8A00',
        });

        // Create additional channels for different notification categories
        await Notifications.setNotificationChannelAsync('social', {
            name: 'Social',
            description: 'Messages, mentions, and followers',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3B82F6',
        });

        await Notifications.setNotificationChannelAsync('rewards', {
            name: 'Rewards',
            description: 'Earnings and reward notifications',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#10B981',
        });

        await Notifications.setNotificationChannelAsync('alerts', {
            name: 'Alerts',
            description: 'Important alerts and updates',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#EF4444',
        });
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
    }

    // Get the Expo push token
    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

        if (!projectId) {
            console.warn('No project ID found for push notifications. Ensure "eas.projectId" is set in app.json.');
            // Allow proceeding slightly further in case it works without it in some contexts, or fail later
        }

        const pushTokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
        });

        token = pushTokenData.data;
        console.log('Expo push token:', token);
    } catch (error: any) {
        // Specific handling for the common Firebase initialization error
        if (error.message && error.message.includes('Default FirebaseApp is not initialized')) {
            console.warn('Firebase connection failed: This is expected in Expo Go on Android or if google-services.json is missing.');
            console.warn('Push notifications will not work in this session.');
            return null;
        }

        console.error('Error getting push token:', error);
        return null;
    }

    return token;
}

/**
 * Register the push token with the backend server.
 */
export async function registerTokenWithServer(userId: string, expoPushToken: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/notifications/register-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                expoPushToken,
            }),
        });

        if (!response.ok) {
            console.error('Failed to register token with server:', response.status);
            return false;
        }

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('Error registering token with server:', error);
        return false;
    }
}

/**
 * Unregister the push token from the backend server.
 * Call this when the user logs out.
 */
export async function unregisterTokenFromServer(userId: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/notifications/unregister-token`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
            }),
        });

        if (!response.ok) {
            console.error('Failed to unregister token from server:', response.status);
            return false;
        }

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('Error unregistering token from server:', error);
        return false;
    }
}

/**
 * Get the route name and params for deep linking from notification data.
 */
export function getNavigationFromNotification(data: NotificationData): {
    screen: string;
    params?: Record<string, unknown>;
} | null {
    if (!data.screen) {
        return null;
    }

    switch (data.screen) {
        case 'clip':
            return {
                screen: 'MainTabs',
                params: {
                    screen: 'Home',
                    params: { clipId: data.clipId },
                },
            };
        case 'chat':
            return {
                screen: 'ChatDetail',
                params: {
                    contact: {
                        id: data.userId || data.conversationId,
                    },
                },
            };
        case 'wallet':
            return {
                screen: 'Rewards',
            };
        case 'profile':
            return {
                screen: 'UserProfile',
                params: { userId: data.userId },
            };
        case 'notifications':
            return {
                screen: 'MainTabs',
                params: { screen: 'Home' },
            };
        default:
            return null;
    }
}

/**
 * Schedule a local notification (for testing or local reminders).
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationData,
    triggerSeconds: number = 1
): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data as Record<string, unknown>,
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: triggerSeconds,
        },
    });

    return id;
}

/**
 * Cancel a scheduled notification.
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get the current badge count.
 */
export async function getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count.
 */
export async function setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all delivered notifications from the notification center.
 */
export async function clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
}
