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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/react-native';
import { Track, RoomEvent, ConnectionState } from 'livekit-client';
import { requestCallToken, generateCallId } from '../services/calling';
import { useAuth } from '../context/AuthProvider';
import ReportModal, { ReportReason } from '../components/ReportModal';
import { API_BASE_URL } from '../config';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoCall'>;

const VideoCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { contact } = route.params;
  const { user } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch LiveKit token on mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const userId = user?.id || 'anonymous';
        const callId = generateCallId(userId, contact.id);
        const response = await requestCallToken(callId, userId, true);
        setToken(response.token);
        setServerUrl(response.serverUrl);
      } catch (err) {
        console.error('Failed to get call token:', err);
        setError('Could not connect to call server');
        Alert.alert('Error', 'Could not connect to call server', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    };

    fetchToken();
  }, [user, contact.id, navigation]);

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

  if (!token || !serverUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing call...</Text>
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
        userId={user?.id}
      />
    </LiveKitRoom>
  );
};

interface VideoCallContentProps {
  contact: any;
  navigation: any;
  insets: any;
  userId?: string;
}

const VideoCallContent: React.FC<VideoCallContentProps> = ({ contact, navigation, insets, userId }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteParticipantConnected, setRemoteParticipantConnected] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Get local and remote video tracks
  const localVideoTrack = tracks.find(
    (track) => track.participant.isLocal && track.source === Track.Source.Camera
  );
  const remoteVideoTrack = tracks.find(
    (track) => !track.participant.isLocal && track.source === Track.Source.Camera
  );

  // Handle room events
  useEffect(() => {
    if (!room) return;

    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      Alert.alert('Call Ended', 'The call has been disconnected.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    };

    const handleParticipantConnected = () => {
      setRemoteParticipantConnected(true);
    };

    const handleParticipantDisconnected = () => {
      setRemoteParticipantConnected(false);
      Alert.alert('Participant Left', 'The other participant has left the call.', [
        { text: 'OK', onPress: () => endCall() }
      ]);
    };

    const handleError = (error: Error) => {
      console.error('Room error:', error);
      Alert.alert('Connection Error', error.message);
    };

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.MediaDevicesError, handleError);

    // Check if already connected
    if (room.state === ConnectionState.Connected) {
      setIsConnected(true);
    }

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.MediaDevicesError, handleError);
    };
  }, [room, navigation]);

  // Check for remote participants
  useEffect(() => {
    const remoteParticipants = participants.filter(p => !p.isLocal);
    setRemoteParticipantConnected(remoteParticipants.length > 0);
  }, [participants]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  // Pulse animation for connecting state
  useEffect(() => {
    if (!remoteParticipantConnected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [remoteParticipantConnected, pulseAnim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = useCallback(() => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this video call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => {
            if (room) {
              room.disconnect();
            }
            navigation.goBack();
          }
        }
      ]
    );
  }, [room, navigation]);

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

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn(!isSpeakerOn);
    // Note: Speaker control requires native module integration
  }, [isSpeakerOn]);

  const switchCamera = useCallback(async () => {
    if (localParticipant) {
      const videoTrackPub = Array.from(localParticipant.videoTrackPublications.values())[0];
      if (videoTrackPub && videoTrackPub.track) {
        try {
          // @ts-ignore - accessing mediaStreamTrack for facingMode
          const currentFacingMode = videoTrackPub.track.mediaStreamTrack?.getSettings?.()?.facingMode;
          // @ts-ignore - restart with new constraints
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

      {/* Call Status Header */}
      <View style={[styles.statusHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.statusInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.callStatus}>
            {remoteParticipantConnected
              ? `Video Call - ${formatDuration(callDuration)}`
              : 'Connecting...'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.minimizeButton}
          onPress={() => {
            Alert.alert('Minimize', 'Video call minimized');
          }}
        >
          <Ionicons name="remove" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Video Call UI */}
      <View style={styles.videoContainer}>
        {/* Remote video area */}
        <View style={styles.remoteVideo}>
          {remoteParticipantConnected && remoteVideoTrack ? (
            <VideoTrack
              trackRef={remoteVideoTrack}
              style={styles.remoteVideoFeed}
            />
          ) : (
            <View style={styles.connectingContainer}>
              <Animated.View style={[
                styles.avatarContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}>
                <Text style={styles.avatarText}>{contact.avatar}</Text>
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
              <Text style={styles.videoOffText}>Video Off</Text>
            </View>
          ) : localVideoTrack ? (
            <VideoTrack
              trackRef={localVideoTrack}
              style={styles.localVideoFeed}
              mirror={true}
            />
          ) : (
            <View style={styles.localVideoFeed}>
              <Text style={styles.localVideoText}>You</Text>
            </View>
          )}
        </View>
      </View>

      {/* Translation Status */}
      <View style={styles.translationContainer}>
        <View style={styles.translationIndicator}>
          <Ionicons name="language" size={16} color="#10B981" />
          <Text style={styles.translationText}>
            Real-time translation: Your Language - {contact.language}
          </Text>
        </View>
      </View>

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              isMuted && styles.activeControlButton
            ]}
            onPress={toggleMute}
          >
            <Ionicons
              name={isMuted ? "mic-off" : "mic"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Video Toggle Button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              isVideoOff && styles.activeControlButton
            ]}
            onPress={toggleVideo}
          >
            <Ionicons
              name={isVideoOff ? "videocam-off" : "videocam"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Speaker Button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              isSpeakerOn && styles.activeControlButton
            ]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name={isSpeakerOn ? "volume-high" : "volume-low"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Switch Camera Button */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={switchCamera}
          >
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={endCall}
          >
            <Ionicons name="call" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Additional Controls */}
        <View style={styles.additionalControls}>
          <TouchableOpacity style={styles.additionalButton}>
            <Ionicons name="chatbubble" size={20} color="#9CA3AF" />
            <Text style={styles.additionalButtonText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.additionalButton}>
            <Ionicons name="people" size={20} color="#9CA3AF" />
            <Text style={styles.additionalButtonText}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.additionalButton}
            onPress={() => setShowReportModal(true)}
          >
            <Ionicons name="flag-outline" size={20} color="#EF4444" />
            <Text style={[styles.additionalButtonText, { color: '#EF4444' }]}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={async (reason, details) => {
          if (!userId || !contact.id) {
            throw new Error('Unable to submit report');
          }
          try {
            const response = await fetch(`${API_BASE_URL}/moderation/report`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
              },
              body: JSON.stringify({
                reportedUserId: contact.id,
                reason,
                additionalDetails: details,
              }),
            });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Failed to submit report');
            }
          } catch (error: any) {
            throw new Error(error.message || 'Failed to submit report');
          }
        }}
        reportedUserName={contact.name}
      />
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
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
  },
  avatarText: {
    fontSize: 60,
  },
  connectingText: {
    fontSize: 18,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  localVideo: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 120,
    height: 160,
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
  translationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  translationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  translationText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControlButton: {
    backgroundColor: '#FF8A00',
  },
  endCallButton: {
    backgroundColor: '#EF4444',
  },
  additionalControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  additionalButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  additionalButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default VideoCallScreen;
