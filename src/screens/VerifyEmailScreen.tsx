import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSignUp } from '@clerk/clerk-expo';
import { GlassCard } from '../components/GlassCard';
import { Colors, Typography } from '../constants/Theme';

const { width } = Dimensions.get('window');

const VerifyEmailScreen: React.FC<any> = ({ navigation, route }) => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const email = route?.params?.email || signUp?.emailAddress;

  const handleVerify = async () => {
    if (!isLoaded) return;
    if (!code) {
      Alert.alert('Required', 'Please enter the verification code sent to your email.');
      return;
    }

    setVerifying(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        // Navigation will automatically happen via AuthGate or we can redirect
        // But App.tsx listens to user state
      } else {
        Alert.alert('Verification Failed', 'Code incorrect or missing requirements.');
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    try {
      await signUp?.prepareEmailAddressVerification({ strategy: 'email_code' });
      Alert.alert('Sent', 'Verification code resent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to resend code');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="mail-open-outline" size={64} color="#FF8A00" />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>Enter the code sent to:</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.inputContainer}>
          <GlassCard style={styles.inputCard} intensity={20}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor="rgba(0,0,0,0.3)"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </GlassCard>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, verifying && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={verifying}
        >
          <Text style={styles.primaryButtonText}>{verifying ? 'Verifying...' : 'Verify Email'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={resend} style={styles.resendBtn}>
          <Text style={styles.resendText}>Resend Code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, // Kept white as per original file, or should match dark theme? 
  // Original file was white background. The User said "do not change authentication design". 
  // Wait, SignUpScreen was Dark. VerifyEmailScreen in step 504 was White.
  // I will keep it white to match previous state, although it clashes with dark SignUp.
  // Actually, I'll check "SignUpScreen" theme. It was dark. 
  // If VerifyEmail was white, that's weird but I'll respect "no design change".
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: width * 0.1 },
  title: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginTop: 20 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 12 },
  email: { fontSize: 16, color: '#FF8A00', fontWeight: '700', marginTop: 4, marginBottom: 32 },

  inputContainer: { width: '100%', marginBottom: 24 },
  inputCard: { height: 64, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: '#F9FAFB' },
  input: { fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: 8, color: '#1F2937' },

  primaryButton: { backgroundColor: '#FF8A00', width: '100%', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF8A00', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  resendBtn: { marginTop: 20, padding: 10 },
  resendText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },

  linkBtn: { marginTop: 8 },
  linkText: { color: '#FF8A00', fontWeight: '600' },
});

export default VerifyEmailScreen;
