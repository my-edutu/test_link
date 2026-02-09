import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabaseClient';
import { Colors, Gradients, Typography, Layout } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';

const { width } = Dimensions.get('window');

export default function SignUpScreen() {
  const navigation = useNavigation<any>();
  const { signUp, loading } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Precise validation
  const validateEmail = async (val: string) => {
    if (!val) { setEmailError(''); return; }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) { setEmailError('Invalid email format'); return; }

    setIsValidating(true);
    const { data } = await supabase.from('profiles').select('id').eq('email', val).maybeSingle();
    if (data) setEmailError('Email already registered');
    else setEmailError('');
    setIsValidating(false);
  };

  const validateUsername = async (val: string) => {
    if (!val) { setUsernameError(''); return; }
    if (val.length < 3) { setUsernameError('Too short'); return; }

    setIsValidating(true);
    const { data } = await supabase.from('profiles').select('id').eq('username', val.toLowerCase()).maybeSingle();
    if (data) setUsernameError('Username taken');
    else setUsernameError('');
    setIsValidating(false);
  };

  useEffect(() => {
    const t = setTimeout(() => validateEmail(email), 500);
    return () => clearTimeout(t);
  }, [email]);

  useEffect(() => {
    const t = setTimeout(() => validateUsername(username), 500);
    return () => clearTimeout(t);
  }, [username]);

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      Alert.alert('Required', 'Please fill in all fields');
      return;
    }
    if (emailError || usernameError) return;

    const err = await signUp({
      email,
      password,
      username: username.toLowerCase().trim(),
      fullName: username, // Temporary fallback
      primaryLanguage: 'Selected in Next Step',
      inviteCode: inviteCode.trim()
    });

    if (err) {
      Alert.alert('Error', err);
    } else {
      navigation.navigate('VerifyEmail', { email });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
      {isDark && <LinearGradient colors={['#1F0802', '#0D0200']} style={StyleSheet.absoluteFill} />}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder }]}
          >
            <MaterialIcons name="chevron-left" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(800)} style={styles.content}>
            <Text style={[styles.headline, { color: colors.text }]}>Create <Text style={{ color: colors.primary }}>Account</Text></Text>
            <Text style={[styles.subhead, { color: colors.textSecondary }]}>Join the community of language preservers.</Text>

            <View style={styles.form}>
              <InputGroup
                label="Username"
                icon="at-outline"
                placeholder="Choose a handle"
                value={username}
                onChangeText={setUsername}
                error={usernameError}
                isValidating={isValidating}
                themeColors={colors}
              />
              <InputGroup
                label="Email Address"
                icon="mail-outline"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                error={emailError}
                isValidating={isValidating}
                themeColors={colors}
              />
              <InputGroup
                label="Password"
                icon="lock-closed-outline"
                placeholder="Min. 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? "eye-off" : "eye"}
                onRightIconPress={() => setShowPassword(!showPassword)}
                themeColors={colors}
              />
              <InputGroup
                label="Referral Code (Optional)"
                icon="gift-outline"
                placeholder="e.g. @username"
                value={inviteCode}
                onChangeText={setInviteCode}
                themeColors={colors}
              />
            </View>

            <TouchableOpacity
              style={[styles.mainBtn, loading && { opacity: 0.7 }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>{loading ? 'Creating...' : 'Create Account'}</Text>
                <MaterialIcons name="arrow-forward" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Log In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const InputGroup = ({ label, icon, error, isValidating, rightIcon, onRightIconPress, themeColors, ...props }: any) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: themeColors.textSecondary }]}>{label}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
    <GlassCard style={[styles.inputCard, error && styles.inputError]} intensity={30} borderColor={themeColors.glassBorder}>
      <View style={styles.inputInner}>
        <Ionicons name={icon} size={22} color={themeColors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, { color: themeColors.text }]}
          placeholderTextColor={themeColors.textMuted}
          autoCapitalize="none"
          textAlignVertical="center" // Important for Android
          includeFontPadding={false}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress}>
            <Ionicons name={rightIcon} size={22} color={themeColors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 20 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: { paddingBottom: 40 },
  content: { paddingHorizontal: 32, paddingTop: 20 },
  headline: { ...Typography.h1, marginBottom: 8 },
  subhead: { ...Typography.body, marginBottom: 40 },
  form: { gap: 24, marginBottom: 40 },
  inputGroup: { gap: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  label: { ...Typography.h3, fontSize: 13, marginLeft: 0 },
  errorText: { ...Typography.caption, fontSize: 10, color: '#EF4444', textTransform: 'none' },
  inputCard: { padding: 0, justifyContent: 'center', paddingHorizontal: 16, height: 64, borderRadius: 20 },
  inputInner: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  inputError: { borderColor: '#EF4444', borderWidth: 1 },
  inputIcon: { marginRight: 16 },
  textInput: { flex: 1, ...Typography.body, height: '100%', paddingVertical: 0, fontSize: 16 },
  mainBtn: { height: 60, borderRadius: 30, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { ...Typography.h3, color: 'white' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { ...Typography.body, fontSize: 14 },
  footerLink: { ...Typography.body, fontSize: 14, fontWeight: '800' }
});