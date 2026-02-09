// src/screens/VoiceCallScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  Animated,
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

type Props = NativeStackScreenProps<RootStackParamList, 'VoiceCall'>;

const VoiceCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { contact } = route.params;
  const { user } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(true);
  const [callAccepted, setCallAccepted] = useState(false);

  // Configure audio session for voice calls
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
      'voice'
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

        console.log('[VoiceCall] Fetching token for call:', generatedCallId);

        const response = await requestCallToken(generatedCallId, userId, !isIncomingCall);
        setToken(response.token);
        setServerUrl(response.serverUrl);

        // Log call start to history (only for initiator)
        if (!isIncomingCall) {
          logCallStart(generatedCallId, contact.id, 'voice');
        }
      } catch (err: any) {
        console.error('[VoiceCall] Failed to get call token:', err);

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
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f0f0f']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={[styles.loadingText, { color: '#EF4444', marginTop: 16 }]}>{error}</Text>
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
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f0f0f']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Connecting call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      video={false}
      audio={true}
      options={{
        adaptiveStream: false,
        dynacast: false,
      }}
    >
      <VoiceCallContent
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
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Ring animation
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
          <Ionicons name="call" size={18} color="#FF8A00" />
          <Text style={styles.callingTypeText}>Voice Call</Text>
        </View>
      </View>

      <View style={styles.callingContent}>
        {/* Ring effect */}
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

interface VoiceCallContentProps {
  contact: any;
  navigation: any;
  insets: any;
  callId: string | null;
}

const VoiceCallContent: React.FC<VoiceCallContentProps> = ({ contact, navigation, insets, callId }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [remoteParticipantConnected, setRemoteParticipantConnected] = useState(false);
  const [callAnswerLogged, setCallAnswerLogged] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const callDurationRef = useRef(callDuration);

  // Keep ref updated for disconnect handler
  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Handle room events with reconnection support
  useEffect(() => {
    if (!room) return;

    const handleConnected = () => {
      console.log('[VoiceCall] Room connected');
      setCallStatus('connected');
      setReconnectAttempt(0);
    };

    const handleReconnecting = () => {
      console.log('[VoiceCall] Reconnecting...');
      setCallStatus('reconnecting');
      setReconnectAttempt(prev => prev + 1);
    };

    const handleReconnected = () => {
      console.log('[VoiceCall] Reconnected successfully');
      setCallStatus('connected');
      setReconnectAttempt(0);
    };

    const handleDisconnected = (reason?: DisconnectReason) => {
      console.log('[VoiceCall] Disconnected, reason:', reason);
      setCallStatus('ended');
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
      console.log('[VoiceCall] Remote participant connected');
      setRemoteParticipantConnected(true);
    };

    const handleParticipantDisconnected = () => {
      console.log('[VoiceCall] Remote participant disconnected');
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

    if (room.state === ConnectionState.Connected) setCallStatus('connected');

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
    if (callStatus === 'connected' && remoteParticipantConnected) {
      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus, remoteParticipantConnected]);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (room) room.disconnect();
    };
  }, [room]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = useCallback(() => {
    setCallStatus('ended');
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
      ios: { defaultOutput: newSpeakerOn ? 'speaker' : 'earpiece' },
    });
  }, [isSpeakerOn]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f0f0f']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={endCall} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Call</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Call Status */}
      <View style={styles.statusContainer}>
        {callStatus === 'reconnecting' && (
          <View style={styles.reconnectingBanner}>
            <ActivityIndicator size="small" color="#FF8A00" style={{ marginRight: 8 }} />
            <Text style={styles.reconnectingText}>
              Reconnecting{reconnectAttempt > 1 ? ` (attempt ${reconnectAttempt})` : ''}...
            </Text>
          </View>
        )}
        <Text style={styles.statusText}>
          {callStatus === 'connecting' && 'Connecting...'}
          {callStatus === 'connected' && (remoteParticipantConnected
            ? formatTime(callDuration)
            : `Waiting for ${contact.name}...`)}
          {callStatus === 'reconnecting' && formatTime(callDuration)}
          {callStatus === 'ended' && 'Call Ended'}
        </Text>
      </View>

      {/* Contact Info */}
      <View style={styles.contactContainer}>
        <Animated.View style={[styles.contactAvatar, { transform: [{ scale: pulseAnim }] }]}>
          {contact.avatarUrl ? (
            <Image source={{ uri: contact.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={['#FF8A00', '#FF6B00']} style={styles.avatarGradient}>
              <Text style={styles.contactAvatarText}>
                {contact.avatar || contact.name?.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          {remoteParticipantConnected && (
            <View style={styles.activeIndicator}>
              <Ionicons name="mic" size={14} color="#FFFFFF" />
            </View>
          )}
        </Animated.View>
        <Text style={styles.contactName}>{contact.name}</Text>
      </View>

      {/* Call Controls */}
      <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + 30 }]}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={26} color="#FFFFFF" />
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
          <Ionicons name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
          onPress={toggleSpeaker}
        >
          <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={26} color="#FFFFFF" />
          <Text style={styles.controlLabel}>Speaker</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  contactContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
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
  contactAvatarText: {
    fontSize: 64,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#10B981',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  controlButton: {
    alignItems: 'center',
    padding: 16,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 138, 0, 0.2)',
    borderRadius: 16,
  },
  controlLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 8,
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reconnectingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 138, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  reconnectingText: {
    color: '#FF8A00',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default VoiceCallScreen;
