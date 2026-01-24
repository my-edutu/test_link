
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceClipInteractions } from './VoiceClipInteractions';

interface ClipCardProps {
    clip: {
        id: string;
        user: {
            name: string;
            username: string;
            avatar: string;
            avatarUrl?: string;
            language: string;
        };
        content: {
            phrase: string;
            translation: string;
            audioWaveform?: number[];
            audioUrl?: string;
            duration?: string;
        };
        engagement: {
            likes: number;
            comments: number;
            shares: number;
            validations: number;
            duets?: number;
        };
        actions: {
            isLiked: boolean;
            isValidated: boolean;
            needsValidation: boolean;
        };
        timeAgo: string;
        // Remix/Duet specific
        parentClipId?: string;
        parentUsername?: string;
    };
    isPlaying: boolean;
    isLoading: boolean;
    onPlay: () => void;
    onDuet: () => void;
    onProfilePress: () => void;
}

export const ClipCard: React.FC<ClipCardProps> = ({
    clip,
    isPlaying,
    isLoading,
    onPlay,
    onDuet,
    onProfilePress,
}) => {
    const { user, content, engagement, actions, timeAgo, parentClipId, parentUsername } = clip;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.userInfo} onPress={onProfilePress}>
                    <View style={styles.avatarContainer}>
                        {user.avatarUrl ? (
                            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{user.avatar}</Text>
                            </View>
                        )}
                    </View>
                    <View>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.username}>@{user.username} • {timeAgo}</Text>
                        {parentClipId && parentUsername && (
                            <View style={styles.remixLabelContainer}>
                                <Ionicons name="git-branch-outline" size={12} color="#666" />
                                <Text style={styles.remixLabel}> Remixed from @{parentUsername}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.phrase}>{content.phrase}</Text>
                {content.translation ? <Text style={styles.translation}>{content.translation}</Text> : null}
            </View>

            {/* Audio Player (Simplified Visual) */}
            <View style={styles.playerContainer}>
                <TouchableOpacity style={styles.playButton} onPress={onPlay}>
                    {isLoading ? (
                        <Ionicons name="sync" size={24} color="#FFF" />
                    ) : (
                        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#FFF" />
                    )}
                </TouchableOpacity>
                <View style={styles.waveform}>
                    {/* Visual placeholder for waveform */}
                    {(content.audioWaveform || [20, 40, 60, 40, 20]).map((h, i) => (
                        <View key={i} style={[styles.bar, { height: h / 2, backgroundColor: isPlaying ? '#FF8A00' : '#DDD' }]} />
                    ))}
                </View>
                <Text style={styles.duration}>{content.duration || '0:00'}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <VoiceClipInteractions clipId={clip.id} />

                {/* Duet Button */}
                <TouchableOpacity style={styles.duetButton} onPress={onDuet}>
                    <Ionicons name="mic-outline" size={18} color="#4B5563" />
                    <Text style={styles.duetText}>Duet</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 10,
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
    },
    name: {
        fontWeight: '600',
        fontSize: 16,
        color: '#111',
    },
    username: {
        fontSize: 12,
        color: '#666',
    },
    remixLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    remixLabel: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    content: {
        marginBottom: 12,
    },
    phrase: {
        fontSize: 18,
        fontWeight: '500',
        color: '#000',
        marginBottom: 4,
    },
    translation: {
        fontSize: 14,
        color: '#666',
    },
    playerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 8,
        marginBottom: 12,
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF8A00',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    waveform: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 30,
        marginRight: 12,
    },
    bar: {
        width: 4,
        borderRadius: 2,
    },
    duration: {
        fontSize: 12,
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    duetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    duetText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
});
