// src/screens/ChatDetailScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
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

const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { contact, conversationId } = route.params as any;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showTranslations, setShowTranslations] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [isTyping, setIsTyping] = useState(false);
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

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatar}>
            {contact.avatarUrl ? (
              <Image
                source={{ uri: contact.avatarUrl }}
                style={styles.headerAvatarImage}
                defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
              />
            ) : (
              <Text style={styles.headerAvatarText}>{contact.avatar}</Text>
            )}
            {contact.isOnline && <View style={styles.headerOnlineIndicator} />}
          </View>
          <View>
            <Text style={styles.headerName}>{contact.name}</Text>
            <Text style={styles.headerStatus}>
              {contact.isOnline ? `Speaking ${contact.language} • Online` : 'Offline'}
            </Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('VoiceCall', { contact })}
          >
            <Ionicons name="call" size={24} color="#FF8A00" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('VideoCall', { contact })}
          >
            <Ionicons name="videocam" size={24} color="#FF8A00" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FF8A00" />
          </TouchableOpacity>
        </View>
      ),
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerShadowVisible: true, // This replaces elevation for React Navigation v6+
      headerTintColor: '#FF8A00',
    });
  }, [navigation, contact]);

  // Presence: show online status for the other user
  useEffect(() => {
    // Expect other user id passed via contact.otherUserId or from route params
    const otherUserId = (route.params as any)?.contact?.otherUserId as string | undefined;
    if (!otherUserId) return;
    const ch = supabase.channel('users_presence', { config: { presence: { key: user?.id || 'me' }}});
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const online = Object.values(state || {}).some((arr: any) => Array.isArray(arr) && arr.some((m: any) => m.userId === otherUserId));
      contact.isOnline = online;
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerAvatar}>
              {contact.avatarUrl ? (
                <Image
                  source={{ uri: contact.avatarUrl }}
                  style={styles.headerAvatarImage}
                  defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
                />
              ) : (
                <Text style={styles.headerAvatarText}>{contact.avatar}</Text>
              )}
              {online && <View style={styles.headerOnlineIndicator} />}
            </View>
            <View>
              <Text style={styles.headerName}>{contact.name}</Text>
              <Text style={styles.headerStatus}>
                {online ? `Online` : 'Offline'}
              </Text>
            </View>
          </View>
        ),
      });
    });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ userId: user?.id });
      }
    });
    return () => { ch.unsubscribe(); };
  }, [navigation, user?.id, route.params]);

  // Load messages from DB
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!conversationId || !user?.id) return;
      const { data, error } = await supabase
        .from('messages')
        .select('id, text, sender_id, created_at, media_url')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (!mounted) return;
      if (error) {
        console.error('load messages error', error);
        return;
      }
      const mapped: Message[] = (data || []).map((m: any) => ({
        id: m.id,
        text: m.media_url ? '[media]' : (m.text || ''),
        sender_id: m.sender_id,
        conversation_id: m.conversation_id,
        type: m.media_url ? 'voice' : 'text',
        created_at: m.created_at,
        media_url: m.media_url,
        audio_url: m.media_url,
        duration: m.media_url ? 0 : undefined,
        // Legacy fields for compatibility
        sender: m.sender_id === user.id ? 'me' : 'them',
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoiceMessage: !!m.media_url,
      }));
      setMessages(mapped);
      if (mapped.length > 0) latestMessageIdRef.current = mapped[mapped.length - 1].id;
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 50);
    };
    load();
    return () => { mounted = false; };
  }, [conversationId, user?.id]);

  // Subscribe to realtime inserts
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
        const m = payload.new;
        const serverText = m.media_url ? '[media]' : (m.text || '');
        setMessages(prev => {
          const built = {
            id: m.id,
            text: serverText,
            sender_id: m.sender_id,
            conversation_id: m.conversation_id,
            type: m.media_url ? 'voice' : 'text',
            created_at: m.created_at,
            media_url: m.media_url,
            audio_url: m.media_url,
            duration: m.media_url ? 0 : undefined,
            // Legacy fields for compatibility
            sender: m.sender_id === user?.id ? 'me' : 'them',
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isVoiceMessage: !!m.media_url,
          } as Message;
          // If it's our own server echo, try to replace the last optimistic temp message
          if (m.sender_id === user?.id) {
            const idx = [...prev].reverse().findIndex(msg => msg.id.startsWith('temp_') && msg.sender === 'me' && msg.text === serverText);
            if (idx !== -1) {
              const realIdx = prev.length - 1 - idx;
              const arr = [...prev];
              arr[realIdx] = built;
              return arr;
            }
          }
          return [...prev, built];
        });
        latestMessageIdRef.current = m.id;
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [conversationId, user?.id]);

  // Mark messages as read when opening and when new messages arrive
  useEffect(() => {
    const markRead = async () => {
      if (!conversationId || !user?.id || !latestMessageIdRef.current) return;
      try {
        // Mark all unread in this conversation as read for this user
        await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
      } catch (e) {
        // ignore
      }
    };
    markRead();
  }, [messages.length, conversationId, user?.id]);

  useEffect(() => {
    // Animate typing dots
    if (isTyping) {
      const animateTypingDots = () => {
        const createAnimation = (animValue: Animated.Value, delay: number) => {
          return Animated.loop(
            Animated.sequence([
              Animated.timing(animValue, {
                toValue: 1,
                duration: 400,
                delay,
                useNativeDriver: true,
              }),
              Animated.timing(animValue, {
                toValue: 0.3,
                duration: 400,
                useNativeDriver: true,
              }),
            ])
          );
        };

        Animated.parallel([
          createAnimation(dot1Anim, 0),
          createAnimation(dot2Anim, 200),
          createAnimation(dot3Anim, 400),
        ]).start();
      };

      animateTypingDots();
      const timer = setTimeout(() => setIsTyping(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isTyping, dot1Anim, dot2Anim, dot3Anim]);

  // Cleanup audio resources
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
    };
  }, [sound, recording, recordingTimer]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;
    const optimistic: Message = {
      id: `temp_${Date.now()}`,
      text: newMessage,
      sender_id: user?.id || '',
      conversation_id: conversationId,
      type: 'text',
      created_at: new Date().toISOString(),
      // Legacy fields for compatibility
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, optimistic]);
    const toSend = newMessage;
    setNewMessage('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const { error } = await supabase.rpc('send_message', { p_conversation_id: conversationId, p_text: toSend });
      if (error) throw error;

      // After successful send, deliver push notifications to other members
      try {
        const { data: recipients, error: recErr } = await supabase.rpc('get_conversation_recipient_ids', { p_conversation_id: conversationId });
        if (!recErr && Array.isArray(recipients) && recipients.length > 0) {
          const preview = toSend.length > 80 ? `${toSend.slice(0, 77)}...` : toSend;
          await supabase.functions.invoke('notify', {
            body: {
              user_ids: recipients,
              title: contact.name || 'New message',
              body: preview || '[media] message',
              data: { conversation_id: conversationId },
            },
          });
        }
      } catch (e) {
        // Ignored: push delivery best-effort
      }
    } catch (e) {
      console.error('send failed', e);
      // optional: mark failed
    }
    // stop typing status after send
    if (typingChannelRef.current) {
      typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id, isTyping: false } });
    }
  };

  // Typing presence/broadcast
  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase.channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const { userId, isTyping: typing } = payload.payload || {};
        if (!userId || userId === user?.id) return;
        if (typing) {
          setIsTyping(true);
        } else {
          setIsTyping(false);
        }
      })
      .subscribe();
    typingChannelRef.current = ch;
    return () => { ch.unsubscribe(); typingChannelRef.current = null; };
  }, [conversationId, user?.id]);

  const notifyTyping = (text: string) => {
    if (!typingChannelRef.current) return;
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id, isTyping: true } });
    }, 200);
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    typingIdleRef.current = setTimeout(() => {
      typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id, isTyping: false } });
    }, 3000);
  };

  const toggleTranslation = (messageId: string) => {
    setMessages(messages.map(msg =>
      msg.id === messageId
        ? { ...msg, isTranslationVisible: !msg.isTranslationVisible }
        : msg
    ));
  };

  const startVoiceRecording = async () => {
    try {
      // Request audio recording permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record voice messages.');
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      console.log('Recording started');

      // Start recording duration timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);

      // Start pulsing animation for recording dot
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingDotAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(recordingDotAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
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

      // Clear recording timer
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }

      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        Alert.alert('Recording Error', 'Failed to save recording. Please try again.');
        return;
      }

      setRecordingUri(uri);
      console.log('Recording stopped and saved to:', uri);

      // Upload the audio file to Supabase Storage
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
      // Clear recording timer
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }

      // Stop and discard recording
      await recording.stopAndUnloadAsync();

      setIsRecording(false);
      setRecordingDuration(0);
      setRecording(null);
      setRecordingUri(null);

      console.log('Recording cancelled');
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const uploadAndSendVoiceMessage = async (audioUri: string) => {
    try {
      // Create a unique filename for the audio file
      const fileName = `voice-${user?.id}-${Date.now()}.m4a`;
      const filePath = `voice-messages/${fileName}`;

      console.log('Uploading file:', fileName, 'from URI:', audioUri);

      // Read the audio file using React Native's file system approach
      const response = await fetch(audioUri);
      const arrayBuffer = await response.arrayBuffer();

      console.log('File size:', arrayBuffer.byteLength, 'bytes');

      // Upload to Supabase Storage using ArrayBuffer
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, arrayBuffer, {
          contentType: 'audio/m4a',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(filePath);

      // Create optimistic voice message
      const voiceMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: user?.id || '',
        conversation_id: conversationId,
        type: 'voice',
        created_at: new Date().toISOString(),
        media_url: urlData.publicUrl,
        duration: 0,
        translated_content: `[Auto-translated to ${contact.language}]`,
        senderName: 'You',
        senderAvatar: 'You',
        isTranslationVisible: false,
        audio_url: urlData.publicUrl,
        // Legacy fields
        sender: 'me',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        translatedText: `[Auto-translated to ${contact.language}]`,
        isVoiceMessage: true,
      };

      // Add optimistic message
      setMessages(prev => [...prev, voiceMessage]);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Send to database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user?.id,
          type: 'voice',
          media_url: urlData.publicUrl,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending voice message:', error);

        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== voiceMessage.id));

        Alert.alert('Error', 'Failed to send voice message. Please try again.');
        return;
      }

      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg =>
        msg.id === voiceMessage.id
          ? {
              ...data,
              senderName: 'You',
              senderAvatar: 'You',
              isTranslationVisible: false,
              audio_url: data.media_url,
              duration: 0,
              translated_content: `[Auto-translated to ${contact.language}]`,
              // Legacy fields
              sender: 'me',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              translatedText: `[Auto-translated to ${contact.language}]`,
              isVoiceMessage: true,
            } as Message
          : msg
      ));

      console.log('Voice message sent successfully');

    } catch (error) {
      console.error('Error in uploadAndSendVoiceMessage:', error);
      Alert.alert('Error', 'Failed to send voice message. Please try again.');
    }
  };

  const playVoiceMessage = async (messageId: string) => {
    try {
      // Stop any currently playing audio
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // If clicking the same message that's playing, stop it
      if (currentPlayingId === messageId) {
        setCurrentPlayingId(null);
        return;
      }

      const message = messages.find(m => m.id === messageId);
      if (!message || !message.audio_url) {
        Alert.alert('Error', 'Audio file not found.');
        return;
      }

      setIsLoadingAudio(true);
      setCurrentPlayingId(messageId);

      // Create and load the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: message.audio_url },
        { shouldPlay: true }
      );

      setSound(newSound);

      // Set up playback status listener
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setCurrentPlayingId(null);
          setSound(null);
        }
      });

      console.log('Playing voice message:', message.audio_url);

    } catch (error) {
      console.error('Error playing voice message:', error);
      Alert.alert('Error', 'Failed to play voice message.');
      setCurrentPlayingId(null);
      setSound(null);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isMe = message.sender === 'me';

    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isMe ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        <TouchableOpacity
          style={[
            styles.messageBubble,
            isMe ? styles.myMessageBubble : styles.theirMessageBubble
          ]}
          onPress={() => message.translatedText && toggleTranslation(message.id)}
          activeOpacity={0.8}
        >
          {message.isVoiceMessage || message.type === 'voice' ? (
            <TouchableOpacity
              style={styles.voiceMessageContent}
              onPress={() => playVoiceMessage(message.id)}
              disabled={isLoadingAudio && currentPlayingId === message.id}
            >
              {isLoadingAudio && currentPlayingId === message.id ? (
                <ActivityIndicator
                  size="small"
                  color={isMe ? "#FFFFFF" : "#FF8A00"}
                />
              ) : (
                <Ionicons
                  name={currentPlayingId === message.id ? "pause-circle" : "play-circle"}
                  size={32}
                  color={isMe ? "#FFFFFF" : "#FF8A00"}
                />
              )}
              <View style={styles.voiceMessageInfo}>
                <Text style={[
                  styles.voiceMessageText,
                  isMe ? styles.myMessageText : styles.theirMessageText
                ]}>
                  {currentPlayingId === message.id ? 'Playing...' : 'Voice Message'}
                </Text>
                <Text style={[
                  styles.voiceMessageDuration,
                  isMe ? styles.myMessageText : styles.theirMessageText
                ]}>
                  {message.duration ? `${Math.floor(message.duration / 60)}:${(message.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                </Text>
              </View>
              <View style={styles.waveformContainer}>
                {[1, 2, 3, 4, 5].map((bar) => (
                  <View
                    key={bar}
                    style={[
                      styles.waveformBar,
                      {
                        height: Math.random() * 20 + 10,
                        backgroundColor: isMe ? "#FFFFFF" : "#FF8A00"
                      }
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={[
              styles.messageText,
              isMe ? styles.myMessageText : styles.theirMessageText
            ]}>
              {message.text}
            </Text>
          )}

          {message.translatedText && (showTranslations || message.isTranslationVisible) && (
            <View style={styles.translationContainer}>
              <Text style={[
                styles.translationText,
                isMe ? styles.myTranslationText : styles.theirTranslationText
              ]}>
                🔄 {message.translatedText}
              </Text>
            </View>
          )}

          <Text style={[
            styles.messageTimestamp,
            isMe ? styles.myTimestamp : styles.theirTimestamp
          ]}>
            {message.timestamp}
          </Text>
        </TouchableOpacity>
      </View>
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.messagesContent, { paddingBottom: insets.bottom + 12 }]}
      >
        {messages.map(renderMessage)}
        {renderTypingIndicator()}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.inputContainer, { paddingBottom: (insets.bottom || 8) }]}
      >
        {isRecording ? (
          // Recording UI
          <View style={styles.recordingContainer}>
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
                <Animated.View
                  key={bar}
                  style={[
                    styles.waveformBar,
                    {
                      height: Math.random() * 30 + 10,
                      backgroundColor: '#FF8A00',
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
                <Ionicons name="stop" size={24} color="#FFFFFF" />
                <Text style={styles.stopRecordingText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Normal Input UI
          <>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.attachButton}>
                <Ionicons name="add" size={24} color="#999" />
              </TouchableOpacity>

              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder={`Type in your language... (auto-translates to ${contact.language})`}
                  value={newMessage}
                  onChangeText={(t) => { setNewMessage(t); notifyTyping(t); }}
                  multiline
                  maxLength={500}
                  placeholderTextColor="#999"
                />
                {newMessage.length > 0 && (
                  <Text style={styles.characterCount}>
                    {newMessage.length}/500
                  </Text>
                )}
              </View>

              {newMessage.trim() ? (
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.voiceButton}
                  onPressIn={startVoiceRecording}
                  onPressOut={stopVoiceRecording}
                >
                  <Ionicons
                    name="mic"
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputHint}>
              <Ionicons name="information-circle" size={12} color="#10B981" />
              <Text style={styles.inputHintText}>
                Messages are automatically translated in real-time
              </Text>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  headerAvatarText: {
    fontSize: 18,
  },
  headerAvatarImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
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
    borderColor: '#FFFFFF',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerStatus: {
    fontSize: 12,
    color: '#10B981',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 15,
  },
  translationToggle: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: width * 0.05,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  translationButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translationButtonText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  languageIndicator: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  languageIndicatorText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: width * 0.05,
    paddingVertical: 10,
  },
  messageContainer: {
    marginBottom: 16,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  theirMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myMessageBubble: {
    backgroundColor: '#FF8A00',
  },
  theirMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#1F2937',
  },
  voiceMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 180,
  },
  voiceMessageInfo: {
    marginLeft: 10,
    flex: 1,
  },
  voiceMessageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  voiceMessageDuration: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  waveformBar: {
    width: 2,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  translationContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  translationText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  myTranslationText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  theirTranslationText: {
    color: '#6B7280',
  },
  messageTimestamp: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirTimestamp: {
    color: '#9CA3AF',
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingHorizontal: width * 0.05,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  textInputContainer: {
    flex: 1,
    position: 'relative',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    backgroundColor: '#F8F9FA',
  },
  characterCount: {
    position: 'absolute',
    bottom: -15,
    right: 20,
    fontSize: 10,
    color: '#9CA3AF',
  },
  sendButton: {
    backgroundColor: '#FF8A00',
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF8A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  voiceButton: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  inputHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  inputHintText: {
    marginLeft: 4,
    fontSize: 10,
    color: '#10B981',
    fontStyle: 'italic',
  },

  // Recording UI Styles
  recordingContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  recordingDuration: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF8A00',
  },
  recordingWaveform: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 60,
    marginBottom: 20,
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  cancelRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
  },
  cancelRecordingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  stopRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
  },
  stopRecordingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ChatDetailScreen;