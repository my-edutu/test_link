import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../config';

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

  // 1. Fetch Stream Metadata and Token
  useEffect(() => {
    const setup = async () => {
      try {
        // Get stream info
        const { data: stream } = await supabase
          .from('live_streams')
          .select('*, profiles:streamer_id(*)')
          .eq('id', roomId)
          .single();

        setLiveStream(stream);

        // Get token from backend
        const response = await fetch(`${API_BASE_URL}/live/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: roomId,
            participantName: user?.user_metadata?.username || 'Viewer'
          })
        });
        const data = await response.json();
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } catch (err) {
        console.error('Setup error:', err);
      } finally {
        setLoading(false);
      }
    };

    setup();
  }, [roomId, user]);

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
        <Text style={{ color: 'white' }}>Connecting to stream...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LiveKitRoom
        serverUrl={serverUrl || "wss://lingualink-rtmp.livekit.cloud"}
        token={token}
        connect={true}
        audio={true}
        video={true}
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

  return (
    <View style={StyleSheet.absoluteFill}>
      <RemoteVideoView />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
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

        {/* Bottom Area */}
        <FloatingHearts count={heartCount} />

        <View style={styles.bottomArea} pointerEvents="box-none">
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
  }
});

export default LiveViewerScreen;
