import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { submitValidation, type VoiceClipWithUser } from '../utils/content';

interface ValidationFormProps {
  clip: VoiceClipWithUser;
  onValidationComplete: () => void;
  onCancel: () => void;
}

type ValidationType = 'pronunciation' | 'grammar' | 'meaning' | 'cultural';

const validationTypes: { type: ValidationType; label: string; icon: string }[] = [
  { type: 'pronunciation', label: 'Pronunciation', icon: 'mic' },
  { type: 'grammar', label: 'Grammar', icon: 'document-text' },
  { type: 'meaning', label: 'Meaning', icon: 'bulb' },
  { type: 'cultural', label: 'Cultural', icon: 'globe' },
];

export const ValidationForm: React.FC<ValidationFormProps> = ({
  clip,
  onValidationComplete,
  onCancel,
}) => {
  const [selectedType, setSelectedType] = useState<ValidationType>('pronunciation');
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please provide a rating before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await submitValidation(
        clip.id,
        selectedType,
        rating,
        feedback.trim() || undefined,
        rating >= 3 // Approve if rating is 3 or higher
      );

      if (success) {
        Alert.alert(
          'Success',
          'Your validation has been submitted successfully!',
          [
            {
              text: 'OK',
              onPress: onValidationComplete,
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to submit validation. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting validation:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        <Text style={styles.starsLabel}>Rate this clip:</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              style={styles.starButton}
              onPress={() => setRating(star)}
            >
              <Ionicons
                name={rating >= star ? 'star' : 'star-outline'}
                size={24}
                color={rating >= star ? '#FFD700' : '#D1D5DB'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingText}>
          {rating > 0 ? `${rating}/5 stars` : 'Select a rating'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Validate Voice Clip</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.clipInfo}>
        <Text style={styles.clipPhrase}>{clip.phrase}</Text>
        <Text style={styles.clipTranslation}>{clip.translation}</Text>
        <Text style={styles.clipLanguage}>{clip.language}</Text>
        <Text style={styles.clipUser}>by @{clip.user.username}</Text>
      </View>

      <View style={styles.validationTypeSection}>
        <Text style={styles.sectionTitle}>Validation Type</Text>
        <View style={styles.typeButtons}>
          {validationTypes.map(({ type, label, icon }) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                selectedType === type && styles.selectedTypeButton,
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Ionicons
                name={icon as any}
                size={20}
                color={selectedType === type ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === type && styles.selectedTypeButtonText,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {renderStars()}

      <View style={styles.feedbackSection}>
        <Text style={styles.sectionTitle}>Feedback (Optional)</Text>
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackPlaceholder}>
            Add any additional comments or suggestions...
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, rating === 0 && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Validation</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  clipInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  clipPhrase: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  clipTranslation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  clipLanguage: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  clipUser: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  validationTypeSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  selectedTypeButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  selectedTypeButtonText: {
    color: '#FFFFFF',
  },
  starsContainer: {
    marginBottom: 20,
  },
  starsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    minHeight: 80,
    justifyContent: 'center',
  },
  feedbackPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
