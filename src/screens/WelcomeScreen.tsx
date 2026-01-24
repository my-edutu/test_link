// src/screens/WelcomeScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={theme === 'dark' ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with microphone icon */}
        <View style={styles.headerSection}>
          <View style={styles.microphoneContainer}>
            <Ionicons name="mic" size={width * 0.1} color={colors.primary} />
            <View style={styles.sparkle}>
              <Ionicons name="sparkles" size={width * 0.04} color={colors.primary} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Lingualink AI</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Preserving languages,{'\n'}one voice at a time
          </Text>

          {/* AI-powered tagline */}
          <Text style={styles.tagline}>Now with AI-powered storytelling</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="mic"
            title="Share Your Voice"
            description="Record and share phrases in your native language or dialect"
            colors={colors}
          />
          <FeatureItem
            icon="videocam"
            title="Create AI Stories"
            description="Turn your voice into animated stories and cultural tales"
            colors={colors}
          />
          <FeatureItem
            icon="globe"
            title="Preserve Culture"
            description="Help build the world's largest archive of living languages"
            colors={colors}
          />
          <FeatureItem
            icon="trophy"
            title="Earn & Learn"
            description="Get rewarded for contributions and discover new languages"
            colors={colors}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Ionicons name="sparkles" size={20} color="#FFFFFF" style={baseStyles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.secondaryButtonText}>I Already Have an Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Feature Item Component
const FeatureItem: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: any;
}> = ({ icon, title, description, colors }) => (
  <View style={baseStyles.featureItem}>
    <View style={[baseStyles.featureIcon, { backgroundColor: colors.secondary }]}>
      <Ionicons name={icon} size={width * 0.06} color={colors.primary} />
    </View>
    <View style={baseStyles.featureContent}>
      <Text style={[baseStyles.featureTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[baseStyles.featureDescription, { color: colors.textSecondary }]}>{description}</Text>
    </View>
  </View>
);

const baseStyles = StyleSheet.create({
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height * 0.025,
    paddingHorizontal: width * 0.02,
  },
  featureIcon: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.04,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: width * 0.045,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: width * 0.035,
    lineHeight: width * 0.05,
  },
  buttonIcon: {
    marginRight: 8,
  },
});

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: width * 0.05,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: height * 0.05,
    marginBottom: height * 0.04,
  },
  microphoneContainer: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    backgroundColor: colors.secondary, // Changed from alpha white to secondary (light orange/dark orange)
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: height * 0.03,
  },
  sparkle: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: height * 0.02,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: width * 0.05,
    color: colors.text,
    textAlign: 'center',
    marginBottom: height * 0.01,
    lineHeight: width * 0.07,
  },
  tagline: {
    fontSize: width * 0.04,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: height * 0.02,
  },
  featuresContainer: {
    width: '100%',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    marginTop: height * 0.02,
  },
  primaryButton: {
    backgroundColor: colors.primary, // Orange
    paddingVertical: height * 0.02,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF', // White text on orange button
    fontSize: width * 0.04,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: height * 0.02,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: width * 0.04,
    fontWeight: '500',
  },
});

export default WelcomeScreen;