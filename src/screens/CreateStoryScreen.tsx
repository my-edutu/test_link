// src/screens/CreateStoryScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { useOffline } from '../context/OfflineProvider';
import { saveStory } from '../services/local/offlineContent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout, Typography } from '../constants/Theme';
import { GlassCard } from '../components/GlassCard';

const { width } = Dimensions.get('window');

const CreateStoryScreen: React.FC<any> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useOffline();
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow media access to create a story');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'] as any,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const getMimeFromExt = (ext: string): string => {
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'gif': return 'image/gif';
      case 'heic': return 'image/heic';
      case 'heif': return 'image/heif';
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      case 'webm': return 'video/webm';
      default: return 'application/octet-stream';
    }
  };

  const uploadStory = async () => {
    if (!user?.id || !mediaUri) return;
    setUploading(true);
    
    try {
      const fileExtRaw = mediaUri.split('?')[0].split('.').pop();
      const fileExt = (fileExtRaw || 'jpg').toLowerCase();
      const contentType = getMimeFromExt(fileExt);

      const result = await saveStory({
        userId: user.id,
        mediaUri,
        caption,
        contentType,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }

      if (result.isOffline) {
        Alert.alert(
          'Saved Offline',
          'Your story has been saved and will be posted when you\'re back online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Posted', 'Your story is live for 24 hours');
        navigation.goBack();
      }
    } catch (e: any) {
      console.log('CreateStory upload error:', e);
      Alert.alert('Upload failed', e?.message || 'Please try again');
    } finally {
      setUploading(false);
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
          <Text style={styles.headerTitle}>Create Story</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.content}>
          <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}>
            {mediaUri ? (
              <Image source={{ uri: mediaUri }} style={styles.preview} />
            ) : (
              <GlassCard style={styles.emptyPicker}>
                <Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.2)" />
                <Text style={styles.placeholderText}>Choose photo or video</Text>
              </GlassCard>
            )}
          </TouchableOpacity>

          <GlassCard style={styles.captionBox}>
            <TextInput
              placeholder="What's on your mind? (optional)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.input}
              value={caption}
              onChangeText={setCaption}
              maxLength={200}
              multiline
            />
            <Text style={styles.counter}>{caption.length}/200</Text>
          </GlassCard>

          <TouchableOpacity
            style={[styles.postButton, (!mediaUri || uploading) && styles.disabledBtn]}
            onPress={uploadStory}
            disabled={!mediaUri || uploading}
          >
            {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.postButtonText}>Share Story</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  backButton: { padding: 4 },
  content: { flex: 1, padding: 20 },
  mediaPicker: { width: '100%', aspectRatio: 3 / 4, borderRadius: 24, overflow: 'hidden', marginBottom: 20 },
  preview: { width: '100%', height: '100%' },
  emptyPicker: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 12, fontWeight: '600' },
  captionBox: { padding: 16, marginBottom: 30 },
  input: { fontSize: 16, color: '#FFF', minHeight: 60, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 },
  postButton: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },
  postButtonText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});

export default CreateStoryScreen;
