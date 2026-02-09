/**
 * Jest Setup File
 * Configures testing environment with mocks for React Native and Expo modules.
 */

import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Supabase client
jest.mock('./src/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
            signInWithPassword: jest.fn(),
            signOut: jest.fn(),
            onAuthStateChange: jest.fn(() => ({
                data: { subscription: { unsubscribe: jest.fn() } },
            })),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
        storage: {
            from: jest.fn(() => ({
                upload: jest.fn(),
                getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/test.png' } })),
            })),
        },
    },
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
    expoConfig: {
        extra: {
            apiUrl: 'http://localhost:3000',
        },
    },
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
    getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
    setNotificationHandler: jest.fn(),
    addNotificationReceivedListener: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
        ...actualNav,
        useNavigation: () => ({
            navigate: jest.fn(),
            goBack: jest.fn(),
        }),
        useRoute: () => ({
            params: {},
        }),
    };
});

// Mock Animated API
// // Mock Expo UI components
jest.mock('expo-blur', () => ({
    BlurView: ({ children }) => children,
}));
jest.mock('expo-linear-gradient', () => ({
    LinearGradient: ({ children }) => children,
}));

// Silence console warnings during tests (optional)
const originalWarn = console.warn;
console.warn = (...args) => {
    if (
        typeof args[0] === 'string' &&
        args[0].includes('Animated:')
    ) {
        return;
    }
    originalWarn(...args);
};

// Global test utilities
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
    })
);

// Test timeout for slower operations
jest.setTimeout(10000);
