// src/screens/SignUpScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import LanguagePicker from '../components/LanguagePicker';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const { width, height } = Dimensions.get('window');

type SignUpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SignUp'
>;

interface Props {
  navigation: SignUpScreenNavigationProp;
}

interface User {
  fullName: string;
  username: string;
  email: string;
  password: string;
  primaryLanguage: string;
}

interface Language {
  id: string;
  name: string;
  dialect?: string;
}

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { signUp, signInWithGoogle, loading } = useAuth();
  const { colors, theme } = useTheme(); // Use theme
  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const [user, setUser] = useState<User>({
    fullName: '',
    username: '',
    email: '',
    password: '',
    primaryLanguage: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | undefined>();
  const [inviteCode, setInviteCode] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [stateRegion, setStateRegion] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [lga, setLga] = useState<string>('');

  // Real-time validation states
  const [emailError, setEmailError] = useState<string>('');
  const [usernameError, setUsernameError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  // Real-time email validation
  const validateEmail = async (email: string) => {
    if (!email) {
      setEmailError('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsValidating(true);
    try {
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingEmail) {
        setEmailError('An account with this email already exists');
      } else {
        setEmailError('');
      }
    } catch (error) {
      setEmailError('Error checking email availability');
    } finally {
      setIsValidating(false);
    }
  };

  // Real-time username validation
  const validateUsername = async (username: string) => {
    if (!username) {
      setUsernameError('');
      return;
    }

    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    setIsValidating(true);
    try {
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existingUsername) {
        setUsernameError('Username is already taken');
      } else {
        setUsernameError('');
      }
    } catch (error) {
      setUsernameError('Error checking username availability');
    } finally {
      setIsValidating(false);
    }
  };

  // Debounced validation
  useEffect(() => {
    const emailTimer = setTimeout(() => {
      if (user.email) validateEmail(user.email);
    }, 500);
    return () => clearTimeout(emailTimer);
  }, [user.email]);

  useEffect(() => {
    const usernameTimer = setTimeout(() => {
      if (user.username) validateUsername(user.username);
    }, 500);
    return () => clearTimeout(usernameTimer);
  }, [user.username]);

  const handleSignUp = async () => {
    if (!user.fullName || !user.username || !user.email || !user.password || !user.primaryLanguage || !country || !stateRegion || !city || !lga) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (user.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (emailError || usernameError) {
      Alert.alert('Error', 'Please fix the validation errors before continuing');
      return;
    }

    const err = await signUp({
      email: user.email,
      password: user.password,
      fullName: user.fullName,
      username: user.username,
      primaryLanguage: user.primaryLanguage,
      inviteCode: inviteCode?.trim() || undefined,
      country: country || undefined,
      state: stateRegion || undefined,
      city: city || undefined,
      lga: lga || undefined,
    });
    if (err) {
      Alert.alert('Sign Up Failed', err);
      return;
    }
    Alert.alert('Success', 'Please check your email to verify your account.');
    navigation.navigate('VerifyEmail', { email: user.email });
  };

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    setUser({ ...user, primaryLanguage: `${language.name}${language.dialect ? ` / ${language.dialect}` : ''}` });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign Up</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.formContent}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand/Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="globe-outline" size={32} color={colors.background} />
            </View>
            <Text style={styles.welcomeTitle}>Start your journey.</Text>
            <Text style={styles.welcomeSubtitle}>Preserve your heritage, one word at a time.</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="What's your name?"
                  placeholderTextColor={colors.textSecondary}
                  value={user.fullName}
                  onChangeText={(text) => setUser({ ...user, fullName: text })}
                />
              </View>
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <View style={[styles.inputContainer, usernameError ? styles.inputError : null]}>
                <Text style={[styles.atSymbol, { color: colors.textSecondary }]}>@</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Choose a username"
                  placeholderTextColor={colors.textSecondary}
                  value={user.username}
                  onChangeText={(text) => setUser({ ...user, username: text })}
                  autoCapitalize="none"
                />
                {isValidating && user.username && <Ionicons name="time-outline" size={16} color={colors.textSecondary} />}
                {usernameError && <Ionicons name="close-circle" size={16} color={colors.error} />}
                {!usernameError && user.username && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
              </View>
              {usernameError && <Text style={styles.errorText}>{usernameError}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                <Ionicons name="mail" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={user.email}
                  onChangeText={(text) => setUser({ ...user, email: text })}
                />
                {isValidating && user.email && <Ionicons name="time-outline" size={16} color={colors.textSecondary} />}
                {emailError && <Ionicons name="close-circle" size={16} color={colors.error} />}
                {!emailError && user.email && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
              </View>
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Create a password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={user.password}
                  onChangeText={(text) => setUser({ ...user, password: text })}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Language Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Primary Language</Text>
              <TouchableOpacity style={styles.inputContainer} onPress={() => setShowLanguagePicker(true)}>
                <Ionicons name="language" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.textInput, { paddingVertical: 12 }, !user.primaryLanguage && { color: colors.textSecondary }]}>
                  {user.primaryLanguage || 'Select Language'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Location Fields (Grouped) */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Country</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nigeria"
                    placeholderTextColor={colors.textSecondary}
                    value={country}
                    onChangeText={setCountry}
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="State"
                    placeholderTextColor={colors.textSecondary}
                    value={stateRegion}
                    onChangeText={setStateRegion}
                  />
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="City"
                    placeholderTextColor={colors.textSecondary}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>LGA</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="LGA"
                    placeholderTextColor={colors.textSecondary}
                    value={lga}
                    onChangeText={setLga}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Invite Code</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="ticket" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Optional"
                  placeholderTextColor={colors.textSecondary}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && { opacity: 0.7 }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} onPress={signInWithGoogle} disabled={loading}>
                <Ionicons name="logo-google" size={20} color={colors.text} />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
              {/* Placeholder Apple button for visual match */}
              <TouchableOpacity style={styles.socialBtn} onPress={() => Alert.alert('Coming Soon', 'Apple Sign In is currently under development.')}>
                <Ionicons name="logo-apple" size={20} color={colors.text} />
                <Text style={styles.socialBtnText}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={styles.footerLink}>Log In</Text>
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <Text style={styles.termsText}>
              By signing up, you agree to our <Text style={{ textDecorationLine: 'underline' }}>Terms of Service</Text> and <Text style={{ textDecorationLine: 'underline' }}>Privacy Policy</Text>.
            </Text>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LanguagePicker
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        onSelect={handleLanguageSelect}
        selectedLanguage={selectedLanguage}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  iconContainer: {
    width: 60, height: 60,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 5,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E0E0E0',
  },
  inputError: {
    borderColor: colors.error,
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    height: '100%',
    backgroundColor: 'transparent',
  },
  inputIcon: {
    marginRight: 12,
  },
  atSymbol: {
    fontSize: 16,
    marginRight: 4,
    fontWeight: 'bold',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginLeft: 4,
    marginTop: 4,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E0E0E0',
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  socialRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#E0E0E0',
    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#FFF',
    gap: 10,
  },
  socialBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary, // Using primary for the link color now
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 20,
  },
});

export default SignUpScreen;