// src/screens/SignInScreen.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

type SignInScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SignIn'
>;

interface Props {
  navigation: SignInScreenNavigationProp;
}

const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, loading } = useAuth();
  const { colors, theme } = useTheme();

  const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Error handling states
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [generalError, setGeneralError] = useState<string>('');

  const handleGoogleSignIn = async () => {
    setGeneralError('');
    const error = await signInWithGoogle();
    if (error) {
      setGeneralError(error);
    }
  };

  const handleSignIn = async () => {
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!credentials.email) {
      setEmailError('Email is required');
      return;
    }
    if (!emailRegex.test(credentials.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!credentials.password) {
      setPasswordError('Password is required');
      return;
    }

    try {
      const err = await signIn(credentials.email, credentials.password);
      if (err) {
        if (err.includes('Invalid login credentials')) {
          setGeneralError('Invalid email or password');
        } else if (err.includes('Email not confirmed')) {
          setGeneralError('Please verify your email before signing in');
        } else {
          setGeneralError(err);
        }
      }
    } catch (error: any) {
      setGeneralError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign In</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.formContent}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="log-in-outline" size={32} color={colors.background} />
            </View>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>Continue preserving languages together.</Text>
          </View>

          <View style={styles.formSection}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[
                styles.inputContainer,
                emailError ? styles.inputError : null
              ]}>
                <Ionicons name="mail" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={credentials.email}
                  onChangeText={(text) => {
                    setCredentials({ ...credentials, email: text });
                    if (emailError) setEmailError('');
                  }}
                />
                {emailError && <Ionicons name="close-circle" size={16} color={colors.error} />}
                {!emailError && credentials.email && !emailError && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[
                styles.inputContainer,
                passwordError ? styles.inputError : null
              ]}>
                <Ionicons name="lock-closed" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={credentials.password}
                  onChangeText={(text) => {
                    setCredentials({ ...credentials, password: text });
                    if (passwordError) setPasswordError('');
                  }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end' }}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* General Error */}
            {generalError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.generalErrorText}>{generalError}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.7 }]} onPress={handleSignIn} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn} disabled={loading}>
                <Ionicons name="logo-google" size={20} color={colors.text} />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>
              {/* Apple Placeholder */}
              <TouchableOpacity style={styles.socialBtn} onPress={() => Alert.alert('Coming Soon', 'Apple Sign In is currently under development.')}>
                <Ionicons name="logo-apple" size={20} color={colors.text} />
                <Text style={styles.socialBtnText}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
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
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginLeft: 4,
    marginTop: 4,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  generalErrorText: {
    color: colors.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});

export default SignInScreen;