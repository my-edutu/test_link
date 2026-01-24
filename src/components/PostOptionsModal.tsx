import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface User {
  id: string;
  name: string;
  isFollowing: boolean;
}

interface PostOptionsModalProps {
  visible: boolean;
  postId: string;
  postType: 'voice' | 'video' | 'story';
  user: User;
  needsValidation: boolean;
  onClose: () => void;
  onFollow: (userId: string) => void;
  onDuet: (postId: string) => void;
  onValidate: (postId: string, isCorrect: boolean) => void;
  onNavigateValidation: (postId: string, language: string) => void;
  userLanguage: string;
}

const PostOptionsModal: React.FC<PostOptionsModalProps> = ({
  visible,
  postId,
  postType,
  user,
  needsValidation,
  onClose,
  onFollow,
  onDuet,
  onValidate,
  onNavigateValidation,
  userLanguage,
}) => {
  const insets = useSafeAreaInsets();

  const handleValidate = async (isCorrect: boolean) => {
    // Close modal FIRST to prevent crash
    onClose();

    // Show alert after modal is closed
    setTimeout(() => {
      Alert.alert(
        'Validation Submitted',
        `Thank you for validating this pronunciation as ${isCorrect ? 'correct' : 'needs improvement'}.`
      );
    }, 300);

    // Perform validation
    onValidate(postId, isCorrect);
  };

  const handleFollow = () => {
    onFollow(user.id);
    onClose();
  };

  const handleDuet = () => {
    onClose();
    setTimeout(() => {
      onDuet(postId);
    }, 100);
  };

  const handleValidationScreen = () => {
    onClose();
    setTimeout(() => {
      onNavigateValidation(postId, userLanguage);
    }, 100);
  };

  const handleReport = () => {
    onClose();
    setTimeout(() => {
      Alert.alert('Report', 'Report functionality would be implemented here.');
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackground}
          onPress={onClose}
        />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={handleFollow}
          >
            <Ionicons
              name={user.isFollowing ? "person-remove" : "person-add"}
              size={20}
              color={user.isFollowing ? "#EF4444" : "#10B981"}
            />
            <Text style={styles.optionText}>
              {user.isFollowing ? `Unfollow ${user.name}` : `Follow ${user.name}`}
            </Text>
          </TouchableOpacity>

          {(postType === 'voice' || postType === 'video') && (
            <>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleDuet}
              >
                <Ionicons name="people" size={20} color="#10B981" />
                <Text style={styles.optionText}>Create Duet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleValidationScreen}
              >
                <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />
                <Text style={styles.optionText}>Validate Pronunciation</Text>
              </TouchableOpacity>
            </>
          )}

          {needsValidation && (
            <>
              <View style={styles.optionDivider} />
              <Text style={styles.validationHeader}>Quick Validation</Text>
              <TouchableOpacity
                style={[styles.optionItem, styles.validationOption]}
                onPress={() => handleValidate(true)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.optionText}>Mark as Correct</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, styles.validationOption]}
                onPress={() => handleValidate(false)}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={styles.optionText}>Needs Improvement</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.optionDivider} />
          <TouchableOpacity
            style={styles.optionItem}
            onPress={handleReport}
          >
            <Ionicons name="flag" size={20} color="#EF4444" />
            <Text style={styles.optionText}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 12,
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 8,
  },
  validationHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  validationOption: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginVertical: 2,
  },
});

export default PostOptionsModal;

