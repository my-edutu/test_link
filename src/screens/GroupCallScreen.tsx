// src/screens/GroupCallScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  ActivityIndicator,
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
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { requestCallToken } from '../services/calling';
import { useAuth } from '../context/AuthProvider';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'GroupCall'>;

const GroupCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const { group } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await requestCallToken(group.id, user?.id || 'anonymous', false);
        setToken(response.token);
        setServerUrl(response.serverUrl);

        // #region agent log
        // Debug logs removed for production
        // #endregion
      } catch (err) {
        // #region agent log
        // Debug logs removed for production
        // #endregion
        Alert.alert('Error', 'Could not join group call');
        navigation.goBack();
      }
    };
    fetchToken();
  }, [group.id]);

  if (!token || !serverUrl) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#FF8A00" size="large" />
      </View>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      video={true}
      audio={true}
    >
      <GroupCallContent group={group} navigation={navigation} insets={insets} />
    </LiveKitRoom>
  );
};

const GroupCallContent = ({ group, navigation, insets }: any) => {
  const tracks = useTracks([Track.Source.Camera]);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View style={[styles.statusHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.statusInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.callStatus}>
            Group Call • {formatDuration(callDuration)} • {participants.length} online
          </Text>
        </View>
        <TouchableOpacity style={styles.minimizeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <ScrollView contentContainerStyle={styles.participantsGrid}>
        {tracks.map((track, index) => (
          <View key={track.participant.sid} style={styles.participantContainer}>
            <VideoTrack trackRef={track} style={styles.participantVideo} />
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>
                {track.participant.identity} {track.participant.isLocal ? '(You)' : ''}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Controls */}
      <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={[styles.controlButton, isMuted && styles.activeControlButton]} onPress={toggleMute}>
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, isVideoOff && styles.activeControlButton]} onPress={toggleVideo}>
            <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.endCallButton]} onPress={() => navigation.goBack()}>
            <Ionicons name="call" size={24} color="#FFFFFF" />
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
  groupName: {
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
  participantsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  participantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  participantContainer: {
    width: '48%',
    aspectRatio: 0.75,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  participantVideo: {
    flex: 1,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yourVideo: {
    borderWidth: 2,
    borderColor: '#FF8A00',
  },
  participantVideoOff: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatar: {
    fontSize: 40,
    marginBottom: 10,
  },
  participantVideoOffOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  participantVideoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  participantInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flex: 1,
  },
  mutedIndicator: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderRadius: 10,
    padding: 2,
    marginLeft: 4,
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

export default GroupCallScreen;