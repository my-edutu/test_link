// src/screens/RecordVoiceScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout, Typography } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { useOffline } from '../context/OfflineProvider';
import { saveVoiceClip } from '../services/local/offlineContent';
import { generateDailyPrompts, markPromptAsUsed, DailyPrompt } from '../utils/dailyPrompts';
import LanguagePicker from '../components/LanguagePicker';
import { trackEvent, AnalyticsEvents } from '../services/analytics';

const { width, height } = Dimensions.get('window');

type RecordVoiceScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RecordVoice'
>;

interface Props {
  navigation: RecordVoiceScreenNavigationProp;
  route?: {
    params?: {
      mode?: 'record' | 'upload';
      isDuet?: boolean;
      originalClip?: {
        id: string;
        phrase: string;
        user: string;
        language: string;
      };
    };
  };
}

interface Language {
  id: string;
  name: string;
  dialect?: string;
}

const RecordVoiceScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const { colors, isDark } = useTheme();
  const { isConnected } = useOffline();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | undefined>(undefined);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [phrase, setPhrase] = useState('');
  const [translation, setTranslation] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  // Daily prompts state
  const [dailyPrompts, setDailyPrompts] = useState<DailyPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<DailyPrompt | null>(null);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Audio recording state (expo-av)
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const heartbeatAnimation = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const heartbeatRef = useRef<Animated.CompositeAnimation | null>(null);

  const isDuet = route?.params?.isDuet || false;
  const originalClip = route?.params?.originalClip;
  const mode = route?.params?.mode || 'record';

  // Request audio recording permissions
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Load daily prompts
  useEffect(() => {
    loadDailyPrompts();
  }, [selectedLanguage]);

  useEffect(() => {
    if (!isDuet) {
      setIsEditingPrompt(true);
    }
  }, [isDuet]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      animationRef.current = Animated.loop(
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
      animationRef.current.start();

      heartbeatRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(heartbeatAnimation, {
            toValue: 1.5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(heartbeatAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      heartbeatRef.current.start();
    } else {
      if (interval) clearInterval(interval);
      if (animationRef.current) animationRef.current.stop();
      if (heartbeatRef.current) heartbeatRef.current.stop();
      pulseAnimation.setValue(1);
      heartbeatAnimation.setValue(1);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (animationRef.current) animationRef.current.stop();
    };
  }, [isRecording, pulseAnimation]);

  const handleRecord = async () => {
    if (mode === 'upload') return;
    if (!selectedLanguage) {
      Alert.alert('Select Language', 'Please select a language first.');
      setShowLanguageModal(true);
      return;
    }

    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone permission needed.');
      return;
    }

    if (isRecording) {
      try {
        if (!recording) return;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setAudioUri(uri);
        setRecording(null);
        setIsRecording(false);
        setHasRecorded(true);
        setPhrase(getPromptText());
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    } else {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') return;

        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setIsRecording(true);
        setRecordingTime(0);
        setHasRecorded(false);
        setAudioUri(null);
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  const handleChooseAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) return;

      setAudioUri(file.uri);
      setHasRecorded(true);
      setRecordingTime(0);
    } catch (e) {
      console.error('Document picker error:', e);
    }
  };

  const handleSave = async () => {
    if (!authUser?.id || !selectedLanguage || !audioUri) return;

    const finalPhrase = (customPrompt || phrase).trim();
    if (!finalPhrase) {
      Alert.alert('Add a prompt', 'Please describe your audio.');
      return;
    }

    // Monetization Criteria: Minimum 3 seconds for payment eligibility
    if (recordingTime < 3) {
      Alert.alert(
        'Recording Too Short',
        'Your recording must be at least 3 seconds long to qualify for monetization. Current length: ' + recordingTime + 's',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSaving(true);
    setUploadProgress(isConnected ? 'Uploading...' : 'Saving offline...');

    try {
      const result = await saveVoiceClip({
        userId: authUser.id,
        audioUri,
        phrase: finalPhrase,
        translation: translation || '',
        language: selectedLanguage.name,
        dialect: selectedLanguage.dialect,
        duration: recordingTime,
        clipType: isDuet ? 'duet' : 'original',
        originalClipId: isDuet ? originalClip?.id : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }

      if (selectedPrompt) {
        await markPromptAsUsed(selectedPrompt.id);
      }

      if (result.isOffline) {
        Alert.alert(
          'Saved Offline',
          'Your clip has been saved and will be uploaded when you\'re back online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Success', 'Clip saved!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert('Discard?', 'This will permanently remove the recording.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard', style: 'destructive', onPress: () => {
          setHasRecorded(false);
          setAudioUri(null);
          setRecordingTime(0);
        }
      }
    ]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScreenTitle = () => isDuet ? 'Record Duet' : (mode === 'upload' ? 'Upload Audio' : 'Record Voice');

  const getPromptText = () => {
    if (customPrompt.trim()) return customPrompt.trim();
    if (selectedPrompt) return selectedPrompt.prompt_text;
    if (isDuet && originalClip) return `Respond to "${originalClip.phrase}"`;
    return '';
  };

  const loadDailyPrompts = async () => {
    if (!authUser || !selectedLanguage) return;
    try {
      setIsLoadingPrompts(true);
      const prompts = await generateDailyPrompts(authUser.id, selectedLanguage.name);
      setDailyPrompts(prompts);
    } catch (error) {
      console.error('Error prompts:', error);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const handlePromptSelect = (prompt: DailyPrompt) => {
    setSelectedPrompt(prompt);
    setCustomPrompt(prompt.prompt_text);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { marginTop: 10, paddingHorizontal: width * 0.05 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
            <Text style={styles.headerTitle}>{getScreenTitle()}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {authUser && (
            <View style={styles.userInfoContainer}>
              <Text style={styles.userInfoText}>
                Recording as: <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>{authUser.user_metadata?.full_name || authUser.email}</Text>
              </Text>
            </View>
          )}

          {isDuet && originalClip && (
            <GlassCard style={styles.originalClipCard}>
              <View style={styles.originalClipHeader}>
                <Ionicons name="people" size={16} color={Colors.primary} />
                <Text style={styles.originalClipType}>Responding to</Text>
              </View>
              <Text style={styles.originalClipPhrase}>"{originalClip.phrase}"</Text>
              <Text style={styles.originalClipMeta}>{originalClip.language}</Text>
            </GlassCard>
          )}

          <TouchableOpacity style={styles.languageSelector} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.langIconBox}>
              <Ionicons name="globe-outline" size={20} color="#FFF" />
            </View>
            <Text style={[styles.languageSelectorText, selectedLanguage && styles.languageSelected]}>
              {selectedLanguage ? `${selectedLanguage.name}${selectedLanguage.dialect ? ` (${selectedLanguage.dialect})` : ''}` : 'Select language'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>

          {!isDuet && !hasRecorded && (
            <GlassCard style={styles.dailyPromptsSection}>
              <Text style={styles.dailyPromptsTitle}>Daily Prompts</Text>
              {isLoadingPrompts ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <View style={styles.promptsContainer}>
                  {dailyPrompts.filter(p => !p.is_used).slice(0, 1).map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.promptOption, selectedPrompt?.id === p.id && styles.selectedPromptOption]}
                      onPress={() => handlePromptSelect(p)}
                    >
                      <Text style={[styles.promptOptionText, selectedPrompt?.id === p.id && styles.selectedPromptText]}>{p.prompt_text}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </GlassCard>
          )}

          {(isDuet || (dailyPrompts.length > 0 && dailyPrompts.every(p => p.is_used)) || selectedPrompt || hasRecorded) && (
            <GlassCard style={styles.promptCard}>
              <View style={styles.promptHeader}>
                <Text style={styles.promptTitle}>{isDuet ? 'Duet Prompt' : 'Your Prompt'}</Text>
                <TouchableOpacity onPress={() => setIsEditingPrompt(!isEditingPrompt)}>
                  <Ionicons name={isEditingPrompt ? "checkmark" : "create-outline"} size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              {isEditingPrompt ? (
                <TextInput
                  style={styles.promptInput}
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  placeholder="What are you saying?"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                />
              ) : (
                <Text style={styles.promptText}>{getPromptText() || 'Tap edit to write prompt'}</Text>
              )}
            </GlassCard>
          )}

          <View style={styles.recordingArea}>
            {(isRecording || hasRecorded) && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
                <Text style={styles.maxTimeText}>/ 1:00</Text>
              </View>
            )}

            <View style={styles.recordButtonContainer}>
              {isRecording && (
                <Animated.View
                  style={[
                    styles.heartbeatCircle,
                    {
                      transform: [{ scale: heartbeatAnimation }],
                      opacity: heartbeatAnimation.interpolate({
                        inputRange: [1, 1.5],
                        outputRange: [0.5, 0]
                      })
                    }
                  ]}
                />
              )}
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordingButton]}
                onPress={mode === 'record' ? handleRecord : handleChooseAudio}
              >
                <Ionicons name={isRecording ? "stop" : (mode === 'record' ? "mic" : "cloud-upload")} size={32} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.statusText}>
              {isRecording ? 'Recording...' : (hasRecorded ? 'Recorded!' : (mode === 'record' ? 'Tap to Record' : 'Tap to Upload'))}
            </Text>
          </View>

          {hasRecorded && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
                <Text style={styles.discardButtonText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save Clip</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <LanguagePicker
          visible={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          onSelect={setSelectedLanguage}
          selectedLanguage={selectedLanguage}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: width * 0.05 },
  header: { paddingVertical: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', marginLeft: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  userInfoContainer: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginBottom: 20 },
  userInfoText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  originalClipCard: { padding: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  originalClipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  originalClipType: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginLeft: 6, textTransform: 'uppercase' },
  originalClipPhrase: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  originalClipMeta: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  languageSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 16, borderRadius: 16, marginBottom: 20 },
  langIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,138,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  languageSelectorText: { flex: 1, fontSize: 16, color: 'rgba(255,255,255,0.5)', marginLeft: 12 },
  languageSelected: { color: '#FFF', fontWeight: '600' },
  promptCard: { padding: 20, marginBottom: 20 },
  promptHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  promptTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase' },
  promptInput: { fontSize: 18, color: '#FFF', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, minHeight: 100 },
  promptText: { fontSize: 18, color: '#FFF', fontWeight: '600' },
  recordingArea: { alignItems: 'center', paddingVertical: 40 },
  timerContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
  timerText: { fontSize: 48, fontWeight: '800', color: '#FFF' },
  maxTimeText: { fontSize: 20, color: 'rgba(255,255,255,0.3)', marginLeft: 8 },
  recordButtonContainer: { marginBottom: 24 },
  recordButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  heartbeatCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    zIndex: 1,
  },
  recordingButton: { backgroundColor: '#EF4444' },
  statusText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  actionButtons: { flexDirection: 'row', gap: 16, marginTop: 20 },
  discardButton: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  discardButtonText: { color: '#EF4444', fontWeight: '700' },
  saveButton: { flex: 2, padding: 16, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontWeight: '700' },
  dailyPromptsSection: { padding: 20, marginBottom: 20 },
  dailyPromptsTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', marginBottom: 12 },
  promptsContainer: { gap: 10 },
  promptOption: { padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  selectedPromptOption: { borderColor: Colors.primary, backgroundColor: 'rgba(255,138,0,0.1)' },
  promptOptionText: { color: '#FFF', fontSize: 15 },
  selectedPromptText: { fontWeight: '700' },
});

export default RecordVoiceScreen;