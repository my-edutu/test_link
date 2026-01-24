import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder } from 'expo-audio';
import { useAuth } from '../context/AuthProvider';
import { uploadAudioFile } from '../utils/storage';

interface CommentInputProps {
  clipId: string;
  parentCommentId?: string;
  placeholder?: string;
  onCommentAdded?: () => void;
  onCancel?: () => void;
  isReply?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  clipId,
  parentCommentId,
  placeholder = 'Add a comment...',
  onCommentAdded,
  onCancel,
  isReply = false,
}) => {
  const { user: authUser } = useAuth();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!authUser) {
      Alert.alert('Error', 'Please sign in to comment');
      return;
    }

    if (!comment.trim() && !audioUrl) {
      Alert.alert('Error', 'Please enter a comment or record audio');
      return;
    }

    setIsSubmitting(true);
    try {
      const { createComment } = await import('../utils/interactions');
      const success = await createComment(
        clipId,
        comment.trim(),
        parentCommentId,
        audioUrl || undefined,
        audioDuration || undefined
      );

      if (success) {
        setComment('');
        setAudioUrl(null);
        setAudioDuration(null);
        onCommentAdded?.();
      } else {
        Alert.alert('Error', 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      // Note: expo-audio recording start will be different
      // This is a placeholder - actual implementation depends on expo-audio API
      const newRecording = { placeholder: true };
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      // Note: expo-audio recording stop will be different
      // This is a placeholder - actual implementation depends on expo-audio API
      const uri = 'placeholder_uri'; // recording.getURI();
      setRecording(null);

      if (uri) {
        // Placeholder duration for now
        const duration = 5; // This should be calculated from actual recording
        setAudioDuration(duration);

        // Upload audio file
        if (!authUser?.id) {
          Alert.alert('Error', 'You must be signed in to upload audio');
          return;
        }
        const uploadResult = await uploadAudioFile(
          uri,
          authUser.id,
          `comments_${Date.now()}.m4a`
        );
        if (uploadResult.success && uploadResult.url) {
          setAudioUrl(uploadResult.url);
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload audio');
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const cancelRecording = async () => {
    if (recording) {
      // Note: expo-audio recording cleanup will be different
      // This is a placeholder - actual implementation depends on expo-audio API
      setRecording(null);
    }
    setIsRecording(false);
  };

  const removeAudio = () => {
    setAudioUrl(null);
    setAudioDuration(null);
  };

  const handleCancel = () => {
    if (isRecording) {
      cancelRecording();
    }
    onCancel?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={500}
          editable={!isSubmitting}
        />

        <View style={styles.actionButtons}>
          {!isRecording && !audioUrl && (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={startRecording}
              disabled={isSubmitting}
            >
              <Ionicons name="mic" size={20} color="#3B82F6" />
            </TouchableOpacity>
          )}

          {isRecording && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopRecording}
            >
              <Ionicons name="stop" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}

          {audioUrl && (
            <View style={styles.audioPreview}>
              <Ionicons name="play-circle" size={20} color="#10B981" />
              <Text style={styles.audioDuration}>
                {audioDuration ? `${audioDuration}s` : 'Audio recorded'}
              </Text>
              <TouchableOpacity onPress={removeAudio}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.submitContainer}>
        {(comment.trim() || audioUrl) && (
          <View style={styles.submitButtons}>
            {onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isReply ? 'Reply' : 'Post'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  audioDuration: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  submitContainer: {
    marginTop: 12,
  },
  submitButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});
