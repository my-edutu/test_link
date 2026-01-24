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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  LiveKitRoom,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useRoomContext,
  AudioSession,
} from '@livekit/react-native';
import { Track, RoomEvent, ConnectionState } from 'livekit-client';
import { requestCallToken, generateCallId } from '../services/calling';
import { useAuth } from '../context/AuthProvider';

const { width, height } = Dimensions.get('window');

interface ChatContact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  language: string;
  isOnline: boolean;
}

type RootStackParamList = {
  VoiceCall: { contact: ChatContact };
};

type VoiceCallRouteProp = RouteProp<RootStackParamList, 'VoiceCall'>;
type VoiceCallNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VoiceCall'>;

interface Props {
  route: VoiceCallRouteProp;
  navigation: VoiceCallNavigationProp;
}

interface TranslationBubble {
  id: string;
  originalText: string;
  translatedText: string;
  speaker: 'me' | 'them';
  timestamp: string;
}

const VoiceCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { contact } = route.params;
  const { user } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Configure audio session for voice calls
  useEffect(() => {
    const configureAudio = async () => {
      await AudioSession.configureAudio({
        android: {
          preferredOutputList: ['speaker'],
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
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={[styles.loadingText, { color: '#EF4444', marginTop: 16 }]}>{error}</Text>
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
      />
    </LiveKitRoom>
  );
};

interface VoiceCallContentProps {
  contact: ChatContact;
  navigation: VoiceCallNavigationProp;
  insets: any;
}

const VoiceCallContent: React.FC<VoiceCallContentProps> = ({ contact, navigation, insets }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Microphone]);

  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [translations, setTranslations] = useState<TranslationBubble[]>([]);
  const [showTranslations, setShowTranslations] = useState(true);
  const [remoteParticipantConnected, setRemoteParticipantConnected] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const translateAnim = useRef(new Animated.Value(0)).current;

  // Handle room events
  useEffect(() => {
    if (!room) return;

    const handleConnected = () => {
      setCallStatus('connected');
    };

    const handleDisconnected = () => {
      setCallStatus('ended');
      Alert.alert('Call Ended', `Call duration: ${formatTime(callDuration)}`, [
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
      setCallStatus('connected');
    }

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.MediaDevicesError, handleError);
    };
  }, [room, navigation, callDuration]);

  // Check for remote participants
  useEffect(() => {
    const remoteParticipants = participants.filter(p => !p.isLocal);
    setRemoteParticipantConnected(remoteParticipants.length > 0);
  }, [participants]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Pulse animation for avatar
  useEffect(() => {
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
  }, [pulseAnim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [room]);

  // Simulate real-time translations (for demo purposes)
  useEffect(() => {
    if (callStatus !== 'connected') return;

    const mockTranslations = [
      {
        originalText: "Ndewo, kedu ka i mere?",
        translatedText: "Hello, how are you doing?",
        speaker: 'them' as const,
      },
      {
        originalText: "I'm doing well, thank you!",
        translatedText: "Ana m eme nke oma, daalu!",
        speaker: 'me' as const,
      },
      {
        originalText: "Achoro m ikoro gi banyere ihe omuma",
        translatedText: "I want to tell you about something interesting",
        speaker: 'them' as const,
      },
      {
        originalText: "That sounds great, I'm listening",
        translatedText: "Nke ahu di mma, ana m ege nti",
        speaker: 'me' as const,
      },
    ];

    let index = 0;
    const translationTimer = setInterval(() => {
      if (index < mockTranslations.length) {
        const newTranslation: TranslationBubble = {
          id: Date.now().toString(),
          ...mockTranslations[index],
          timestamp: formatTime(callDuration + index * 15),
        };

        setTranslations(prev => [...prev, newTranslation]);

        Animated.timing(translateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        index++;
      } else {
        clearInterval(translationTimer);
      }
    }, 15000);

    return () => clearInterval(translationTimer);
  }, [callStatus, callDuration, translateAnim]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = useCallback(() => {
    setCallStatus('ended');
    Alert.alert(
      'Call Ended',
      `Call duration: ${formatTime(callDuration)}\nTranslations provided: ${translations.length}`,
      [
        {
          text: 'OK',
          onPress: () => {
            if (room) {
              room.disconnect();
            }
            navigation.goBack();
          },
        },
      ]
    );
  }, [room, callDuration, translations.length, navigation]);

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
      },
      ios: {
        defaultOutput: newSpeakerOn ? 'speaker' : 'earpiece',
      },
    });
  }, [isSpeakerOn]);

  const toggleTranslations = () => {
    setShowTranslations(!showTranslations);
  };

  const renderTranslationBubble = ({ item: translation }: { item: TranslationBubble }) => {
    const isMe = translation.speaker === 'me';

    return (
      <Animated.View
        key={translation.id}
        style={[
          styles.translationBubble,
          isMe ? styles.myTranslationBubble : styles.theirTranslationBubble,
        ]}
      >
        <View style={styles.translationHeader}>
          <Text style={[
            styles.speakerLabel,
            isMe ? styles.mySpeakerLabel : styles.theirSpeakerLabel
          ]}>
            {isMe ? 'You' : contact.name}
          </Text>
          <Text style={styles.translationTime}>{translation.timestamp}</Text>
        </View>

        <Text style={[
          styles.originalText,
          isMe ? styles.myOriginalText : styles.theirOriginalText
        ]}>
          "{translation.originalText}"
        </Text>

        <Text style={[
          styles.translatedText,
          isMe ? styles.myTranslatedText : styles.theirTranslatedText
        ]}>
          {translation.translatedText}
        </Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + height * 0.02 }]}>
        <TouchableOpacity onPress={() => {
          if (room) room.disconnect();
          navigation.goBack();
        }}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LinguaCall</Text>
        <TouchableOpacity onPress={toggleTranslations}>
          <Ionicons
            name={showTranslations ? "eye" : "eye-off"}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* Call Status */}
      <View style={styles.callStatusContainer}>
        <Text style={styles.callStatusText}>
          {callStatus === 'connecting' && 'Connecting...'}
          {callStatus === 'connected' && (remoteParticipantConnected
            ? `Connected - ${formatTime(callDuration)}`
            : `Waiting for ${contact.name}...`)}
          {callStatus === 'ended' && 'Call Ended'}
        </Text>

        <View style={styles.languageInfo}>
          <Text style={styles.languageInfoText}>
            Real-time translation: Your language - {contact.language}
          </Text>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.contactContainer}>
        <Animated.View
          style={[
            styles.contactAvatar,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.contactAvatarText}>{contact.avatar}</Text>
          {callStatus === 'connected' && remoteParticipantConnected && (
            <View style={styles.speakingIndicator}>
              <Ionicons name="mic" size={16} color="#10B981" />
            </View>
          )}
        </Animated.View>

        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactLanguage}>Speaking {contact.language}</Text>
      </View>

      {/* Real-time Translations */}
      {showTranslations && (
        <View style={styles.translationsContainer}>
          <Text style={styles.translationsHeader}>Live Translations</Text>
          <FlatList
            data={translations.slice(-3)}
            renderItem={renderTranslationBubble}
            keyExtractor={item => item.id}
            style={styles.translationsList}
          />
        </View>
      )}

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.activeControlButton]}
          onPress={toggleMute}
        >
          <Ionicons
            name={isMuted ? "mic-off" : "mic"}
            size={24}
            color={isMuted ? "#EF4444" : "#FFFFFF"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerOn && styles.activeControlButton]}
          onPress={toggleSpeaker}
        >
          <Ionicons
            name={isSpeakerOn ? "volume-high" : "volume-low"}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
          <Ionicons name="call" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="keypad" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="person-add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Translation Info */}
      <View style={styles.translationInfoContainer}>
        <Ionicons name="language" size={20} color="#10B981" />
        <Text style={styles.translationInfoText}>
          AI-powered real-time translation active
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  callStatusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  callStatusText: {
    fontSize: 16,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  languageInfo: {
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  languageInfoText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  contactContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  contactAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  contactAvatarText: {
    fontSize: 60,
  },
  speakingIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 4,
  },
  contactName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  contactLanguage: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  translationsContainer: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
  },
  translationsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  translationsList: {
    flex: 1,
  },
  translationBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  myTranslationBubble: {
    borderLeftColor: '#FF8A00',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  theirTranslationBubble: {
    borderLeftColor: '#10B981',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  translationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  speakerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  mySpeakerLabel: {
    color: '#FF8A00',
  },
  theirSpeakerLabel: {
    color: '#10B981',
  },
  translationTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  originalText: {
    fontSize: 14,
    marginBottom: 4,
  },
  myOriginalText: {
    color: '#FFFFFF',
  },
  theirOriginalText: {
    color: '#FFFFFF',
  },
  translatedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  myTranslatedText: {
    color: '#FCD34D',
  },
  theirTranslatedText: {
    color: '#86EFAC',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: width * 0.1,
    paddingVertical: 32,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControlButton: {
    backgroundColor: '#EF4444',
  },
  endCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  translationInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  translationInfoText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
});

export default VoiceCallScreen;
