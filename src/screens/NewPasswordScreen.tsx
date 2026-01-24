// src/screens/NewPasswordScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';

const { width, height } = Dimensions.get('window');

type NewPasswordScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'NewPassword'
>;

type Props = NativeStackScreenProps<RootStackParamList, 'NewPassword'>;

const NewPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string>('');
  const [confirmPasswordError, setConfirmPasswordError] = useState<string>('');
  const [generalError, setGeneralError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Check if user has a valid session for password reset
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      } else {
        setGeneralError('No valid session found. Please request a new password reset link.');
      }
    };
    checkSession();
  }, []);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  const handleUpdatePassword = async () => {
    // Clear previous errors
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');

    // Validate password
    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const error = await updatePassword(password);
      if (error) {
        setGeneralError(error);
        return;
      }

      // After successful password update, sign out the user
      await supabase.auth.signOut();
      setIsSuccess(true);
    } catch (error: any) {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Password Updated</Text>
          </View>

          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Password Successfully Updated</Text>
            <Text style={styles.successDescription}>
              Your password has been changed successfully. You can now sign in with your new password.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.primaryButtonText}>Continue to Sign In</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Show loading while checking session
  if (!hasSession && !generalError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Verifying reset link...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF8A00" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Set New Password</Text>
        </View>
        <Text style={styles.formSubtitle}>Enter your new password below</Text>

        <View style={styles.formContent}>
          {/* General Error Message */}
          {generalError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={[
              styles.inputContainer,
              passwordError ? styles.inputContainerError : null
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your new password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError(''); // Clear error when user starts typing
                }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
              {passwordError ? (
                <Ionicons name="close-circle" size={16} color="#EF4444" style={{ marginLeft: 8 }} />
              ) : null}
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : (
              <Text style={styles.inputHint}>Must be at least 6 characters</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={[
              styles.inputContainer,
              confirmPasswordError ? styles.inputContainerError : null
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Confirm your new password"
                placeholderTextColor="#999"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError(''); // Clear error when user starts typing
                }}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
              {confirmPasswordError ? (
                <Ionicons name="close-circle" size={16} color="#EF4444" style={{ marginLeft: 8 }} />
              ) : null}
            </View>
            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleUpdatePassword}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>

          {/* Back to Sign In */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF8A00',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.06,
    paddingBottom: height * 0.02,
  },
  formTitle: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formSubtitle: {
    fontSize: width * 0.04,
    color: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: width * 0.05,
    paddingBottom: height * 0.02,
  },
  formContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.04,
    paddingBottom: height * 0.05,
  },
  successContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: width * 0.05,
    paddingTop: height * 0.06,
    paddingBottom: height * 0.05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: width * 0.06,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: width * 0.04,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: height * 0.025,
  },
  inputLabel: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: height * 0.015,
    minHeight: 50,
  },
  inputContainerError: {
    borderColor: '#EF4444',
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: width * 0.04,
    color: '#1F2937',
  },
  inputHint: {
    fontSize: width * 0.03,
    color: '#6B7280',
    marginTop: 4,
  },
  errorText: {
    fontSize: width * 0.035,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#FF8A00',
    paddingVertical: height * 0.02,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 50,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: width * 0.04,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: width * 0.035,
    color: '#FF8A00',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF8A00',
  },
  loadingText: {
    fontSize: width * 0.04,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default NewPasswordScreen;
