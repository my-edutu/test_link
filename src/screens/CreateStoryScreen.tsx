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
import { supabase } from '../supabaseClient';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CreateStoryScreen: React.FC<any> = ({ navigation }) => {
  const { user } = useAuth();
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
      const mime = getMimeFromExt(fileExt);
      const path = `${user.id}/${Date.now()}.${fileExt}`;

      // Prefer REST upload via FileSystem on RN to avoid fetch(blob) issues
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      const supabaseUrl = (supabase as any).storageUrl || (supabase as any)._storageUrl || (supabase as any).url || (supabase as any).supabaseUrl || (supabase as any).rest?.url || (supabase as any).storage?.url;
      const baseUrl = (supabase as any).storageUrl || (supabase as any).supabaseUrl || (supabase as any).url;
      const projectUrl = (supabase as any).supabaseUrl || (supabase as any).url || baseUrl;
      const uploadUrl = `${projectUrl}/storage/v1/object/stories/${encodeURIComponent(path)}`;

      const fsResult = await FileSystem.uploadAsync(uploadUrl, mediaUri, {
        httpMethod: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-upsert': 'false',
          'Content-Type': mime,
        },
        uploadType: 0, // BINARY_CONTENT
      });
      if (fsResult.status !== 200 && fsResult.status !== 201) {
        throw new Error(`Upload failed (${fsResult.status}): ${fsResult.body?.slice(0, 120)}`);
      }

      const { data: pub } = supabase.storage.from('stories').getPublicUrl(path);
      const mediaUrl = pub?.publicUrl ?? `stories/${path}`;
      const { error: insErr } = await supabase.from('stories').insert({ user_id: user.id, media_url: mediaUrl, caption });
      if (insErr) throw insErr;
      Alert.alert('Posted', 'Your story is live for 24 hours');
      navigation.goBack();
    } catch (e: any) {
      console.log('CreateStory upload error:', e);
      Alert.alert('Upload failed', e?.message || 'Please try again');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Story</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}>
          {mediaUri ? (
            <Image source={{ uri: mediaUri }} style={styles.preview} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="images" size={28} color="#9CA3AF" />
              <Text style={styles.placeholderText}>Tap to choose photo or video</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.captionBox}>
          <TextInput
            placeholder="Add a caption (optional)"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={caption}
            onChangeText={setCaption}
            maxLength={200}
          />
          <Text style={styles.counter}>{caption.length}/200</Text>
        </View>
      </View>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.bottomBtn, styles.cancelBarBtn]}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={uploadStory} disabled={!mediaUri || uploading} style={[styles.bottomBtn, styles.doneBarBtn, (!mediaUri || uploading) && { opacity: 0.5 }]}>
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.doneBtnText}>Done</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerTextBtn: { marginLeft: 12 },
  postBtn: { color: '#FF8A00', fontWeight: '600' },
  cancelBtn: { color: '#6B7280', fontWeight: '600' },
  content: { padding: width * 0.05 },
  mediaPicker: {
    height: 240,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  placeholderText: { marginTop: 8, color: '#9CA3AF' },
  captionBox: { marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  counter: { marginTop: 6, fontSize: 12, color: '#9CA3AF', alignSelf: 'flex-end' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bottomBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBarBtn: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  doneBarBtn: {
    marginLeft: 8,
    backgroundColor: '#FF8A00',
  },
  doneBtnText: { color: '#FFFFFF', fontWeight: '700' },
});

export default CreateStoryScreen;


