import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Image,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    LiveKitRoom,
    VideoTrack,
    useTracks,
    useRoomContext,
    useParticipantInfo,
    useLocalParticipant,
    useParticipants
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { liveService } from '../services/liveService';

const { width, height } = Dimensions.get('window');

// --- Real System Logic: Chat & Profiles ---

interface ChatMessage {
    id: string;
    user_id: string;
    username: string;
    avatar_url?: string;
    text: string;
    created_at: string;
}

const LiveStreamHUD = ({ roomName, hostProfile, viewerCount }: { roomName: string, hostProfile: any, viewerCount: number }) => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const tracks = useTracks([Track.Source.Camera]);

    // Format viewer count (1.2k for 1200, etc.)
    const formatViewerCount = (count: number) => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        }
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}k`;
        }
        return count.toString();
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            {/* The Video Layer */}
            {tracks.length > 0 ? (
                <VideoTrack trackRef={tracks[0]} style={styles.fullVideo} />
            ) : (
                <View style={[styles.fullVideo, { backgroundColor: '#000' }]}>
                    <Text style={{ color: '#fff' }}>Waiting for host...</Text>
                </View>
            )}

            {/* Top Overlay */}
            <SafeAreaView style={styles.headerOverlay}>
                <View style={styles.headerLeft}>
                    <LinearGradient
                        colors={['#A033FF', '#7012CE']}
                        style={styles.liveBadge}
                    >
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </LinearGradient>

                    <View style={styles.viewerBadge}>
                        <Ionicons name="eye-outline" size={14} color="white" />
                        <Text style={styles.viewerCount}>{formatViewerCount(viewerCount)}</Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIconButton}>
                        <FontAwesome name="gift" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerIconButton}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialIcons name="close" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Host Info Floating Right */}
            {hostProfile && (
                <View style={styles.hostPill}>
                    <Image source={{ uri: hostProfile.avatar_url }} style={styles.hostAvatar} />
                    <TouchableOpacity style={styles.followBtn}>
                        <MaterialIcons name="add" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const ChatOverlay = ({ roomName }: { roomName: string }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        // Fetch existing messages (last 20)
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('live_messages')
                .select(`
                    id, 
                    user_id, 
                    text, 
                    created_at,
                    profiles:user_id (username, avatar_url)
                `)
                .eq('room_name', roomName)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                const formatted = data.map((m: any) => ({
                    id: m.id,
                    user_id: m.user_id,
                    text: m.text,
                    created_at: m.created_at,
                    username: m.profiles?.username || 'User',
                    avatar_url: m.profiles?.avatar_url
                })).reverse();
                setMessages(formatted);
            }
        };

        fetchMessages();

        // Subscribe to Realtime
        const channel = supabase
            .channel(`live_chat:${roomName}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'live_messages',
                filter: `room_name=eq.${roomName}`
            }, async (payload) => {
                // Fetch profile for the new message
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('id', payload.new.user_id)
                    .single();

                const newMessage: ChatMessage = {
                    id: payload.new.id,
                    user_id: payload.new.user_id,
                    text: payload.new.text,
                    created_at: payload.new.created_at,
                    username: profile?.username || 'User',
                    avatar_url: profile?.avatar_url
                };
                setMessages(prev => [...prev, newMessage]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomName]);

    const sendMessage = async () => {
        if (!inputText.trim() || !user) return;

        const text = inputText;
        setInputText('');

        const { error } = await supabase
            .from('live_messages')
            .insert({
                room_name: roomName,
                user_id: user.id,
                text: text
            });

        if (error) console.error('Error sending message:', error.message);
    };

    const renderItem = ({ item }: { item: ChatMessage }) => (
        <View style={styles.chatBubbleContainer}>
            <Image
                source={item.avatar_url ? { uri: item.avatar_url } : require('../../assets/avatar_placeholder.png')}
                style={styles.chatAvatar}
            />
            <View style={styles.chatTextContent}>
                <Text style={styles.chatUsername}>{item.username}</Text>
                <Text style={styles.chatMessageText}>{item.text}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.chatWrapper}>
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                style={styles.chatList}
            />

            <View style={styles.inputBar}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Say something..."
                        placeholderTextColor="rgba(255,255,255,0.7)"
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity>
                        <FontAwesome name="microphone" size={18} color="white" style={{ marginHorizontal: 10 }} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                    <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.shareBtn}>
                    <Ionicons name="share-social-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Inner component that has access to LiveKit room context for viewer count
const LiveStreamContent = ({ roomName, hostProfile }: { roomName: string, hostProfile: any }) => {
    const participants = useParticipants();
    // Viewer count = total participants (includes host, so subtract 1 for viewers only)
    const viewerCount = Math.max(0, participants.length - 1);

    return (
        <>
            <LiveStreamHUD roomName={roomName} hostProfile={hostProfile} viewerCount={viewerCount} />
            <ChatOverlay roomName={roomName} />
        </>
    );
};

export default function LiveStreamScreen() {
    const route = useRoute<any>();
    const { roomName, hostId } = route.params || { roomName: 'test-room', hostId: null };
    const { user } = useAuth();
    const [token, setToken] = useState<string | null>(null);
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const [hostProfile, setHostProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const setup = async () => {
            try {
                // 1. Fetch Host Profile
                if (hostId) {
                    const { data } = await supabase.from('profiles').select('*').eq('id', hostId).single();
                    setHostProfile(data);
                }

                // 2. Get LiveKit Token from our NestJS Backend
                const participantName = user?.email?.split('@')[0] || 'Guest';
                const { token, serverUrl } = await liveService.getJoinToken(roomName, participantName);
                setToken(token);
                setServerUrl(serverUrl);
            } catch (err) {
                console.error('Setup error:', err);
            } finally {
                setLoading(false);
            }
        };

        setup();
    }, [roomName, hostId, user]);

    if (loading || !token || !serverUrl) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white' }}>Joining stream...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LiveKitRoom
                serverUrl={serverUrl}
                token={token}
                connect={true}
                audio={true}
                video={true}
            >
                <LiveStreamContent roomName={roomName} hostProfile={hostProfile} />
            </LiveKitRoom>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' }, // Immersive video context stays dark
    fullVideo: { width: width, height: height, position: 'absolute' },

    headerOverlay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        zIndex: 100
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
    liveText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    viewerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6
    },
    viewerCount: { color: 'white', fontSize: 12, fontWeight: '500' },

    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center'
    },

    hostPill: {
        position: 'absolute',
        right: 15,
        top: height * 0.35,
        alignItems: 'center',
        gap: -10
    },
    hostAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#A033FF'
    },
    followBtn: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#A033FF',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },

    chatWrapper: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        paddingBottom: 20,
        paddingHorizontal: 15,
        zIndex: 100
    },
    chatList: { maxHeight: 200, marginBottom: 15 },
    chatBubbleContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 15,
        alignSelf: 'flex-start',
        maxWidth: '85%'
    },
    chatAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
    chatTextContent: { flex: 1 },
    chatUsername: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
    chatMessageText: { color: 'white', fontSize: 14 },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 50
    },
    textInput: { flex: 1, color: 'white', fontSize: 14 },
    sendBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#A033FF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    shareBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FF8A00',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
