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
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  useIsEncrypted,
} from '@livekit/react-native';
import { Track, RoomEvent, ConnectionState, DisconnectReason } from 'livekit-client';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { liveService } from '../services/liveService';
import { authFetch } from '../services/authFetch';
import * as Network from 'expo-network';

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
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Connection state management
  const [tokenFetchRetries, setTokenFetchRetries] = useState(0);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const MAX_TOKEN_RETRIES = 3;

  // 0. Request Camera and Microphone Permissions
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        try {
          const cameraPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'LinguaLink needs camera access for live streaming',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          const audioPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'LinguaLink needs microphone access for live streaming',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          const granted =
            cameraPermission === PermissionsAndroid.RESULTS.GRANTED &&
            audioPermission === PermissionsAndroid.RESULTS.GRANTED;

          console.log('[LiveStream] Permissions:', { cameraPermission, audioPermission, granted });

          if (granted) {
            setPermissionsGranted(true);
          } else {
            Alert.alert(
              'Permissions Required',
              'Camera and microphone permissions are required for live streaming.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        } catch (err) {
          console.error('Permission error:', err);
          Alert.alert('Error', 'Failed to request permissions.');
        }
      } else {
        // iOS handles permissions through Info.plist and system prompts
        setPermissionsGranted(true);
      }
    };

    requestPermissions();
  }, [navigation]);

  // 1. Fetch Token from Backend (only after permissions granted) - with retry mechanism
  useEffect(() => {
    if (!permissionsGranted || !user) {
      console.log('[LiveStream] Waiting for permissions/user:', { permissionsGranted, hasUser: !!user });
      return;
    }

    const fetchToken = async (retryAttempt: number = 0) => {
      setTokenError(null);

      try {
        // Check network connectivity first
        const netState = await Network.getNetworkStateAsync();
        if (!netState.isConnected || !netState.isInternetReachable) {
          throw new Error('NO_NETWORK');
        }

        const participantName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Host';
        console.log('[LiveStream] Fetching LiveKit token for room:', roomName, 'participant:', participantName, 'attempt:', retryAttempt + 1);

        const { token: newToken, serverUrl: newServerUrl } = await liveService.getJoinToken(roomName, participantName);

        console.log('[LiveStream] Token received:', {
          hasToken: !!newToken,
          tokenLength: newToken?.length,
          serverUrl: newServerUrl
        });

        setToken(newToken);
        setServerUrl(newServerUrl);
        setTokenError(null);
        setTokenFetchRetries(0);
      } catch (err: any) {
        console.error('[LiveStream] Failed to get token:', err);

        // Determine specific error type
        let errorMessage = 'Connection failed';
        let shouldRetry = true;

        if (err.message === 'NO_NETWORK') {
          errorMessage = 'No internet connection. Please check your network and try again.';
          shouldRetry = false;
        } else if (err.message?.includes('Authentication required') || err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          errorMessage = 'Session expired. Please log in again.';
          shouldRetry = false;
        } else if (err.message?.includes('403') || err.message?.includes('Forbidden')) {
          errorMessage = 'You do not have permission to stream. Please contact support.';
          shouldRetry = false;
        } else if (err.message?.includes('500') || err.message?.includes('502') || err.message?.includes('503')) {
          errorMessage = 'Server is temporarily unavailable. Retrying...';
        } else if (err.message?.includes('timeout') || err.message?.includes('TIMEOUT')) {
          errorMessage = 'Request timed out. Retrying...';
        } else if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
          errorMessage = 'Could not reach server. Checking connection...';
        }

        setTokenError(errorMessage);

        // Retry logic with exponential backoff
        if (shouldRetry && retryAttempt < MAX_TOKEN_RETRIES) {
          const delay = Math.pow(2, retryAttempt) * 1000; // 1s, 2s, 4s
          console.log(`[LiveStream] Retrying in ${delay}ms (attempt ${retryAttempt + 1}/${MAX_TOKEN_RETRIES})`);
          setTokenFetchRetries(retryAttempt + 1);
          setTimeout(() => fetchToken(retryAttempt + 1), delay);
        } else if (!shouldRetry || retryAttempt >= MAX_TOKEN_RETRIES) {
          // Final failure - show alert with specific message
          const finalMessage = shouldRetry
            ? 'Could not connect after multiple attempts. Please check your connection and try again.'
            : errorMessage;

          Alert.alert(
            'Connection Error',
            finalMessage,
            [
              { text: 'Go Back', onPress: () => navigation.goBack(), style: 'cancel' },
              { text: 'Retry', onPress: () => { setTokenFetchRetries(0); fetchToken(0); } }
            ]
          );
        }
      }
    };
    fetchToken(0);
  }, [user, roomName, permissionsGranted]);

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
      // Get user's primary language from profile metadata
      const userLanguage = user?.unsafeMetadata?.primary_language || user?.publicMetadata?.primary_language || 'English';
      const { roomId } = await liveService.startStream(title, userLanguage as string);
      setIsLive(true);

      // Track live stream started event
      trackEvent(AnalyticsEvents.LIVE_STREAM_STARTED, {
        room_id: roomName,
        title: title,
        language: userLanguage,
      });
    } catch (err) {
      console.error('Start error:', err);
      Alert.alert('Error', 'Failed to start live stream. Please ensure you are logged in.');
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
            await authFetch('/live/end', {
              method: 'POST',
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

      {!permissionsGranted ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8A00" />
          <Text style={{ color: 'white', fontSize: 16, marginTop: 16 }}>Requesting camera permissions...</Text>
        </View>
      ) : !token || !serverUrl ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8A00" />
          <Text style={{ color: 'white', fontSize: 16, marginTop: 16 }}>
            {tokenError || 'Connecting to stream server...'}
          </Text>
          {tokenFetchRetries > 0 && !tokenError?.includes('No internet') && (
            <Text style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
              Retry attempt {tokenFetchRetries}/{MAX_TOKEN_RETRIES}...
            </Text>
          )}
          {tokenError && (
            <TouchableOpacity
              style={{ marginTop: 20, backgroundColor: '#FF8A00', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 }}
              onPress={() => {
                setTokenError(null);
                setTokenFetchRetries(0);
                // Trigger re-fetch by updating roomName state briefly
                setToken(null);
                setServerUrl(null);
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Retry Connection</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          connect={true}
          video={true}
          audio={true}
          options={{
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
              facingMode: 'user',
            },
          }}
          onConnected={() => {
            console.log('[LiveStream] Room connected!');
            setConnectionError(null);
          }}
          onDisconnected={() => {
            console.log('[LiveStream] Room disconnected');
          }}
          onError={(error) => {
            console.error('[LiveStream] Room error:', error);
            // Parse error and show user-friendly message
            const errorMessage = error?.message || 'Unknown error';
            if (errorMessage.includes('token') || errorMessage.includes('expired')) {
              setConnectionError('Session expired. Please try again.');
            } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
              setConnectionError('Network error. Please check your connection.');
            } else {
              setConnectionError('Connection error. Retrying...');
            }
          }}
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
      )}
    </View>
  );
};

const RoomView = ({ isLive, startLive, endLive, messages, newComment, setNewComment, sendMessage, userTheme, navigation, heartCount, onPressHeart, title, setTitle, roomName, durationString }: any) => {
  const room = useRoomContext();
  // Get all camera tracks - both local and remote
  const allCameraTracks = useTracks([Track.Source.Camera]);
  const participants = useParticipants();
  const { localParticipant, cameraTrack, isCameraEnabled } = useLocalParticipant();
  const flatListRef = useRef<FlatList>(null);
  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [cameraReady, setCameraReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const insets = useSafeAreaInsets();

  // Reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);

  // Monitor room connection state with reconnection handling
  useEffect(() => {
    if (!room) {
      console.log('[LiveStream] Room context not available yet');
      return;
    }

    const handleConnectionChange = (state: ConnectionState) => {
      console.log('[LiveStream] Connection state changed:', state);
      setConnectionState(state);

      // Reset reconnection state when connected
      if (state === ConnectionState.Connected) {
        setIsReconnecting(false);
        setReconnectAttempt(0);
        setDisconnectReason(null);
      }
    };

    const handleTrackPublished = (publication: any) => {
      console.log('[LiveStream] Local track published:', publication?.kind);
      if (publication?.kind === 'video') {
        setCameraReady(true);
      }
    };

    const handleTrackSubscribed = (track: any) => {
      console.log('[LiveStream] Track subscribed:', track?.kind);
    };

    // Handle reconnecting event
    const handleReconnecting = () => {
      console.log('[LiveStream] Reconnecting to server...');
      setIsReconnecting(true);
      setReconnectAttempt(prev => prev + 1);
    };

    // Handle reconnected event
    const handleReconnected = () => {
      console.log('[LiveStream] Reconnected successfully!');
      setIsReconnecting(false);
      setReconnectAttempt(0);
    };

    // Handle disconnected event with reason
    const handleDisconnected = (reason?: DisconnectReason) => {
      console.log('[LiveStream] Disconnected, reason:', reason);
      setIsReconnecting(false);

      // Map disconnect reasons to user-friendly messages
      let message = 'Disconnected from stream';
      let shouldGoBack = false;

      switch (reason) {
        case DisconnectReason.DUPLICATE_IDENTITY:
          message = 'You joined from another device. This session has ended.';
          shouldGoBack = true;
          break;
        case DisconnectReason.ROOM_DELETED:
          message = 'The stream room has been closed.';
          shouldGoBack = true;
          break;
        case DisconnectReason.PARTICIPANT_REMOVED:
          message = 'You have been removed from the stream.';
          shouldGoBack = true;
          break;
        case DisconnectReason.JOIN_FAILURE:
          message = 'Failed to join the stream. Please check your connection and try again.';
          break;
        case DisconnectReason.CLIENT_INITIATED:
          // User intentionally disconnected, no message needed
          return;
        default:
          message = 'Connection lost. Please try rejoining the stream.';
      }

      setDisconnectReason(message);

      if (shouldGoBack) {
        Alert.alert('Stream Ended', message, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Connection Lost', message, [
          { text: 'Go Back', onPress: () => navigation.goBack(), style: 'cancel' },
          { text: 'Retry', onPress: () => setDisconnectReason(null) }
        ]);
      }
    };

    room.on(RoomEvent.ConnectionStateChanged, handleConnectionChange);
    room.on(RoomEvent.LocalTrackPublished, handleTrackPublished);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    // Check initial state
    setConnectionState(room.state);
    console.log('[LiveStream] Room initial state:', room.state);

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionChange);
      room.off(RoomEvent.LocalTrackPublished, handleTrackPublished);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [room, navigation]);

  // Enable camera after room connects - with retry mechanism
  useEffect(() => {
    const enableCamera = async () => {
      if (!room || !localParticipant) {
        console.log('[LiveStream] Waiting for room/localParticipant...', { hasRoom: !!room, hasLP: !!localParticipant });
        return;
      }

      if (room.state !== ConnectionState.Connected) {
        console.log('[LiveStream] Room not connected yet, state:', room.state);
        return;
      }

      try {
        console.log('[LiveStream] Attempting to enable camera (attempt', retryCount + 1, ')...');

        // Check if camera is already enabled
        if (isCameraEnabled) {
          console.log('[LiveStream] Camera already enabled');
          setCameraReady(true);
          return;
        }

        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('[LiveStream] Camera and mic enabled successfully');
        setCameraReady(true);
      } catch (err: any) {
        console.error('[LiveStream] Failed to enable camera:', err?.message || err);
        // Retry after a delay
        if (retryCount < 3) {
          setTimeout(() => setRetryCount(c => c + 1), 1000);
        }
      }
    };
    enableCamera();
  }, [room, room?.state, localParticipant, isCameraEnabled, retryCount]);

  // Debug: Log track state
  useEffect(() => {
    console.log('[LiveStream] Track debug:', {
      roomState: room?.state,
      hasLocalParticipant: !!localParticipant,
      hasCameraTrack: !!cameraTrack,
      isCameraEnabled: isCameraEnabled,
      cameraReady: cameraReady,
      allCameraTracks: allCameraTracks.length,
      localVideoTracks: localParticipant?.videoTrackPublications?.size || 0,
    });
  }, [room?.state, localParticipant, cameraTrack, isCameraEnabled, cameraReady, allCameraTracks.length]);

  // Build the local camera track reference
  const localCameraTrackRef = useMemo(() => {
    // First try from useLocalParticipant hook
    if (cameraTrack && localParticipant) {
      return { participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera };
    }
    // Fallback: find local track from all tracks
    const localTrack = allCameraTracks.find(t => t.participant?.isLocal);
    if (localTrack) {
      return localTrack;
    }
    return null;
  }, [cameraTrack, localParticipant, allCameraTracks]);

  // Periodically update viewer count on backend (authenticated)
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const count = participants.length > 0 ? participants.length - 1 : 0; // Exclude host
      authFetch('/live/count', {
        method: 'POST',
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
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        // @ts-ignore
        await videoTrackPub.track.restart({
          facingMode: newFacingMode
        });
        setIsFrontCamera(newFacingMode === 'user');
      }
    }
  };

  // Prefer local camera track for host preview, fallback to any available camera track
  const videoTrackRef = localCameraTrackRef || (allCameraTracks.length > 0 ? allCameraTracks[0] : null);

  // Get status message based on connection state
  const getStatusMessage = () => {
    if (connectionState !== 'connected') {
      return `Connecting to LiveKit... (${connectionState})`;
    }
    if (!isCameraEnabled && !cameraReady) {
      return `Enabling camera... (attempt ${retryCount + 1}/4)`;
    }
    if (!videoTrackRef) {
      return 'Waiting for camera track...';
    }
    return 'Camera ready';
  };

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

      {/* Background Video */}
      {videoTrackRef ? (
        <VideoTrack trackRef={videoTrackRef} style={styles.camera} mirror={isFrontCamera} />
      ) : (
        <View style={[styles.camera, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>{getStatusMessage()}</Text>
          <Text style={{ color: '#888', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
            Room: {connectionState} | Tracks: {allCameraTracks.length} | Camera: {isCameraEnabled ? 'ON' : 'OFF'}
          </Text>
          {connectionState === 'connected' && !videoTrackRef && retryCount >= 3 && (
            <TouchableOpacity
              style={{ marginTop: 20, backgroundColor: '#FF8A00', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}
              onPress={() => setRetryCount(0)}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Retry Camera</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Floating Hearts Layer */}
      <FloatingHearts count={heartCount} />

      {/* Overlay HUD */}
      <View style={[styles.overlay, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { ...StyleSheet.absoluteFillObject },
  mirroredCamera: { transform: [{ scaleX: -1 }] },
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

export default LiveStreamingScreen;