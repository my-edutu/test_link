
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { uploadAudioFile, getPlayableAudioUrl } from '../utils/storage';
import { authFetch } from '../services/authFetch';

type DuetRecordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DuetRecord'>;
type DuetRecordScreenRouteProp = RouteProp<RootStackParamList, 'DuetRecord'>;

interface Props {
    navigation: DuetRecordScreenNavigationProp;
    route: DuetRecordScreenRouteProp;
}

export const DuetRecordScreen: React.FC<Props> = ({ navigation, route }) => {
    const { parentClipId, parentClipUrl, parentClipPhrase, parentUsername } = route.params || {};
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [parentSound, setParentSound] = useState<Audio.Sound | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordedUri, setRecordedUri] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [language, setLanguage] = useState<string>('English'); // Default or inherit?

    // Permissions
    useEffect(() => {
        (async () => {
            const { status } = await Audio.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    // Prepare Parent Sound
    useEffect(() => {
        let sound: Audio.Sound | null = null;
        const loadParentAudio = async () => {
            if (!parentClipUrl) return;
            try {
                const workableUrl = await getPlayableAudioUrl(parentClipUrl);
                if (!workableUrl) return;

                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: workableUrl },
                    { shouldPlay: false }
                );
                sound = newSound;
                setParentSound(newSound);
            } catch (e) {
                console.error('Failed to load parent clip:', e);
                Alert.alert('Error', 'Could not load the clip to duet with.');
            }
        };
        loadParentAudio();

        return () => {
            if (sound) sound.unloadAsync();
        };
    }, [parentClipUrl]);

    const startRecording = async () => {
        if (!hasPermission) return;
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Start parent audio
            if (parentSound) {
                await parentSound.replayAsync();
            }

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            setRecordingDuration(0);

            // Timer
            const interval = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            // Store interval to clear it later? 
            // Simplified: we'll clean up on stop.
            (recording as any)._timerInterval = interval;

        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        try {
            if (recording) {
                clearInterval((recording as any)._timerInterval);
                await recording.stopAndUnloadAsync();
                const uri = recording.getURI();
                setRecordedUri(uri);
                setRecording(null);
                setIsRecording(false);

                if (parentSound) {
                    await parentSound.stopAsync();
                }
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    };

    const handleSave = async () => {
        if (!recordedUri || !user) return;
        setIsSaving(true);
        try {
            // 1. Upload
            const uploadRes = await uploadAudioFile(recordedUri, user.id);
            if (!uploadRes.success || !uploadRes.url) throw new Error('Upload failed');

            // 2. Call backend Remix Endpoint (authenticated via Clerk JWT)
            const response = await authFetch(`/monetization/remix`, {
                method: 'POST',
                body: JSON.stringify({
                    parentClipId,
                    phrase: `Remix of "${parentClipPhrase || 'clip'}"`,
                    language: language,
                    audioUrl: uploadRes.url
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Server error: ${errText}`);
            }

            const result = await response.json();
            console.log('Remix created:', result);

            Alert.alert('Success', 'Duet created!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (e) {
            console.error('Save failed:', e);
            Alert.alert('Error', 'Failed to save duet.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Record Duet</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.parentInfo}>
                    <Text style={styles.parentLabel}>Dueting with @{parentUsername || 'user'}</Text>
                    <Text style={styles.parentPhrase}>"{parentClipPhrase}"</Text>
                </View>

                <View style={styles.visualizer}>
                    <Ionicons name="mic-outline" size={80} color={isRecording ? "#FF4B4B" : "#DDD"} />
                    <Text style={styles.timer}>{recordingDuration}s</Text>
                </View>

                {recordedUri ? (
                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.buttonSecondary} onPress={() => setRecordedUri(null)}>
                            <Text style={styles.btnTextSec}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.buttonPrimary} onPress={handleSave} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTextPri}>Post Duet</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={[styles.recordBtn, isRecording && styles.recordingBtn]}
                            onPress={isRecording ? stopRecording : startRecording}
                        >
                            <Ionicons name={isRecording ? "stop" : "mic"} size={32} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    title: { fontSize: 18, fontWeight: 'bold' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    parentInfo: { marginBottom: 40, alignItems: 'center' },
    parentLabel: { fontSize: 14, color: '#666' },
    parentPhrase: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 8 },
    visualizer: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
    timer: { fontSize: 24, marginTop: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    controls: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    recordBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FF8A00', alignItems: 'center', justifyContent: 'center' },
    recordingBtn: { backgroundColor: '#FF4B4B' },
    buttonPrimary: { backgroundColor: '#FF8A00', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 24 },
    buttonSecondary: { paddingHorizontal: 32, paddingVertical: 16 },
    btnTextPri: { color: '#FFF', fontWeight: 'bold' },
    btnTextSec: { color: '#666' }
});
