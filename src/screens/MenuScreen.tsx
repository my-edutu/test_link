
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar, Modal, TextInput, Alert, Share, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../supabaseClient';
import { Colors, Typography, Layout, Gradients } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from '../components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

type MenuScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LEVELS = [
    { name: 'Newbie', minXp: 0, color: '#A0AEC0' },
    { name: 'Explorer', minXp: 1000, color: '#4FD1C5' },
    { name: 'Conversationalist', minXp: 5000, color: '#F6AD55' },
    { name: 'Fluency Seeker', minXp: 10000, color: '#9F7AEA' },
    { name: 'Language Master', minXp: 25000, color: '#F56565' },
];

const MenuScreen = () => {
    const navigation = useNavigation<MenuScreenNavigationProp>();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    // Profile Edit State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [fullName, setFullName] = useState(user?.fullName || user?.user_metadata?.full_name || '');
    const [username, setUsername] = useState(user?.username || user?.user_metadata?.username || '');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');

    // Stats State
    const [currentXp, setCurrentXp] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);

    // Levels Modal
    const [levelsModalVisible, setLevelsModalVisible] = useState(false);

    // Fetch Profile Data
    React.useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, username, bio, location, xp, streak, avatar_url')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setFullName(data.full_name || '');
                    setUsername(data.username || '');
                    setBio(data.bio || '');
                    setLocation(data.location || '');
                    setCurrentXp(data.xp || 0);
                    setCurrentStreak(data.streak || 0);
                }
            } catch (e) {
                console.error("Error fetching profile", e);
            }
        };
        fetchProfile();
    }, [user?.id]);


    const currentLevel = LEVELS.slice().reverse().find(l => currentXp >= l.minXp) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.minXp > currentXp);
    const progress = nextLevel
        ? (currentXp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)
        : 1;

    const [updating, setUpdating] = useState(false);

    const handleSaveProfile = async () => {
        if (!user?.id) return;
        setUpdating(true);
        try {
            const updates = {
                full_name: fullName,
                username,
                bio,
                location,
                updated_at: new Date(),
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            Alert.alert("Success", "Profile updated successfully!");
            setEditModalVisible(false);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to update profile");
        } finally {
            setUpdating(false);
        }
    };

    const handleShareProfile = async () => {
        try {
            await Share.share({
                message: `Check out my profile on Lingualink AI! @${username}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleCheckUpdate = async () => {
        // expo-updates is native-only and not available on web
        if (Platform.OS === 'web') {
            Alert.alert("Info", "Updates are automatic on web. Refresh the page to get the latest version.");
            return;
        }

        try {
            // Dynamic import to avoid web bundling issues
            const Updates = await import('expo-updates');
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                await Updates.fetchUpdateAsync();
                Alert.alert("Update available", "Restarting app...", [
                    { text: "OK", onPress: () => Updates.reloadAsync() }
                ]);
            } else {
                Alert.alert("Up to date", "You are using the latest version.");
            }
        } catch (e) {
            Alert.alert("Info", "Development mode: Updates not available in Expo Go.");
        }
    };


    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Menu</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShareProfile} style={[styles.shareHeaderBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="share-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                <GlassCard
                    style={[styles.profileCard, !isDark && { backgroundColor: 'rgba(255,255,255,0.8)', borderColor: colors.border }]}
                    intensity={isDark ? 30 : 80}
                    tint={isDark ? 'dark' : 'light'}
                >
                    <TouchableOpacity
                        style={{ padding: 20 }}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.avatarContainerLarge, { borderColor: user?.imageUrl ? 'transparent' : colors.primary }]}>
                                {user?.imageUrl || (user?.user_metadata?.avatar_url) ? (
                                    <Image
                                        source={{ uri: user.imageUrl || user.user_metadata.avatar_url }}
                                        style={{ width: '100%', height: '100%', borderRadius: 40 }}
                                    />
                                ) : (
                                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: colors.text }}>
                                        {(user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View style={{ marginLeft: 16, flex: 1 }}>
                                <Text style={[styles.profileNameLarge, { color: colors.text }]}>
                                    {fullName || user?.fullName || user?.user_metadata?.full_name || 'Lingualink User'}
                                </Text>
                                <Text style={[styles.profileHandleLarge, { color: colors.textSecondary }]}>
                                    @{username || user?.username || user?.user_metadata?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'user'}
                                </Text>
                                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                    <View style={[styles.miniBadge, { backgroundColor: colors.primary }]}>
                                        <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{currentLevel.name}</Text>
                                    </View>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                        </View>
                    </TouchableOpacity>
                </GlassCard>

                {/* Payments & Earnings (Moved Up) */}
                <View style={styles.menuSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PAYMENTS & EARNINGS</Text>
                    <MenuItem icon="wallet-outline" label="Wallet" onPress={() => navigation.navigate('Rewards')} colors={colors} />
                    <MenuItem icon="trophy-outline" label="Leaderboard" onPress={() => navigation.navigate('Leaderboard' as any)} colors={colors} />
                    <MenuItem icon="cart-outline" label="Store" onPress={() => navigation.navigate('Store' as any)} colors={colors} />
                    <MenuItem icon="card-outline" label="Payment Settings" onPress={() => navigation.navigate('PaymentSettings')} colors={colors} />
                    <MenuItem icon="megaphone-outline" label="Ambassador Program" onPress={() => navigation.navigate('Ambassador')} colors={colors} />
                </View>

                {/* Account & Activity */}
                <View style={styles.menuSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
                    <MenuItem icon="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} colors={colors} />
                    <MenuItem icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} colors={colors} />
                </View>

                {/* Resources Section */}
                <View style={styles.menuSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Resources</Text>
                    <MenuItem icon="bookmark-outline" label="Saved Items" onPress={() => navigation.navigate('SavedItems')} colors={colors} />
                </View>

                <View style={styles.menuSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
                    <MenuItem icon="help-circle-outline" label="FAQ" onPress={() => navigation.navigate('FAQ')} colors={colors} />
                    <MenuItem icon="mail-outline" label="Contact Us" onPress={() => Linking.openURL('mailto:info@lingualink.com')} colors={colors} />
                    <MenuItem icon="information-circle-outline" label="About" onPress={() => Alert.alert("LinguaLink", "Version 1.0.0\n\nCheck for Updates?", [{ text: "Check", onPress: handleCheckUpdate }, { text: "Cancel" }])} colors={colors} />
                </View>

                {/* Admin Section (Only for admins) */}
                {(user?.user_metadata?.role === 'admin' || user?.email?.endsWith('@lingualink-app.com')) && (
                    <View style={styles.menuSection}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ADMIN TOOLS</Text>
                        <MenuItem icon="shield-checkmark-outline" label="Moderation Center" onPress={() => navigation.navigate('AdminModeration')} colors={colors} />
                        <MenuItem icon="wallet-outline" label="Payout Management" onPress={() => navigation.navigate('AdminPayout')} colors={colors} />
                    </View>
                )}

            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalBody}>
                            <Input label="Full Name" value={fullName} onChangeText={setFullName} colors={colors} />
                            <Input label="Username" value={username} onChangeText={setUsername} colors={colors} />
                            <Input label="Bio" value={bio} onChangeText={setBio} multiline colors={colors} />
                            <Input label="Location" value={location} onChangeText={setLocation} colors={colors} />
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: updating ? 0.7 : 1 }]}
                            onPress={handleSaveProfile}
                            disabled={updating}
                        >
                            <Text style={styles.saveBtnText}>{updating ? 'Saving...' : 'Save Changes'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Levels Modal */}
            <Modal visible={levelsModalVisible} animationType="fade" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Levels Hierarchy</Text>
                            <TouchableOpacity onPress={() => setLevelsModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.modalBody}>
                            {LEVELS.map((lvl, index) => (
                                <View key={lvl.name} style={[styles.levelItem, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                                    <View style={[styles.levelBadge, { backgroundColor: lvl.color }]}>
                                        <Text style={styles.levelBadgeText}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.levelInfo}>
                                        <Text style={[styles.levelName, { color: colors.text }]}>{lvl.name}</Text>
                                        <Text style={[styles.levelDesc, { color: colors.textSecondary }]}>{lvl.minXp} XP Required</Text>
                                    </View>
                                    {currentXp >= lvl.minXp && <Ionicons name="checkmark-circle" size={24} color={colors.success || '#48BB78'} />}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const MenuItem = ({ icon, label, onPress, colors }: { icon: any, label: string, onPress: () => void, colors: any }) => (
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onPress}>
        <View style={styles.menuItemLeft}>
            <Ionicons name={icon} size={24} color={colors.text} />
            <Text style={[styles.menuItemLabel, { color: colors.text }]}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
);

const Input = ({ label, value, onChangeText, multiline, colors }: any) => (
    <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
        <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, height: multiline ? 80 : 50 }]}
            value={value}
            onChangeText={onChangeText}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            placeholderTextColor={colors.textSecondary}
        />
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    backButton: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', marginLeft: 12 },
    shareHeaderBtn: { padding: 10, borderRadius: 20 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    profileCard: { borderRadius: 16, padding: 0, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
    profileHeader: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    profileText: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: 'bold' },
    profileHandle: { fontSize: 14, marginBottom: 4 },
    profileBio: { fontSize: 12, fontStyle: 'italic' },

    // New Profile Styles
    avatarContainerLarge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
    profileNameLarge: { fontSize: 20, fontWeight: 'bold' },
    profileHandleLarge: { fontSize: 16 },
    miniBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },

    statsRow: { flexDirection: 'row', paddingVertical: 16, borderTopWidth: 1 },
    statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statBorder: { borderLeftWidth: 1 },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    statLabel: { fontSize: 12 },
    levelCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
    levelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    levelTitle: { fontSize: 16, fontWeight: 'bold' },
    levelSubtitle: { fontSize: 14 },
    progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressBarFill: { height: '100%', borderRadius: 4 },
    nextLevelText: { fontSize: 12, textAlign: 'right' },
    menuSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    menuItemLabel: { fontSize: 16, fontWeight: '500' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalBody: { paddingBottom: 20 },
    saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    inputContainer: { marginBottom: 16 },
    inputLabel: { fontSize: 14, marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16 },
    levelItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
    levelBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    levelBadgeText: { color: 'white', fontWeight: 'bold' },
    levelInfo: { flex: 1 },
    levelName: { fontSize: 16, fontWeight: '600' },
    levelDesc: { fontSize: 12 },
});

export default MenuScreen;
