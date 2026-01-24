// src/screens/TellStoryScreen.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width, height } = Dimensions.get('window');

type TellStoryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TellStory'
>;

interface Props {
  navigation: TellStoryScreenNavigationProp;
}

const TellStoryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [pulseAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Pulse animation
      const pulseAnimationLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimationLoop.start();
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isRecording]);

  const handleRecord = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setHasRecorded(true);
      Alert.alert('Story Recorded', 'Your story has been captured! Our AI will now create a beautiful animated video.');
    } else {
      // Start recording
      if (recordingTime >= 120) {
        Alert.alert('Maximum Length', 'Stories are limited to 2 minutes');
        return;
      }
      setIsRecording(true);
      setRecordingTime(0);
      setHasRecorded(false);
    }
  };

  const handleCreateStory = () => {
    Alert.alert(
      'Creating AI Story',
      'Your story is being processed by our AI. This may take a few minutes. You\'ll be notified when it\'s ready!',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Story',
      'Are you sure you want to discard this story recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setIsRecording(false);
            setRecordingTime(0);
            setHasRecorded(false);
          }
        }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tell a Story</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Story Prompt Card */}
      <View style={styles.promptCard}>
        <Text style={styles.promptTitle}>Create Your Story</Text>
        <Text style={styles.promptText}>
          Tell a story, share a proverb, or describe a cultural tradition. Our AI will turn it into a beautiful video!
        </Text>
      </View>

      {/* Recording Area */}
      <View style={styles.recordingArea}>
        {/* Timer */}
        {(isRecording || hasRecorded) && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
            <Text style={styles.maxTimeText}>/ 2:00</Text>
          </View>
        )}

        {/* Waveform Visualization (when recording) */}
        {isRecording && (
          <View style={styles.waveformContainer}>
            {Array.from({ length: 25 }, (_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveformBar,
                  {
                    height: Math.random() * 80 + 20,
                    transform: [{ scaleY: pulseAnimation }]
                  }
                ]}
              />
            ))}
          </View>
        )}

        {/* Record Button */}
        <View style={styles.recordButtonContainer}>
          <Animated.View
            style={[
              styles.recordButtonOuter,
              isRecording && {
                transform: [{ scale: pulseAnimation }]
              }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordingButton
              ]}
              onPress={handleRecord}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={32}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Recording Status */}
        <View style={styles.statusContainer}>
          {!isRecording && !hasRecorded && (
            <>
              <Text style={styles.statusText}>Hold to record your story idea</Text>
              <Text style={styles.statusSubtext}>Speak naturally, up to 2 minutes</Text>
            </>
          )}
          {isRecording && (
            <>
              <Text style={styles.statusText}>Recording your story...</Text>
              <Text style={styles.statusSubtext}>Share your cultural wisdom</Text>
            </>
          )}
          {!isRecording && hasRecorded && (
            <>
              <Text style={styles.statusText}>Story captured!</Text>
              <Text style={styles.statusSubtext}>Ready to create AI video</Text>
            </>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      {hasRecorded && (
        <View style={[styles.actionButtons, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.discardButtonText}>Discard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.createButton} onPress={handleCreateStory}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create AI Story</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Story Tips */}
      {!isRecording && !hasRecorded && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Great stories include:</Text>
          <Text style={styles.tipText}>• Traditional folktales or legends</Text>
          <Text style={styles.tipText}>• Family stories or memories</Text>
          <Text style={styles.tipText}>• Cultural proverbs with meaning</Text>
          <Text style={styles.tipText}>• Historical events or heroes</Text>
        </View>
      )}

      {/* AI Processing Info */}
      {hasRecorded && (
        <View style={styles.aiInfoContainer}>
          <View style={styles.aiInfoHeader}>
            <Ionicons name="sparkles" size={20} color="#8B5CF6" />
            <Text style={styles.aiInfoTitle}>AI Story Creation</Text>
          </View>
          <Text style={styles.aiInfoText}>
            Our AI will analyze your story and create beautiful visuals, animations, and cultural context to bring your narrative to life.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  promptCard: {
    backgroundColor: '#F3E8FF',
    margin: width * 0.05,
    padding: 20,
    borderRadius: 16,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 16,
    color: '#5B21B6',
    lineHeight: 22,
  },
  recordingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  maxTimeText: {
    fontSize: 18,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    marginBottom: 40,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#8B5CF6',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  recordButtonContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  recordButtonOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: width * 0.05,
    paddingBottom: 20,
    gap: 12,
  },
  discardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
  },
  discardButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsContainer: {
    backgroundColor: '#FFFFFF',
    margin: width * 0.05,
    padding: 20,
    borderRadius: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  aiInfoContainer: {
    backgroundColor: '#FFFFFF',
    margin: width * 0.05,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
  },
  aiInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 8,
  },
  aiInfoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default TellStoryScreen;