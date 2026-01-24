import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthProvider';
import {
    registerForPushNotificationsAsync,
    registerTokenWithServer,
    unregisterTokenFromServer,
    getNavigationFromNotification,
    NotificationData,
} from '../services/notifications';

interface NotificationContextType {
    expoPushToken: string | null;
    notification: Notifications.Notification | null;
    requestPermissions: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType>({
    expoPushToken: null,
    notification: null,
    requestPermissions: async () => false,
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
    children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);
    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();
    const navigation = useNavigation<any>();
    const { user, session } = useAuth();

    // Register for push notifications when user logs in
    useEffect(() => {
        if (user?.id && session) {
            registerForPushNotificationsAsync().then(async (token) => {
                if (token) {
                    setExpoPushToken(token);
                    // Register token with backend
                    await registerTokenWithServer(user.id, token);
                    console.log('Push token registered with server');
                }
            });
        }

        return () => {
            // Cleanup on logout
            if (!session && user?.id) {
                unregisterTokenFromServer(user.id);
            }
        };
    }, [user?.id, session]);

    // Set up notification listeners
    useEffect(() => {
        // Listener for notifications received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            console.log('Notification received in foreground:', notification);
            setNotification(notification);
        });

        // Listener for when user taps on a notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            console.log('Notification response received:', response);
            const data = response.notification.request.content.data as NotificationData;

            // Navigate to the appropriate screen
            const navigationTarget = getNavigationFromNotification(data);
            if (navigationTarget && navigation) {
                try {
                    navigation.navigate(navigationTarget.screen, navigationTarget.params);
                } catch (error) {
                    console.error('Navigation error from notification:', error);
                }
            }
        });

        // Check if app was opened from a notification
        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (response) {
                console.log('App opened from notification:', response);
                const data = response.notification.request.content.data as NotificationData;
                const navigationTarget = getNavigationFromNotification(data);
                if (navigationTarget && navigation) {
                    // Small delay to ensure navigation is ready
                    setTimeout(() => {
                        try {
                            navigation.navigate(navigationTarget.screen, navigationTarget.params);
                        } catch (error) {
                            console.error('Navigation error from initial notification:', error);
                        }
                    }, 500);
                }
            }
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [navigation]);

    const requestPermissions = async (): Promise<boolean> => {
        const token = await registerForPushNotificationsAsync();
        if (token) {
            setExpoPushToken(token);
            if (user?.id) {
                await registerTokenWithServer(user.id, token);
            }
            return true;
        }
        return false;
    };

    return (
        <NotificationContext.Provider
            value={{
                expoPushToken,
                notification,
                requestPermissions,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationProvider;
