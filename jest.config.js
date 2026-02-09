module.exports = {
    preset: 'jest-expo',
    setupFilesAfterEnv: ['./jest.setup.js'],
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*)',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        'services/api/src/**/*.ts',
        '!**/node_modules/**',
        '!**/*.d.ts',
    ],
    coverageThreshold: {
        global: {
            statements: 20,
            branches: 15,
            functions: 20,
            lines: 20,
        },
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testEnvironment: 'node',
    globals: {
        __DEV__: true,
    },
};
