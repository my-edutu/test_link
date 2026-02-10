import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    TextInput,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { Colors, Gradients, Typography, Layout } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';
import { SmartSelectionModal } from '../components/SmartSelectionModal';
import { COUNTRIES, ALL_LANGUAGES, Country, Language } from '../constants/CountryData';

const { width } = Dimensions.get('window');

const CARTOON_AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/png?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Max',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Zoe'
];

export default function ModernProfileSetup() {
    const navigation = useNavigation<any>();
    const { user, refreshProfile } = useAuth();

    const [step, setStep] = useState(1);
    const [selectedLangs, setSelectedLangs] = useState<Language[]>([]);
    const [otherLang, setOtherLang] = useState('');
    const [loading, setLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // Location & Identity State
    const [username, setUsername] = useState('');
    const [country, setCountry] = useState<Country>(COUNTRIES.find(c => c.name === 'Nigeria') || COUNTRIES[0]);
    const [state, setState] = useState('');
    const [city, setCity] = useState('');

    // Modal State
    const [isLangModalVisible, setLangModalVisible] = useState(false);
    const [isCountryModalVisible, setCountryModalVisible] = useState(false);

    const toggleLang = (lang: Language) => {
        if (selectedLangs.some(l => l.name === lang.name)) {
            setSelectedLangs(selectedLangs.filter(l => l.name !== lang.name));
        } else {
            setSelectedLangs([...selectedLangs, lang]);
        }
    };

    const handleNext = () => {
        if (step === 1 && selectedLangs.length === 0) {
            Alert.alert('Selection Required', 'Please select at least one language.');
            return;
        }
        if (step === 2 && (!username.trim() || !state.trim())) {
            Alert.alert('Missing Info', 'Please provide a username and your state.');
            return;
        }

        if (step === 1) setStep(2);
        else completeSetup();
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled) {
                uploadImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Error picking image');
        }
    };

    const uploadImage = async (uri: string) => {
        if (!user) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', {
                uri,
                name: `avatar-${Date.now()}.jpg`,
                type: 'image/jpeg',
            } as any);

            const fileExt = 'jpg';
            const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(fileName, formData, { upsert: true });

            if (uploadError) {
                // Fallback: If Storage fails, just use the local URI or don't upload (requires bucket setup)
                console.warn("Upload failed, bucket might not exist:", uploadError);
                // If bucket fails, we might just store the URI if it was a web url, but it's local.
                // We'll set it anyway for UI, but it won't persist across devices if local.
                // For now, let's just set the local URI to avatarUrl and hope fetch works next time, OR try to find a public bucket.
                // Actually, let's assumes avatars bucket exists. If not, user should create it.
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            setAvatarUrl(publicUrl);
        } catch (error: any) {
            Alert.alert('Upload Error', error.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const completeSetup = async () => {
        if (!user) return;

        const finalLangs = selectedLangs.map(l => l.name);
        if (otherLang.trim()) finalLangs.push(otherLang.trim());

        setLoading(true);
        try {
            // Use upsert to create profile if it doesn't exist, or update if it does
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id, // Clerk user ID
                    email: user.emailAddresses?.[0]?.emailAddress || user.primaryEmailAddress?.emailAddress,
                    username: username.toLowerCase().trim(),
                    full_name: user.fullName || user.firstName || username,
                    interests: finalLangs,
                    country: country.name,
                    state: state,
                    city: city,
                    avatar_url: avatarUrl || user.imageUrl, // Use uploaded, or Clerk, or fallback
                    has_completed_onboarding: true
                }, {
                    onConflict: 'id' // If profile exists, update it
                });

            if (error) {
                console.error('Profile save error:', error);
                throw error;
            }

            // Force refresh of auth state
            if (refreshProfile) refreshProfile();

        } catch (e: any) {
            console.error('Profile setup error:', e);
            if (e.message?.includes('username') || e.code === '23505') {
                Alert.alert('Username Taken', 'This username is already in use. Please choose another one.');
            } else {
                Alert.alert('Error', 'Could not save profile. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#1F0802', '#0D0200']}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBase, { width: '100%' }]} />
                        <Animated.View style={[styles.progressActive, { width: `${(step / 2) * 100}%` }]} />
                    </View>
                    <Text style={styles.stepCounter}>STEP {step} OF 2</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {step === 1 ? (
                        <Animated.View entering={FadeIn.duration(600)} style={styles.stepView}>
                            <Text style={styles.headline}>Your <Text style={{ color: Colors.dark.primary }}>Heritage</Text></Text>
                            <Text style={styles.subhead}>Which languages do you speak or want to help preserve?</Text>

                            <View style={styles.chipGrid}>
                                <TouchableOpacity
                                    style={[styles.chip, styles.addChip]}
                                    onPress={() => setLangModalVisible(true)}
                                >
                                    <Ionicons name="add" size={24} color={Colors.dark.primary} />
                                    <Text style={[styles.chipText, { color: Colors.dark.primary }]}>Add Language</Text>
                                </TouchableOpacity>

                                {selectedLangs.map((lang) => (
                                    <TouchableOpacity
                                        key={lang.name}
                                        style={[styles.chip, styles.chipActive]}
                                        onPress={() => toggleLang(lang)}
                                    >
                                        <Text style={styles.chipIcon}>🗣️</Text>
                                        <Text style={[styles.chipText, styles.chipTextActive]}>{lang.name}</Text>
                                        <MaterialIcons name="close" size={18} color="white" style={styles.checkIcon} />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <SmartSelectionModal
                                visible={isLangModalVisible}
                                onClose={() => setLangModalVisible(false)}
                                title="Select Languages"
                                items={ALL_LANGUAGES}
                                searchPlaceholder="Search languages..."
                                onSelect={(lang) => toggleLang(lang)}
                                selectedItems={selectedLangs}
                                renderItem={(item: Language, isSelected) => (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 24, marginRight: 12 }}>🗣️</Text>
                                        <View>
                                            <Text style={{ fontSize: 16, color: 'white', fontWeight: 'bold' }}>{item.name}</Text>
                                            {item.nativeName && <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{item.nativeName}</Text>}
                                        </View>
                                    </View>
                                )}
                            />
                        </Animated.View>
                    ) : (
                        <Animated.View entering={SlideInRight.duration(600)} style={styles.stepView}>
                            <Text style={styles.headline}>Your <Text style={{ color: Colors.dark.primary }}>Identity</Text></Text>
                            <Text style={styles.subhead}>How should the community recognize you?</Text>

                            <View style={styles.form}>
                                <InputGroup
                                    label="Username"
                                    icon="person-outline"
                                    placeholder="e.g. tunde_heritage"
                                    value={username}
                                    onChangeText={setUsername}
                                />
                                <InputGroup
                                    label="State / Region"
                                    icon="map-outline"
                                    placeholder="e.g. Lagos"
                                    value={state}
                                    onChangeText={setState}
                                />
                                <TouchableOpacity onPress={() => setCountryModalVisible(true)}>
                                    <View pointerEvents="none">
                                        <InputGroup
                                            label="Country"
                                            icon="flag-outline"
                                            placeholder="Select Country"
                                            value={country.name}
                                            editable={false}
                                        />
                                    </View>
                                </TouchableOpacity>

                                <SmartSelectionModal
                                    visible={isCountryModalVisible}
                                    onClose={() => setCountryModalVisible(false)}
                                    title="Select Country"
                                    items={COUNTRIES}
                                    searchPlaceholder="Search countries..."
                                    onSelect={(c) => {
                                        setCountry(c);
                                        setCountryModalVisible(false);
                                    }}
                                    selectedItems={[country]}
                                    renderItem={(item: Country, isSelected) => (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 24, marginRight: 12 }}>{item.flag}</Text>
                                            <View>
                                                <Text style={{ fontSize: 16, color: 'white', fontWeight: 'bold' }}>{item.name}</Text>
                                                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{item.code}</Text>
                                            </View>
                                        </View>
                                    )}
                                />
                                <InputGroup
                                    label="Town / City (Optional)"
                                    icon="location-outline"
                                    placeholder="e.g. Ikeja"
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>

                            <View style={styles.avatarSection}>
                                <Text style={styles.label}>Choose an avatar vibe</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarList}>
                                    <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} disabled={uploading}>
                                        {avatarUrl && !CARTOON_AVATARS.includes(avatarUrl) ? (
                                            <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 44 }} />
                                        ) : (
                                            <Ionicons name="camera-outline" size={32} color={Colors.dark.primary} />
                                        )}
                                        {uploading && (
                                            <View style={StyleSheet.absoluteFill}>
                                                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}>
                                                    <MaterialIcons name="refresh" size={20} color="white" />
                                                </View>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    {CARTOON_AVATARS.map((url, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            onPress={() => setAvatarUrl(url)}
                                            style={[styles.avatarPlaceholder, avatarUrl === url && { borderColor: Colors.dark.primary, borderWidth: 2 }]}
                                        >
                                            <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 44 }} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    {step === 2 && (
                        <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)}>
                            <Text style={styles.backLinkText}>PREVIOUS STEP</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.mainBtn}
                        onPress={handleNext}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={Gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnText}>
                                {loading ? 'Saving...' : step === 1 ? 'Continue' : 'Finish Setup'}
                            </Text>
                            {!loading && <MaterialIcons name="chevron-right" size={24} color="white" />}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const InputGroup = ({ label, icon, ...props }: any) => (
    <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <GlassCard style={styles.inputCard} intensity={15} borderColor="rgba(255,255,255,0.15)">
            <View style={styles.inputContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={22} color={Colors.dark.primary} />
                </View>
                <TextInput
                    style={styles.textInput}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    autoCapitalize="none"
                    selectionColor={Colors.dark.primary}
                    {...props}
                />
            </View>
        </GlassCard>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050100' }, // Darker background
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingHorizontal: 24,
        alignItems: 'center',
        marginBottom: 20
    },
    progressContainer: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 3,
        marginBottom: 12,
        overflow: 'hidden'
    },
    progressBase: {
        // Unused now with new structure but kept for safety
    },
    progressActive: {
        height: '100%',
        backgroundColor: Colors.dark.primary,
        borderRadius: 3
    },
    stepCounter: {
        ...Typography.caption,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        fontSize: 11,
        fontWeight: '600'
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40
    },
    stepView: {
        flex: 1
    },
    headline: {
        fontSize: 34,
        fontWeight: '700',
        color: 'white',
        marginBottom: 8,
        letterSpacing: -0.5,
        lineHeight: 40
    },
    subhead: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 32,
        lineHeight: 24
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12, // Taller touch target
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 10
    },
    chipActive: {
        backgroundColor: 'rgba(255, 138, 0, 0.15)', // Tinted background
        borderColor: Colors.dark.primary,
    },
    addChip: {
        borderStyle: 'dashed',
        borderColor: Colors.dark.primary,
        backgroundColor: 'rgba(255, 138, 0, 0.05)',
    },
    chipIcon: {
        fontSize: 20
    },
    chipText: {
        fontSize: 15,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.7)'
    },
    chipTextActive: {
        color: 'white',
        fontWeight: '600'
    },
    checkIcon: {
        marginLeft: 4
    },
    otherInputCard: {
        marginTop: 20,
        paddingHorizontal: 16,
        height: 60, // Taller
        justifyContent: 'center'
    },
    form: {
        gap: 24
    },
    inputGroup: {
        gap: 10
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginLeft: 4,
        letterSpacing: 0.5
    },
    inputCard: {
        padding: 0,
        height: 64, // significantly taller for better touch area
        backgroundColor: 'rgba(255,255,255,0.03)', // Slight tint
        borderRadius: 20,
        justifyContent: 'center'
    },
    inputContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        width: '100%',
        height: '100%'
    },
    iconContainer: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
        opacity: 0.9
    },
    inputIcon: {
        // unused
    },
    textInput: {
        flex: 1,
        fontSize: 17, // Larger text for better readability
        color: 'white',
        height: '100%',
        fontWeight: '500'
    },
    avatarSection: {
        marginTop: 40,
        gap: 16
    },
    avatarList: {
        gap: 16,
        paddingRight: 24
    },
    uploadBtn: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255, 138, 0, 0.08)',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: Colors.dark.primary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    },
    avatarPlaceholder: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden'
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        alignItems: 'center',
        gap: 20
    },
    mainBtn: {
        width: '100%',
        height: 62,
        borderRadius: 31,
        overflow: 'hidden',
        shadowColor: Colors.dark.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10
    },
    btnText: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 0.5
    },
    backLink: {
        padding: 12
    },
    backLinkText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 2
    }
});
