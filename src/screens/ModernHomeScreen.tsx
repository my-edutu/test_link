import React from 'react';
import { NewtonCradleLoader } from '../components/NewtonCradleLoader';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Animated,
    Dimensions
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
// ... rest of imports

// ... inside component
// Hooks removed from top level 
// Erroneous top-level code removed
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors, Gradients, Typography, Layout } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from '../components/GlassCard';
import { PulseMic } from '../components/PulseMic';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import { VoiceClipInteractions } from '../components/VoiceClipInteractions';
import { getGlobalFeed, FeedItem } from '../utils/content';
import { FeedVideo } from '../components/FeedVideo';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { liveService, LiveStream } from '../services/liveService';

import { StoriesRail } from '../components/StoriesRail';

const SILHOUETTE_AVATAR = 'https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/www/public/avatars/01.png';

const { width } = Dimensions.get('window');
// Initial header height = Row(60) + Tabs(40) + Padding
const HEADER_HEIGHT = 90;

export default function ModernHomeScreen() {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const { user: clerkUser } = useAuth();
    const { colors, isDark } = useTheme();
    const [activeTab, setActiveTab] = React.useState<'feed' | 'live'>('feed');
    const [clips, setClips] = React.useState<FeedItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [visibleVideoId, setVisibleVideoId] = React.useState<string | null>(null);
    const [liveStreams, setLiveStreams] = React.useState<LiveStream[]>([]);
    const [liveLoading, setLiveLoading] = React.useState(false);
    const [stories, setStories] = React.useState<any[]>([]);
    const [showNotifs, setShowNotifs] = React.useState(false);
    const horizontalScrollRef = React.useRef<ScrollView>(null);
    const feedScrollRef = React.useRef<ScrollView>(null);

    const { currentPlayingId, isLoadingAudio, playAudio, stopAudio } = useAudioPlayback();

    // Stop media when screen loses focus
    React.useEffect(() => {
        if (!isFocused) {
            if (currentPlayingId) stopAudio();
            setVisibleVideoId(null);
        }
    }, [isFocused]);

    const handleScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const layoutHeight = event.nativeEvent.layoutMeasurement.height;

        // Roughly check which video item is in the middle of the screen
        // Each clip card is roughly 400-500px high
        // We'll simplify: the logic here is to find the ID of the item closest to the center
        // In a more robust implementation, we'd use viewabilityConfig with FlatList
    };

    const fetchLiveStreams = React.useCallback(async () => {
        setLiveLoading(true);
        try {
            const streams = await liveService.getActiveStreams();
            setLiveStreams(streams);
        } catch (error) {
            console.error('Error fetching live streams:', error);
        } finally {
            setLiveLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchClips();
        fetchStories();

        const channel = supabase
            .channel('global_feed')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voice_clips' }, () => fetchClips())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'video_clips' }, () => fetchClips())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => {
                fetchClips();
                fetchStories();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Fetch live streams when the live tab becomes active
    React.useEffect(() => {
        if (activeTab === 'live') {
            fetchLiveStreams();
        }
    }, [activeTab, fetchLiveStreams]);

    const [myStory, setMyStory] = React.useState<any>(null);

    const fetchStories = async () => {
        try {
            // Fetch recent stories
            const { data, error } = await supabase
                .from('stories')
                .select(`
                    id, 
                    user_id, 
                    created_at,
                    media_url,
                    profiles:user_id ( username, avatar_url )
                `)
                .gt('expires_at', new Date().toISOString()) // Only active stories
                .order('created_at', { ascending: false })
                .limit(20);

            if (data) {
                // Map to StoriesRail format
                const formatted = data.map((s: any) => ({
                    id: s.id,
                    user_id: s.user_id,
                    username: s.profiles?.username || 'User',
                    avatar_url: s.profiles?.avatar_url || SILHOUETTE_AVATAR,
                    media_url: s.media_url,
                    has_unseen: true, // Mock logic for now
                    is_me: s.user_id === clerkUser?.id
                }));

                // Group by user, taking the latest story for each
                const uniqueStoriesMap = new Map();
                formatted.forEach((item: any) => {
                    if (!uniqueStoriesMap.has(item.user_id)) {
                        uniqueStoriesMap.set(item.user_id, item);
                    }
                });

                const uniqueStories = Array.from(uniqueStoriesMap.values());

                // Separate my story
                const myLatestStory = uniqueStories.find((s: any) => s.user_id === clerkUser?.id);
                const othersStories = uniqueStories.filter((s: any) => s.user_id !== clerkUser?.id);

                setStories(othersStories);
                setMyStory(myLatestStory || null);
            }
        } catch (e) {
            console.error('Fetch stories error:', e);
        }
    };

    const fetchClips = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await getGlobalFeed(30);
            setClips(data);
        } catch (error) {
            console.error('Error fetching global feed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const renderClipItem = (item: any) => (
        <GlassCard key={`${item.item_type}-${item.id}`} style={styles.clipCard} intensity={30}>
            <View style={styles.clipHeader}>
                <TouchableOpacity
                    style={styles.clipUserInfo}
                    onPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}
                >
                    <Image
                        source={{ uri: item.profiles?.avatar_url || SILHOUETTE_AVATAR }}
                        style={styles.clipAvatar}
                    />
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={[styles.clipUserName, { color: colors.text }]}>{item.profiles?.full_name || 'User'}</Text>
                            {item.item_type === 'video' && <MaterialIcons name="videocam" size={14} color={Colors.primary} />}
                            {item.item_type === 'story' && <MaterialIcons name="auto-stories" size={14} color="#8B5CF6" />}
                        </View>
                        <Text style={[styles.clipMeta, { color: colors.textSecondary }]}>@{item.profiles?.username || 'user'} • {formatTimeAgo(item.created_at)}</Text>
                    </View>
                </TouchableOpacity>
                <View style={[styles.langBadge, item.item_type === 'story' && { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                    <Text style={[styles.langText, item.item_type === 'story' && { color: '#8B5CF6' }]}>{item.language}</Text>
                </View>
            </View>

            <View style={styles.clipContent}>
                <Text style={[styles.clipPhrase, { color: colors.text }]}>{item.phrase}</Text>
                {item.translation && <Text style={[styles.clipTranslation, { color: colors.textMuted }]}>{item.translation}</Text>}
            </View>

            <View style={styles.playerRow}>
                {item.item_type === 'voice' ? (
                    <>
                        <TouchableOpacity
                            style={[styles.playBtn, currentPlayingId === item.id && { backgroundColor: Colors.secondary }]}
                            onPress={() => playAudio(item.id, item.media_url)}
                            disabled={isLoadingAudio === item.id}
                        >
                            {isLoadingAudio === item.id ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <MaterialIcons
                                    name={currentPlayingId === item.id ? "pause" : "play-arrow"}
                                    size={24}
                                    color="#FFF"
                                />
                            )}
                        </TouchableOpacity>
                        <View style={styles.waveContainer}>
                            {[10, 20, 15, 25, 10, 15, 20, 12, 18, 14, 22, 10].map((h, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.waveBar,
                                        { height: h },
                                        currentPlayingId === item.id && { backgroundColor: colors.text, opacity: 0.8 }
                                    ]}
                                />
                            ))}
                        </View>
                        <Text style={[styles.durationText, { color: colors.textSecondary }]}>{item.duration ? `${item.duration}s` : '0:05s'}</Text>
                    </>
                ) : item.item_type === 'video' ? (
                    <FeedVideo
                        videoUrl={item.media_url}
                        thumbnailUrl={item.thumbnail_url}
                        isActive={visibleVideoId === item.id}
                    />
                ) : (
                    <TouchableOpacity
                        style={[styles.playBtn, { width: '100%', borderRadius: 12, height: 250, backgroundColor: '#000', overflow: 'hidden' }]}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('StoryView', { story: item })}
                    >
                        <Image
                            source={{ uri: item.media_url || item.thumbnail_url || item.profiles?.avatar_url || SILHOUETTE_AVATAR }}
                            style={{ width: '100%', height: '100%', opacity: 0.7 }}
                            resizeMode="cover"
                        />
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                            <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                                <MaterialIcons name="auto-stories" size={32} color="#FFF" />
                            </View>
                            <Text style={{ color: '#FFF', fontWeight: 'bold', marginTop: 12, fontSize: 16 }}>View Story</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.clipActions}>
                <VoiceClipInteractions
                    clipId={item.id}
                    targetType={item.item_type}
                    showCommentButton={item.item_type === 'voice'}
                />
                {item.item_type === 'voice' && (
                    <TouchableOpacity
                        style={styles.duetButton}
                        onPress={() => navigation.navigate('DuetRecord', { parentClipId: item.id, parentUsername: item.profiles?.username })}
                    >
                        <MaterialIcons name="mic-none" size={20} color={Colors.primary} />
                        <Text style={[styles.actionCount, { color: Colors.primary }]}>Duet</Text>
                    </TouchableOpacity>
                )}
            </View>
        </GlassCard >
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

            {/* Header: Fixed */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top,
                        backgroundColor: colors.background,
                    }
                ]}
            >
                <View style={[styles.headerContent, { paddingHorizontal: Layout.spacing.l }]}>
                    <View style={[styles.headerRow, { backgroundColor: colors.background }]}>
                        <View style={styles.userNameContainer}>
                            <Text style={[styles.userNameText, { color: colors.text }]}>LinguaLink</Text>
                        </View>

                        <View style={styles.headerRight}>
                            <View style={styles.headerMicBox}>
                                <PulseMic onPress={() => navigation.navigate('RecordVoice')} />
                            </View>
                            <TouchableOpacity onPress={() => navigation.navigate('Menu')} style={styles.profileBtn}>
                                <Image source={{ uri: clerkUser?.imageUrl || SILHOUETTE_AVATAR }} style={styles.headerAvatar} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Tab Bar Container */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            onPress={() => {
                                setActiveTab('feed');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                horizontalScrollRef.current?.scrollTo({ x: 0, animated: true });
                            }}
                            style={styles.tabItem}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'feed' ? colors.primary : colors.textMuted }]}>View Feed</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                setActiveTab('live');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                horizontalScrollRef.current?.scrollTo({ x: width, animated: true });
                            }}
                            style={styles.tabItem}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'live' ? colors.primary : colors.textMuted }]}>View Live</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Notifications Modal */}
            <Modal
                visible={showNotifs}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowNotifs(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowNotifs(false)}
                >
                    <View style={[styles.notifDropdown, { top: insets.top + 60 }]}>
                        <GlassCard intensity={80} style={styles.notifContent}>
                            <View style={[styles.notifHeader, { borderBottomColor: colors.glassBorder }]}>
                                <Text style={[styles.notifTitle, { color: colors.text }]}>Notifications</Text>
                                <MaterialIcons name="notifications-active" size={16} color={Colors.primary} />
                            </View>
                            <View style={styles.notifList}>
                                <Text style={[styles.emptyNotifText, { color: colors.textMuted }]}>No new notifications</Text>
                            </View>
                        </GlassCard>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Swipable Content */}
            <ScrollView
                ref={horizontalScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(ev) => {
                    const newIndex = Math.round(ev.nativeEvent.contentOffset.x / width);
                    setActiveTab(newIndex === 0 ? 'feed' : 'live');
                }}
                contentContainerStyle={{ paddingTop: insets.top + 100 }} // Ensure this clears the header height
            >
                {/* Feed Page */}
                <View style={{ width, height: '100%' }}>
                    {loading && clips.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <NewtonCradleLoader />
                        </View>
                    ) : (
                        <ScrollView
                            ref={feedScrollRef}
                            contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: 10 }}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={() => fetchClips(true)} tintColor={Colors.primary} />
                            }
                            scrollEventThrottle={16}
                            onScroll={(event) => {
                                // Simplified visibility detection for ScrollView
                                const y = event.nativeEvent.contentOffset.y;
                                // Assuming roughly 400px per card for now
                                const index = Math.floor((y + 150) / 450);
                                if (clips[index] && clips[index].item_type === 'video') {
                                    if (visibleVideoId !== clips[index].id) {
                                        setVisibleVideoId(clips[index].id);
                                    }
                                } else if (visibleVideoId !== null) {
                                    setVisibleVideoId(null);
                                }
                            }}
                        >
                            {/* Stories Rail at Top of Feed */}
                            <StoriesRail stories={stories} currentUserStory={myStory} />

                            <View style={{ paddingHorizontal: Layout.spacing.l }}>
                                {clips.map(clip => renderClipItem(clip))}
                            </View>
                        </ScrollView>
                    )}
                </View>

                {/* Live Page */}
                <View style={{ width, height: '100%' }}>
                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80 }}
                        refreshControl={
                            <RefreshControl refreshing={liveLoading} onRefresh={fetchLiveStreams} tintColor={Colors.primary} />
                        }
                    >
                        {/* Go Live Button */}
                        <TouchableOpacity
                            style={styles.startLiveBtn}
                            onPress={() => navigation.navigate('LiveStream', { isHost: true })}
                        >
                            <LinearGradient
                                colors={['#FF4B2B', '#FF416C']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.startLiveGradient}
                            >
                                <MaterialIcons name="videocam" size={24} color="#FFF" />
                                <Text style={styles.startLiveText}>Go Live</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {liveLoading && liveStreams.length === 0 ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                                <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>Loading streams...</Text>
                            </View>
                        ) : liveStreams.length === 0 ? (
                            <GlassCard intensity={20} style={styles.livePlaceholder}>
                                <MaterialIcons name="live-tv" size={48} color={colors.textMuted} />
                                <Text style={[styles.liveTitle, { color: colors.text }]}>No Live Streams</Text>
                                <Text style={[styles.liveSubtitle, { color: colors.textSecondary }]}>Be the first to go live and practice languages!</Text>
                            </GlassCard>
                        ) : (
                            <View style={{ gap: 16 }}>
                                <Text style={[styles.liveSectionTitle, { color: colors.text }]}>Live Now</Text>
                                {liveStreams.map((stream) => (
                                    <TouchableOpacity
                                        key={stream.id}
                                        onPress={() => navigation.navigate('LiveViewer', { roomId: stream.id })}
                                    >
                                        <GlassCard intensity={30} style={styles.liveStreamCard}>
                                            <View style={styles.liveStreamHeader}>
                                                <Image
                                                    source={{ uri: stream.avatarUrl || SILHOUETTE_AVATAR }}
                                                    style={styles.liveStreamerAvatar}
                                                />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.liveStreamerName, { color: colors.text }]}>{stream.username || 'Anonymous'}</Text>
                                                    <Text style={[styles.liveStreamTitle, { color: colors.textSecondary }]} numberOfLines={1}>{stream.title}</Text>
                                                </View>
                                                <View style={styles.liveBadgeSmall}>
                                                    <View style={styles.liveDotSmall} />
                                                    <Text style={styles.liveBadgeText}>LIVE</Text>
                                                </View>
                                            </View>
                                            <View style={styles.liveStreamStats}>
                                                <View style={styles.viewerCount}>
                                                    <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.6)" />
                                                    <Text style={styles.viewerCountText}>{stream.viewerCount || '0'} watching</Text>
                                                </View>
                                                <TouchableOpacity style={styles.joinLiveBtn}>
                                                    <Text style={styles.joinLiveText}>Join</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </GlassCard>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </ScrollView>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: '#1F0800', // Solid BG to cover content
        overflow: 'hidden', // clips the collapsing tab bar
    },
    headerContent: {
        width: '100%',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        zIndex: 101, // Ensure top row stays above the collapsing part
        backgroundColor: '#1F0800',
    },
    userNameContainer: { flexDirection: 'row', alignItems: 'center' },
    userNameText: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    headerMicBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.5 }] },
    profileBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary, overflow: 'hidden' },
    headerAvatar: { width: '100%', height: '100%' },

    // Collapsible Tab Container
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        gap: 20, // Reduced gap
        paddingBottom: 8,
    },
    tabItem: { paddingVertical: 4, paddingHorizontal: 8 },
    tabText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
    activeTabText: { color: Colors.primary },

    content: { paddingHorizontal: Layout.spacing.l },
    clipCard: { marginBottom: 16, padding: 16 },
    clipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    clipUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    clipAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)' },
    clipUserName: { fontWeight: 'bold', color: '#FFF', fontSize: 14 },
    clipMeta: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
    langBadge: { backgroundColor: 'rgba(255,138,0,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    langText: { color: Colors.primary, fontSize: 10, fontWeight: 'bold' },
    clipContent: { marginBottom: 16 },
    clipPhrase: { ...Typography.h3, color: '#FFF', marginBottom: 4 },
    clipTranslation: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },
    playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    waveContainer: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
    waveBar: { width: 3, borderRadius: 1.5, backgroundColor: Colors.primary, opacity: 0.5 },
    durationText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
    clipActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 },
    actionCount: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
    duetButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,138,0,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    liveContainer: { padding: 20 },
    livePlaceholder: { padding: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
    liveTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 16 },
    liveSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 },
    goLiveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginTop: 24 },
    goLiveText: { color: '#FFF', fontWeight: 'bold' },
    startLiveBtn: { marginBottom: 20 },
    startLiveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10 },
    startLiveText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    liveSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
    liveStreamCard: { padding: 16, borderRadius: 16 },
    liveStreamHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    liveStreamerAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FF4B2B' },
    liveStreamerName: { fontSize: 16, fontWeight: 'bold' },
    liveStreamTitle: { fontSize: 14, marginTop: 2 },
    liveBadgeSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF4B2B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    liveDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
    liveBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    liveStreamStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    viewerCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    viewerCountText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
    joinLiveBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16 },
    joinLiveText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'transparent' },
    notifDropdown: { position: 'absolute', right: 20, width: 280, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
    notifContent: { padding: 16, borderRadius: 16 },
    notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 10, marginBottom: 10 },
    notifTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
    notifList: { minHeight: 100, justifyContent: 'center', alignItems: 'center' },
    emptyNotifText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});
