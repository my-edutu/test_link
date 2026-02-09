import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme, StatusBar, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeColors } from '../constants/Theme';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = '@lingualink_theme_mode';

interface ThemeContextType {
    theme: ResolvedTheme;
    themeMode: ThemeMode;
    colors: ThemeColors;
    isDark: boolean;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const defaultContextValue: ThemeContextType = {
    theme: 'dark',
    themeMode: 'dark',
    colors: Colors.dark,
    isDark: true,
    setThemeMode: () => {},
    toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContextValue);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load saved theme preference on mount
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                    setThemeModeState(savedTheme as ThemeMode);
                }
            } catch (error) {
                console.error('Failed to load theme preference:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadTheme();
    }, []);

    // Resolve the actual theme based on mode and system preference
    const resolvedTheme: ResolvedTheme =
        themeMode === 'system'
            ? (systemColorScheme || 'dark')
            : themeMode;

    const isDark = resolvedTheme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;

    // Update status bar based on theme
    useEffect(() => {
        StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
    }, [isDark]);

    const setThemeMode = useCallback(async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    }, []);

    const toggleTheme = useCallback(() => {
        const newMode = themeMode === 'dark' ? 'light' : 'dark';
        setThemeMode(newMode);
    }, [themeMode, setThemeMode]);

    // Don't render until theme is loaded to prevent flash
    if (!isLoaded) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{
            theme: resolvedTheme,
            themeMode,
            colors,
            isDark,
            setThemeMode,
            toggleTheme
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    // Defensive: ensure colors always exists even if context is somehow undefined
    if (!context || !context.colors) {
        console.warn('[useTheme] Context is missing or incomplete, returning defaults');
        return defaultContextValue;
    }
    return context;
};
