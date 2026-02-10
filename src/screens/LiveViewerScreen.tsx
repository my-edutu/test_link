import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  TextInput,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  useRoomContext,
} from '@livekit/react-native';
import { Track, RoomEvent, ConnectionState, DisconnectReason } from 'livekit-client';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { liveService } from '../services/liveService';
import * as Network from 'expo-network';

const { width, height } = Dimensions.get('window');

// --- Floating Hearts Animation Component ---
const HeartIcon = ({ style }: { style: any }) => {
  const [color] = useState(['#ff4b2b', '#ff416c', '#6a11cb', '#2575fc', '#f9d423'][Math.floor(Math.random() * 5)]);
  return (
    <Animated.View style={style}>
      <Ionicons name="heart" size={30} color={color} />
    </Animated.View>
  );
};

const FloatingHearts = ({ count }: { count: number }) => {
  const [hearts, setHearts] = useState<any[]>([]);

  useEffect(() => {
    if (count > 0) {
      const id = Date.now();
      const animation = new Animated.Value(0);
      const xOffset = Math.random() * 100 - 50;

      setHearts(prev => [...prev, { id, animation, xOffset }]);

      Animated.timing(animation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }).start(() => {
        setHearts(prev => prev.filter(h => h.id !== id));
      });
    }
  }, [count]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {hearts.map(heart => {
        const translateY = heart.animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -height * 0.6],
        });
        const opacity = heart.animation.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = heart.animation.interpolate({
          inputRange: [0, 0.2],
          outputRange: [0.5, 1.2],
          extrapolate: 'clamp',
        });
        const rotate = heart.animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${heart.xOffset * 0.5}deg`],
        });

        return (
          <HeartIcon
            key={heart.id}
            style={{
              position: 'absolute',
              bottom: 80,
              right: 20,
              transform: [{ translateY }, { translateX: heart.xOffset }, { scale }, { rotate }],
              opacity,
            }}
          />
        );
      })}
    </View>
  );
};

const MAX_TOKEN_RETRIES = 3;

const LiveViewerScreen: React.FC<any> = ({ navigation, route }) => {
  const { roomId } = route.params;
  const { user } = useAuth();
  const { colors: userTheme } = useTheme();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [liveStream, setLiveStream] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [heartCount, setHeartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Connection state management
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenFetchRetries, setTokenFetchRetries] = useState(0);

  // 1. Fetch Stream Metadata and Token with retry mechanism
  useEffect(() => {
    const setup = async (retryAttempt: number = 0) => {
      setTokenError(null);

      try {
        // Check network connectivity first
        const netState = await Network.getNetworkStateAsync();
        if (!netState.isConnected || !netState.isInternetReachable) {
          throw new Error('NO_NETWORK');
        }

        // 1. Get stream info (optional metadata)
        const { data: stream, error: streamError } = await supabase
          .from('live_streams')
          .select('*, profiles:streamer_id(*)')
          .eq('id', roomId)
          .single();

        if (streamError) {
          console.warn('[LiveViewer] Could not fetch stream metadata:', streamError);
        }
        setLiveStream(stream);

        // Check if stream is still live
        if (stream && stream.is_live === false) {
          Alert.alert('Stream Ended', 'This stream has already ended.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
          return;
        }

        // 2. Get token from liveService
        const participantName = user?.user_metadata?.username || 'Viewer';
        console.log('[LiveViewer] Fetching token for room:', roomId, 'attempt:', retryAttempt + 1);

        const { token: newToken, serverUrl: newServerUrl } = await liveService.getJoinToken(roomId, participantName);

        console.log('[LiveViewer] Token received:', {
          hasToken: !!newToken,
          serverUrl: newServerUrl
        });

        setToken(newToken);
        setServerUrl(newServerUrl);
        setTokenError(null);
        setTokenFetchRetries(0);
      } catch (err: any) {
        console.error('[LiveViewer] Setup error:', err);

        // Determine specific error type
        let errorMessage = 'Could not connect to stream';
        let shouldRetry = true;

        if (err.message === 'NO_NETWORK') {
          errorMessage = 'No internet connection. Please check your network.';
          shouldRetry = false;
        } else if (err.message?.includes('Authentication required') || err.message?.includes('401')) {
          errorMessage = 'Session expired. Please log in again.';
          shouldRetry = false;
        } else if (err.message?.includes('500') || err.message?.includes('502') || err.message?.includes('503')) {
          errorMessage = 'Server is temporarily unavailable. Retrying...';
        } else if (err.message?.includes('Network request failed')) {
          errorMessage = 'Could not reach server. Checking connection...';
        }

        setTokenError(errorMessage);

        // Retry logic with exponential backoff
        if (shouldRetry && retryAttempt < MAX_TOKEN_RETRIES) {
          const delay = Math.pow(2, retryAttempt) * 1000;
          console.log(`[LiveViewer] Retrying in ${delay}ms (attempt ${retryAttempt + 1}/${MAX_TOKEN_RETRIES})`);
          setTokenFetchRetries(retryAttempt + 1);
          setTimeout(() => setup(retryAttempt + 1), delay);
        } else if (!shouldRetry || retryAttempt >= MAX_TOKEN_RETRIES) {
          const finalMessage = shouldRetry
            ? 'Could not connect after multiple attempts. The stream may be unavailable.'
            : errorMessage;

          Alert.alert(
            'Connection Error',
            finalMessage,
            [
              { text: 'Go Back', onPress: () => navigation.goBack(), style: 'cancel' },
              { text: 'Retry', onPress: () => { setTokenFetchRetries(0); setup(0); } }
            ]
          );
        }
      } finally {
        setLoading(false);
      }
    };

    setup(0);
  }, [roomId, user, navigation]);

  // 2. Chat Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`live_chat:${roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_streams',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        if (payload.new.is_live === false) {
          Alert.alert('Stream Ended', 'The host has ended the stream.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_messages',
        filter: `room_name=eq.${roomId}`
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.user_id)
          .single();

        setMessages(prev => [...prev, {
          id: payload.new.id,
          username: profile?.username || 'User',
          text: payload.new.text
        }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, navigation]);

  const sendMessage = async () => {
    if (!newComment.trim()) return;
    const text = newComment;
    setNewComment('');
    await supabase.from('live_messages').insert({
      room_name: roomId,
      user_id: user?.id,
      text: text
    });
  };

  if (loading || !token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8A00" />
        <Text style={{ color: 'white', fontSize: 16, marginTop: 16 }}>
          {tokenError || 'Connecting to stream...'}
        </Text>
        {tokenFetchRetries > 0 && !tokenError?.includes('No internet') && (
          <Text style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
            Retry attempt {tokenFetchRetries}/{MAX_TOKEN_RETRIES}...
          </Text>
        )}
        {tokenError && (
          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: '#FF8A00',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 25,
            }}
            onPress={() => {
              setTokenError(null);
              setTokenFetchRetries(0);
              setLoading(true);
              setToken(null);
              setServerUrl(null);
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Retry Connection</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ marginTop: 16 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#888' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LiveKitRoom
        serverUrl={serverUrl || "wss://lingualink-wrnisht2.livekit.cloud"}
        token={token}
        connect={true}
        audio={true}
        video={true}
        onConnected={() => console.log('[LiveViewer] Room connected!')}
        onDisconnected={() => console.log('[LiveViewer] Room disconnected')}
        onError={(error) => {
          console.error('[LiveViewer] Room error:', error);
          const errorMessage = error?.message || 'Unknown error';
          if (errorMessage.includes('token') || errorMessage.includes('expired')) {
            Alert.alert('Session Error', 'Your session has expired. Please rejoin the stream.', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }
        }}
      >
        <ViewerContent
          navigation={navigation}
          liveStream={liveStream}
          heartCount={heartCount}
          messages={messages}
          newComment={newComment}
          setNewComment={setNewComment}
          sendMessage={sendMessage}
          setHeartCount={setHeartCount}
        />
      </LiveKitRoom>
    </View>
  );
};

const ViewerContent = ({ navigation, liveStream, heartCount, messages, newComment, setNewComment, sendMessage, setHeartCount }: any) => {
  const participants = useParticipants();
  const room = useRoomContext();
  const insets = useSafeAreaInsets();

  // Reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Monitor room connection state with reconnection handling
  useEffect(() => {
    if (!room) return;

    const handleReconnecting = () => {
      console.log('[LiveViewer] Reconnecting to server...');
      setIsReconnecting(true);
      setReconnectAttempt(prev => prev + 1);
    };

    const handleReconnected = () => {
      console.log('[LiveViewer] Reconnected successfully!');
      setIsReconnecting(false);
      setReconnectAttempt(0);
    };

    const handleDisconnected = (reason?: DisconnectReason) => {
      console.log('[LiveViewer] Disconnected, reason:', reason);
      setIsReconnecting(false);

      let message = 'Disconnected from stream';
      let shouldGoBack = false;

      switch (reason) {
        case DisconnectReason.DUPLICATE_IDENTITY:
          message = 'You joined from another device. This session has ended.';
          shouldGoBack = true;
          break;
        case DisconnectReason.ROOM_DELETED:
          message = 'The stream has ended.';
          shouldGoBack = true;
          break;
        case DisconnectReason.PARTICIPANT_REMOVED:
          message = 'You have been removed from the stream.';
          shouldGoBack = true;
          break;
        case DisconnectReason.JOIN_FAILURE:
          message = 'Failed to join the stream. Please check your connection.';
          break;
        case DisconnectReason.CLIENT_INITIATED:
          return;
        default:
          message = 'Connection lost. Please try rejoining.';
      }

      if (shouldGoBack) {
        Alert.alert('Stream Ended', message, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Connection Lost', message, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    };

    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, navigation]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Reconnecting Overlay */}
      {isReconnecting && (
        <View style={styles.reconnectingOverlay}>
          <View style={styles.reconnectingBox}>
            <ActivityIndicator size="large" color="#FF8A00" />
            <Text style={styles.reconnectingText}>Reconnecting...</Text>
            <Text style={styles.reconnectingSubtext}>
              Attempt {reconnectAttempt}
            </Text>
          </View>
        </View>
      )}

      <RemoteVideoView />

      <SafeAreaView style={styles.overlay} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Top Header */}
          <View style={styles.header}>
            <View style={styles.streamerPill}>
              <Image
                source={{ uri: liveStream?.profiles?.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.streamerName}>{liveStream?.profiles?.username || 'Streamer'}</Text>
                <Text style={styles.viewerCount}>{participants.length > 0 ? participants.length : 1} viewers</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <FloatingHearts count={heartCount} />

            {/* Bottom Area with manual bottom safe area padding */}
            <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 16) }]} pointerEvents="box-none">
              <FlatList
                data={messages}
                renderItem={({ item }) => (
                  <View style={styles.chatBubble}>
                    <Text style={styles.chatUser}>{item.username}</Text>
                    <Text style={styles.chatText}>{item.text}</Text>
                  </View>
                )}
                keyExtractor={item => item.id}
                style={styles.chatList}
              />

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Say something..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={newComment}
                  onChangeText={setNewComment}
                  onSubmitEditing={sendMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                  <Ionicons name="send" size={20} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.heartBtn} onPress={() => setHeartCount((c: number) => c + 1)}>
                  <Ionicons name="heart" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const RemoteVideoView = () => {
  const tracks = useTracks([Track.Source.Camera]);
  if (tracks.length === 0) return <View style={[styles.video, { backgroundColor: '#111' }]} />;
  return <VideoTrack trackRef={tracks[0]} style={styles.video} />;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center'
  },
  streamerPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6, borderRadius: 25, gap: 10
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  streamerName: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  viewerCount: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center'
  },
  bottomArea: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  chatList: { maxHeight: 200, marginBottom: 16 },
  chatBubble: {
    backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 12,
    marginBottom: 8, alignSelf: 'flex-start', maxWidth: '80%'
  },
  chatUser: { color: '#FF8A00', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  chatText: { color: '#FFF', fontSize: 14 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  chatInput: {
    flex: 1, height: 50, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25, paddingHorizontal: 20, color: '#FFF'
  },
  sendBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#FF8A00', justifyContent: 'center', alignItems: 'center'
  },
  heartBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#FF416C', justifyContent: 'center', alignItems: 'center'
  },
  reconnectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  reconnectingBox: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  reconnectingText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  reconnectingSubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
});

export default LiveViewerScreen;
