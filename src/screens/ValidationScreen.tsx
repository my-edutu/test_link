import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  BackHandler,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { supabase } from '../supabaseClient';
import { useAudioPlayer } from 'expo-audio';
import { getPlayableAudioUrl } from '../utils/storage';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { monetizationApi } from '../services/monetizationApi';
import { trackEvent, AnalyticsEvents } from '../services/analytics';

const { width } = Dimensions.get('window');

// Helper to extract original prompt from nested remix chains
const extractOriginalPrompt = (phrase: string) => {
  if (phrase.includes('"Create your own version of "') || phrase.includes('"Respond to "')) {
    const matches = phrase.match(/"([^"]*)"(?: by [^"]*)?$/);
    if (matches && matches[1]) {
      const extracted = matches[1];
      if (!extracted.includes('"Create your own version of "') && !extracted.includes('"Respond to "')) {
        return extracted;
      }
      return extractOriginalPrompt(extracted);
    }
  }
  return phrase;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Validation'>;

const FLAG_REASONS = [
  { id: 'unclear_audio', label: 'Audio is unclear' },
  { id: 'dialect_dispute', label: 'Dialect disagreement' },
  { id: 'inappropriate_content', label: 'Inappropriate content' },
  { id: 'other', label: 'Other issue' },
];

const mockWaveform = [30, 50, 70, 40, 60, 80, 90, 70, 40, 20, 50, 60, 30, 40, 60, 50];

const ValidationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const clipId = route?.params?.clipId;
  const [hasValidated, setHasValidated] = useState(false);
  const [validationResult, setValidationResult] = useState<'correct' | 'incorrect' | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<{
    id: string;
    phrase?: string;
    language?: string;
    dialect?: string;
    audio_url?: string;
  } | null>(null);
  const audioPlayer = useAudioPlayer();
  const [audioLoading, setAudioLoading] = useState(false);

  // Validator Stats (for monetization display)
  const [validatorAccuracy, setValidatorAccuracy] = useState<number>(100);
  const [dailyValidationCount, setDailyValidationCount] = useState<number>(0);
  const DAILY_VALIDATION_CAP = 20; // Max validations that count toward rewards per day

  // Flag Modal State
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [selectedFlagReason, setSelectedFlagReason] = useState<string | null>(null);
  const [flagNotes, setFlagNotes] = useState('');

  // Consensus feedback
  const [consensusMessage, setConsensusMessage] = useState<string | null>(null);

  // Fetch Next Clip Logic
  const fetchNextClip = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const queue = await monetizationApi.getValidationQueue(1);

      if (queue && queue.length > 0) {
        setClip(queue[0]);
        setError(null);
        setHasValidated(false);
        setValidationResult(null);
        setConsensusMessage(null);
      } else {
        setClip(null);
        Alert.alert('All Caught Up!', 'You have validated all available clips.');
        navigation.goBack();
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load clip');
    } finally {
      setLoading(false);
    }
  }, [user?.id, navigation]);

  // Fetch Validator Stats for Display
  useEffect(() => {
    const fetchValidatorStats = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('accuracy_rating, daily_validations_count')
          .eq('id', user.id)
          .single();

        if (data) {
          setValidatorAccuracy(data.accuracy_rating || 100);
          setDailyValidationCount(data.daily_validations_count || 0);
        }
      } catch (error) {
        console.error('Error fetching validator stats:', error);
      }
    };
    fetchValidatorStats();
  }, [user?.id]);

  // Initial Load
  useEffect(() => {
    if (clipId) {
      const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('voice_clips').select('*').eq('id', clipId).single();
        if (data) {
          setClip(data);
          setLoading(false);
        }
      };
      load();
    } else {
      fetchNextClip();
    }
  }, [clipId, fetchNextClip]);

  // Android Back Handler for Modals
  useEffect(() => {
    const onBackPress = () => {
      if (flagModalVisible) {
        setFlagModalVisible(false);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [flagModalVisible]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      // expo-audio cleanup
    };
  }, []);

  /**
   * SECURE VALIDATION SUBMISSION
   * Uses NestJS endpoint instead of direct Supabase
   */
  const handleValidation = async (isCorrect: boolean) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to validate clips.');
      return;
    }
    if (!clip?.id) return;

    setSubmitting(true);
    setValidationResult(isCorrect ? 'correct' : 'incorrect');
    setHasValidated(true);

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await monetizationApi.submitValidation(
        clip.id,
        isCorrect
      );

      if (result.success) {
        // Track validation submitted event
        trackEvent(AnalyticsEvents.VALIDATION_SUBMITTED, {
          clip_id: clip.id,
          is_correct: isCorrect,
          language: clip.language,
          consensus_reached: result.consensusReached || false,
        });

        // Update local stats immediately for UX
        setDailyValidationCount((prev) => prev + 1);

        let message = isCorrect
          ? "Great! You've confirmed this pronunciation is correct."
          : 'Thank you for the feedback. This helps the community learn.';

        if (result.consensusReached) {
          setConsensusMessage('🎉 Consensus reached! Rewards have been distributed.');
          message += '\n\n🎉 Consensus reached!';
        }

        Alert.alert('Validation Submitted', message, [
          { text: 'Next Clip', onPress: fetchNextClip }
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit validation');
      setHasValidated(false);
      setValidationResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * FLAG FOR REVIEW (Dispute Resolution)
   */
  const handleFlagSubmit = async () => {
    if (!user?.id || !clip?.id || !selectedFlagReason) return;

    try {
      const result = await monetizationApi.flagForReview(
        clip.id,
        selectedFlagReason,
        flagNotes
      );

      if (result.success) {
        Alert.alert('Flagged', result.message);
        setFlagModalVisible(false);
        setSelectedFlagReason(null);
        setFlagNotes('');
        fetchNextClip();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to flag clip');
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Validation',
      'Are you sure you want to skip this validation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => fetchNextClip() }
      ]
    );
  };

  const handleNext = () => {
    fetchNextClip();
  };

  const handlePlay = async () => {
    if (!clip?.audio_url) {
      Alert.alert('No audio', 'This clip does not have an audio file.');
      return;
    }
    try {
      if (audioPlayer.playing) {
        audioPlayer.pause();
        return;
      }

      setAudioLoading(true);
      const uri = await getPlayableAudioUrl(clip.audio_url);
      if (!uri) {
        setAudioLoading(false);
        Alert.alert('Error', 'Unable to load audio file');
        return;
      }
      audioPlayer.replace(uri);
      audioPlayer.play();
      setAudioLoading(false);
    } catch (e) {
      setAudioLoading(false);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const renderWaveform = (waveform: number[]) => (
    <View style={styles.waveformContainer}>
      {waveform.map((height, index) => (
        <View
          key={index}
          style={[
            styles.waveformBar,
            { height: height * 0.6 }
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Validate Pronunciation</Text>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={[styles.skipButton, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Language Info */}
        <View style={styles.languageCard}>
          <View style={styles.languageHeader}>
            <Ionicons name="globe" size={20} color="#FF8A00" />
            <Text style={styles.languageTitle}>
              {clip?.language || '—'}{clip?.dialect ? ` / ${clip?.dialect}` : ''}
            </Text>
          </View>
          <Text style={styles.languageDescription}>
            Help validate pronunciations in your native language
          </Text>
        </View>

        {/* Validator Stats Card */}
        <View style={[styles.validatorStatsCard, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Ionicons name="ribbon" size={16} color="#10B981" />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accuracy</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{validatorAccuracy.toFixed(1)}%</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="today" size={16} color="#FF8A00" />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today's Validations</Text>
            <Text style={[styles.statValue, { color: dailyValidationCount >= DAILY_VALIDATION_CAP ? '#EF4444' : colors.text }]}>
              {dailyValidationCount}/{DAILY_VALIDATION_CAP}
            </Text>
          </View>
        </View>

        {/* Clip Information */}
        <View style={[styles.clipCard, { backgroundColor: colors.card }]}>
          <View style={styles.clipHeader}>
            <Text style={[styles.clipUser, { color: colors.textSecondary }]}>Recording</Text>
            <TouchableOpacity
              style={styles.flagButton}
              onPress={() => setFlagModalVisible(true)}
            >
              <Ionicons name="flag-outline" size={16} color="#EF4444" />
              <Text style={styles.flagButtonText}>Flag</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.phraseContainer}>
            <Text style={[styles.phrase, { color: colors.text }]}>{extractOriginalPrompt(clip?.phrase || '—')}</Text>
          </View>

          {renderWaveform(mockWaveform)}

          <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
            <Text style={styles.playButtonText}>{audioLoading ? 'Loading...' : 'Listen to pronunciation'}</Text>
          </TouchableOpacity>
        </View>

        {/* Consensus Message */}
        {consensusMessage && (
          <View style={styles.consensusCard}>
            <Text style={styles.consensusText}>{consensusMessage}</Text>
          </View>
        )}

        {/* Validation Question */}
        <View style={[styles.questionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.questionTitle, { color: colors.text }]}>Is this pronunciation correct?</Text>
          <Text style={[styles.questionDescription, { color: colors.textSecondary }]}>
            As a native speaker, does this sound accurate to you?
          </Text>

          {!hasValidated ? (
            <View style={styles.validationButtons}>
              <TouchableOpacity
                style={[styles.validationButton, styles.correctButton]}
                onPress={() => handleValidation(true)}
                disabled={submitting}
              >
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.validationButtonText}>Yes, Correct</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.validationButton, styles.incorrectButton]}
                onPress={() => handleValidation(false)}
                disabled={submitting}
              >
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                <Text style={styles.validationButtonText}>Needs Work</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.validationResult}>
              <View style={[
                styles.resultCard,
                validationResult === 'correct' ? styles.correctResult : styles.incorrectResult
              ]}>
                <Ionicons
                  name={validationResult === 'correct' ? "checkmark-circle" : "close-circle"}
                  size={32}
                  color={validationResult === 'correct' ? "#10B981" : "#EF4444"}
                />
                <Text style={styles.resultTitle}>
                  {validationResult === 'correct' ? 'Marked as Correct!' : 'Marked as Needs Work'}
                </Text>
                <Text style={styles.resultDescription}>
                  {validationResult === 'correct'
                    ? 'Your validation helps confirm accurate pronunciations.'
                    : 'Your feedback helps the community improve their pronunciation.'
                  }
                </Text>
              </View>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>Validate Next →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>Validation Tips:</Text>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>• Consider regional dialect differences</Text>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>• Focus on accuracy, not accent</Text>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>• Use "Flag" for unclear or problematic audio</Text>
        </View>
      </ScrollView>

      {/* Flag Modal */}
      <Modal
        visible={flagModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFlagModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Flag for Review</Text>
              <TouchableOpacity onPress={() => setFlagModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Let an admin know there's an issue with this clip.
            </Text>

            {FLAG_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  selectedFlagReason === reason.id && styles.reasonOptionSelected
                ]}
                onPress={() => setSelectedFlagReason(reason.id)}
              >
                <Ionicons
                  name={selectedFlagReason === reason.id ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={selectedFlagReason === reason.id ? "#FF8A00" : "#9CA3AF"}
                />
                <Text style={styles.reasonText}>{reason.label}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.notesInput}
              placeholder="Additional notes (optional)"
              value={flagNotes}
              onChangeText={setFlagNotes}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitFlagButton, !selectedFlagReason && styles.submitFlagButtonDisabled]}
              onPress={handleFlagSubmit}
              disabled={!selectedFlagReason}
            >
              <Text style={styles.submitFlagButtonText}>Submit Flag</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  skipButton: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  languageCard: {
    backgroundColor: '#FEF3E2',
    margin: width * 0.05,
    padding: 16,
    borderRadius: 12,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  languageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 8,
  },
  languageDescription: {
    fontSize: 14,
    color: '#92400E',
  },
  validatorStatsCard: {
    backgroundColor: '#FFFFFF',
    margin: width * 0.05,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  clipCard: {
    backgroundColor: '#FFFFFF',
    margin: width * 0.05,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clipUser: {
    fontSize: 14,
    color: '#6B7280',
  },
  flagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  flagButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 4,
  },
  phraseContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  phrase: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginBottom: 20,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#FF8A00',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8A00',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  consensusCard: {
    backgroundColor: '#ECFDF5',
    margin: width * 0.05,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  consensusText: {
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    margin: width * 0.05,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  questionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  validationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  validationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  correctButton: {
    backgroundColor: '#10B981',
  },
  incorrectButton: {
    backgroundColor: '#EF4444',
  },
  validationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  validationResult: {
    alignItems: 'center',
  },
  resultCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  correctResult: {
    backgroundColor: '#ECFDF5',
  },
  incorrectResult: {
    backgroundColor: '#FEF2F2',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#FF8A00',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    margin: width * 0.05,
    padding: 16,
    borderRadius: 12,
    marginTop: 0,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  reasonOptionSelected: {
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: '#FF8A00',
  },
  reasonText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginTop: 16,
    textAlignVertical: 'top',
  },
  submitFlagButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitFlagButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitFlagButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ValidationScreen;