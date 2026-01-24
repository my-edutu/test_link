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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App'; // Adjust path as needed

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'GroupCall'>;

const GroupCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const { group } = route.params;
  const insets = useSafeAreaInsets();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState([
    { id: '1', name: 'John', avatar: '🧑‍💼', isMuted: false, isVideoOff: false },
    { id: '2', name: 'Sarah', avatar: '👩‍💻', isMuted: true, isVideoOff: false },
    { id: '3', name: 'Mike', avatar: '👨‍🎨', isMuted: false, isVideoOff: true },
  ]);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Simulate call connection
    const connectionTimer = setTimeout(() => {
      setIsConnected(true);
    }, 3000);

    // Start call duration timer
    const durationTimer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearTimeout(connectionTimer);
      clearInterval(durationTimer);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to leave this group call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Call',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const switchCamera = () => {
    Alert.alert('Camera Switched', 'Switched to front/back camera');
  };

  const renderParticipant = (participant: any, index: number) => (
    <View key={participant.id} style={styles.participantContainer}>
      {participant.isVideoOff ? (
        <View style={styles.participantVideoOff}>
          <Text style={styles.participantAvatar}>{participant.avatar}</Text>
          <View style={styles.participantVideoOffOverlay}>
            <Ionicons name="videocam-off" size={16} color="#FFFFFF" />
          </View>
        </View>
      ) : (
        <View style={styles.participantVideo}>
          <Text style={styles.participantVideoText}>Video Feed</Text>
        </View>
      )}

      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{participant.name}</Text>
        {participant.isMuted && (
          <View style={styles.mutedIndicator}>
            <Ionicons name="mic-off" size={12} color="#EF4444" />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Call Status Header */}
      <View style={[styles.statusHeader, { paddingTop: insets.top + 10 }]}>
        <View style={styles.statusInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.callStatus}>
            {isConnected
              ? `Group Call • ${formatDuration(callDuration)} • ${activeParticipants.length + 1} participants`
              : 'Connecting...'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.minimizeButton}
          onPress={() => {
            Alert.alert('Minimize', 'Group call minimized');
          }}
        >
          <Ionicons name="remove" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Participants Grid */}
      <ScrollView style={styles.participantsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.participantsGrid}>
          {/* Your video */}
          <View style={styles.participantContainer}>
            {isVideoOff ? (
              <View style={styles.participantVideoOff}>
                <Text style={styles.participantAvatar}>👤</Text>
                <View style={styles.participantVideoOffOverlay}>
                  <Ionicons name="videocam-off" size={16} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={[styles.participantVideo, styles.yourVideo]}>
                <Text style={styles.participantVideoText}>You</Text>
              </View>
            )}
            <View style={styles.participantInfo}>
              <Text style={styles.participantName}>You</Text>
              {isMuted && (
                <View style={styles.mutedIndicator}>
                  <Ionicons name="mic-off" size={12} color="#EF4444" />
                </View>
              )}
            </View>
          </View>

          {/* Other participants */}
          {activeParticipants.map((participant, index) =>
            renderParticipant(participant, index)
          )}
        </View>
      </ScrollView>

      {/* Translation Status */}
      <View style={styles.translationContainer}>
        <View style={styles.translationIndicator}>
          <Ionicons name="language" size={16} color="#10B981" />
          <Text style={styles.translationText}>
            Real-time translation active for {group.language}
          </Text>
        </View>
      </View>

      {/* Call Controls */}
      <View style={[styles.controlsContainer, { paddingBottom: insets.bottom + 20 }]}>
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
            <Ionicons name="people-outline" size={20} color="#9CA3AF" />
            <Text style={styles.additionalButtonText}>Participants</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.additionalButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
            <Text style={styles.additionalButtonText}>More</Text>
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