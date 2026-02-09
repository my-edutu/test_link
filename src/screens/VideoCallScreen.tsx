// src/screens/VideoCallScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  AudioSession,
} from '@livekit/react-native';
import { Track, RoomEvent, ConnectionState, DisconnectReason } from 'livekit-client';
import { requestCallToken, generateCallId, logCallStart, logCallAnswered, logCallEnd, CallError } from '../services/calling';
import { callSignaling } from '../services/callSignaling';
import { useAuth } from '../context/AuthProvider';
import * as Network from 'expo-network';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'VideoCall'>;

const VideoCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { contact } = route.params;
  const { user } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(true);
  const [callAccepted, setCallAccepted] = useState(false);

  // Configure audio session for video calls (speaker by default)
  useEffect(() => {
    const configureAudio = async () => {
      await AudioSession.configureAudio({
        android: {
          preferredOutputList: ['speaker'],
          audioTypeOptions: {
            audioAttributesUsageType: 'voiceCommunication',
            audioAttributesContentType: 'speech',
          },
        },
        ios: {
          defaultOutput: 'speaker',
        },
      });
      await AudioSession.startAudioSession();
    };

    configureAudio();

    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  // Check if this is an incoming call (navigated from IncomingCallScreen)
  const isIncomingCall = useRef(callSignaling.hasActiveCall()).current;

  // Initiate call signaling if this is an outgoing call
  useEffect(() => {
    if (!user?.id || isIncomingCall) {
      // For incoming calls, we're already connected via signaling
      setIsWaitingForAnswer(false);
      setCallAccepted(true);
      return;
    }

    const userName = user.fullName || user.username || 'User';
    const userAvatar = user.imageUrl;

    // Generate call ID and initiate signaling
    const sorted = [user.id, contact.id].sort();
    const newCallId = `${sorted[0]}_${sorted[1]}_${Date.now()}`;
    setCallId(newCallId);

    callSignaling.initiateCall(
      newCallId,
      contact.id,
      userName,
      userAvatar,
      'video'
    );

    // Listen for call acceptance/decline
    const checkCallStatus = setInterval(() => {
      const activeCall = callSignaling.getActiveCall();
      if (activeCall) {
        if (activeCall.status === 'accepted') {
          setCallAccepted(true);
          setIsWaitingForAnswer(false);
          clearInterval(checkCallStatus);
        } else if (activeCall.status === 'declined' || activeCall.status === 'missed') {
          clearInterval(checkCallStatus);
          Alert.alert(
            activeCall.status === 'declined' ? 'Call Declined' : 'No Answer',
            `${contact.name} ${activeCall.status === 'declined' ? 'declined' : 'did not answer'} your call.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }
    }, 500);

    return () => {
      clearInterval(checkCallStatus);
    };
  }, [user, contact.id, isIncomingCall, navigation]);

  // Fetch LiveKit token when call is accepted - with improved error handling
  useEffect(() => {
    if (!callAccepted) return;

    const fetchToken = async () => {
      try {
        // Network check
        const netState = await Network.getNetworkStateAsync();
        if (!netState.isConnected || !netState.isInternetReachable) {
          setError('No internet connection');
          Alert.alert(
            'No Connection',
            'Please check your internet connection and try again.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        const userId = user?.id || 'anonymous';
        const generatedCallId = callId || generateCallId(userId, contact.id);
        if (!callId) setCallId(generatedCallId);

        console.log('[VideoCall] Fetching token for call:', generatedCallId);

        const response = await requestCallToken(generatedCallId, userId, !isIncomingCall);
        setToken(response.token);
        setServerUrl(response.serverUrl);

        // Log call start to history (only for initiator)
        if (!isIncomingCall) {
          logCallStart(generatedCallId, contact.id, 'video');
        }
      } catch (err: any) {
        console.error('[VideoCall] Failed to get call token:', err);

        // Handle specific error types
        let errorMessage = 'Could not connect to call server';
        let errorTitle = 'Connection Error';

        if (err instanceof CallError) {
          errorMessage = err.message;
          if (err.code === 'AUTH_ERROR') {
            errorTitle = 'Session Expired';
          } else if (err.code === 'NO_NETWORK') {
            errorTitle = 'No Connection';
          } else if (err.code === 'TIMEOUT') {
            errorTitle = 'Connection Timeout';
          }
        }

        setError(errorMessage);
        Alert.alert(errorTitle, errorMessage, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    };

    fetchToken();
  }, [callAccepted, user, contact.id, callId, isIncomingCall, navigation]);

  const handleCancelCall = useCallback(async () => {
    await callSignaling.cancelCall();
    navigation.goBack();
  }, [navigation]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show waiting/calling screen while waiting for answer
  if (isWaitingForAnswer) {
    return (
      <CallingScreen
        contact={contact}
        insets={insets}
        onCancel={handleCancelCall}
      />
    );
  }

  if (!token || !serverUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Connecting video call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      video={true}
      audio={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
    >
      <VideoCallContent
        contact={contact}
        navigation={navigation}
        insets={insets}
        callId={callId}
      />
    </LiveKitRoom>
  );
};

// Calling screen shown while waiting for answer
interface CallingScreenProps {
  contact: any;
  insets: any;
  onCancel: () => void;
}

const CallingScreen: React.FC<CallingScreenProps> = ({ contact, insets, onCancel }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const ring = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    ring.start();

    return () => {
      pulse.stop();
      ring.stop();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f0f0f']} style={StyleSheet.absoluteFill} />

      <View style={[styles.callingHeader, { paddingTop: insets.top + 20 }]}>
        <View style={styles.callingTypeContainer}>
          <Ionicons name="videocam" size={18} color="#FF8A00" />
          <Text style={styles.callingTypeText}>Video Call</Text>
        </View>
      </View>

      <View style={styles.callingContent}>
        <Animated.View
          style={[
            styles.ringEffect,
            {
              transform: [{ scale: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
              opacity: ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0.2, 0] }),
            },
          ]}
        />

        <Animated.View style={[styles.callingAvatar, { transform: [{ scale: pulseAnim }] }]}>
          {contact.avatarUrl ? (
            <Image source={{ uri: contact.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={['#FF8A00', '#FF6B00']} style={styles.avatarGradient}>
              <Text style={styles.avatarText}>
                {contact.avatar || contact.name?.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
        </Animated.View>

        <Text style={styles.callingName}>{contact.name}</Text>
        <Text style={styles.callingStatus}>Calling...</Text>
      </View>

      <View style={[styles.callingActions, { paddingBottom: insets.bottom + 40 }]}>
        <TouchableOpacity style={styles.cancelCallButton} onPress={onCancel}>
          <Ionicons name="call" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.cancelText}>Cancel</Text>
      </View>
    </SafeAreaView>
  );
};

interface VideoCallContentProps {
  contact: any;
  navigation: any;
  insets: any;
  callId: string | null;
}

const VideoCallContent: React.FC<VideoCallContentProps> = ({ contact, navigation, insets, callId }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [remoteParticipantConnected, setRemoteParticipantConnected] = useState(false);
  const [callAnswerLogged, setCallAnswerLogged] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const callDurationRef = useRef(callDuration);

  // Keep ref updated for disconnect handler
  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Get local and remote video tracks
  const localVideoTrack = tracks.find(
    (track) => track.participant.isLocal && track.source === Track.Source.Camera
  );
  const remoteVideoTrack = tracks.find(
    (track) => !track.participant.isLocal && track.source === Track.Source.Camera
  );

  // Handle room events with reconnection support
  useEffect(() => {
    if (!room) return;

    const handleConnected = () => {
      console.log('[VideoCall] Room connected');
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempt(0);
    };

    const handleReconnecting = () => {
      console.log('[VideoCall] Reconnecting...');
      setIsReconnecting(true);
      setReconnectAttempt(prev => prev + 1);
    };

    const handleReconnected = () => {
      console.log('[VideoCall] Reconnected successfully');
      setIsReconnecting(false);
      setReconnectAttempt(0);
    };

    const handleDisconnected = (reason?: DisconnectReason) => {
      console.log('[VideoCall] Disconnected, reason:', reason);
      setIsConnected(false);
      setIsReconnecting(false);
      callSignaling.endCall();

      // Determine message based on disconnect reason
      let message = `Call duration: ${formatTime(callDurationRef.current)}`;
      let title = 'Call Ended';

      if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
        title = 'Session Conflict';
        message = 'You joined this call from another device.';
      } else if (reason === DisconnectReason.ROOM_DELETED) {
        message = 'The call has been ended.';
      } else if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
        title = 'Removed';
        message = 'You have been removed from the call.';
      } else if (reason === DisconnectReason.JOIN_FAILURE) {
        title = 'Connection Failed';
        message = 'Could not join the call. Please check your connection.';
      }

      Alert.alert(title, message, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    };

    const handleParticipantConnected = () => {
      console.log('[VideoCall] Remote participant connected');
      setRemoteParticipantConnected(true);
    };

    const handleParticipantDisconnected = () => {
      console.log('[VideoCall] Remote participant disconnected');
      setRemoteParticipantConnected(false);
      Alert.alert('Participant Left', 'The other participant has left the call.', [
        { text: 'OK', onPress: () => endCall() }
      ]);
    };

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    if (room.state === ConnectionState.Connected) setIsConnected(true);

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room, navigation]);

  // Check for remote participants
  useEffect(() => {
    const remoteParticipants = participants.filter(p => !p.isLocal);
    const hasRemote = remoteParticipants.length > 0;
    setRemoteParticipantConnected(hasRemote);

    if (hasRemote && !callAnswerLogged && callId) {
      logCallAnswered(callId);
      setCallAnswerLogged(true);
    }
  }, [participants, callAnswerLogged, callId]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && remoteParticipantConnected) {
      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected, remoteParticipantConnected]);

  // Pulse animation for connecting state
  useEffect(() => {
    if (!remoteParticipantConnected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [remoteParticipantConnected]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (room) room.disconnect();
    };
  }, [room]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = useCallback(() => {
    if (callId) {
      logCallEnd(callId, callAnswerLogged ? 'caller_ended' : 'missed');
    }
    callSignaling.endCall();
    if (room) room.disconnect();
    navigation.goBack();
  }, [room, navigation, callId, callAnswerLogged]);

  const toggleMute = useCallback(async () => {
    if (localParticipant) {
      const newMuted = !isMuted;
      await localParticipant.setMicrophoneEnabled(!newMuted);
      setIsMuted(newMuted);
    }
  }, [localParticipant, isMuted]);

  const toggleVideo = useCallback(async () => {
    if (localParticipant) {
      const newVideoOff = !isVideoOff;
      await localParticipant.setCameraEnabled(!newVideoOff);
      setIsVideoOff(newVideoOff);
    }
  }, [localParticipant, isVideoOff]);

  const toggleSpeaker = useCallback(async () => {
    const newSpeakerOn = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerOn);

    await AudioSession.configureAudio({
      android: {
        preferredOutputList: newSpeakerOn ? ['speaker'] : ['earpiece'],
        audioTypeOptions: {
          audioAttributesUsageType: 'voiceCommunication',
          audioAttributesContentType: 'speech',
        },
      },
      ios: {
        defaultOutput: newSpeakerOn ? 'speaker' : 'earpiece',
      },
    });
  }, [isSpeakerOn]);

  const switchCamera = useCallback(async () => {
    if (localParticipant) {
      const videoTrackPub = Array.from(localParticipant.videoTrackPublications.values())[0];
      if (videoTrackPub && videoTrackPub.track) {
        try {
          // @ts-ignore
          const currentFacingMode = videoTrackPub.track.mediaStreamTrack?.getSettings?.()?.facingMode;
          // @ts-ignore
          await videoTrackPub.track.restartTrack({
            facingMode: currentFacingMode === 'user' ? 'environment' : 'user'
          });
        } catch (err) {
          console.error('Failed to switch camera:', err);
        }
      }
    }
  }, [localParticipant]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Reconnecting Overlay */}
      {isReconnecting && (
        <View style={styles.reconnectingOverlay}>
          <View style={styles.reconnectingBox}>
            <ActivityIndicator size="large" color="#FF8A00" />
            <Text style={styles.reconnectingTitle}>Reconnecting...</Text>
            <Text style={styles.reconnectingSubtitle}>
              Attempt {reconnectAttempt}
            </Text>
          </View>
        </View>
      )}

      {/* Call Status Header */}
      <View style={[styles.statusHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.statusInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.callStatus}>
            {isReconnecting
              ? 'Reconnecting...'
              : remoteParticipantConnected
                ? formatDuration(callDuration)
                : 'Connecting...'}
          </Text>
        </View>
        <TouchableOpacity style={styles.minimizeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Video Container */}
      <View style={styles.videoContainer}>
        {/* Remote video area */}
        <View style={styles.remoteVideo}>
          {remoteParticipantConnected && remoteVideoTrack ? (
            <VideoTrack trackRef={remoteVideoTrack} style={styles.remoteVideoFeed} />
          ) : (
            <View style={styles.connectingContainer}>
              <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
                {contact.avatarUrl ? (
                  <Image source={{ uri: contact.avatarUrl }} style={styles.waitingAvatarImage} />
                ) : (
                  <Text style={styles.waitingAvatarText}>
                    {contact.avatar || contact.name?.charAt(0).toUpperCase()}
                  </Text>
                )}
              </Animated.View>
              <Text style={styles.connectingText}>
                {isConnected ? `Waiting for ${contact.name}...` : 'Connecting...'}
              </Text>
            </View>
          )}
        </View>

        {/* Local video preview */}
        <View style={styles.localVideo}>
          {isVideoOff ? (
            <View style={styles.videoOffContainer}>
              <Ionicons name="videocam-off" size={20} color="#FFFFFF" />
              <Text style={styles.videoOffText}>Camera Off</Text>
            </View>
          ) : localVideoTrack ? (
            <VideoTrack trackRef={localVideoTrack} style={styles.localVideoFeed} mirror={true} />
          ) : (
            <View style={styles.localVideoFeed}>
              <Text style={styles.localVideoText}>You</Text>
            </View>
          )}
        </View>
      </View>

      {/* Call Controls */}
      <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.activeControlButton]}
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isVideoOff && styles.activeControlButton]}
            onPress={toggleVideo}
          >
            <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.activeControlButton]}
            onPress={toggleSpeaker}
          >
            <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
            <Ionicons name="call" size={24} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginTop: 16,
  },
  // Calling screen styles
  callingHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  callingTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callingTypeText: {
    color: '#FF8A00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  callingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringEffect: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#FF8A00',
  },
  callingAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    marginBottom: 24,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 56,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  callingName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  callingStatus: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  callingActions: {
    alignItems: 'center',
  },
  cancelCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 12,
  },
  // Active call styles
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  statusInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  callStatus: {
    fontSize: 14,
    color: '#10B981',
  },
  minimizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  remoteVideoFeed: {
    flex: 1,
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  waitingAvatarImage: {
    width: '100%',
    height: '100%',
  },
  waitingAvatarText: {
    fontSize: 60,
    color: '#FFFFFF',
  },
  connectingText: {
    fontSize: 18,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  localVideo: {
    position: 'absolute',
    top: 80,
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF8A00',
  },
  localVideoFeed: {
    flex: 1,
    backgroundColor: '#4B5563',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  localVideoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  videoOffContainer: {
    flex: 1,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOffText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 4,
  },
  controlsContainer: {
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControlButton: {
    backgroundColor: '#FF8A00',
  },
  endCallButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
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
  reconnectingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  reconnectingSubtitle: {
    color: '#888888',
    fontSize: 12,
    marginTop: 8,
  },
});

// Helper function for formatting time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default VideoCallScreen;
