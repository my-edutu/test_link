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
  const themeContext = useTheme();
  const colors = themeContext.colors || Colors; // Fallback to static Colors if context is missing
  const isDark = themeContext.isDark ?? true;
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
            <View style={[styles.headerAvatar, { marginRight: 10 }]}>
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
      headerTintColor: '#FFFFFF',
    });
  }, [navigation, activeContact]);

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

  // ... (renderMessage logic)
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
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
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
                  <View style={[styles.translationContainer, { borderTopColor: 'rgba(255, 255, 255, 0.1)' }]}>
                    <Text style={[
                      styles.translationText,
                      isMe ? styles.myTranslationText : styles.theirTranslationText
                    ]}>
                      {message.translatedText}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </GlassCard>
            <Text style={[
              styles.messageTimestamp,
              isMe ? styles.myTimestamp : styles.theirTimestamp
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
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <Animated.View style={[styles.typingDot, { opacity: dot1Anim }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot2Anim }]} />
            <Animated.View style={[styles.typingDot, { opacity: dot3Anim }]} />
          </View>
        </View>
        <Text style={styles.typingText}>{contact.name} is typing...</Text>
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
          <GlassCard intensity={80} style={styles.replyBanner}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.replyLabel}>Replying to {replyingTo.sender === 'me' ? 'Yourself' : contact.name}</Text>
                <Text style={styles.replyText} numberOfLines={1}>{replyingTo.text || (replyingTo.type === 'voice' ? 'Voice Message' : 'Media')}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={[styles.inputContainer, { paddingBottom: (insets.bottom || 8), backgroundColor: isDark ? 'transparent' : colors.surface }]}
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
              <View style={[styles.textInputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  value={newMessage}
                  onChangeText={(t) => { setNewMessage(t); notifyTyping(); }}
                  onFocus={() => { }}
                  multiline
                  maxLength={500}
                  placeholder={replyingTo ? `Reply to ${replyingTo.sender === 'me' ? 'yourself' : contact.name}...` : "Type a message..."}
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerAvatarText: {
    fontSize: 18,
    color: '#FFFFFF',
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
    borderColor: '#1D0800',
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
    maxWidth: '85%',
  },
  messageBubble: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
    backgroundColor: '#FF8A00', // Primary color for sender
    borderWidth: 0,
  },
  theirMessageBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    // Colors handled dynamically in render or via hook if possible, 
    // but since this is StyleSheet, we might need to inline styles in render 
    // or leave defaults and override.
    // For now, let's keep default as glass/dark and override in render.
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    // color now handled by dynamic logic or we can add dynamic style here? 
    // It's better to use dynamic logic in the component render
    color: '#FFFFFF',
  },
  voiceMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 240, // Wider for audio
    paddingRight: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceMessageInfo: {
    flex: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
  },
  voiceMessageDuration: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  translationContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  translationText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  myTranslationText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirTranslationText: {
    color: Colors.primary,
  },
  messageTimestamp: {
    fontSize: 10,
    marginTop: 4,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  myTimestamp: {
    alignSelf: 'flex-end',
  },
  theirTimestamp: {
    alignSelf: 'flex-start',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  typingText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modernInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 28,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  attachButton: {
    padding: 4,
    marginLeft: 4,
  },
  textInputContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  textInput: {
    ...Typography.body,
    color: '#FFFFFF',
    maxHeight: 120,
    paddingVertical: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  recordingContainer: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#FF4444',
    marginRight: 10,
  },
  recordingText: {
    ...Typography.h4,
    color: '#FFFFFF',
  },
  recordingDuration: {
    ...Typography.h3,
    color: Colors.primary,
  },
  recordingWaveform: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    height: 40,
    marginBottom: 24,
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelRecordingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: Layout.radius.m,
  },
  cancelRecordingText: {
    ...Typography.h4,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  stopRecordingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Layout.radius.m,
    overflow: 'hidden',
  },
  stopRecordingText: {
    ...Typography.h4,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  replyBanner: {
    position: 'absolute',
    bottom: 80, // Above input
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    zIndex: 10,
  },
  replyLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  replyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
});

export default ChatDetailScreen;