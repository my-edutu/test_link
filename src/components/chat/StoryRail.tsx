import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Story } from '../../types/chat.types';

interface StoryRailProps {
    stories: Story[];
    navigation: any;
}

export const StoryRail: React.FC<StoryRailProps> = ({ stories, navigation }) => {
    const { colors, theme } = useTheme();

    const styles = useMemo(() => StyleSheet.create({
        storiesSection: {
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme === 'dark' ? '#333' : '#F0F0F0',
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginLeft: 16,
            marginBottom: 12,
        },
        storiesList: {
            paddingHorizontal: 16,
        },
        storyItem: {
            width: 72,
            marginRight: 12,
            alignItems: 'center',
        },
        addStoryItem: {
            width: 72,
            marginRight: 12,
            alignItems: 'center',
        },
        addStoryAvatar: {
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: colors.border,
            borderStyle: 'dashed',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 4,
        },
        addStoryText: {
            fontSize: 24,
            color: colors.textSecondary,
        },
        storyAvatar: {
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.card,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 4,
            borderWidth: 2,
            borderColor: colors.primary,
        },
        storyAvatarText: {
            fontSize: 24,
            color: colors.text,
        },
        unviewedStory: {
            // styles handled by border color in render
        },
        storyIndicator: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.primary,
            borderWidth: 2,
            borderColor: colors.background,
        },
        storyUsername: {
            fontSize: 12,
            color: colors.text,
            textAlign: 'center',
        },
    }), [colors, theme]);

    const renderStoryItem = ({ item }: { item: Story | { id: string; user: { name: string; avatar: string; }; thumbnail: string; } }) => {
        // Handle "Add Story" item
        if (item.id === 'add') {
            return (
                <TouchableOpacity
                    style={styles.addStoryItem}
                    onPress={() => navigation.navigate('CreateStory')}
                >
                    <View style={styles.addStoryAvatar}>
                        <Text style={styles.addStoryText}>➕</Text>
                    </View>
                    <Text style={styles.storyUsername} numberOfLines={1}>Add Story</Text>
                </TouchableOpacity>
            );
        }

        // Handle regular story items
        const storyItem = item as Story;
        return (
            <TouchableOpacity
                style={styles.storyItem}
                onPress={() => navigation.navigate('StoryView', { story: storyItem })}
            >
                <View style={[
                    styles.storyAvatar,
                    { borderColor: storyItem.viewed ? colors.border : colors.primary }
                ]}>
                    <Text style={styles.storyAvatarText}>{storyItem.user.avatar}</Text>
                </View>
                <Text style={styles.storyUsername} numberOfLines={1}>
                    {storyItem.user.name.split(' ')[0]}
                </Text>
            </TouchableOpacity>
        );
    };

    if (stories.length === 0) return null;

    return (
        <View style={styles.storiesSection}>
            <Text style={styles.sectionTitle}>Stories</Text>
            <FlatList
                data={[{ id: 'add', user: { name: 'Add', avatar: '+' }, thumbnail: '+', viewed: false, timestamp: '' } as any, ...stories]}
                renderItem={renderStoryItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesList}
            />
        </View>
    );
};
