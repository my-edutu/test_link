import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  Switch,
  Alert,
  Share,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import LanguagePicker from '../components/LanguagePicker';
import SettingsSection from '../components/SettingsSection';
import SettingsItem from '../components/SettingsItem';
import ProfileEditModal from '../components/ProfileEditModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import NotificationToggle from '../components/NotificationToggle';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { Colors, Typography, Layout, Gradients } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get('window');

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

interface Language {
  id: string;
  name: string;
  dialect?: string;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { signOut, user, updatePassword } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();

  const [notificationSettings, setNotificationSettings] = useState({
    likes: true,
    duets: true,
    validations: false,
  });
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState<Language>({
    id: 'yoruba-ekiti',
    name: 'Yoruba',
    dialect: 'Ekiti Dialect'
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileFullName, setProfileFullName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [referralCode, setReferralCode] = useState<string>('');
  const [inviteCount, setInviteCount] = useState<number>(0);
  const [loadingReferral, setLoadingReferral] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const loadReferral = async () => {
      if (!user?.id) return;

      setLoadingReferral(true);
      try {
        // Fetch the latest username from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        const username = profile?.username || user.username || user.user_metadata?.username || 'user';
        const code = username.startsWith('@') ? username : `@${username}`;
        setReferralCode(code);

        // We still fetch the ID to count referrals
        const { data: codeRow } = await supabase
          .from('referral_codes')
          .select('id')
          .eq('owner_user_id', user.id)
          .maybeSingle();

        if (codeRow?.id) {
          const { data: countRows } = await supabase
            .from('referrals')
            .select('id')
            .eq('referral_code_id', codeRow.id);

          setInviteCount(countRows ? countRows.length : 0);
        }
      } catch (e) {
        console.error('Error loading referral:', e);
      } finally {
        setLoadingReferral(false);
      }
    };
    loadReferral();
  }, [user?.id, user?.username, user?.user_metadata?.username]);

