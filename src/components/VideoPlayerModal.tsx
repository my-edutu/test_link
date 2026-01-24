import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface VideoPlayerModalProps {
  visible: boolean;
  videoUrl: string | null;
  onClose: () => void;
  title?: string;
  autoPlay?: boolean;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  visible,
  videoUrl,
  onClose,
  title = 'Playing Video',
  autoPlay = true,
}) => {
  const insets = useSafeAreaInsets();

  // Don't render anything if no video URL
  if (!videoUrl) {
    return null;
  }

  return <VideoPlayerContent visible={visible} videoUrl={videoUrl} onClose={onClose} title={title} autoPlay={autoPlay} />;
};

// Separate component to ensure useVideoPlayer is only called when we have a URL
const VideoPlayerContent: React.FC<VideoPlayerModalProps> = ({
  visible,
  videoUrl,
  onClose,
  title = 'Playing Video',
  autoPlay = true,
}) => {
  const insets = useSafeAreaInsets();
  const isPlayerActive = useRef(false);

  // Now we can safely create the player - videoUrl is guaranteed to be non-null
  const player = useVideoPlayer(videoUrl!, (player) => {
    player.loop = false;
    player.muted = false;
  });

  // Handle play/pause based on visibility
  useEffect(() => {
    const handlePlayback = async () => {
      try {
        if (visible && autoPlay && !isPlayerActive.current) {
          player.play();
          isPlayerActive.current = true;
        } else if (!visible && isPlayerActive.current) {
          player.pause();
          isPlayerActive.current = false;
        }
      } catch (error) {
        // Player might be released, safe to ignore
        console.log('Playback control skipped');
      }
    };

    handlePlayback();

    // Cleanup when modal closes
    return () => {
      if (isPlayerActive.current) {
        try {
          player.pause();
          isPlayerActive.current = false;
        } catch (error) {
          // Safe to ignore
        }
      }
    };
  }, [visible, autoPlay, player]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.fullscreenContainer}>
        {/* Close Button Overlay */}
        <View style={[styles.closeButtonOverlay, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Fullscreen Video */}
        <VideoView
          player={player}
          style={styles.fullscreenVideo}
          nativeControls
          contentFit="contain"
          allowsFullscreen
          allowsPictureInPicture
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    paddingRight: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.3,
    // shadowRadius: 4,
    elevation: 5,
  },
  fullscreenVideo: {
    width: width,
    height: height,
    backgroundColor: '#000000',
  },
});

export default VideoPlayerModal;

