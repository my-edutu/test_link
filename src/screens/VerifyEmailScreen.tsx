import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';

const { width, height } = Dimensions.get('window');

const VerifyEmailScreen: React.FC<any> = ({ navigation, route }) => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const email = user?.email || route?.params?.email;

  const resend = async () => {
    if (!email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: 'lingualink://auth' },
      });
      if (error) throw error;
      Alert.alert('Verification Sent', 'Please check your email for the verification link.');
    } catch (e: any) {
      Alert.alert('Failed to Resend', e.message || 'Please try again later');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="mail" size={48} color="#FF8A00" />
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>We sent a verification link to:</Text>
        <Text style={styles.email}>{email || 'your email'}</Text>
        <Text style={styles.help}>Open the link on this device to complete sign in.</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={resend} disabled={sending || !email}>
          <Text style={styles.primaryButtonText}>{sending ? 'Sending...' : 'Resend verification email'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: width * 0.1 },
  title: { fontSize: 22, fontWeight: '700', color: '#1F2937', marginTop: 12 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  email: { fontSize: 16, color: '#374151', fontWeight: '600', marginTop: 4 },
  help: { fontSize: 12, color: '#6B7280', marginTop: 16, textAlign: 'center' },
  primaryButton: { backgroundColor: '#FF8A00', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 20, minWidth: 240, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  linkBtn: { marginTop: 16 },
  linkText: { color: '#FF8A00', fontWeight: '600' },
});

export default VerifyEmailScreen;


