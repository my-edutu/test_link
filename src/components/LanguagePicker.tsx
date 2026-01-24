// src/components/LanguagePicker.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

const { width, height } = Dimensions.get('window');

interface Language {
  id: string;
  name: string;
  dialect?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (language: Language) => void;
  selectedLanguage?: Language;
}

// Predefined languages
const predefinedLanguages: Language[] = [
  { id: 'yoruba-ekiti', name: 'Yoruba', dialect: 'Ekiti Dialect' },
  { id: 'yoruba-lagos', name: 'Yoruba', dialect: 'Lagos Dialect' },
  { id: 'igbo-nsukka', name: 'Igbo', dialect: 'Nsukka' },
  { id: 'hausa-kano', name: 'Hausa', dialect: 'Kano' },
  { id: 'twi-ashanti', name: 'Twi', dialect: 'Ashanti' },
  { id: 'swahili-coastal', name: 'Swahili', dialect: 'Coastal' },
  { id: 'zulu-kwazulu', name: 'Zulu', dialect: 'KwaZulu-Natal' },
  { id: 'amharic-central', name: 'Amharic', dialect: 'Central' },
  { id: 'other', name: 'Other...' },
];

const LanguagePicker: React.FC<Props> = ({ visible, onClose, onSelect, selectedLanguage }) => {
  const [languages] = useState<Language[]>(predefinedLanguages);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customLanguage, setCustomLanguage] = useState('');
  const [customDialect, setCustomDialect] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCustomLanguageSubmit = async () => {
    if (!customLanguage.trim()) {
      Alert.alert('Error', 'Please enter a language name');
      return;
    }

    setLoading(true);
    try {
      // Create the new language object (always use local ID for now)
      const newLanguage: Language = {
        id: `custom-${Date.now()}`, // Generate local ID
        name: customLanguage.trim(),
        dialect: customDialect.trim() || undefined
      };

      // Try to save to database in background (don't wait for it)
      (async () => {
        try {
          const { error } = await supabase
            .from('languages')
            .insert({
              name: customLanguage.trim(),
              dialect: customDialect.trim() || null,
            });

          if (error) {
            console.log('Background save failed (this is OK):', error.message);
          } else {
            console.log('Custom language saved to database');
          }
        } catch (dbError: any) {
          console.log('Database connection issue (this is OK):', dbError.message);
        }
      })();

      // Select the new language immediately
      onSelect(newLanguage);
      setShowCustomModal(false);
      setCustomLanguage('');
      setCustomDialect('');
      onClose();
    } catch (error) {
      console.error('Error with custom language:', error);
      Alert.alert('Error', 'Failed to process custom language');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = (item: Language) => {
    if (item.id === 'other') {
      setShowCustomModal(true);
    } else {
      onSelect(item);
      onClose();
    }
  };

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        selectedLanguage?.id === item.id && styles.selectedLanguageItem
      ]}
      onPress={() => handleLanguageSelect(item)}
    >
      <View style={styles.languageInfo}>
        <Text style={styles.languageName}>{item.name}</Text>
        {item.dialect && (
          <Text style={styles.dialectText}>/ {item.dialect}</Text>
        )}
      </View>
      {selectedLanguage?.id === item.id && (
        <Ionicons name="checkmark" size={20} color="#FF8A00" />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>Select Language</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={languages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {/* Custom Language Input Modal */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowCustomModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>Add Custom Language</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.customLanguageContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Language Name *</Text>
              <TextInput
                style={styles.textInput}
                value={customLanguage}
                onChangeText={setCustomLanguage}
                placeholder="e.g., Igbo"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Dialect (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={customDialect}
                onChangeText={setCustomDialect}
                placeholder="e.g., Owerri"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleCustomLanguageSubmit}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Language'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
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
  customLanguageContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
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
  saveButton: {
    backgroundColor: '#FF8A00',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LanguagePicker;