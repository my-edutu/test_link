import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Theme';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeType;
    colors: typeof Colors.light; // The structure is the same for both
    toggleTheme: () => void;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>(systemColorScheme === 'dark' ? 'dark' : 'light');

    // Update theme if system changes, but allow manual override if needed (logic can be enhanced)
    useEffect(() => {
        if (systemColorScheme) {
            setThemeState(systemColorScheme as ThemeType);
        }
    }, [systemColorScheme]);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
    };

    const colors = Colors[theme];

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
