// src/screens/RecordVideoScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as DocumentPicker from 'expo-document-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout, Typography } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuth } from '../context/AuthProvider';
import { useOffline } from '../context/OfflineProvider';
import { saveVideoClip } from '../services/local/offlineContent';
import LanguagePicker from '../components/LanguagePicker';

const { width, height } = Dimensions.get('window');

type RecordVideoScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RecordVideo'
>;

interface Props {
  navigation: RecordVideoScreenNavigationProp;
}

interface Language {
  id: string;
  name: string;
  dialect?: string;
}

const RecordVideoScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useOffline();
  const [selectedLanguage, setSelectedLanguage] = useState<Language | undefined>(undefined);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const player = useVideoPlayer(videoUri ? { uri: videoUri } : undefined as any, (p) => {
    p.loop = false;
    p.staysActiveInBackground = false;
  });

  const handlePickVideo = async () => {
    if (!selectedLanguage) {
      Alert.alert('Select Language', "Please select a language first.");
      setShowLanguageModal(true);
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) return;
      setVideoUri(file.uri);
    } catch (e) {
      console.error('pick video error', e);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const handleSave = async () => {
    if (!selectedLanguage || !videoUri) {
      Alert.alert('Error', 'Missing required information.');
      return;
    }
    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      Alert.alert('Add a prompt', 'Please write a short phrase that describes the video.');
      return;
    }

    setIsSaving(true);
    setUploadProgress(isConnected ? 'Uploading video...' : 'Saving offline...');
    
    try {
      // Generate thumbnail
      let thumbnailUri: string | undefined;
      try {
        setUploadProgress('Generating thumbnail...');
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: 1000,
        });
        thumbnailUri = uri;
      } catch (thumbError) {
        console.error('Thumbnail error:', thumbError);
      }

      setUploadProgress(isConnected ? 'Uploading...' : 'Saving offline...');
      
      const result = await saveVideoClip({
        userId: user!.id,
        videoUri,
        phrase: finalPrompt,
        language: selectedLanguage.name,
        dialect: selectedLanguage.dialect,
        thumbnailUri,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }

      if (result.isOffline) {
        Alert.alert(
          'Saved Offline',
          'Your video has been saved and will be uploaded when you\'re back online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Success', 'Video uploaded!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e) {
      console.error('save video error', e);
      Alert.alert('Error', 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Video</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.languageSelector} onPress={() => setShowLanguageModal(true)}>
            <Ionicons name="language" size={20} color={Colors.primary} />
            <Text style={[styles.languageSelectorText, selectedLanguage && styles.languageSelected]}>
              {selectedLanguage ? `${selectedLanguage.name}${selectedLanguage.dialect ? ` (${selectedLanguage.dialect})` : ''}` : 'Select target language'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <GlassCard style={styles.videoCard}>
            {videoUri ? (
              <VideoView player={player} style={styles.previewVideo} allowsFullscreen={false} />
            ) : (
              <TouchableOpacity style={styles.pickerPlaceholder} onPress={handlePickVideo}>
                <Ionicons name="videocam" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={styles.pickerText}>Select a video clip</Text>
                <Text style={styles.pickerSubtext}>Max 60 seconds recommended</Text>
              </TouchableOpacity>
            )}
            {videoUri && (
              <TouchableOpacity style={styles.changeBtn} onPress={handlePickVideo}>
                <Text style={styles.changeBtnText}>Change Video</Text>
              </TouchableOpacity>
            )}
          </GlassCard>

          <GlassCard style={styles.promptCard}>
            <Text style={styles.label}>Caption / Prompt</Text>
            <TextInput
              style={styles.input}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="What are you saying in this video?"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
            />
          </GlassCard>

          <TouchableOpacity
            style={[styles.saveButton, (isSaving || !videoUri) && styles.disabledBtn]}
            onPress={handleSave}
            disabled={isSaving || !videoUri}
          >
            {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Upload Now</Text>}
          </TouchableOpacity>
          {isSaving && <Text style={styles.progressText}>{uploadProgress}</Text>}
        </ScrollView>

        <LanguagePicker
          visible={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          onSelect={setSelectedLanguage}
          selectedLanguage={selectedLanguage}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  backButton: { padding: 4 },
  scrollContent: { padding: 20 },
  languageSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 16, borderRadius: 16, marginBottom: 20 },
  languageSelectorText: { flex: 1, fontSize: 16, color: 'rgba(255,255,255,0.5)', marginLeft: 12 },
  languageSelected: { color: '#FFF', fontWeight: '600' },
  videoCard: { height: 300, borderRadius: 20, overflow: 'hidden', marginBottom: 20, justifyContent: 'center' },
  previewVideo: { width: '100%', height: '100%' },
  pickerPlaceholder: { alignItems: 'center' },
  pickerText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginTop: 12 },
  pickerSubtext: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
  changeBtn: { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  changeBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  promptCard: { padding: 16, marginBottom: 30 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', marginBottom: 12 },
  input: { fontSize: 16, color: '#FFF', minHeight: 80, textAlignVertical: 'top' },
  saveButton: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  disabledBtn: { opacity: 0.5 },
  progressText: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 12, fontSize: 12 },
});

export default RecordVideoScreen;
