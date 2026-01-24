import Constants from 'expo-constants';

/**
 * Application Configuration
 * Centralized configuration for API endpoints and app settings.
 */

// API Base URL - defaults to localhost for development
export const API_BASE_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:3000';

// Environment
export const IS_DEV = __DEV__;

// App Info
export const APP_NAME = 'LinguaLink';
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
