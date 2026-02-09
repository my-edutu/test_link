// src/screens/IncomingCallScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Vibration,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { callSignaling, CallSignal } from '../services/callSignaling';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'IncomingCall'>;

const IncomingCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { callSignal } = route.params;

  const [isAnswering, setIsAnswering] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [ringtoneSound, setRingtoneSound] = useState<Audio.Sound | null>(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim1 = useRef(new Animated.Value(0)).current;
  const ringAnim2 = useRef(new Animated.Value(0)).current;
  const ringAnim3 = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(0)).current;

  // Start animations and ringtone
  useEffect(() => {
    // Pulse animation for avatar
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Ring ripple animation
    const createRingAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const ring1 = createRingAnimation(ringAnim1, 0);
    const ring2 = createRingAnimation(ringAnim2, 666);
    const ring3 = createRingAnimation(ringAnim3, 1333);

    ring1.start();
    ring2.start();
    ring3.start();

    // Slide up animation for buttons
    Animated.timing(slideUpAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Start vibration pattern
    const vibrationPattern = [0, 1000, 500, 1000, 500, 1000];
    Vibration.vibrate(vibrationPattern, true);

    // Play ringtone (using system default or skip if not available)
    const playRingtone = async () => {
      try {
        // Configure audio mode for ringtone playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
        // Note: A custom ringtone can be added at assets/ringtone.mp3
        // For now, the app uses vibration as the primary alert
      } catch (error) {
        console.log('Audio configuration error:', error);
      }
    };
    playRingtone();

    return () => {
      pulse.stop();
      ring1.stop();
      ring2.stop();
      ring3.stop();
      Vibration.cancel();
      if (ringtoneSound) {
        ringtoneSound.stopAsync();
        ringtoneSound.unloadAsync();
      }
    };
  }, []);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (ringtoneSound) {
        ringtoneSound.stopAsync();
        ringtoneSound.unloadAsync();
      }
    };
  }, [ringtoneSound]);

  const stopRingtone = async () => {
    Vibration.cancel();
    if (ringtoneSound) {
      try {
        await ringtoneSound.stopAsync();
        await ringtoneSound.unloadAsync();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  };

  const handleAccept = async () => {
    if (isAnswering || isDeclining) return;

    setIsAnswering(true);
    await stopRingtone();

    try {
      await callSignaling.acceptCall(callSignal.callId);

      // Navigate to the appropriate call screen
      const contact = {
        id: callSignal.callerId,
        name: callSignal.callerName,
        username: callSignal.callerName.toLowerCase().replace(/\s/g, ''),
        avatar: callSignal.callerAvatar || callSignal.callerName.charAt(0).toUpperCase(),
        language: 'English',
        isOnline: true,
      };

      // Replace the current screen with the call screen
      if (callSignal.callType === 'video') {
        navigation.replace('VideoCall', { contact });
      } else {
        navigation.replace('VoiceCall', { contact });
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      setIsAnswering(false);
    }
  };

  const handleDecline = async () => {
    if (isAnswering || isDeclining) return;

    setIsDeclining(true);
    await stopRingtone();

    try {
      await callSignaling.declineCall(callSignal.callId);
      navigation.goBack();
    } catch (error) {
      console.error('Error declining call:', error);
      navigation.goBack();
    }
  };

  const getRingStyle = (anim: Animated.Value) => ({
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.5],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 0.3, 0],
    }),
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f0f0f']}
        style={StyleSheet.absoluteFill}
      />

      {/* Call Type Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.callTypeContainer}>
          <Ionicons
            name={callSignal.callType === 'video' ? 'videocam' : 'call'}
            size={20}
            color="#FF8A00"
          />
          <Text style={styles.callTypeText}>
            Incoming {callSignal.callType === 'video' ? 'Video' : 'Voice'} Call
          </Text>
        </View>
      </View>

      {/* Caller Info */}
      <View style={styles.callerContainer}>
        {/* Ripple rings */}
        <View style={styles.ringContainer}>
          <Animated.View style={[styles.ring, getRingStyle(ringAnim1)]} />
          <Animated.View style={[styles.ring, getRingStyle(ringAnim2)]} />
          <Animated.View style={[styles.ring, getRingStyle(ringAnim3)]} />
        </View>

        {/* Avatar */}
        <Animated.View
          style={[
            styles.avatarContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {callSignal.callerAvatar && callSignal.callerAvatar.startsWith('http') ? (
            <Image
              source={{ uri: callSignal.callerAvatar }}
              style={styles.avatarImage}
            />
          ) : (
            <LinearGradient
              colors={['#FF8A00', '#FF6B00']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {callSignal.callerAvatar || callSignal.callerName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
        </Animated.View>

        <Text style={styles.callerName}>{callSignal.callerName}</Text>
        <Text style={styles.callingText}>is calling you...</Text>
      </View>

      {/* Action Buttons */}
      <Animated.View
        style={[
          styles.actionsContainer,
          {
            paddingBottom: insets.bottom + 40,
            transform: [
              {
                translateY: slideUpAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: slideUpAnim,
          },
        ]}
      >
        {/* Decline Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDecline}
          disabled={isAnswering || isDeclining}
          activeOpacity={0.7}
        >
          <View style={[styles.buttonCircle, styles.declineButton]}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.buttonLabel}>Decline</Text>
        </TouchableOpacity>

        {/* Accept Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAccept}
          disabled={isAnswering || isDeclining}
          activeOpacity={0.7}
        >
          <View style={[styles.buttonCircle, styles.acceptButton]}>
            <Ionicons
              name={callSignal.callType === 'video' ? 'videocam' : 'call'}
              size={32}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.buttonLabel}>
            {isAnswering ? 'Connecting...' : 'Accept'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  callTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callTypeText: {
    color: '#FF8A00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  callerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#FF8A00',
  },
  avatarContainer: {
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
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  actionButton: {
    alignItems: 'center',
  },
  buttonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default IncomingCallScreen;
