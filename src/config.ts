import Constants from 'expo-constants';

/**
 * Application Configuration
 * Centralized configuration for API endpoints and app settings.
 */

// Use the machine's IP address for development to allow connection from physical devices
const getLocalBaseUrl = () => {
    // Forcing HTTPS to avoid cleartext issues on Android
    return 'https://lingualink-backend-otu6.onrender.com/api/v1';
};

// export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.API_URL || getLocalBaseUrl();
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://lingualink-backend-otu6.onrender.com/api/v1';

// Environment
export const IS_DEV = __DEV__;

// App Info
export const APP_NAME = 'LinguaLink';
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
