import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/Theme';
import { useAuth } from '../context/AuthProvider';

// Hexagon-like shape or just a unique border radius
const STORY_SIZE = 70;

interface Story {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string;
    has_unseen: boolean;
    is_me?: boolean;
}

interface StoriesRailProps {
    stories: Story[];
    currentUserStory?: Story | null;
}

export const StoriesRail: React.FC<StoriesRailProps> = ({ stories, currentUserStory }) => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();

    // "My Story" item configuration
    const myStoryItem = currentUserStory ? {
        ...currentUserStory,
        id: 'my-story-active', // unique id for list
        is_me: true,
        username: 'Your Story',
        // keep original data for navigation
        originalData: currentUserStory
    } : {
        id: 'my-story-placeholder',
        username: 'Your Story',
        avatar_url: user?.imageUrl || user?.user_metadata?.avatar_url || '',
        has_unseen: false,
        is_me: true
    };

    // Filter out current user from stories list just in case, though parent should handle it
    const otherStories = stories.filter(s => !s.is_me);
    const allStories = [myStoryItem, ...otherStories];

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {allStories.map((story, index) => (
                    <TouchableOpacity
                        key={story.id}
                        style={styles.storyItem}
                        onPress={() => {
                            if (story.is_me) {
                                if (currentUserStory) {
                                    navigation.navigate('StoryView', { story: currentUserStory });
                                } else {
                                    navigation.navigate('CreateStory');
                                }
                            } else {
                                navigation.navigate('StoryView', { story: story });
                            }
                        }}
                    >
                        <View style={styles.avatarContainer}>
                            {/* Unique: Hexagonal-ish Gradient Border for Unseen */}
                            {(story.is_me && !currentUserStory) ? (
                                // No active story -> Show placeholder style with +
                                <View style={[styles.gradientBorder, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                                    <View style={styles.avatarInner}>
                                        {story.avatar_url ? (
                                            <Image
                                                source={{ uri: story.avatar_url }}
                                                style={styles.avatar}
                                            />
                                        ) : (
                                            <View style={[styles.avatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                                                <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>
                                                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.plusBadge}>
                                        <Text style={styles.plusText}>+</Text>
                                    </View>
                                </View>
                            ) : (
                                // Active story or other user story
                                story.has_unseen ? (
                                    <LinearGradient
                                        colors={['#FF8A00', '#D946EF', '#8B5CF6']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.gradientBorder}
                                    >
                                        <View style={styles.avatarInner}>
                                            <Image
                                                source={{ uri: story.avatar_url || 'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/avatars/01.png' }}
                                                style={styles.avatar}
                                            />
                                        </View>
                                    </LinearGradient>
                                ) : (
                                    // Seen story
                                    <View style={[styles.gradientBorder, { backgroundColor: 'rgba(255,255,255,0.1)', padding: 2 }]}>
                                        <View style={[styles.avatarInner, { borderColor: 'rgba(255,255,255,0.2)' }]}>
                                            <Image
                                                source={{ uri: story.avatar_url || 'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/avatars/01.png' }}
                                                style={styles.avatar}
                                            />
                                        </View>
                                    </View>
                                )
                            )}
                        </View>
                        <Text style={styles.username} numberOfLines={1}>
                            {story.is_me ? 'Your Story' : story.username}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        // Add a separator line at the bottom
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        marginBottom: 10,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
    },
    storyItem: {
        alignItems: 'center',
        width: STORY_SIZE,
    },
    avatarContainer: {
        width: STORY_SIZE,
        height: STORY_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    gradientBorder: {
        width: '100%',
        height: '100%',
        borderRadius: 24, // Squircle / Unique shape
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2, // Border width
    },
    avatarInner: {
        width: '100%',
        height: '100%', // Fill the gradient container minus padding
        backgroundColor: '#000', // Matches background to create "border" effect
        borderRadius: 22, // Slightly smaller than outer
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#1F0800', // Match parent background color
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    username: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    plusBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: Colors.primary,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1F0800',
    },
    plusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: -1,
    }
});
