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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import { uploadAudioFile } from '../utils/storage';
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
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Audio recording state (expo-av)
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<Audio.RecordingStatus | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const isDuet = route?.params?.isDuet || false;
  const originalClip = route?.params?.originalClip;
  const mode = route?.params?.mode || 'record';

  // Request audio recording permissions (expo-av)
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Load daily prompts on component mount
  useEffect(() => {
    loadDailyPrompts();
  }, []);

  // Default to editing prompt for regular record/upload so users can type theirs
  useEffect(() => {
    if (!isDuet) {
      setIsEditingPrompt(true);
    }
  }, []);

  // Set up audio mode for recording
  useEffect(() => {
    // Note: expo-audio audio mode setup will be different
    // This is a placeholder - actual implementation depends on expo-audio API
  }, []);

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
    } else {
      if (interval) {
        clearInterval(interval);
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
      pulseAnimation.setValue(1);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [isRecording, pulseAnimation]);

  const handleRecord = async () => {
    if (mode === 'upload') return; // recording disabled in upload mode
    if (!selectedLanguage) {
      Alert.alert('Select Language', 'Please select the language you\'ll be speaking in before recording.');
      setShowLanguageModal(true);
      return;
    }

    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
      return;
    }

    if (isRecording) {
      // Stop recording (expo-av)
      try {
        if (!recording) {
          setIsRecording(false);
          return;
        }
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (!uri) {
          Alert.alert('Recording Error', 'No audio file URI was returned. Please try recording again.');
          setIsRecording(false);
          return;
        }
        setAudioUri(uri);
        setRecording(null);
        setRecordingStatus(null);
        setIsRecording(false);
        setHasRecorded(true);
        setPhrase(getPromptText());
        setTranslation('');
        Alert.alert('Recording Complete', 'Your voice clip has been recorded!');
      } catch (error) {
        console.error('Error stopping recording:', error);
        Alert.alert('Error', 'Failed to stop recording. Please try again.');
      }
    } else {
      // Start recording
      if (recordingTime >= 60) {
        Alert.alert('Maximum Length', 'Recordings are limited to 60 seconds');
        return;
      }

      try {
        // Always (re)request permission right before starting
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
          return;
        }

        // Configure audio mode and start (expo-av)
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setIsRecording(true);
        setRecordingTime(0);
        setHasRecorded(false);
        setAudioUri(null);
        setPhrase('');
        setTranslation('');

        // Status updates
        newRecording.setOnRecordingStatusUpdate((status) => {
          setRecordingStatus(status);
          if (status.isRecording) {
            setRecordingTime(Math.floor((status.durationMillis || 0) / 1000));
          }
        });

      } catch (error) {
        console.error('Error starting recording:', error);
        Alert.alert('Error', 'Failed to start recording. Please try again.');
      }
    }
  };

  const handleChooseAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) return;

      setAudioUri(file.uri);
      setHasRecorded(true);
      setRecordingTime(0);
      if (!customPrompt.trim()) {
        setPhrase('');
      }
      Alert.alert('Audio Selected', 'Your audio file is ready to upload.');
    } catch (e) {
      console.error('Document picker error:', e);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const handleSave = async () => {
    if (!authUser?.id || !selectedLanguage || !audioUri) {
      Alert.alert('Error', 'Missing required information to save recording.');
      return;
    }

    const finalPhrase = (customPrompt || phrase).trim();
    if (!finalPhrase) {
      Alert.alert('Add a prompt', 'Please write a short phrase describing your audio.');
      return;
    }

    setIsSaving(true);
    setUploadProgress('Preparing upload...');

    try {
      // Basic URI validation to avoid unsupported schemes
      if (!/^file:\/\//.test(audioUri) && !/^content:\/\//.test(audioUri)) {
        throw new Error('Invalid audio source URI');
      }
      // Upload audio file to Supabase Storage
      console.log('Uploading audio file to Supabase Storage...');
      setUploadProgress('Uploading audio file...');
      const uploadResult = await uploadAudioFile(audioUri, authUser.id);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload audio file');
      }

      console.log('Audio file uploaded successfully:', uploadResult.url);
      setUploadProgress('Saving to database...');

      // Save the voice clip with the cloud URL
      const { data, error } = await supabase
        .from('voice_clips')
        .insert({
          user_id: authUser.id,
          phrase: finalPhrase,
          translation: translation || '',
          audio_url: uploadResult.url, // Use the cloud URL
          language: selectedLanguage.name,
          dialect: selectedLanguage.dialect || null,
          duration: recordingTime,
          likes_count: 0,
          comments_count: 0,
          validations_count: 0,
          is_validated: false,
          daily_prompt_id: selectedPrompt ? selectedPrompt.id : null,
          // Duet tracking
          original_clip_id: isDuet ? originalClip?.id : null,
          clip_type: isDuet ? 'duet' : 'original'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Voice clip saved successfully:', data);
      console.log('Audio file available at:', uploadResult.url);

      // Track clip recorded event
      trackEvent(AnalyticsEvents.CLIP_RECORDED, {
        clip_id: data.id,
        language: selectedLanguage.name,
        dialect: selectedLanguage.dialect,
        duration: recordingTime,
        clip_type: isDuet ? 'duet' : 'original',
        has_translation: !!translation,
        media_type: 'audio',
      });

      // If a daily prompt was selected, mark it as used upon successful save
      if (selectedPrompt) {
        await markPromptAsUsed(selectedPrompt.id);
        setDailyPrompts(prev => prev.map(p => p.id === selectedPrompt.id ? { ...p, is_used: true, used_at: new Date().toISOString() } : p));
        setSelectedPrompt(null);
      }

      // If this is a duet, update the original clip's duet count
      if (isDuet && originalClip?.id) {
        try {
          // Get current duet count and increment it
          const { data: currentClip } = await supabase
            .from('voice_clips')
            .select('duets_count')
            .eq('id', originalClip.id)
            .single();

          const newDuetCount = (currentClip?.duets_count || 0) + 1;

          const { error: duetError } = await supabase
            .from('voice_clips')
            .update({
              duets_count: newDuetCount
            })
            .eq('id', originalClip.id);

          if (duetError) {
            console.error('Error updating duet count:', duetError);
          } else {
            console.log('Duet count updated for original clip:', originalClip.id);
          }
        } catch (duetCountError) {
          console.error('Error updating duet count:', duetCountError);
        }
      }

      const clipType = isDuet ? 'duet' : 'original clip';
      Alert.alert(
        'Success!',
        `Your ${clipType} has been saved to your library! It will be available for validation by native speakers of ${selectedLanguage.name}${selectedLanguage.dialect ? ` (${selectedLanguage.dialect})` : ''}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to profile to see the new clip
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving voice clip:', error);
      Alert.alert('Error', 'Failed to save your recording. Please try again.');
    } finally {
      setIsSaving(false);
      setUploadProgress('');
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Recording',
      'Are you sure you want to discard this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            // Stop recording if it's active
            if (recording) {
              try {
                // Note: expo-audio recording stop will be different
                // This is a placeholder - actual implementation depends on expo-audio API
              } catch (error) {
                console.error('Error stopping recording:', error);
              }
            }
            setIsRecording(false);
            setRecordingTime(0);
            setHasRecorded(false);
            setRecording(null);
            setRecordingStatus(null);
            setAudioUri(null);
          }
        }
      ]
    );
  };

  // Cleanup recording on component unmount
  useEffect(() => {
    return () => {
      if (recording) {
        // Note: expo-audio recording cleanup will be different
        // This is a placeholder - actual implementation depends on expo-audio API
      }
    };
  }, [recording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScreenTitle = () => {
    if (isDuet) return 'Record Duet';
    return mode === 'upload' ? 'Upload Audio' : 'Record Voice';
  };

  const getPromptText = () => {
    if (customPrompt.trim()) return customPrompt.trim();
    if (selectedPrompt) return selectedPrompt.prompt_text;
    if (isDuet && originalClip) {
      return `Respond to "${originalClip.phrase}"`;
    }
    return '';
  };

  // Load daily prompts for the user
  const loadDailyPrompts = async () => {
    if (!authUser) return;

    try {
      setIsLoadingPrompts(true);
      const prompts = await generateDailyPrompts(authUser.id, selectedLanguage?.name);
      setDailyPrompts(prompts);
    } catch (error) {
      console.error('Error loading daily prompts:', error);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  // Handle prompt selection (do NOT mark as used yet; only after successful save)
  const handlePromptSelect = async (prompt: DailyPrompt) => {
    setSelectedPrompt(prompt);
    setCustomPrompt(prompt.prompt_text);
    setShowPromptSelector(false);
  };

  // Handle custom prompt
  const handleCustomPrompt = () => {
    setSelectedPrompt(null);
    setCustomPrompt('');
    setShowPromptSelector(false);
    setIsEditingPrompt(true);
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getScreenTitle()}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info */}
        {authUser && (
          <View style={styles.userInfoContainer}>
            <Text style={styles.userInfoText}>
              Recording as: {authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email}
            </Text>
          </View>
        )}

        {/* Original Clip Reference (for Duet) */}
        {isDuet && originalClip && (
          <View style={styles.originalClipCard}>
            <View style={styles.originalClipHeader}>
              <Ionicons name="people" size={16} color="#10B981" />
              <Text style={styles.originalClipType}>Responding to</Text>
            </View>
            <Text style={styles.originalClipPhrase}>"{originalClip.phrase}"</Text>
            <Text style={styles.originalClipMeta}>
              {originalClip.language}
            </Text>
          </View>
        )}

        {/* Language Selection */}
        <TouchableOpacity
          style={styles.languageSelector}
          onPress={() => setShowLanguageModal(true)}
        >
          <Ionicons name="globe-outline" size={20} color="#FF8A00" />
          <Text style={[
            styles.languageSelectorText,
            selectedLanguage && styles.languageSelected
          ]}>
            {selectedLanguage
              ? `${selectedLanguage.name}${selectedLanguage.dialect ? ` / ${selectedLanguage.dialect}` : ''}`
              : 'Select your language'
            }
          </Text>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>

        {/* Daily Prompts Section - Only show for regular record/upload */}
        {!isDuet && (
          <View style={styles.dailyPromptsSection}>
            <Text style={styles.dailyPromptsTitle}>Today's Daily Prompts</Text>
            <Text style={styles.dailyPromptsSubtitle}>
              You’ll see one prompt at a time (3 per day)
            </Text>

            {isLoadingPrompts ? (
              <View style={styles.loadingPrompts}>
                <ActivityIndicator size="small" color="#FF8A00" />
                <Text style={styles.loadingText}>Loading your daily prompts...</Text>
              </View>
            ) : (
              <View style={styles.promptsContainer}>
                {/* Show only the first unused prompt (or none if all used) */}
                {(() => {
                  const nextPrompt = dailyPrompts.find(p => !p.is_used);
                  return nextPrompt ? (
                    <TouchableOpacity
                      key={nextPrompt.id}
                      style={[
                        styles.promptOption,
                        selectedPrompt?.id === nextPrompt.id && styles.selectedPromptOption
                      ]}
                      onPress={() => handlePromptSelect(nextPrompt)}
                    >
                      <View style={styles.promptOptionContent}>
                        <Text style={[
                          styles.promptOptionText,
                          selectedPrompt?.id === nextPrompt.id && styles.selectedPromptText
                        ]}>
                          {nextPrompt.prompt_text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.dailyPromptsSubtitle}>You have used all 3 daily prompts.</Text>
                  );
                })()}

                {/* Custom prompt button removed per request */}
              </View>
            )}
          </View>
        )}

        {/* Prompt Card - only after all daily prompts are used, or for duet */}
        {(isDuet || (dailyPrompts.length > 0 && dailyPrompts.every(p => p.is_used))) && (
        <View style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <Text style={styles.promptTitle}>
              {isDuet ? 'Duet Prompt' : 'Your Prompt'}
            </Text>
            <View style={styles.promptActions}>
              {!isEditingPrompt && customPrompt.trim() && (
                <TouchableOpacity
                  style={styles.resetPromptButton}
                  onPress={() => {
                    setCustomPrompt('');
                  }}
                >
                  <Ionicons name="refresh-outline" size={16} color="#6B7280" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.editPromptButton}
                onPress={() => {
                  if (isEditingPrompt) {
                    // Save the custom prompt
                    setIsEditingPrompt(false);
                  } else {
                    // Start editing - initialize with current prompt
                    const currentPrompt = customPrompt.trim() ||
                      (isDuet && originalClip ? `Respond to "${originalClip.phrase}"` : '');
                    setCustomPrompt(currentPrompt);
                    setIsEditingPrompt(true);
                  }
                }}
              >
                <Ionicons
                  name={isEditingPrompt ? "checkmark" : "create-outline"}
                  size={16}
                  color="#D97706"
                />
              </TouchableOpacity>
            </View>
          </View>

          {isEditingPrompt ? (
            <TextInput
              style={styles.promptInput}
              value={customPrompt}
              onChangeText={setCustomPrompt}
              placeholder="Enter your custom prompt..."
              multiline
              textAlignVertical="top"
              autoFocus
            />
          ) : (
            <Text style={styles.promptText}>
              {getPromptText() || 'Describe what you are saying...'}
            </Text>
          )}

          <Text style={styles.promptSubtext}>
            {isDuet ? 'Express it in your own way!' : 'Write a short phrase that matches your audio'}
          </Text>
        </View>
        )}

        {/* Recording Area */}
        <View style={styles.recordingArea}>
          {(isRecording || hasRecorded) && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
              <Text style={styles.maxTimeText}>/ 1:00</Text>
            </View>
          )}

          {isRecording && (
            <View style={styles.waveformContainer}>
              {Array.from({ length: 20 }, (_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveformBar,
                    {
                      height: Math.random() * 60 + 20,
                      transform: [{ scaleY: pulseAnimation }]
                    }
                  ]}
                />
              ))}
            </View>
          )}

          {mode === 'record' ? (
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
                  isRecording && styles.recordingButton,
                  (!selectedLanguage || !hasPermission) && styles.disabledButton
                ]}
                onPress={handleRecord}
                disabled={!hasPermission}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={32}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
          ) : (
          <View style={styles.recordButtonContainer}>
            <TouchableOpacity
              style={[styles.recordButton, (!selectedLanguage) && styles.disabledButton]}
              onPress={handleChooseAudio}
              disabled={!selectedLanguage}
            >
              <Ionicons name="cloud-upload" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          )}

          <View style={styles.statusContainer}>
            {!hasPermission && (
              <Text style={styles.statusText}>Microphone permission required</Text>
            )}
            {!selectedLanguage && hasPermission && (
              <Text style={styles.statusText}>Select a language to start recording</Text>
            )}
            {selectedLanguage && !isRecording && !hasRecorded && hasPermission && (
              <Text style={styles.statusText}>Tap to start recording in {selectedLanguage.name}</Text>
            )}
            {isRecording && (
              <Text style={styles.statusText}>Recording in {selectedLanguage?.name}...</Text>
            )}
            {!isRecording && hasRecorded && (
              <Text style={styles.statusText}>Recording complete! Ready to save.</Text>
            )}
            <Text style={styles.maxTimeSubtext}>Max 60 seconds</Text>
          </View>
        </View>

        {hasRecorded && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.discardButtonText}>Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              )}
      <Text style={styles.saveButtonText}>
        {isSaving ? (uploadProgress || 'Saving...') : `Save ${isDuet ? 'Duet' : 'Clip'}`}
      </Text>
            </TouchableOpacity>
          </View>
        )}


        {!isRecording && !hasRecorded && selectedLanguage && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>
              {isDuet ? 'Duet Tips:' : 'Recording Tips:'}
            </Text>
            {isDuet ? (
              <>
                <Text style={styles.tipText}>• Respond naturally to the original</Text>
                <Text style={styles.tipText}>• Share your perspective or translation</Text>
                <Text style={styles.tipText}>• Build on the conversation</Text>
              </>
            ) : (
              <>
                <Text style={styles.tipText}>• Speak clearly and naturally</Text>
                <Text style={styles.tipText}>• Hold phone close to your mouth</Text>
                <Text style={styles.tipText}>• Record in a quiet environment</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <LanguagePicker
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onSelect={(language) => setSelectedLanguage(language)}
        selectedLanguage={selectedLanguage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  userInfoContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: width * 0.05,
    paddingVertical: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  originalClipCard: {
    backgroundColor: '#F0F9FF',
    margin: width * 0.05,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  originalClipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalClipType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  originalClipPhrase: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  originalClipMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: width * 0.05,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  languageSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 12,
  },
  languageSelected: {
    color: '#1F2937',
    fontWeight: '500',
  },
  promptCard: {
    backgroundColor: '#FEF3E2',
    margin: width * 0.05,
    padding: 20,
    borderRadius: 16,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D97706',
    flex: 1,
  },
  promptActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editPromptButton: {
    padding: 4,
    borderRadius: 4,
  },
  resetPromptButton: {
    padding: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  promptInput: {
    fontSize: 16,
    color: '#92400E',
    marginBottom: 4,
    lineHeight: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: 60,
  },
  promptText: {
    fontSize: 16,
    color: '#92400E',
    marginBottom: 4,
    lineHeight: 22,
  },
  promptSubtext: {
    fontSize: 14,
    color: '#A16207',
  },
  recordingArea: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingVertical: 40,
    minHeight: 400,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF8A00',
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
    height: 80,
    marginBottom: 40,
  },
  waveformBar: {
    width: 4,
    backgroundColor: '#FF8A00',
    marginHorizontal: 2,
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
    backgroundColor: 'rgba(255, 138, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF8A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  maxTimeSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: width * 0.05,
    paddingBottom: 30,
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
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8A00',
    borderRadius: 12,
    paddingVertical: 16,
  },
  saveButtonText: {
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
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  languageList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedLanguageItem: {
    backgroundColor: '#FEF3E2',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  dialectText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  // Daily Prompts Styles
  dailyPromptsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dailyPromptsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  dailyPromptsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  loadingPrompts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  promptsContainer: {
    gap: 8,
  },
  promptOption: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedPromptOption: {
    backgroundColor: '#FEF3E2',
    borderColor: '#FF8A00',
    borderWidth: 2,
  },
  usedPromptOption: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    opacity: 0.7,
  },
  promptOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptOptionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  selectedPromptText: {
    color: '#D97706',
    fontWeight: '500',
  },
  usedPromptText: {
    color: '#059669',
  },
  customPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF8A00',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  customPromptButtonText: {
    fontSize: 14,
    color: '#FF8A00',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default RecordVoiceScreen;