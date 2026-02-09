import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Network from 'expo-network';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants/Theme';

interface ConnectivityContextType {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
}

const ConnectivityContext = createContext<ConnectivityContextType>({
    isConnected: true,
    isInternetReachable: true,
});

export const ConnectivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<ConnectivityContextType>({
        isConnected: true,
        isInternetReachable: true,
    });

    const [showAlert, setShowAlert] = useState(false);
    const slideAnim = useState(new Animated.Value(-100))[0];

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkNetwork = async () => {
            try {
                const networkState = await Network.getNetworkStateAsync();
                const connected = networkState.isConnected;
                const reachable = networkState.isInternetReachable;

                setStatus({
                    isConnected: connected ?? null,
                    isInternetReachable: reachable ?? null,
                });

                // Show/hide offline banner
                if (connected === false || reachable === false) {
                    if (!showAlert) {
                        setShowAlert(true);
                        Animated.timing(slideAnim, {
                            toValue: 0,
                            duration: 500,
                            useNativeDriver: true,
                        }).start();
                    }
                } else if (showAlert) {
                    Animated.timing(slideAnim, {
                        toValue: -100,
                        duration: 500,
                        useNativeDriver: true,
                    }).start(() => setShowAlert(false));
                }
            } catch (error) {
                console.error('Connectivity check failed:', error);
            }
        };

        // Initial check
        checkNetwork();

        // Poll for status (Expo Network doesn't have a listener like NetInfo)
        interval = setInterval(checkNetwork, 5000);

        return () => clearInterval(interval);
    }, [showAlert]);

    return (
        <ConnectivityContext.Provider value={status}>
            {children}
            {showAlert && (
                <Animated.View style={[styles.offlineBanner, { transform: [{ translateY: slideAnim }] }]}>
                    <MaterialIcons name="cloud-off" size={20} color="white" />
                    <Text style={styles.offlineText}>
                        {!status.isConnected ? 'No connection' : 'Internet unreachable'}
                    </Text>
                </Animated.View>
            )}
        </ConnectivityContext.Provider>
    );
};

export const useConnectivity = () => useContext(ConnectivityContext);

const styles = StyleSheet.create({
    offlineBanner: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        backgroundColor: '#FF3B30',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    offlineText: {
        ...Typography.caption,
        color: 'white',
        letterSpacing: 1,
    },
});
