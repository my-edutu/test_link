import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Layout, Gradients } from '../constants/Theme';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.container}>
                    <LinearGradient
                        colors={['#1A0500', '#0D0200']}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <LinearGradient
                                colors={['rgba(255, 59, 48, 0.2)', 'rgba(255, 59, 48, 0.05)']}
                                style={styles.iconGlow}
                            />
                            <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
                        </View>

                        <Text style={styles.title}>System Interruption</Text>
                        <Text style={styles.message}>
                            We encountered an unexpected error. Our engineers have been notified.
                        </Text>

                        {__DEV__ && (
                            <View style={styles.debugContainer}>
                                <Text style={styles.debugTitle}>Debug Info:</Text>
                                <Text style={styles.debugText}>{this.state.error?.message}</Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <LinearGradient
                                colors={Gradients.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.buttonGradient}
                            >
                                <Text style={styles.buttonText}>Try Again</Text>
                                <MaterialIcons name="refresh" size={20} color="white" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A0500',
    },
    content: {
        flex: 1,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    iconGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 60,
    },
    title: {
        ...Typography.h1,
        color: 'white',
        textAlign: 'center',
        marginBottom: 16,
    },
    message: {
        ...Typography.body,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    debugContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: Layout.radius.m,
        width: '100%',
        marginBottom: 32,
    },
    debugTitle: {
        ...Typography.caption,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 8,
    },
    debugText: {
        fontFamily: 'System',
        fontSize: 12,
        color: '#FF453A',
    },
    button: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: {
        ...Typography.h3,
        color: 'white',
    },
});