  const handleCopyReferralCode = async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Invite code copied', ToastAndroid.SHORT);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleShareReferral = async () => {
    if (!referralCode) return;
    const message = `Join me on Lingualink AI! Use my code ${referralCode} when you sign up. https://lingualink.ai`;
    try { await Share.share({ message }); } catch { }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20, backgroundColor: isDark ? 'transparent' : colors.surface }]}>
        {isDark && <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Account Section */}
        <SettingsSection
          title="Account"
          icon="person-outline"
          iconColor={Colors.primary}
        >
          <SettingsItem
            title="Edit Profile"
            onPress={async () => {
              try {
                if (!user?.id) { Alert.alert('Error', 'Not signed in'); return; }
                const { data, error } = await supabase
                  .from('profiles')
                  .select('full_name, username, bio, location, primary_language')
                  .eq('id', user.id)
                  .maybeSingle();
                if (error) throw error;
                setProfileFullName(data?.full_name || '');
                setProfileUsername(data?.username || '');
                setProfileBio(data?.bio || '');
                setProfileLocation(data?.location || '');
              } catch { }
              setShowEditProfile(true);
            }}
          />
          <SettingsItem
            title="Change Password"
            onPress={() => setShowChangePassword(true)}
          />
          <SettingsItem
            title="Privacy Settings"
            onPress={() => Alert.alert('Privacy Settings', 'Privacy settings coming soon!')}
          />
        </SettingsSection>

        {/* Referrals */}
        <SettingsSection
          title="Referrals"
          icon="gift-outline"
          iconColor="#F59E0B"
        >
          <View style={[styles.settingsItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingsItemContent}>
              <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Your invite code</Text>
              <Text style={[styles.settingsItemSubtitle, { color: colors.textSecondary }]}>
                {loadingReferral ? 'Loading…' : (referralCode || 'Generating on first sign-in…')}
                {copied ? '   Copied' : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={handleCopyReferralCode} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShareReferral} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <SettingsItem
            title="View your invites"
            subtitle={loadingReferral ? 'Loading…' : `${inviteCount} joined with your code`}
            onPress={() => navigation.navigate('Invites' as never)}
          />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection
          title="Appearance"
          icon="color-palette-outline"
          iconColor="#8B5CF6"
        >
          <View style={[styles.themeSelector, { backgroundColor: colors.inputBackground }]}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === 'light' && styles.themeOptionActive,
                themeMode === 'light' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setThemeMode('light')}
            >
              <Ionicons
                name="sunny"
                size={20}
                color={themeMode === 'light' ? '#FFF' : colors.textSecondary}
              />
              <Text style={[
                styles.themeOptionText,
                { color: themeMode === 'light' ? '#FFF' : colors.textSecondary }
              ]}>Light</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === 'dark' && styles.themeOptionActive,
                themeMode === 'dark' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setThemeMode('dark')}
            >
              <Ionicons
                name="moon"
                size={20}
                color={themeMode === 'dark' ? '#FFF' : colors.textSecondary}
              />
              <Text style={[
                styles.themeOptionText,
                { color: themeMode === 'dark' ? '#FFF' : colors.textSecondary }
              ]}>Dark</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                themeMode === 'system' && styles.themeOptionActive,
                themeMode === 'system' && { backgroundColor: colors.primary }
              ]}
              onPress={() => setThemeMode('system')}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={themeMode === 'system' ? '#FFF' : colors.textSecondary}
              />
              <Text style={[
                styles.themeOptionText,
                { color: themeMode === 'system' ? '#FFF' : colors.textSecondary }
              ]}>System</Text>
            </TouchableOpacity>
          </View>
        </SettingsSection>

        {/* Language Settings */}
        <SettingsSection
          title="Language Settings"
          icon="globe-outline"
          iconColor="#10B981"
        >
          <SettingsItem
            title="Primary Language"
            subtitle={`${primaryLanguage.name}${primaryLanguage.dialect ? ` / ${primaryLanguage.dialect}` : ''}`}
            onPress={() => setShowLanguagePicker(true)}
          />
          <SettingsItem
            title="Add Languages"
            onPress={() => Alert.alert('Add Languages', 'Coming soon!')}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          title="Notifications"
          icon="notifications-outline"
          iconColor="#8B5CF6"
        >
          <NotificationToggle
            title="Likes on my clips"
            subtitle="Get notified when someone likes your voice clips"
            value={notificationSettings.likes}
            onChange={async (value) => {
              setNotificationSettings(prev => ({ ...prev, likes: value }));
              try { if (user?.id) await supabase.from('profiles').update({ notification_prefs: { ...notificationSettings, likes: value } }).eq('id', user.id); } catch { }
            }}
          />
          <NotificationToggle
            title="Duet replies"
            subtitle="When someone creates a duet response"
            value={notificationSettings.duets}
            onChange={async (value) => {
              setNotificationSettings(prev => ({ ...prev, duets: value }));
              try { if (user?.id) await supabase.from('profiles').update({ notification_prefs: { ...notificationSettings, duets: value } }).eq('id', user.id); } catch { }
            }}
          />
          <NotificationToggle
            title="Validation requests"
            subtitle="New clips to validate in your languages"
            value={notificationSettings.validations}
            onChange={async (value) => {
              setNotificationSettings(prev => ({ ...prev, validations: value }));
              try { if (user?.id) await supabase.from('profiles').update({ notification_prefs: { ...notificationSettings, validations: value } }).eq('id', user.id); } catch { }
            }}
          />
        </SettingsSection>

        {/* App Info */}
        <SettingsSection
          title="About"
          icon="information-circle-outline"
          iconColor="#6B7280"
        >
          <SettingsItem
            title="Version"
            subtitle="1.0.0 (Premium Edit)"
            showArrow={false}
          />
          <SettingsItem
            title="Terms of Service"
            onPress={() => Alert.alert('Terms of Service', 'Terms coming soon!')}
          />
          <SettingsItem
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy coming soon!')}
          />
          <SettingsItem
            title="Contact Support"
            onPress={() => Alert.alert('Contact Support', 'Support: hello@lingualink.app')}
          />
        </SettingsSection>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <LanguagePicker
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        onSelect={async (language) => {
          setPrimaryLanguage(language);
          try { if (user?.id) await supabase.from('profiles').update({ primary_language: language.dialect ? `${language.name} / ${language.dialect}` : language.name, updated_at: new Date().toISOString() }).eq('id', user.id); } catch { }
        }}
        selectedLanguage={primaryLanguage}
      />

      <ProfileEditModal
        visible={showEditProfile}
        fullName={profileFullName}
        username={profileUsername}
        bio={profileBio}
        location={profileLocation}
        loading={savingProfile}
        onChange={(f) => {
          if (f.fullName !== undefined) setProfileFullName(f.fullName);
          if (f.username !== undefined) setProfileUsername(f.username);
          if (f.bio !== undefined) setProfileBio(f.bio);
          if (f.location !== undefined) setProfileLocation(f.location);
        }}
        onClose={() => setShowEditProfile(false)}
        onSave={async () => {
          try {
            if (!user?.id) return;
            setSavingProfile(true);
            const { error } = await supabase
              .from('profiles')
              .update({
                full_name: profileFullName,
                username: profileUsername,
                bio: profileBio || null,
                location: profileLocation || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);
            if (error) throw error;
            Alert.alert('Saved', 'Profile updated successfully');
            setShowEditProfile(false);
          } catch (e) {
            Alert.alert('Error', 'Failed to save profile');
          } finally { setSavingProfile(false); }
        }}
      />

      <ChangePasswordModal
        visible={showChangePassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        loading={savingPassword}
        onChange={(f) => {
          if (f.newPassword !== undefined) setNewPassword(f.newPassword);
          if (f.confirmPassword !== undefined) setConfirmPassword(f.confirmPassword);
        }}
        onClose={() => setShowChangePassword(false)}
        onSave={async () => {
          try {
            if (!newPassword || newPassword.length < 6) {
              Alert.alert('Invalid', 'Password must be at least 6 characters');
              return;
            }
            if (newPassword !== confirmPassword) {
              Alert.alert('Mismatch', 'Passwords do not match');
              return;
            }
            setSavingPassword(true);
            const err = await updatePassword(newPassword);
            if (err) throw new Error(err);
            Alert.alert('Success', 'Password updated');
            setShowChangePassword(false);
            setNewPassword(''); setConfirmPassword('');
          } catch (e) {
            Alert.alert('Error', 'Failed to update password');
          } finally { setSavingPassword(false); }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor handled by style prop
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h2,
    // color handled by prop
  },
  content: {
    flex: 1,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    // borderBottomColor handled by prop
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '500',
    // color handled by prop (or inline)
  },
  settingsItemSubtitle: {
    ...Typography.body,
    fontSize: 13,
    // color handled online 
    marginTop: 2,
  },
  iconBtn: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: Layout.radius.m,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 8,
  },
  themeSelector: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  themeOptionActive: {
    shadowColor: '#FF8A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingsScreen;