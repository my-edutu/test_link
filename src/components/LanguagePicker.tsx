// src/components/LanguagePicker.tsx
import React, { useState, useMemo } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';

const { width, height } = Dimensions.get('window');

interface Language {
  id: string;
  name: string;
  dialect?: string;
  countryCode?: string; // Optional, for reference
}

interface Country {
  code: string;
  name: string;
  flagEmoji: string;
  languages: Language[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (language: Language) => void;
  selectedLanguage?: Language;
}

// Data Structure
const COUNTRIES: Country[] = [
  {
    code: 'NG',
    name: 'Nigeria',
    flagEmoji: '🇳🇬',
    languages: [
      { id: 'hausa-kano', name: 'Hausa', dialect: 'Kano' },
      { id: 'yoruba-ekiti', name: 'Yoruba', dialect: 'Ekiti Dialect' },
      { id: 'yoruba-lagos', name: 'Yoruba', dialect: 'Lagos Dialect' },
      { id: 'igbo-nsukka', name: 'Igbo', dialect: 'Nsukka' },
      { id: 'igbo-central', name: 'Igbo', dialect: 'Central' },
      { id: 'pidgin-ng', name: 'Pidgin', dialect: 'Nigerian' },
      { id: 'efik', name: 'Efik' },
      { id: 'ibibio', name: 'Ibibio' },
      { id: 'tiv', name: 'Tiv' },
      { id: 'edo', name: 'Edo' },
      { id: 'urhobo', name: 'Urhobo' },
      { id: 'fulfulde', name: 'Fulfulde' },
      { id: 'kanuri', name: 'Kanuri' },
      { id: 'nupe', name: 'Nupe' },
      { id: 'igala', name: 'Igala' },
    ]
  },
  {
    code: 'GH',
    name: 'Ghana',
    flagEmoji: '🇬🇭',
    languages: [
      { id: 'twi-ashanti', name: 'Twi', dialect: 'Ashanti' },
      { id: 'twi-fante', name: 'Fante' },
      { id: 'ewe', name: 'Ewe' },
      { id: 'ga', name: 'Ga' },
      { id: 'dagbani', name: 'Dagbani' },
      { id: 'pidgin-gh', name: 'Pidgin', dialect: 'Ghanaian' },
    ]
  },
  {
    code: 'KE',
    name: 'Kenya',
    flagEmoji: '🇰🇪',
    languages: [
      { id: 'swahili-coastal', name: 'Swahili', dialect: 'Coastal' },
      { id: 'kikuyu', name: 'Kikuyu' },
      { id: 'luo', name: 'Luo' },
      { id: 'kamba', name: 'Kamba' },
      { id: 'kalenjin', name: 'Kalenjin' },
    ]
  },
  {
    code: 'ZA',
    name: 'South Africa',
    flagEmoji: '🇿🇦',
    languages: [
      { id: 'zulu-kwazulu', name: 'Zulu', dialect: 'KwaZulu-Natal' },
      { id: 'xhosa', name: 'Xhosa' },
      { id: 'afrikaans', name: 'Afrikaans' },
      { id: 'sotho-southern', name: 'Sesotho' },
    ]
  },
  {
    code: 'ET',
    name: 'Ethiopia',
    flagEmoji: '🇪🇹',
    languages: [
      { id: 'amharic-central', name: 'Amharic', dialect: 'Central' },
      { id: 'oromo', name: 'Oromo' },
      { id: 'tigrinya', name: 'Tigrinya' },
      { id: 'somali-et', name: 'Somali' },
    ]
  },
  {
    code: 'GLOBAL',
    name: 'Other',
    flagEmoji: '🌍',
    languages: [
      { id: 'english', name: 'English' },
      { id: 'french', name: 'French' },
      { id: 'spanish', name: 'Spanish' },
      { id: 'other', name: 'Other (Custom)...' },
    ]
  }
];

const LanguagePicker: React.FC<Props> = ({ visible, onClose, onSelect, selectedLanguage }) => {
  const { colors, theme } = useTheme();

  // Navigation State
  const [step, setStep] = useState<'COUNTRY' | 'LANGUAGE'>('COUNTRY');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Language State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customLanguage, setCustomLanguage] = useState('');
  const [customDialect, setCustomDialect] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  // Derived Data
  const filteredCountries = useMemo(() => {
    if (!searchQuery) return COUNTRIES;
    const q = searchQuery.toLowerCase();
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const filteredLanguages = useMemo(() => {
    if (!selectedCountry) return [];
    if (!searchQuery) return selectedCountry.languages;

    const q = searchQuery.toLowerCase();
    // Special case for 'other'

    return selectedCountry.languages.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.dialect && l.dialect.toLowerCase().includes(q))
    );
  }, [selectedCountry, searchQuery]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setSearchQuery(''); // Reset search for next step
    setStep('LANGUAGE');
  };

