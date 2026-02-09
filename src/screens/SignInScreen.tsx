import React, { useState, useMemo } from 'react';
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
import { Colors, Gradients, Typography, Layout } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';

const { width } = Dimensions.get('window');

export default function SignInScreen() {
  const navigation = useNavigation<any>();
  const { signIn, loading } = useAuth();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter your email and password');
      return;
    }

    const err = await signIn(email, password);
    if (err) {
      Alert.alert('Sign In Failed', err);
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
            <Text style={[styles.headline, { color: colors.text }]}>Welcome <Text style={{ color: colors.primary }}>Back</Text></Text>
            <Text style={[styles.subhead, { color: colors.textSecondary }]}>Continue your legacy of language preservation.</Text>

            <View style={styles.form}>
              <InputGroup
                label="Email Address"
                icon="mail-outline"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                themeColors={colors}
              />
              <View>
                <InputGroup
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? "eye-off" : "eye"}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  themeColors={colors}
                />
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotPass}
                >
                  <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.mainBtn, loading && { opacity: 0.7 }]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <LinearGradient
                colors={Gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>{loading ? 'Logging In...' : 'Sign In'}</Text>
                <MaterialIcons name="login" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const InputGroup = ({ label, icon, rightIcon, onRightIconPress, themeColors, ...props }: any) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, { color: themeColors.textSecondary }]}>{label}</Text>
    <GlassCard style={styles.inputCard} intensity={30} borderColor={themeColors.glassBorder}>
      <View style={styles.inputInner}>
        <Ionicons name={icon} size={22} color={themeColors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, { color: themeColors.text }]}
          placeholderTextColor={themeColors.textMuted}
          autoCapitalize="none"
          textAlignVertical="center"
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
  content: { paddingHorizontal: 32, paddingTop: 40 },
  headline: { ...Typography.h1, marginBottom: 8 },
  subhead: { ...Typography.body, marginBottom: 48 },
  form: { gap: 24, marginBottom: 40 },
  inputGroup: { gap: 10 },
  label: { ...Typography.h3, fontSize: 13, marginLeft: 0 },
  inputCard: { padding: 0, justifyContent: 'center', paddingHorizontal: 16, height: 64, borderRadius: 20 },
  inputInner: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  inputIcon: { marginRight: 16 },
  textInput: { flex: 1, ...Typography.body, height: '100%', paddingVertical: 0, fontSize: 16 },
  forgotPass: { alignSelf: 'flex-end', marginTop: 8 },
  forgotText: { ...Typography.caption, textTransform: 'none' },
  mainBtn: { height: 60, borderRadius: 30, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { ...Typography.h3, color: 'white' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { ...Typography.body, fontSize: 14 },
  footerLink: { ...Typography.body, fontSize: 14, fontWeight: '800' }
});