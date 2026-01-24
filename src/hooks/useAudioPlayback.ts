import { useState, useEffect, useRef, useCallback } from 'react';
import { setAudioModeAsync } from 'expo-audio';
import { Audio } from 'expo-av';

interface UseAudioPlaybackReturn {
  currentPlayingId: string | null;
  isLoadingAudio: string | null;
  playAudio: (postId: string, audioUrl: string) => Promise<void>;
  stopAudio: () => void;
}

/**
 * Custom hook for managing audio playback in the feed
 * Uses expo-av's Audio.Sound with proper lifecycle management
 *
 * Note: expo-audio's useAudioPlayer has issues with dynamic sources,
 * so we're using the stable expo-av API with proper cleanup
 */
export const useAudioPlayback = (): UseAudioPlaybackReturn => {
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMountedRef = useRef(true);

  // Configure audio mode on mount
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
        });
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        console.log('Audio mode configured successfully');
      } catch (error) {
        console.error('Failed to configure audio mode:', error);
      }
    };

    configureAudio();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cleanup sound when unmounting or stopping
  const cleanupSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }
      } catch (error) {
        console.log('Cleanup sound - already unloaded');
      }
      soundRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSound();
    };
  }, [cleanupSound]);

  const playAudio = async (postId: string, audioUrl: string) => {
    try {
      // If clicking the same audio that's playing, stop it
      if (currentPlayingId === postId && soundRef.current) {
        await cleanupSound();
        setCurrentPlayingId(null);
        setIsLoadingAudio(null);
        return;
      }

      console.log('Starting audio playback:', audioUrl);
      setIsLoadingAudio(postId);

      // Stop and cleanup current sound if exists
      await cleanupSound();

      if (!isMountedRef.current) return;

      // Create and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          // Playback status callback
          if (!isMountedRef.current) return;

          if (status.isLoaded) {
            if (status.didJustFinish) {
              console.log('Audio finished playing');
              setCurrentPlayingId(null);
              cleanupSound();
            }
          }
        }
      );

      if (!isMountedRef.current) {
        await sound.unloadAsync();
        return;
      }

      soundRef.current = sound;
      setCurrentPlayingId(postId);
      setIsLoadingAudio(null);
      console.log('Audio started playing successfully');
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoadingAudio(null);
      setCurrentPlayingId(null);
      await cleanupSound();
      throw error;
    }
  };

  const stopAudio = useCallback(async () => {
    await cleanupSound();
    setCurrentPlayingId(null);
    setIsLoadingAudio(null);
  }, [cleanupSound]);

  return {
    currentPlayingId,
    isLoadingAudio,
    playAudio,
    stopAudio,
  };
};

