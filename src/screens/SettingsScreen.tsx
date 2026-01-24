// src/screens/SettingsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  Switch,
  Alert,
  TextInput,
  Modal,
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
import * as Clipboard from 'expo-clipboard';

const { width, height } = Dimensions.get('window');

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
  const { signOut, user } = useAuth();
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

  // Referral state
  const [referralCode, setReferralCode] = useState<string>('');
  const [inviteCount, setInviteCount] = useState<number>(0);
  const [loadingReferral, setLoadingReferral] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const loadReferral = async () => {
      if (!user?.id) return;
      setLoadingReferral(true);
      try {
        const { data: codeRow } = await supabase
          .from('referral_codes')
          .select('code, id')
          .eq('owner_user_id', user.id)
          .maybeSingle();

        if (codeRow?.code) setReferralCode(codeRow.code);

        const { data: countRows } = await supabase
          .from('referrals')
          .select('id, referral_code_id')
          .in('referral_code_id', codeRow?.id ? [codeRow.id] : ['00000000-0000-0000-0000-000000000000']);

        setInviteCount(countRows ? countRows.length : 0);
      } catch (e) {
      } finally {
        setLoadingReferral(false);
      }
    };
    loadReferral();
  }, [user?.id]);

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
    const message = `Join me on Lingualink AI! Use my code ${referralCode} when you sign up. lingualink://signup?code=${referralCode}`;
    try { await Share.share({ message }); } catch {}
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
            // AuthGate will switch to the Auth stack automatically after sign out
          }
        }
      ]
    );
  };

  // moved SettingsSection and SettingsItem into components

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* Account Section */}
        <SettingsSection
          title="Account"
          icon="person-outline"
          iconColor="#FF8A00"
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
              } catch {}
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
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemContent}>
              <Text style={styles.settingsItemTitle}>Your invite code</Text>
              <Text style={styles.settingsItemSubtitle}>
                {loadingReferral ? 'Loading…' : (referralCode || 'Generating on first sign-in…')}
                {copied ? '   Copied' : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={handleCopyReferralCode} style={{ marginRight: 12 }}>
                <Ionicons name="copy-outline" size={20} color="#1F2937" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShareReferral}>
                <Ionicons name="share-social-outline" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => navigation.navigate('Invites' as never)}
          >
            <View style={styles.settingsItemContent}>
              <Text style={styles.settingsItemTitle}>View your invites</Text>
              <Text style={styles.settingsItemSubtitle}>
                {loadingReferral ? 'Loading…' : `${inviteCount} joined with your code`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
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
            onPress={() => Alert.alert('Add Languages', 'Coming soon! You\'ll be able to add multiple languages.')}
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
              try { if (user?.id) await supabase.from('profiles').update({ notification_prefs: { ...notificationSettings, likes: value } }).eq('id', user.id); } catch {}
            }}
          />
          <NotificationToggle
            title="Duet replies"
            subtitle="When someone creates a duet response"
            value={notificationSettings.duets}
            onChange={async (value) => {
              setNotificationSettings(prev => ({ ...prev, duets: value }));
              try { if (user?.id) await supabase.from('profiles').update({ notification_prefs: { ...notificationSettings, duets: value } }).eq('id', user.id); } catch {}
            }}
          />
          <NotificationToggle
            title="Validation requests"
            subtitle="New clips to validate in your languages"
            value={notificationSettings.validations}
            onChange={async (value) => {
              setNotificationSettings(prev => ({ ...prev, validations: value }));
              try { if (user?.id) await supabase.from('profiles').update({ notification_prefs: { ...notificationSettings, validations: value } }).eq('id', user.id); } catch {}
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
            title="Notifications"
            subtitle="Notifications are disabled in Expo Go"
            onPress={() => {}}
          />
          <SettingsItem
            title="Version"
            subtitle="1.0.0"
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

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Language Picker Modal */}
      <LanguagePicker
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        onSelect={async (language) => {
          setPrimaryLanguage(language);
          try { if (user?.id) await supabase.from('profiles').update({ primary_language: language.dialect ? `${language.name} / ${language.dialect}` : language.name, updated_at: new Date().toISOString() }).eq('id', user.id); } catch {}
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
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            Alert.alert('Success', 'Password updated');
            setShowChangePassword(false);
            setNewPassword(''); setConfirmPassword('');
          } catch (e) {
            Alert.alert('Error', 'Failed to update password');
          } finally { setSavingPassword(false); }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    marginHorizontal: width * 0.05,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: width * 0.05,
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

export default SettingsScreen;