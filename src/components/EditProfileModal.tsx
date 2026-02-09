import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    currentProfile: any;
    onUpdate: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
    visible,
    onClose,
    currentProfile,
    onUpdate,
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        bio: '',
        country: '',
        state: '',
        city: '',
    });

    useEffect(() => {
        if (currentProfile) {
            setFormData({
                full_name: currentProfile.full_name || '',
                bio: currentProfile.bio || '',
                country: currentProfile.country || '',
                state: currentProfile.state || '',
                city: currentProfile.city || '',
            });
        }
    }, [currentProfile, visible]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const updates = {
                id: user.id, // clerk user id
                full_name: formData.full_name,
                bio: formData.bio,
                country: formData.country,
                state: formData.state,
                city: formData.city,
                updated_at: new Date(),
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id); // Matches the text ID

            if (error) {
                throw error;
            }

            onUpdate();
            onClose();
        } catch (error: any) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Edit Profile</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                        {/* Full Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.full_name}
                                onChangeText={(text) => handleChange('full_name', text)}
                                placeholder="Enter your full name"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                            />
                        </View>

                        {/* Bio */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.bio}
                                onChangeText={(text) => handleChange('bio', text)}
                                placeholder="Tell us about yourself..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                multiline
                                maxLength={150}
                            />
                            <Text style={styles.charCount}>{formData.bio.length}/150</Text>
                        </View>

                        {/* Location Fields */}
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Country</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.country}
                                    onChangeText={(text) => handleChange('country', text)}
                                    placeholder="Country"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>State</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.state}
                                    onChangeText={(text) => handleChange('state', text)}
                                    placeholder="State"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>City</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.city}
                                onChangeText={(text) => handleChange('city', text)}
                                placeholder="City"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                            />
                        </View>

                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1C1022',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    closeBtn: {
        padding: 4,
    },
    formContainer: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    charCount: {
        alignSelf: 'flex-end',
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 6,
    },
    footer: {
        marginTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    saveBtn: {
        backgroundColor: '#FF8A00', // Primary color
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#FF8A00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EditProfileModal;
