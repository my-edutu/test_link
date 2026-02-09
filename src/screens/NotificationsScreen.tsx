import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { Colors, Typography, Layout, Gradients } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { BlurView } from 'expo-blur';

interface Notification {
    id: string;
    type: string;
    actor: {
        username: string;
        avatar_url: string;
    };
    action: string;
    created_at: string;
    read: boolean;
}

const NotificationsScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    id,
                    type,
                    created_at,
                    read,
                    actor:actor_id (username, avatar_url),
                    action
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.log('Notifications fetch error', error);
            } else if (data) {
                setNotifications(data.map((n: any) => ({
                    id: n.id,
                    type: n.type,
                    actor: n.actor || [{ username: 'Someone', avatar_url: null }],
                    action: n.action || (n.type === 'like' ? 'liked your post' : 'interacted with you'),
                    created_at: n.created_at,
                    read: n.read
                })));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user?.id]);

    const getTimeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <GlassCard intensity={item.read ? 15 : 25} style={[styles.item, { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.borderLight }]}>
            {!item.read && <View style={styles.unreadDot} />}
            <View style={[styles.actorAvatar, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                <Image
                    source={{ uri: item.actor.avatar_url || 'https://via.placeholder.com/100' }}
                    style={styles.avatar}
                />
            </View>
            <View style={styles.content}>
                <Text style={[styles.text, { color: colors.text }]}>
                    <Text style={[styles.bold, { color: colors.text }]}>{item.actor.username || 'User'}</Text> {item.action}
                </Text>
                <Text style={[styles.time, { color: colors.textSecondary }]}>{getTimeAgo(item.created_at)}</Text>
            </View>
            <View style={[styles.typeIcon, { backgroundColor: item.type === 'like' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 138, 0, 0.1)' }]}>
                <Ionicons
                    name={item.type === 'like' ? 'heart' : 'notifications'}
                    size={16}
                    color={item.type === 'like' ? '#EF4444' : Colors.primary}
                />
            </View>
        </GlassCard>
    );

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
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                <TouchableOpacity style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={22} color={colors.text} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching updates...</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                <Ionicons name="notifications-off-outline" size={48} color={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>All caught up!</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>No new notifications at the moment.</Text>
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
        // backgroundColor handled by theme
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
        // color handled by theme
    },
    settingsButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
        gap: 12,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: Layout.radius.l,
        borderWidth: 1,
    },
    unreadDot: {
        position: 'absolute',
        top: 16,
        left: 8,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
    actorAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    text: {
        ...Typography.body,
        fontSize: 14,
        lineHeight: 20,
    },
    bold: {
        fontWeight: '700',
    },
    time: {
        fontSize: 11,
        marginTop: 4,
    },
    typeIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...Typography.body,
        marginTop: 12,
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
});

export default NotificationsScreen;
