import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';

const { width, height } = Dimensions.get('window');

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated?: () => void;
}

interface NewGroup {
  name: string;
  description: string;
  language: string;
  isPrivate: boolean;
  category: string;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  visible,
  onClose,
  onGroupCreated,
}) => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newGroup, setNewGroup] = useState<NewGroup>({
    name: '',
    description: '',
    language: '',
    isPrivate: false,
    category: '',
  });

  const createGroup = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
    if (!newGroup.name.trim()) {
      Alert.alert('Error', 'Group name is required.');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating group with user ID:', user.id);
      console.log('Group data:', { title: newGroup.name, is_group: true, created_by: user.id });

      if (!session) {
        Alert.alert('Error', 'No active session found. Please log in again.');
        return;
      }

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title: newGroup.name,
          is_group: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) {
        console.error('Conversation creation error:', convError);
        throw convError;
      }

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('conversation_members')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      // Reset form and close modal
      setNewGroup({ name: '', description: '', language: '', isPrivate: false, category: '' });
      onClose();

      // Notify parent component
      if (onGroupCreated) {
        onGroupCreated();
      }

      Alert.alert('Success', 'Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewGroup({ name: '', description: '', language: '', isPrivate: false, category: '' });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Group</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalBodyContent}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Group Name</Text>
              <TextInput
                style={styles.textInput}
                value={newGroup.name}
                onChangeText={(text) => setNewGroup(prev => ({ ...prev, name: text }))}
                placeholder="Enter group name"
                maxLength={50}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newGroup.description}
                onChangeText={(text) => setNewGroup(prev => ({ ...prev, description: text }))}
                placeholder="Describe your group"
                multiline
                numberOfLines={3}
                maxLength={200}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Language Focus</Text>
              <TextInput
                style={styles.textInput}
                value={newGroup.language}
                onChangeText={(text) => setNewGroup(prev => ({ ...prev, language: text }))}
                placeholder="e.g., Spanish, French, Igbo"
                returnKeyType="done"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Group Type</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setNewGroup(prev => ({ ...prev, isPrivate: false }))}
                >
                  <View style={styles.radioButton}>
                    {!newGroup.isPrivate && <View style={styles.radioButtonSelected} />}
                  </View>
                  <Text style={styles.radioText}>Public - Anyone can join</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setNewGroup(prev => ({ ...prev, isPrivate: true }))}
                >
                  <View style={styles.radioButton}>
                    {newGroup.isPrivate && <View style={styles.radioButtonSelected} />}
                  </View>
                  <Text style={styles.radioText}>Private - Invite only</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={createGroup}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Group'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF8A00',
  },
  radioText: {
    fontSize: 14,
    color: '#374151',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#FF8A00',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default CreateGroupModal;
