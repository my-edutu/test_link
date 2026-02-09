// Dark theme colors (original)
const darkColors = {
    background: '#1A0800',
    surface: '#220A00',
    card: '#2A0C00',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    primary: '#FF8A00',
    secondary: '#3D1500',
    accent: '#FF8A00',
    border: '#2A0C00',
    borderLight: 'rgba(255, 255, 255, 0.1)',
    notification: '#FF453A',
    success: '#30D158',
    error: '#FF453A',
    warning: '#FFD60A',
    navBackground: '#1A0800',
    navBorder: 'transparent',
    inputBackground: 'rgba(255, 255, 255, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    skeleton: 'rgba(255, 255, 255, 0.1)',
    glassBackground: 'transparent',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    tint: 'dark',
    tabIcon: '#FFFFFF',
    tabIconInactive: 'rgba(255, 255, 255, 0.5)',
};

// Light theme colors
const lightColors = {
    background: '#F8F9FA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: 'rgba(0, 0, 0, 0.4)',
    primary: '#FF8A00',
    secondary: '#FFF3E0',
    accent: '#FF8A00',
    border: '#E5E7EB',
    borderLight: 'rgba(0, 0, 0, 0.1)',
    notification: '#EF4444',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    navBackground: '#FFFFFF',
    navBorder: '#E5E7EB',
    inputBackground: '#F3F4F6',
    overlay: 'rgba(0, 0, 0, 0.3)',
    skeleton: 'rgba(0, 0, 0, 0.08)',
    glassBackground: 'rgba(255, 255, 255, 0.6)',
    glassBorder: 'rgba(0, 0, 0, 0.1)',
    tint: 'light',
    tabIcon: '#1F2937',
    tabIconInactive: 'rgba(31, 41, 55, 0.5)',
};

export type ThemeColors = typeof darkColors;

export const Colors = {
    light: lightColors,
    dark: darkColors,
    // Default exports for backward compatibility
    ...darkColors,
    primary: '#FF8A00',
};

export const Spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const FontSize = {
    small: 12,
    medium: 16,
    large: 20,
    xlarge: 24,
    xxlarge: 32,
};

export const Gradients = {
    primary: ['#FF8A00', '#FF5F00'] as const,
    darkOverlay: ['transparent', 'rgba(26, 5, 0, 0.8)', '#1A0500'] as const,
    lightOverlay: ['transparent', 'rgba(255, 255, 255, 0.8)', '#FFFFFF'] as const,
    card: ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)'] as const,
    cardLight: ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.5)'] as const,
    glow: ['rgba(255, 138, 0, 0.2)', 'transparent'] as const,
};

export const Layout = {
    radius: {
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        circle: 9999,
    },
    spacing: Spacing,
};

export const Typography = {
    hero: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1, lineHeight: 44 },
    h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5, lineHeight: 32 },
    h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 26 },
    h4: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
    body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    caption: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
};
