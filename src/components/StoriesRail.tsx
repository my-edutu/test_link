import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/Theme';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';

// Hexagon-like shape or just a unique border radius
const STORY_SIZE = 70;

interface Story {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string;
    has_unseen: boolean;
    is_me?: boolean;
    media_url?: string; // New: For showing latest story preview
    thumbnail_url?: string; // New: For video thumbnails
}

interface StoriesRailProps {
    stories: Story[];
    currentUserStory?: Story | null;
}

export const StoriesRail: React.FC<StoriesRailProps> = ({ stories, currentUserStory }) => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();

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
        <View style={[styles.container, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {allStories.map((story, index) => {
                    // Determine what image to show:
                    // 1. If active story (me or other) -> Show media_url/thumbnail if available
                    // 2. Fallback -> Show avatar_url
                    const showMediaPreview = (story.is_me && currentUserStory) || (!story.is_me && story.has_unseen);
                    const imageSource = showMediaPreview && (story.media_url || story.thumbnail_url)
                        ? { uri: story.media_url || story.thumbnail_url }
                        : { uri: story.avatar_url || 'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/avatars/01.png' };

                    // Fallback for empty avatar if not viewing media
                    const hasAvatar = !!story.avatar_url;

                    return (
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
                                {/* Case 1: My Story - No active story -> Show Add Button style */}
                                {(story.is_me && !currentUserStory) ? (
                                    <View style={[styles.gradientBorder, { backgroundColor: colors.card }]}>
                                        <View style={[styles.avatarInner, { borderColor: colors.background, backgroundColor: colors.background }]}>
                                            {hasAvatar ? (
                                                <Image
                                                    source={{ uri: story.avatar_url }}
                                                    style={styles.avatar}
                                                />
                                            ) : (
                                                <View style={[styles.avatar, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>
                                                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={[styles.plusBadge, { borderColor: colors.background }]}>
                                            <Text style={styles.plusText}>+</Text>
                                        </View>
                                    </View>
                                ) : (
                                    // Case 2: Active Story (Me or Others)
                                    story.has_unseen || (story.is_me && currentUserStory) ? (
                                        <LinearGradient
                                            colors={['#FF8A00', '#D946EF', '#8B5CF6']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.gradientBorder}
                                        >
                                            <View style={[styles.avatarInner, { borderColor: colors.background, backgroundColor: colors.background }]}>
                                                <Image
                                                    source={imageSource}
                                                    style={styles.avatar}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        </LinearGradient>
                                    ) : (
                                        // Case 3: Seen Story
                                        <View style={[styles.gradientBorder, { backgroundColor: colors.border, padding: 2 }]}>
                                            <View style={[styles.avatarInner, { borderColor: colors.background, backgroundColor: colors.background }]}>
                                                <Image
                                                    source={imageSource}
                                                    style={styles.avatar}
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        </View>
                                    )
                                )}
                            </View>
                            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                                {story.is_me ? 'Your Story' : story.username}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        borderBottomWidth: 1,
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
        borderRadius: 22, // Slightly smaller than outer
        overflow: 'hidden',
        borderWidth: 2,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    username: {
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
    },
    plusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: -1,
    }
});
