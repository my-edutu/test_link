import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Layout, Gradients } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { BlurView } from 'expo-blur';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useFocusEffect } from '@react-navigation/native';

interface SavedItem {
    id: string; // The saved_item id
    user_id: string;
    item_type: string;
    item_id: string;
    item_data: {
        title?: string;
        subtitle?: string; // or type details
        image_url?: string;
    };
    created_at: string;
}

const SavedItemsScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSavedItems = useCallback(async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('saved_items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSavedItems(data || []);
        } catch (error) {
            console.error('Error fetching saved items:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchSavedItems();
        }, [fetchSavedItems])
    );

    const handleUnsave = async (item: SavedItem) => {
        Alert.alert(
            'Remove Item',
            'Are you sure you want to remove this from your saved items?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Optimistic update
                            setSavedItems(prev => prev.filter(i => i.id !== item.id));

                            const { error } = await supabase
                                .from('saved_items')
                                .delete()
                                .eq('id', item.id);

                            if (error) {
                                throw error;
                            }
                        } catch (error) {
                            console.error('Error removing saved item:', error);
                            // Revert on error
                            fetchSavedItems();
                            Alert.alert('Error', 'Failed to remove item.');
                        }
                    }
                }
            ]
        );
    };

    const handleClearAll = () => {
        if (savedItems.length === 0) return;

        Alert.alert(
            'Clear All',
            'Are you sure you want to remove all saved items?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSavedItems([]);
                            const { error } = await supabase
                                .from('saved_items')
                                .delete()
                                .eq('user_id', user?.id);
                            if (error) throw error;
                        } catch (e) {
                            console.error(e);
                            fetchSavedItems();
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: SavedItem }) => {
        const title = item.item_data?.title || 'Untitled Item';
        const type = item.item_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const date = new Date(item.created_at).toLocaleDateString();

        return (
            <GlassCard intensity={isDark ? 15 : 60} style={[styles.item, { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.borderLight }]}>
                <View style={styles.itemIconContainer}>
                    <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
                    <Ionicons name="bookmark" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.itemContent}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                    <View style={styles.itemMeta}>
                        <Text style={styles.itemType}>{type}</Text>
                        <Text style={[styles.itemDot, { color: colors.textSecondary }]}>•</Text>
                        <Text style={[styles.itemDate, { color: colors.textSecondary }]}>{date}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.moreButton} onPress={() => handleUnsave(item)}>
                    <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </GlassCard>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Items</Text>
                <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={savedItems}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                <Ionicons name="bookmark-outline" size={48} color={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>Empty Library</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Save phrases and articles to access them quickly later.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        overflow: 'hidden',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...Typography.h2,
    },
    clearButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    clearButtonText: {
        ...Typography.body,
        color: Colors.primary,
        fontWeight: '600',
    },
    listContent: {
        padding: 20,
        gap: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: Layout.radius.l,
        borderWidth: 1,
    },
    itemIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginRight: 16,
    },
    itemContent: {
        flex: 1,
        justifyContent: 'center',
    },
    itemTitle: {
        ...Typography.h4,
        marginBottom: 4,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemType: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
    },
    itemDot: {
        fontSize: 12,
        marginHorizontal: 6,
    },
    itemDate: {
        fontSize: 12,
    },
    moreButton: {
        padding: 8,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        ...Typography.h3,
        marginBottom: 8,
    },
    emptySub: {
        ...Typography.body,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default SavedItemsScreen;
