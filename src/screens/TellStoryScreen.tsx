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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout, Typography } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';
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

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnimation, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      if (interval) clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRecording]);

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecorded(true);
      Alert.alert('Story Recorded', 'Captured! Our AI will now create a beautiful animated video.');
    } else {
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
    Alert.alert('Processing', 'Your story is being processed by our AI.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
            <Text style={styles.headerTitle}>Tell a Story</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <GlassCard style={styles.promptCard}>
            <Text style={styles.promptTitle}>Create Your Story</Text>
            <Text style={styles.promptText}>Tell a story, share a proverb, or describe a cultural tradition. Our AI will turn it into a video!</Text>
          </GlassCard>

          <View style={styles.recordingArea}>
            {(isRecording || hasRecorded) && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
                <Text style={styles.maxTimeText}>/ 2:00</Text>
              </View>
            )}

            <View style={styles.recordButtonContainer}>
              <Animated.View style={[styles.recordButtonOuter, isRecording && { transform: [{ scale: pulseAnimation }] }]}>
                <TouchableOpacity style={[styles.recordButton, isRecording && styles.recordingButton]} onPress={handleRecord}>
                  <Ionicons name={isRecording ? "stop" : "mic"} size={32} color="#FFF" />
                </TouchableOpacity>
              </Animated.View>
            </View>

            <Text style={styles.statusText}>
              {isRecording ? 'Recording...' : (hasRecorded ? 'Captured!' : 'Hold to Record')}
            </Text>
          </View>

          {hasRecorded && (
            <TouchableOpacity style={styles.createButton} onPress={handleCreateStory}>
              <Ionicons name="sparkles" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Generate AI Story</Text>
            </TouchableOpacity>
          )}

          {!isRecording && !hasRecorded && (
            <GlassCard style={styles.tipsContainer}>
              <Text style={styles.tipsHeader}>Great stories include:</Text>
              <Text style={styles.tipText}>• Folk tales or legends</Text>
              <Text style={styles.tipText}>• Cultural proverbs</Text>
              <Text style={styles.tipText}>• Family memories</Text>
            </GlassCard>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginLeft: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1, padding: 20 },
  promptCard: { padding: 20, marginBottom: 20 },
  promptTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  promptText: { fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  recordingArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timerContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 30 },
  timerText: { fontSize: 40, fontWeight: '800', color: '#FFF' },
  maxTimeText: { fontSize: 18, color: 'rgba(255,255,255,0.3)', marginLeft: 8 },
  recordButtonContainer: { marginBottom: 24 },
  recordButtonOuter: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,138,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  recordButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  recordingButton: { backgroundColor: '#EF4444' },
  statusText: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
  createButton: { backgroundColor: Colors.primary, flexDirection: 'row', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 },
  createButtonText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  tipsContainer: { padding: 20, marginTop: 20 },
  tipsHeader: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 12 },
  tipText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
});

export default TellStoryScreen;