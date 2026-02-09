// src/utils/nativeModuleCheck.ts
// Utility to check if native modules are available (development build vs Expo Go)

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Check if we're running in Expo Go (managed workflow without native modules)
 * Returns true if we're in Expo Go or on web, false if we're in a development build
 */
export const isExpoGo = (): boolean => {
    // Web doesn't support native modules
    if (Platform.OS === 'web') {
        return true;
    }
    return Constants.appOwnership === 'expo';
};

/**
 * Check if LiveKit native modules are available
 * LiveKit requires a custom development build
 */
export const isLiveKitAvailable = (): boolean => {
    if (isExpoGo()) {
        return false;
    }

    try {
        // Try to require the module to check if it's linked
        require('@livekit/react-native');
        return true;
    } catch (error) {
        console.warn('[nativeModuleCheck] LiveKit is not available:', error);
        return false;
    }
};

/**
 * Check if WebRTC native modules are available
 */
export const isWebRTCAvailable = (): boolean => {
    if (isExpoGo()) {
        return false;
    }

    try {
        require('@livekit/react-native-webrtc');
        return true;
    } catch (error) {
        console.warn('[nativeModuleCheck] WebRTC is not available:', error);
        return false;
    }
};
