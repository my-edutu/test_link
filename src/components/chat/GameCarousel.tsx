import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface GameCarouselProps {
    navigation: any;
}

export const GameCarousel: React.FC<GameCarouselProps> = ({ navigation }) => {
    const { colors, theme } = useTheme();

    const styles = useMemo(() => StyleSheet.create({
        gamesContainer: {
            padding: 16,
        },
        gameCard: {
            backgroundColor: theme === 'dark' ? '#2A2A2A' : '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme === 'dark' ? '#333' : '#E5E5E5',
        },
        gameIcon: {
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 12,
        },
        gameTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 4,
        },
        gameDescription: {
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: 12,
        },
        gameStats: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        gameStat: {
            flexDirection: 'row',
            alignItems: 'center',
            marginRight: 16,
        },
        gameStatText: {
            fontSize: 12,
            color: colors.textSecondary,
            marginLeft: 4,
        },
    }), [colors, theme]);

    return (
        <View style={styles.gamesContainer}>
            <TouchableOpacity
                style={styles.gameCard}
                onPress={() => navigation.navigate('TurnVerse')}
            >
                <View style={styles.gameIcon}>
                    <Ionicons name="game-controller" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.gameTitle}>TurnVerse</Text>
                <Text style={styles.gameDescription}>Language learning game with live streaming</Text>
                <View style={styles.gameStats}>
                    <View style={styles.gameStat}>
                        <Ionicons name="people" size={12} color="#10B981" />
                        <Text style={styles.gameStatText}>234 playing</Text>
                    </View>
                    <View style={styles.gameStat}>
                        <Ionicons name="radio" size={12} color="#EF4444" />
                        <Text style={styles.gameStatText}>12 live</Text>
                    </View>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.gameCard}
                onPress={() => navigation.navigate('WordChain')}
            >
                <View style={[styles.gameIcon, { backgroundColor: '#8B5CF6' }]}>
                    <Ionicons name="link" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.gameTitle}>Word Chain</Text>
                <Text style={styles.gameDescription}>Build vocabulary in your language</Text>
                <View style={styles.gameStats}>
                    <View style={styles.gameStat}>
                        <Ionicons name="people" size={12} color="#10B981" />
                        <Text style={styles.gameStatText}>89 playing</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};