  const handleBackToCountry = () => {
    setStep('COUNTRY');
    setSelectedCountry(null);
    setSearchQuery('');
  };

  const handleLanguageSelect = (item: Language) => {
    if (item.id === 'other') {
      setShowCustomModal(true);
    } else {
      onSelect(item);
      // Reset state for next time
      setStep('COUNTRY');
      setSelectedCountry(null);
      setSearchQuery('');
      onClose();
    }
  };

  const handleCustomLanguageSubmit = async () => {
    if (!customLanguage.trim()) {
      Alert.alert('Error', 'Please enter a language name');
      return;
    }

    setLoading(true);
    try {
      const newLanguage: Language = {
        id: `custom-${Date.now()}`,
        name: customLanguage.trim(),
        dialect: customDialect.trim() || undefined
      };

      // Optional: Save to DB in background
      (async () => {
        try {
          await supabase.from('languages').insert({
            name: customLanguage.trim(),
            dialect: customDialect.trim() || null,
          });
        } catch { }
      })();

      onSelect(newLanguage);
      setShowCustomModal(false);
      setCustomLanguage('');
      setCustomDialect('');
      setStep('COUNTRY');
      setSelectedCountry(null);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to process custom language');
    } finally {
      setLoading(false);
    }
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleCountrySelect(item)}
    >
      <View style={styles.itemContent}>
        <Text style={styles.flagEmoji}>{item.flagEmoji}</Text>
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSubtext}>{item.languages.length} Languages</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        selectedLanguage?.id === item.id && styles.selectedItem
      ]}
      onPress={() => handleLanguageSelect(item)}
    >
      <View style={styles.itemContent}>
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.dialect && (
            <Text style={styles.itemSubtext}>{item.dialect}</Text>
          )}
        </View>
      </View>
      {selectedLanguage?.id === item.id && (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              {step === 'LANGUAGE' ? (
                <TouchableOpacity onPress={handleBackToCountry} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              )}

              <Text style={styles.title}>
                {step === 'COUNTRY' ? 'Select Country' : `Languages in ${selectedCountry?.name}`}
              </Text>

              {/* Spacer for alignment */}
              <View style={{ width: 24 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={step === 'COUNTRY' ? "Search country..." : "Search language (e.g. 'Igbo')..."}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* List */}
          {step === 'COUNTRY' ? (
            <FlatList
              data={filteredCountries}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <FlatList
              data={filteredLanguages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No languages found matching "{searchQuery}"</Text>
                  <TouchableOpacity onPress={() => setShowCustomModal(true)}>
                    <Text style={styles.addCustomText}>+ Add Custom Language</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* Custom Language Modal */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.container}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => setShowCustomModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Add Custom Language</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.customForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Language Name *</Text>
              <TextInput
                style={styles.input}
                value={customLanguage}
                onChangeText={setCustomLanguage}
                placeholder="e.g., Igbo"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dialect (Optional)</Text>
              <TextInput
                style={styles.input}
                value={customDialect}
                onChangeText={setCustomDialect}
                placeholder="e.g., Owerri"
                placeholderTextColor={colors.textSecondary}
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

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: '100%',
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedItem: {
    backgroundColor: theme === 'dark' ? 'rgba(255, 138, 0, 0.1)' : '#FFF8F0',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flagEmoji: {
    fontSize: 28,
  },
  itemTextContainer: {
    gap: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  addCustomText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  customForm: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.inputBackground,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  }
});

export default LanguagePicker;