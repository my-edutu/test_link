// src/components/CreateGroupModal.tsx
import React, { useState, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';
import { Colors } from '../constants/Theme';

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
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [newGroup, setNewGroup] = useState<NewGroup>({
    name: '',
    description: '',
    language: '',
    isPrivate: false,
    category: '',
  });

  const styles = useMemo(() => StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    keyboardView: {
      width: '100%',
      maxHeight: '90%',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      flex: 1,
      paddingTop: 8,
      backgroundColor: colors.card,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    modalBody: {
      flex: 1,
    },
    modalBodyContent: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      paddingBottom: 40,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
      marginLeft: 4,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      backgroundColor: colors.inputBackground,
      color: colors.text,
      borderColor: colors.border,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    radioGroup: {
      marginTop: 8,
      backgroundColor: colors.inputBackground,
      borderRadius: 16,
      padding: 12,
    },
    radioOption: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingVertical: 4,
    },
    radioButton: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: colors.border,
    },
    radioButtonSelected: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: Colors.primary,
    },
    radioText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    modalFooter: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderTopWidth: 1,
      marginBottom: 20,
      gap: 12,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      borderColor: colors.border,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    createButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor: Colors.primary,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  }), [colors]);

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
      <View style={styles.modalOverlay}>
        <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <GlassCard intensity={isDark ? 40 : 80} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Group</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
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
                  placeholderTextColor={colors.textSecondary}
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
                  placeholderTextColor={colors.textSecondary}
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
                  placeholderTextColor={colors.textSecondary}
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
          </GlassCard>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default CreateGroupModal;
