import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';

interface FeedVideoProps {
    videoUrl: string;
    thumbnailUrl?: string;
    isActive: boolean;
}

export const FeedVideo: React.FC<FeedVideoProps> = ({ videoUrl, thumbnailUrl, isActive }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const player = useVideoPlayer(videoUrl, (player) => {
        player.loop = true;
        player.muted = false;
    });

    useEffect(() => {
        if (isActive) {
            player.play();
        } else {
            player.pause();
        }
    }, [isActive, player]);

    return (
        <View style={styles.container}>
            {/* Show thumbnail as background when not active or until video plays */}
            {(!isActive || !isLoaded) && thumbnailUrl && (
                <Image
                    source={{ uri: thumbnailUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                />
            )}

            <VideoView
                player={player}
                style={styles.video}
                contentFit="cover"
                nativeControls={false}
                onLayout={() => setIsLoaded(true)}
            />

            {!isLoaded && isActive && (
                <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                    <ActivityIndicator size="large" color="#FF8A00" />
                </View>
            )}

            {!isActive && (
                <View style={styles.overlay}>
                    {thumbnailUrl ? (
                        <MaterialIcons name="play-circle-outline" size={64} color="rgba(255,255,255,0.9)" />
                    ) : (
                        <MaterialIcons name="play-circle-filled" size={48} color="rgba(255,255,255,0.8)" />
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 300,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
