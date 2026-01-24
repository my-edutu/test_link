import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

interface AudioContextValue {
  audioPlayer: ReturnType<typeof useAudioPlayer>;
  currentPlayingId: string | null;
  setCurrentPlayingId: (id: string | null) => void;
  isLoadingAudio: string | null;
  setIsLoadingAudio: (id: string | null) => void;
  playAudio: (id: string, audioUrl: string) => Promise<void>;
  stopAudio: () => void;
  pauseAudio: () => void;
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioPlayer = useAudioPlayer();
  const currentPlayingIdRef = useRef<string | null>(null);
  const isLoadingAudioRef = useRef<string | null>(null);

  const setCurrentPlayingId = (id: string | null) => {
    currentPlayingIdRef.current = id;
  };

  const setIsLoadingAudio = (id: string | null) => {
    isLoadingAudioRef.current = id;
  };

  const playAudio = async (id: string, audioUrl: string) => {
    try {
      // Stop any currently playing audio
      if (audioPlayer.playing) {
        audioPlayer.pause();
      }

      setIsLoadingAudio(id);

      // Get playable URL (you'll need to import getPlayableAudioUrl)
      const { getPlayableAudioUrl } = await import('../utils/storage');
      const resolvedUrl = await getPlayableAudioUrl(audioUrl);

      if (!resolvedUrl) {
        setIsLoadingAudio(null);
        throw new Error('Failed to resolve audio URL');
      }

      // Load and play the audio
      audioPlayer.replace(resolvedUrl);
      await audioPlayer.play();
      setCurrentPlayingId(id);
      setIsLoadingAudio(null);

      console.log('Playing audio:', resolvedUrl);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsLoadingAudio(null);
      throw error;
    }
  };

  const stopAudio = () => {
    if (audioPlayer.playing) {
      audioPlayer.pause();
    }
    setCurrentPlayingId(null);
  };

  const pauseAudio = () => {
    if (audioPlayer.playing) {
      audioPlayer.pause();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioPlayer.playing) {
        audioPlayer.pause();
      }
    };
  }, [audioPlayer]);

  const value: AudioContextValue = {
    audioPlayer,
    currentPlayingId: currentPlayingIdRef.current,
    setCurrentPlayingId,
    isLoadingAudio: isLoadingAudioRef.current,
    setIsLoadingAudio,
    playAudio,
    stopAudio,
    pauseAudio,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
