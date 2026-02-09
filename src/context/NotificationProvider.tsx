import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
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
    unreadMessages: number;
}

const NotificationContext = createContext<NotificationContextType>({
    expoPushToken: null,
    notification: null,
    requestPermissions: async () => false,
    unreadMessages: 0,
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
    children: React.ReactNode;
    navigationRef: any; // Using explicit ref passed from App.tsx
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, navigationRef }) => {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);
    const [unreadMessages, setUnreadMessages] = useState<number>(0);
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);
    
    // We remove useNavigation() because this provider sits at the root, 
    // potentially before the navigation context is fully ready or is used incorrectly.
    const { user, session } = useAuth();

    // Register for push notifications when user logs in
    useEffect(() => {
        if (user?.id && session) {
            registerForPushNotificationsAsync().then(async (token) => {
                if (token) {
                    setExpoPushToken(token);
                    // Register token with backend
                    try {
                        const success = await registerTokenWithServer(user.id, token);
                        if (success) {
                            console.log('Push token registered with server');
                        } else {
                            console.warn('Push token registration returned failure');
                        }
                    } catch (e) {
                         console.warn("Failed to register token", e);
                    }
                }
            }).catch(e => {
                console.warn("Push registration failed (likely missing config or emulator)", e);
            });
        }

        return () => {
            // Cleanup on logout
            if (session === null && user?.id) { // explicit check for null session
                 try {
                    unregisterTokenFromServer(user.id).catch(() => {});
                 } catch (e) {}
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

            // Navigate to the appropriate screen using REF
            const navigationTarget = getNavigationFromNotification(data);
            if (navigationTarget && navigationRef?.isReady?.()) {
                try {
                    navigationRef.navigate(navigationTarget.screen, navigationTarget.params);
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
                if (navigationTarget && navigationRef?.isReady?.()) {
                    // Small delay to ensure navigation is ready
                    setTimeout(() => {
                        try {
                            navigationRef.navigate(navigationTarget.screen, navigationTarget.params);
                        } catch (error) {
                            console.error('Navigation error from initial notification:', error);
                        }
                    }, 500);
                }
            }
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [navigationRef]);

    const requestPermissions = async (): Promise<boolean> => {
        try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                setExpoPushToken(token);
                if (user?.id) {
                    await registerTokenWithServer(user.id, token).catch(() => {});
                }
                return true;
            }
        } catch (e) {
            console.warn("Permission request failed", e);
        }
        return false;
    };

    return (
        <NotificationContext.Provider
            value={{
                expoPushToken,
                notification,
                requestPermissions,
                unreadMessages,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationProvider;
