import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';

const { width, height } = Dimensions.get('window');

interface Interest {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: 'language' | 'topic' | 'region' | 'content';
}

const InterestSelectionScreen: React.FC<any> = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const interests: Interest[] = [
    // Languages
    { id: 'english', name: 'English', icon: '🇺🇸', color: '#3B82F6', category: 'language' },
    { id: 'spanish', name: 'Spanish', icon: '🇪🇸', color: '#EF4444', category: 'language' },
    { id: 'french', name: 'French', icon: '🇫🇷', color: '#8B5CF6', category: 'language' },
    { id: 'german', name: 'German', icon: '🇩🇪', color: '#F59E0B', category: 'language' },
    { id: 'chinese', name: 'Chinese', icon: '🇨🇳', color: '#10B981', category: 'language' },
    { id: 'japanese', name: 'Japanese', icon: '🇯🇵', color: '#EF4444', category: 'language' },
    { id: 'arabic', name: 'Arabic', icon: '🇸🇦', color: '#059669', category: 'language' },
    { id: 'hindi', name: 'Hindi', icon: '🇮🇳', color: '#10B981', category: 'language' },
    { id: 'portuguese', name: 'Portuguese', icon: '🇧🇷', color: '#059669', category: 'language' },
    { id: 'russian', name: 'Russian', icon: '🇷🇺', color: '#3B82F6', category: 'language' },
    { id: 'korean', name: 'Korean', icon: '🇰🇷', color: '#8B5CF6', category: 'language' },
    { id: 'italian', name: 'Italian', icon: '🇮🇹', color: '#10B981', category: 'language' },

    // Topics
    { id: 'culture', name: 'Culture', icon: '🏛️', color: '#8B5CF6', category: 'topic' },
    { id: 'travel', name: 'Travel', icon: '✈️', color: '#3B82F6', category: 'topic' },
    { id: 'business', name: 'Business', icon: '💼', color: '#059669', category: 'topic' },
    { id: 'food', name: 'Food & Cooking', icon: '🍳', color: '#F59E0B', category: 'topic' },
    { id: 'music', name: 'Music', icon: '🎵', color: '#EF4444', category: 'topic' },
    { id: 'sports', name: 'Sports', icon: '⚽', color: '#10B981', category: 'topic' },
    { id: 'technology', name: 'Technology', icon: '💻', color: '#6B7280', category: 'topic' },
    { id: 'art', name: 'Art & Design', icon: '🎨', color: '#8B5CF6', category: 'topic' },
    { id: 'health', name: 'Health & Wellness', icon: '🏥', color: '#10B981', category: 'topic' },
    { id: 'education', name: 'Education', icon: '📚', color: '#3B82F6', category: 'topic' },

    // Regions
    { id: 'north_america', name: 'North America', icon: '🌎', color: '#3B82F6', category: 'region' },
    { id: 'europe', name: 'Europe', icon: '🌍', color: '#8B5CF6', category: 'region' },
    { id: 'asia', name: 'Asia', icon: '🌏', color: '#10B981', category: 'region' },
    { id: 'africa', name: 'Africa', icon: '🌍', color: '#F59E0B', category: 'region' },
    { id: 'south_america', name: 'South America', icon: '🌎', color: '#EF4444', category: 'region' },
    { id: 'oceania', name: 'Oceania', icon: '🌏', color: '#059669', category: 'region' },

    // Content Types
    { id: 'stories', name: 'Stories', icon: '📖', color: '#8B5CF6', category: 'content' },
    { id: 'conversations', name: 'Conversations', icon: '💬', color: '#3B82F6', category: 'content' },
    { id: 'pronunciation', name: 'Pronunciation', icon: '🗣️', color: '#10B981', category: 'content' },
    { id: 'vocabulary', name: 'Vocabulary', icon: '📝', color: '#F59E0B', category: 'content' },
    { id: 'grammar', name: 'Grammar', icon: '📚', color: '#EF4444', category: 'content' },
  ];

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleContinue = async () => {
    if (selectedInterests.length === 0) {
      Alert.alert(
        'No Interests Selected',
        'You can skip this step, but selecting interests will help us personalize your experience.',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Skip', onPress: () => handleSkip(true) }
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      if (user?.id) {
        const { data: saved, error: upsertError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              interests: selectedInterests,
              has_completed_onboarding: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          .select('id')
          .single();

        if (upsertError || !saved) {
          console.error('Error saving interests array:', upsertError);
          Alert.alert('Error', 'Failed to save your interests. Please try again.');
          return;
        }

        console.log('Interests saved successfully.');
        navigation.replace('MainTabs');
      }
    } catch (error) {
      console.error('Error in handleContinue:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async (silent?: boolean) => {
    if (!silent) {
      Alert.alert(
        'Skip Interests?',
        'You can always add interests later in your profile settings.',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Skip', onPress: () => handleSkip(true) }
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      // Mark onboarding complete on skip as well (interests empty)
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              interests: [],
              has_completed_onboarding: true,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          );

        if (error) {
          console.error('Error marking onboarding complete on skip:', error);
          Alert.alert('Error', 'Failed to complete setup. Please try again.');
          return;
        }

        console.log('Onboarding skipped successfully. Navigating to Home tab.');
        navigation.replace('MainTabs');
      }
    } catch (e) {
      console.error('Error marking onboarding complete on skip:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderInterestCard = (interest: Interest) => {
    const isSelected = selectedInterests.includes(interest.id);

    return (
      <TouchableOpacity
        key={interest.id}
        style={[
          styles.interestCard,
          isSelected && styles.selectedInterestCard,
          { borderColor: isSelected ? interest.color : '#E5E7EB' }
        ]}
        onPress={() => toggleInterest(interest.id)}
      >
        <View style={styles.interestIcon}>
          <Text style={styles.interestEmoji}>{interest.icon}</Text>
        </View>
        <Text style={[
          styles.interestName,
          isSelected && { color: interest.color }
        ]}>
          {interest.name}
        </Text>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: interest.color }]}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const groupedInterests = interests.reduce((acc, interest) => {
    if (!acc[interest.category]) {
      acc[interest.category] = [];
    }
    acc[interest.category].push(interest);
    return acc;
  }, {} as Record<string, Interest[]>);

  const categoryTitles = {
    language: 'Languages',
    topic: 'Topics',
    region: 'Regions',
    content: 'Content Types'
  };

  const orderedCategories = (Object.keys(categoryTitles) as Array<keyof typeof categoryTitles>)
    .filter((key) => Boolean(groupedInterests[key] && groupedInterests[key].length > 0));

  // Compute progress: number of categories with at least one selected interest
  const selectedSet = new Set(selectedInterests);
  const completedCategories = orderedCategories.reduce((count, cat) => {
    const anySelected = (groupedInterests[cat] || []).some(i => selectedSet.has(i.id));
    return count + (anySelected ? 1 : 0);
  }, 0);
  const totalSteps = orderedCategories.length || 1;
  const progressPercent = Math.round(((completedCategories) / totalSteps) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + height * 0.02 }]}>
        <Text style={styles.headerTitle}>What interests you?</Text>
        <Text style={styles.headerSubtitle}>
          Help us personalize your experience by selecting your interests
        </Text>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>Step {completedCategories} of {totalSteps}</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {orderedCategories.map((categoryKey) => (
          <View key={String(categoryKey)} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {categoryTitles[categoryKey]}
            </Text>
            <View style={styles.interestsGrid}>
              {groupedInterests[categoryKey].map(renderInterestCard)}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => handleSkip(true)}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueButton,
              selectedInterests.length === 0 && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FF8A00',
    paddingTop: height * 0.02,
    paddingBottom: height * 0.03,
    paddingHorizontal: width * 0.05,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: width * 0.05,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF8A00',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    paddingTop: 20,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  interestCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedInterestCard: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  interestIcon: {
    marginBottom: 8,
  },
  interestEmoji: {
    fontSize: 24,
  },
  interestName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: width * 0.05,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  selectionInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  selectionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#FF8A00',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default InterestSelectionScreen;
