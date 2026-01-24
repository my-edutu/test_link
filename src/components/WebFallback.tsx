
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WebFallbackProps {
    title: string;
}

const WebFallback: React.FC<WebFallbackProps> = ({ title }) => (
    <View style={styles.container}>
        <Text style={styles.text}>{title}</Text>
        <Text style={styles.subtext}>This feature is not available on the web version yet.</Text>
        <Text style={styles.subtext}>Please use the mobile app for the best experience.</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111827', // Dark background to match app theme
        padding: 20,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtext: {
        color: '#9CA3AF',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8,
    }
});

export default WebFallback;
