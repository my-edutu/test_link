// src/screens/ChatDetailScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
// Update these imports to use the correct types
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App'; // Adjust path as needed
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { Colors, Typography, Layout, Gradients } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../components/GlassCard';
import { BlurView } from 'expo-blur';
const { width, height } = Dimensions.get('window');

interface Message {
  id: string;
  text?: string;
  sender_id: string;
  conversation_id: string;
  type: 'text' | 'voice' | 'image';
  created_at: string;
  updated_at?: string;
  media_url?: string;
  // UI-specific fields (computed/derived)
  senderName?: string;
  senderAvatar?: string;
  isTranslationVisible?: boolean;
  translated_content?: string;
  audio_url?: string;
  duration?: number;
  // Legacy fields for compatibility
  sender?: 'me' | 'them';
  timestamp?: string;
  translatedText?: string;
  isVoiceMessage?: boolean;
}

// Update Props type to use the correct navigation types
type Props = NativeStackScreenProps<RootStackParamList, 'ChatDetail'>;

import { useTheme } from '../context/ThemeContext';

const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const params = route.params || {} as any;
  const contact = params.contact || { id: '', name: 'Unknown', avatar: 'U', language: '—', isOnline: false };
  const initialConversationId = params.conversationId || null;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // State for profile data (start with params, update with fresh data)
  const [activeContact, setActiveContact] = useState(contact);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showTranslations, setShowTranslations] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Fetch conversation ID if missing (e.g. starting chat from contacts)
  useEffect(() => {
    if (conversationId || !user?.id || !activeContact?.id) return;

    const initChat = async () => {
      try {
        // Cast to any to access potentially passed otherUserId from ChatList
        const targetId = (activeContact as any).otherUserId || activeContact.id;
        // Don't try to chat with yourself or invalid ID
        if (!targetId || targetId === user.id) return;

        console.log('Initializing chat with:', targetId);
        const { data, error } = await supabase.rpc('create_or_get_dm', { target: targetId });

        if (error) {
          console.error('Error creating DM:', error);
          return;
        }

        if (data) {
          console.log('Conversation ID found:', data);
          setConversationId(data);
        }
      } catch (e) {
        console.error('Failed to init chat', e);
      }
    };

    initChat();
  }, [conversationId, user?.id, activeContact]);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const latestMessageIdRef = useRef<string | null>(null);
  const typingChannelRef = useRef<any>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const typingIdleRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values for typing dots
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  const recordingDotAnim = useRef(new Animated.Value(1)).current;

  // Audio playback state
  const [playbackStatus, setPlaybackStatus] = useState<{ position: number; duration: number } | null>(null);

  // Swipe to Reply State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const swipeableRefs = useRef(new Map<string, Swipeable>()).current;

  // Swipe Action
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, message: Message) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <View style={{ width: 80, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="arrow-undo" size={24} color={Colors.primary} />
        </Animated.View>
      </View>
    );
  };

  const handleSwipeOpen = (message: Message) => {
    setReplyingTo(message);
    // Close swipe
    const ref = swipeableRefs.get(message.id);
    if (ref) ref.close();
  };

  const notifyTyping = () => {
    // Optional: broadcast typing to other participant via channel
  };

  const toggleTranslation = (messageId: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, isTranslationVisible: !msg.isTranslationVisible }
        : msg
    ));
  };

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !user?.id || !conversationId) return;
    setIsSending(true);
    setNewMessage('');
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text,
          type: 'text',
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const mapped: Message = {
          ...data,
          sender: 'me',
          timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isTranslationVisible: false,
        };
        setMessages(prev => [...prev, mapped]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error('Send message error', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record voice messages.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      const timer = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
      setRecordingTimer(timer);
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingDotAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(recordingDotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseAnimation.start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopVoiceRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) {
        Alert.alert('Recording Error', 'Failed to save recording. Please try again.');
        return;
      }
      await uploadAndSendVoiceMessage(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Recording Error', 'Failed to save recording. Please try again.');
    } finally {
      setRecording(null);
      setRecordingUri(null);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    try {
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      setRecordingDuration(0);
      setRecording(null);
      setRecordingUri(null);
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const uploadAndSendVoiceMessage = async (audioUri: string) => {
    if (!user?.id || !conversationId) return;
    try {
      setIsSending(true);
      const fileName = `voice-${user.id}-${Date.now()}.m4a`;
      const filePath = `voice-messages/${fileName}`;
      const response = await fetch(audioUri);
      const arrayBuffer = await response.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, arrayBuffer, { contentType: 'audio/m4a', upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('voice-messages').getPublicUrl(filePath);
      const voiceMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        conversation_id: conversationId,
        type: 'voice',
        created_at: new Date().toISOString(),
        media_url: urlData.publicUrl,
        audio_url: urlData.publicUrl,
        duration: 0,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoiceMessage: true,
      };
      setMessages(prev => [...prev, voiceMessage]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          type: 'voice',
          media_url: urlData.publicUrl,
        })
        .select()
        .single();
      if (error) {
        setMessages(prev => prev.filter(msg => msg.id !== voiceMessage.id));
        Alert.alert('Error', 'Failed to send voice message. Please try again.');
        return;
      }
      setMessages(prev => prev.map(msg =>
        msg.id === voiceMessage.id ? { ...data, ...voiceMessage, id: data.id } as Message : msg
      ));
    } catch (error) {
      console.error('Upload/send voice error', error);
      Alert.alert('Error', 'Failed to send voice message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Fetch fresh profile data
  useEffect(() => {
    if (!contact?.id) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', contact.id).single();
      if (data) {
        setActiveContact(prev => ({
          ...prev,
          name: data.full_name || prev.name,
          avatar: 'U', // Use logic if needed 
          avatarUrl: data.avatar_url,
          isOnline: false // Presence would be separate
        }));
      }
    };
    fetchProfile();
  }, [contact?.id]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerBackground: () => (
        <BlurView
          intensity={80}
          style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)' }]}
          tint={isDark ? "dark" : "light"}
        />
      ),
      headerLeft: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 0 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 0 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => navigation.navigate('UserProfile', { userId: activeContact.id })}
          >
            <View style={[styles.headerAvatar, { borderColor: colors.borderLight }]}>
              {activeContact.avatar && activeContact.avatar.startsWith('http') ? (
                <Image source={{ uri: activeContact.avatar }} style={styles.headerAvatarImage} />
              ) : (
                <Text style={styles.headerAvatarText}>{activeContact.avatar}</Text>
              )}
              {activeContact.isOnline && <View style={styles.headerOnlineIndicator} />}
            </View>
            <View>
              <Text style={[styles.headerName, { color: colors.text }]}>{activeContact.name}</Text>
              <Text style={styles.headerStatus}>
                {activeContact.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ),
      headerTitle: () => null,
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { marginRight: 8 }]}
            onPress={() => {
              console.log('[ChatDetail] Voice call button pressed', { contactId: activeContact.id, name: activeContact.name });
              navigation.navigate('VoiceCall', { contact: activeContact });
            }}
          >
            <Ionicons name="call" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('VideoCall', { contact: activeContact })}
          >
            <Ionicons name="videocam" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      ),
      headerTintColor: colors.text, // Dynamic tint color
    });
  }, [navigation, activeContact, colors, isDark]);

  // ... (Presence code remains same)

  // ... (Load messages code remains same)

  // ... (Realtime code remains same)

  const playVoiceMessage = async (messageId: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setPlaybackStatus(null);
      }

      if (currentPlayingId === messageId) {
        setCurrentPlayingId(null);
        return;
      }

      const message = messages.find(m => m.id === messageId);
      if (!message || !message.audio_url) return;

      setIsLoadingAudio(true);
      setCurrentPlayingId(messageId);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: message.audio_url },
        { shouldPlay: true }
      );

      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackStatus({
            position: status.positionMillis,
            duration: status.durationMillis || 0
          });
          if (status.didJustFinish) {
            setCurrentPlayingId(null);
            setSound(null);
            setPlaybackStatus(null);
          }
        }
      });

    } catch (error) {
      console.error('Play error', error);
      setCurrentPlayingId(null);
      setSound(null);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isMe = message.sender === 'me';
    const isPlaying = currentPlayingId === message.id;

    // Calculate progress
    let progress = 0;
    let currentPos = 0;
    let totalDur = message.duration ? message.duration * 1000 : 0;

    if (isPlaying && playbackStatus) {
      currentPos = playbackStatus.position;
      totalDur = playbackStatus.duration || totalDur;
      progress = totalDur > 0 ? (currentPos / totalDur) * 100 : 0;
    }

    const formatTime = (millis: number) => {
      const minutes = Math.floor(millis / 60000);
      const seconds = ((millis % 60000) / 1000).toFixed(0);
      return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    return (
      <Swipeable
        key={message.id}
        ref={(ref) => {
          if (ref && message.id) swipeableRefs.set(message.id, ref);
        }}
        renderRightActions={(p, d) => renderRightActions(p as any, d as any, message)}
        onSwipeableOpen={() => handleSwipeOpen(message)}
        containerStyle={{ marginBottom: 20 }}
      >
        <View style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.theirMessageContainer,
          { marginBottom: 0 } // Remove margin from container as Swipeable handles it
        ]}>
          <View style={styles.bubbleWrapper}>
            <GlassCard
              intensity={isMe ? 40 : 15}
              style={[
                styles.messageBubble,
                isMe ? styles.myMessageBubble : [styles.theirMessageBubble, {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.inputBackground,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border
                }]
              ]}
            >
              {/* ... existing card content ... */}
              <TouchableOpacity
                onPress={() => message.translatedText && toggleTranslation(message.id)}
                activeOpacity={0.8}
              >
                {(message.isVoiceMessage || message.type === 'voice') ? (
                  <View style={[styles.voiceMessageContent, { width: 220, padding: 4 }]}>
                    <TouchableOpacity
                      onPress={() => playVoiceMessage(message.id)}
                      style={[styles.playButton, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={20}
                        color={isMe ? "#FFFFFF" : colors.text}
                      />
                    </TouchableOpacity>

                    <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
                      {/* Progress Bar Container */}
                      <View style={{ height: 4, backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                        <View style={{ width: `${progress}%`, height: '100%', backgroundColor: isMe ? '#FFF' : colors.primary }} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.8)' : colors.textMuted }}>
                          {isPlaying ? formatTime(currentPos) : formatTime(message.duration ? message.duration * 1000 : 0)}
                        </Text>
                        <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : colors.textMuted }}>
                          {formatTime(totalDur)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={[
                    styles.messageText,
                    isMe ? styles.myMessageText : [styles.theirMessageText, { color: colors.text }]
                  ]}>
                    {message.text}
                  </Text>
                )}


                {message.translatedText && (showTranslations || message.isTranslationVisible) && (
                  <View style={[styles.translationContainer, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                    <Text style={[
                      styles.translationText,
                      isMe ? styles.myTranslationText : [styles.theirTranslationText, { color: colors.textSecondary }]
                    ]}>
                      {message.translatedText}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </GlassCard>
            <Text style={[
              styles.messageTimestamp,
              isMe ? styles.myTimestamp : [styles.theirTimestamp, { color: colors.textSecondary }]
            ]}>
              {message.timestamp}
            </Text>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={[styles.typingBubble, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.inputBackground }]}>
          <View style={styles.typingDots}>
            <Animated.View style={[styles.typingDot, { opacity: dot1Anim, backgroundColor: isDark ? '#FFF' : colors.textSecondary }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot2Anim, backgroundColor: isDark ? '#FFF' : colors.textSecondary }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot3Anim, backgroundColor: isDark ? '#FFF' : colors.textSecondary }]} />
          </View>
        </View>
        <Text style={[styles.typingText, { color: colors.textMuted }]}>{activeContact.name} is typing...</Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.messagesContent, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 12 }]}
        >
          {messages.map(renderMessage)}
          {renderTypingIndicator()}
        </ScrollView>

        {/* Reply Banner */}
        {replyingTo && (
          <GlassCard intensity={80} style={[styles.replyBanner, { backgroundColor: isDark ? undefined : colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.replyLabel, { color: colors.textSecondary }]}>Replying to {replyingTo.sender === 'me' ? 'Yourself' : activeContact.name}</Text>
                <Text style={[styles.replyText, { color: colors.text }]} numberOfLines={1}>{replyingTo.text || (replyingTo.type === 'voice' ? 'Voice Message' : 'Media')}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={[styles.inputContainer, { paddingBottom: (insets.bottom || 8), backgroundColor: isDark ? 'transparent' : colors.surface, borderTopColor: colors.border, borderTopWidth: isDark ? 0 : 1 }]}
        >
          {isRecording ? (
            // Recording UI
            <GlassCard intensity={40} style={styles.recordingContainer}>
              <View style={styles.recordingHeader}>
                <View style={styles.recordingIndicator}>
                  <Animated.View
                    style={[
                      styles.recordingDot,
                      { opacity: recordingDotAnim }
                    ]}
                  />
                  <Text style={styles.recordingText}>Recording...</Text>
                </View>
                <Text style={styles.recordingDuration}>
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </Text>
              </View>

              <View style={styles.recordingWaveform}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                  <View
                    key={bar}
                    style={[
                      styles.waveformBar,
                      {
                        height: Math.random() * 30 + 10,
                        backgroundColor: Colors.primary,
                      }
                    ]}
                  />
                ))}
              </View>

              <View style={styles.recordingActions}>
                <TouchableOpacity
                  style={styles.cancelRecordingButton}
                  onPress={cancelRecording}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                  <Text style={styles.cancelRecordingText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stopRecordingButton}
                  onPress={stopVoiceRecording}
                >
                  <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.stopRecordingText}>Send</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : (
            // Normal Input UI
            <View style={styles.modernInputRow}>
              {/* Plus Icon Removed */}
              <View style={[styles.textInputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.inputBackground }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={newMessage}
                  onChangeText={(t) => { setNewMessage(t); notifyTyping(); }}
                  onFocus={() => { }}
                  multiline
                  maxLength={500}
                  placeholder={replyingTo ? `Reply to ${replyingTo.sender === 'me' ? 'yourself' : activeContact.name}...` : "Type a message..."}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {newMessage.trim() ? (
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                  <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
                  <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.voiceButton}
                  onPressIn={startVoiceRecording}
                  onPressOut={stopVoiceRecording}
                >
                  <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
                  <Ionicons name="mic" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor handled by theme
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Keep as is for now, or use a theme driven semi-transparent color
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    // borderColor handled in component
  },
  headerAvatarText: {
    fontSize: 18,
    color: '#FFFFFF', // Keep as is or use theme.textInverse
  },
  headerAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1D0800', // Could be theme.background
  },
  headerName: {
    ...Typography.h4,
    // color handled by theme
  },
  headerStatus: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 20,
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  messageContainer: {
    marginBottom: 20,
    width: '100%',
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  theirMessageContainer: {
    alignItems: 'flex-start',
  },
  bubbleWrapper: {
    maxWidth: '80%',
  },
  messageBubble: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  myMessageBubble: {
    backgroundColor: 'rgba(255, 138, 0, 0.8)', // Primary color with high opacity
    borderColor: 'rgba(255, 138, 0, 1)',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    // colors handled in component
    borderBottomLeftRadius: 4,
  },
  voiceMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    // color handled by theme
  },
  translationContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    // border color handled in component
  },
  translationText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  myTranslationText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  theirTranslationText: {
    // color handled by theme
  },
  messageTimestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  theirTimestamp: {
    // color handled by theme
  },
  typingContainer: {
    marginVertical: 10,
    alignItems: 'flex-start',
    marginLeft: 10,
  },
  typingBubble: {
    padding: 10,
    borderRadius: 15,
    borderBottomLeftRadius: 2,
    marginBottom: 5,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  typingText: {
    fontSize: 12,
    marginLeft: 5,
  },
  replyBanner: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  replyText: {
    fontSize: 14,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  recordingContainer: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 10,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  recordingDuration: {
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  recordingWaveform: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    gap: 3,
    marginBottom: 16,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  cancelRecordingText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  stopRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  stopRecordingText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  modernInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  textInputContainer: {
    flex: 1,
    borderRadius: 24,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginRight: 10,
  },
  textInput: {
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatDetailScreen;