import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, Alert, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const LANGUAGES = ['Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'Efik', 'Kanuri', 'Tiv', 'Other'];

export default function ModernProfileSetup() {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { colors, theme } = useTheme();

    const styles = useMemo(() => createStyles(colors, theme), [colors, theme]);

    const [selectedLangs, setSelectedLangs] = useState<string[]>(['Yoruba', 'Hausa']);
    const [otherLang, setOtherLang] = useState('');
    const [loading, setLoading] = useState(false);

    // Location State
    const [country, setCountry] = useState('');
    const [state, setState] = useState('');
    const [city, setCity] = useState('');

    const toggleLang = (lang: string) => {
        if (selectedLangs.includes(lang)) {
            setSelectedLangs(selectedLangs.filter(l => l !== lang));
        } else {
            setSelectedLangs([...selectedLangs, lang]);
        }
    };

    const isOtherSelected = selectedLangs.includes('Other');

    const completeSetup = async () => {
        if (!user) return;

        if (!country.trim() || !state.trim() || !city.trim()) {
            Alert.alert('Missing Details', 'Please fill in your location details (Country, State, Town).');
            return;
        }

        const finalLangs = isOtherSelected
            ? [...selectedLangs.filter(l => l !== 'Other'), otherLang].filter(l => l.trim() !== '')
            : selectedLangs;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    interests: finalLangs,
                    country: country,
                    state: state,
                    city: city,
                    has_completed_onboarding: true
                })
                .eq('id', user.id);

            if (error) throw error;
        } catch (e: any) {
            console.error(e);
            Alert.alert('Error', 'Could not save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style={theme === 'dark' ? "light" : "dark"} />

            {/* Vibes - Glow Blobs */}
            <View style={[styles.glowBlob, { top: -100, left: -100, backgroundColor: colors.primary, opacity: 0.1 }]} />
            <View style={[styles.glowBlob, { bottom: -100, right: -100, backgroundColor: colors.secondary || colors.primary, opacity: 0.05 }]} />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <MaterialIcons name="chevron-left" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Complete Profile</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Welcome Text */}
                    <View style={styles.topSection}>
                        <Text style={styles.headline}>Final Touch ✨</Text>
                        <Text style={styles.subhead}>Let's personalize your LinguaLink experience.</Text>
                    </View>

                    {/* Language Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>What do you speak?</Text>
                        <View style={styles.chipGrid}>
                            {LANGUAGES.map(lang => {
                                const active = selectedLangs.includes(lang);
                                return (
                                    <TouchableOpacity
                                        key={lang}
                                        style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                                        onPress={() => toggleLang(lang)}
                                    >
                                        <Text style={active ? styles.chipTextActive : styles.chipTextInactive}>{lang}</Text>
                                        {active && <MaterialIcons name="check-circle" size={16} color="white" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {isOtherSelected && (
                            <View style={styles.otherInputWrapper}>
                                <Text style={styles.inputLabel}>Specify other languages</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="E.g. Idoma, Ibibio, French..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={otherLang}
                                        onChangeText={setOtherLang}
                                    />
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Location Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Where are you from?</Text>

                        <View style={styles.inputStack}>
                            {/* Country Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Country</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialIcons name="public" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g. Nigeria"
                                        placeholderTextColor={colors.textSecondary}
                                        value={country}
                                        onChangeText={setCountry}
                                    />
                                </View>
                            </View>

                            {/* State Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>State</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialIcons name="map" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g. Lagos"
                                        placeholderTextColor={colors.textSecondary}
                                        value={state}
                                        onChangeText={setState}
                                    />
                                </View>
                            </View>

                            {/* City/Town Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Town / City</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialIcons name="location-city" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g. Ikeja"
                                        placeholderTextColor={colors.textSecondary}
                                        value={city}
                                        onChangeText={setCity}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Avatar Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Choose your vibe</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
                            <TouchableOpacity style={styles.avatarUpload}>
                                <MaterialIcons name="add-a-photo" size={24} color={colors.primary} />
                            </TouchableOpacity>

                            {['https://lh3.googleusercontent.com/aida-public/AB6AXuCSD8kCKoHcV55KVae7-0y6IKiTAxHep-jh3Ai8BC9-f9xXvu_6vc-fL1kGbJS_hJN8ZQHvovplYB43MXxOUSQ3yGWZnzx41jbSl7dfzWUSFzKgYjq8HX-261evcmK3agCB2WW_dU77zQN9goeCPflqBJFCVM43U3hVZKtK4ulzDIZKaWDOhR4aj2VJAvMNuTh7zzklGU-ctZBP3PV_ItsO_NfKU3dcufw5AN6gvcsAjPvAG86vSY5ALr_V6mc6av6Uoz_7rUfDbi6d',
                                'https://lh3.googleusercontent.com/aida-public/AB6AXuDXmQd-JqqQFIay0b1wjI4V3ki86ZJcLTtWpXTy-4jSxVp64CwHQOHr24n8695WYcYuWluYc6InQbYZDrvjnqUsjKEt21EaKD8F_PegJsSS_s2_1AIS8ln0XNu-f2SRk2JUnC7xBj8phy83v4v0ETRmjETnHfYZ9LNCRBlhjE__Rz5pgyQt8Fim2xuEbyJegHe1Cv4Z92y7RW67XDPC7fzpYeDeGeVdMNzZ9k9UQ3VFF-2VCJTmiHjFARsYpotzjRpuA2X-pLK-rFzp'].map((uri, idx) => (
                                    <TouchableOpacity key={idx} style={[styles.avatarContainer, idx === 0 && styles.activeAvatar]}>
                                        <Image source={{ uri }} style={styles.avatarImg} />
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.enterBtn, loading && { opacity: 0.7 }]}
                        onPress={completeSetup}
                        disabled={loading}
                    >
                        <Text style={styles.enterBtnText}>{loading ? 'Setting up...' : 'Enter the App'}</Text>
                        {!loading && <MaterialIcons name="rocket-launch" size={20} color="white" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    glowBlob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, zIndex: -1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },

    content: { paddingHorizontal: 20, paddingBottom: 40 },
    topSection: { marginBottom: 32 },
    headline: { color: colors.text, fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
    subhead: { color: colors.textSecondary, fontSize: 16 },

    section: { marginBottom: 32 },
    sectionTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 44, borderRadius: 22, gap: 8, borderWidth: 1 },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8 },
    chipInactive: { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F5F5F5', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E0E0E0' },
    chipTextActive: { color: 'white', fontWeight: 'bold' },
    chipTextInactive: { color: colors.textSecondary, fontWeight: '600' },

    otherInputWrapper: { marginTop: 16, gap: 8 },

    inputStack: { gap: 16 },
    inputGroup: { gap: 8 },
    inputLabel: { color: colors.text, fontSize: 15, fontWeight: '600', marginLeft: 4 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F5F5F5',
        height: 56, borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E0E0E0'
    },
    inputIcon: { marginRight: 12 },
    textInput: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
        backgroundColor: 'transparent', // Explicitly transparent to remove "white lines"
        padding: 0, // Remove default padding that might cause sizing issues
    },

    avatarRow: { gap: 16 },
    avatarUpload: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme === 'dark' ? 'rgba(255,109,0,0.1)' : '#FFF5EB', borderStyle: 'dashed', borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarContainer: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', borderWidth: 3, borderColor: 'transparent' },
    activeAvatar: { borderColor: colors.primary },
    avatarImg: { width: '100%', height: '100%' },

    footer: { padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#E0E0E0' },
    enterBtn: { backgroundColor: colors.primary, height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12 },
    enterBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
