// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';

const { width, height } = Dimensions.get('window');

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ForgotPassword'
>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleResetPassword = async () => {
    // Clear previous errors
    setEmailError('');

    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const error = await resetPassword(email);
      if (error) {
        setEmailError(error);
        return;
      }
      setIsSuccess(true);
    } catch (error: any) {
      setEmailError('An unexpected error occurred. Please try again.');
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
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Check Your Email</Text>
          </View>

          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="mail" size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Password Reset Sent</Text>
            <Text style={styles.successSubtitle}>
              We've sent a password reset link to:
            </Text>
            <Text style={styles.emailText}>{email}</Text>
            <Text style={styles.successDescription}>
              Check your email and click the link to reset your password. The link will expire in 1 hour.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setIsSuccess(false);
                setEmail('');
              }}
            >
              <Text style={styles.secondaryButtonText}>Try Different Email</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Reset Password</Text>
        </View>
        <Text style={styles.formSubtitle}>Enter your email to receive a password reset link</Text>

        <View style={styles.formContent}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[
              styles.inputContainer,
              emailError ? styles.inputContainerError : null
            ]}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError(''); // Clear error when user starts typing
                }}
              />
              {emailError ? (
                <Ionicons name="close-circle" size={16} color="#EF4444" />
              ) : null}
            </View>
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
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
    marginLeft: 20,
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
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: width * 0.04,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emailText: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  successDescription: {
    fontSize: width * 0.035,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
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
  errorText: {
    fontSize: width * 0.035,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
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
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: height * 0.015,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: width * 0.04,
    fontWeight: '500',
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
});

export default ForgotPasswordScreen;
