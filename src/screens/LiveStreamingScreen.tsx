import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  TextInput,
  Alert,
  FlatList,
  Modal,
  Image,
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../config';

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

const { width, height } = Dimensions.get('window');

// --- Real System Logic ---

const LiveStreamingScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors: userTheme, theme: currentTheme } = useTheme();
  const { user } = useAuth();

  const [isLive, setIsLive] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState(`room_${user?.id || 'test'}`);
  const [viewerCount, setViewerCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('My Live Stream');

  const [messages, setMessages] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [heartCount, setHeartCount] = useState(0);

  const liveAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList>(null);

  // 1. Fetch Token from Backend
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/live/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            participantName: user?.user_metadata?.username || user?.email?.split('@')[0] || 'Host'
          })
        });
        const data = await response.json();
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } catch (err) {
        console.error('Failed to get token:', err);
        Alert.alert('Error', 'Could not connect to live streaming server');
      }
    };
    if (user) fetchToken();
  }, [user, roomName]);

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 2. Realtime Chat Subscription
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel(`live_chat:${roomName}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_messages',
        filter: `room_name=eq.${roomName}`
      }, async (payload) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.user_id)
          .single();

        const newMessage = {
          id: payload.new.id,
          username: profile?.username || 'User',
          avatar_url: profile?.avatar_url,
          text: payload.new.text
        };
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLive, roomName]);

  const startLive = async () => {
    try {
      // 1. Start on Backend
      const response = await fetch(`${API_BASE_URL}/live/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          title: title,
          roomName: roomName
        })
      });

      if (!response.ok) throw new Error('Failed to start stream');

      setIsLive(true);

      // Track live stream started event
      trackEvent(AnalyticsEvents.LIVE_STREAM_STARTED, {
        room_id: roomName,
        title: title,
      });
    } catch (err) {
      console.error('Start error:', err);
      Alert.alert('Error', 'Failed to start live stream');
    }
  };

  const endLive = async () => {
    Alert.alert('End Stream', 'Are you sure you want to end your live stream?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE_URL}/live/end`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId: roomName })
            });

            setIsLive(false);

            // Track live stream ended event
            trackEvent(AnalyticsEvents.LIVE_STREAM_ENDED, {
              room_id: roomName,
              title: title,
              duration_seconds: duration,
            });

            navigation.goBack();
          } catch (err) {
            console.error('End error:', err);
            navigation.goBack(); // Close anyway
          }
        }
      }
    ]);
  };

  const sendMessage = async () => {
    if (!newComment.trim()) return;
    const text = newComment;
    setNewComment('');
    await supabase.from('live_messages').insert({
      room_name: roomName,
      user_id: user?.id,
      text: text
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {token && serverUrl ? (
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          connect={true} // Always connect to PREVIEW until live
          video={true}
          audio={true}
        >
          <RoomView
            isLive={isLive}
            startLive={startLive}
            endLive={endLive}
            messages={messages}
            newComment={newComment}
            setNewComment={setNewComment}
            sendMessage={sendMessage}
            userTheme={userTheme}
            navigation={navigation}
            heartCount={heartCount}
            onPressHeart={() => setHeartCount(c => c + 1)}
            title={title}
            setTitle={setTitle}
            roomName={roomName}
            durationString={formatDuration(duration)}
          />
        </LiveKitRoom>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={{ color: 'white' }}>Initializing...</Text>
        </View>
      )}
    </View>
  );
};

const RoomView = ({ isLive, startLive, endLive, messages, newComment, setNewComment, sendMessage, userTheme, navigation, heartCount, onPressHeart, title, setTitle, roomName, durationString }: any) => {
  const tracks = useTracks([Track.Source.Camera]);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const flatListRef = useRef<FlatList>(null);

  // Periodically update viewer count on backend
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const count = participants.length > 0 ? participants.length - 1 : 0; // Exclude host
      fetch(`${API_BASE_URL}/live/count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomName, count })
      }).catch(e => console.log('Count update failed', e));
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [isLive, participants.length, roomName]);

  const toggleCamera = async () => {
    if (localParticipant) {
      const videoTrackPub = Array.from(localParticipant.videoTrackPublications.values())[0];
      if (videoTrackPub && videoTrackPub.track) {
        // @ts-ignore
        const currentFacingMode = videoTrackPub.track.mediaStreamTrack.getSettings().facingMode;
        // @ts-ignore
        await videoTrackPub.track.restart({
          facingMode: currentFacingMode === 'user' ? 'environment' : 'user'
        });
      }
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Background Video */}
      {tracks.length > 0 ? (
        <VideoTrack trackRef={tracks[0]} style={styles.camera} />
      ) : (
        <View style={[styles.camera, { backgroundColor: '#111' }]} />
      )}

      {/* Floating Hearts Layer */}
      <FloatingHearts count={heartCount} />

      {/* Overlay HUD */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => isLive ? endLive() : navigation.goBack()} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>

            {isLive && (
              <LinearGradient colors={['#FF4B2B', '#FF416C']} style={styles.liveBadge}>
                <Text style={styles.liveText}>LIVE</Text>
              </LinearGradient>
            )}
          </View>

          <View style={styles.headerRight}>
            {isLive && (
              <View style={styles.statBadge}>
                <Ionicons name="eye" size={16} color="#FFF" />
                <Text style={styles.statText}>{participants.length > 1 ? participants.length - 1 : 0}</Text>
              </View>
            )}
            {isLive && (
              <View style={[styles.statBadge, { marginLeft: 8 }]}>
                <Text style={styles.statText}>{durationString}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={toggleCamera}>
              <Ionicons name="camera-reverse-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {!isLive && (
          <View style={styles.preLiveContent}>
            <TextInput
              style={styles.titleInput}
              placeholder="Enter stream title..."
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />
            <TouchableOpacity style={styles.goLiveMainBtn} onPress={startLive}>
              <Text style={styles.goLiveText}>GO LIVE</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLive && (
          <View style={styles.bottomArea} pointerEvents="box-none">
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({ item }) => (
                <View style={styles.chatBubble}>
                  <Text style={styles.chatUser}>{item.username}</Text>
                  <Text style={styles.chatText}>{item.text}</Text>
                </View>
              )}
              keyExtractor={item => item.id}
              style={styles.chatList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
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

              <TouchableOpacity style={styles.heartBtn} onPress={onPressHeart}>
                <Ionicons name="heart" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', gap: 12 },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center'
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center'
  },
  liveBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  liveText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  preLiveContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  titleInput: {
    width: '100%', backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12, padding: 16, color: '#FFF', fontSize: 18, marginBottom: 20
  },
  goLiveMainBtn: {
    backgroundColor: '#FF8A00', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30
  },
  goLiveText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },

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
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8
  },
  statText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4
  }
});

export default LiveStreamingScreen;