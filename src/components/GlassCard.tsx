import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Layout, Gradients } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
    borderColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    intensity = 20,
    borderColor
}) => {
    const { isDark, colors } = useTheme();

    // Default border color based on theme if not provided
    const effectiveBorderColor = borderColor || (isDark ? colors.glassBorder : 'rgba(0, 0, 0, 0.1)');

    return (
        <View style={[styles.container, { borderColor: effectiveBorderColor, backgroundColor: colors.glassBackground }, style]}>
            <BlurView
                intensity={intensity}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={isDark ? Gradients.card : Gradients.cardLight}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: Layout.radius.l,
        overflow: 'hidden',
        borderWidth: 1,
        position: 'relative',
    },
    content: {
        // Ensure content is above the background layers if needed, 
        // but strictly they are siblings in absoluteFill vs this view? 
        // No, BlurView and Gradient are absoluteFill, so they sit behind if this View is rendered after? 
        // Actually, in RN, absolute positioned elements are layered by order. 
        // So I should put content in a separate view that is NOT absolute, 
        // but Wait, View with absoluteFill will cover the parent.
        // So I must put children AFTER the absolute views.
        // Yes, the order above is correct: BlurView, Gradient, then children content implicitly? 
        // No, `children` is passed directly. If I put it inside a View, that View will be stacked on top.
        // Let's be explicit with a content container.
        zIndex: 1,
    }
});
