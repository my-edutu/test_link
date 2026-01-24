// src/screens/StoryViewScreen.tsx
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, StyleSheet, Dimensions, TouchableOpacity, Text, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { VideoView, useVideoPlayer } from 'expo-video';
import ReportModal, { ReportReason } from '../components/ReportModal';
import { API_BASE_URL } from '../config';

const { width, height } = Dimensions.get('window');

const isVideoUrl = (url?: string) => {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.endsWith('.mp4') || u.endsWith('.mov') || u.endsWith('.webm');
};

const StoryViewScreen: React.FC<any> = ({ navigation, route }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const story = route.params?.story as { id: string; user: { name: string; id?: string }; thumbnail: string; timestamp?: string; viewed?: boolean; mediaUrl?: string; media_url?: string } | undefined;
  const mediaUrl = (story as any)?.mediaUrl || (story as any)?.media_url || '';
  const videoPlayer = useVideoPlayer(mediaUrl);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const markViewed = async () => {
      if (!user?.id || !story?.id) return;
      try {
        await supabase.from('story_views').upsert({ story_id: story.id, user_id: user.id });
      } catch { }
    };
    markViewed();
  }, [user?.id, story?.id]);

  // Handle report submission
  const handleReportSubmit = async (reason: ReportReason, details?: string) => {
    if (!user?.id || !story?.user?.id) {
      throw new Error('Unable to submit report');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/moderation/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          reportedUserId: story.user.id,
          postId: story.id,
          reason,
          additionalDetails: details,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit report');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to submit report');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{story?.user?.name || 'Story'}</Text>
        <TouchableOpacity onPress={() => setShowReportModal(true)}>
          <Ionicons name="flag-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.mediaBox}>
        {!mediaUrl ? (
          <Text style={{ color: '#FFF' }}>No media</Text>
        ) : isVideoUrl(mediaUrl) ? (
          <VideoView
            style={styles.media}
            player={videoPlayer}
          />
        ) : (
          <Image source={{ uri: mediaUrl }} style={styles.media} resizeMode="contain" />
        )}
      </View>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        reportedUserName={story?.user?.name}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: { color: '#FFF', fontWeight: '600', maxWidth: width * 0.6 },
  mediaBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  media: { width, height: height * 0.8 },
});

export default StoryViewScreen;



