// src/screens/GroupChatScreen.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';

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
  senderName?: string;
  senderAvatar?: string;
  isTranslationVisible?: boolean;
  translated_content?: string;
  audio_url?: string;
  duration?: number;
}

interface GroupMember {
  id: string;
  user_id: string;
  conversation_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  primary_language?: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>;

const GroupChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { group } = route.params;
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  const recordingDotAnim = useRef(new Animated.Value(1)).current;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    headerAvatarText: {
      fontSize: 18,
      color: colors.text,
    },
    headerName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    headerStatus: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      padding: 6,
      marginLeft: 4,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 0 : 16,
      backgroundColor: isDark ? 'rgba(20,20,20,0.9)' : colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    actionButton: {
      padding: 8,
    },
    textInputContainer: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.inputBackground,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minHeight: 44,
      justifyContent: 'center',
    },
    textInput: {
      fontSize: 16,
      color: colors.text,
      maxHeight: 100,
      padding: 0,
    },
    voiceButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.primary,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.primary,
    },
    messageBubble: {
      maxWidth: '80%',
      padding: 12,
      borderRadius: 16,
      marginVertical: 4,
    },
    myMessage: {
      alignSelf: 'flex-end',
      backgroundColor: Colors.primary,
      borderBottomRightRadius: 4,
    },
    theirMessage: {
      alignSelf: 'flex-start',
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.inputBackground,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 16,
      color: '#FFFFFF',
    },
    theirMessageText: {
      fontSize: 16,
      color: colors.text,
    },
    senderName: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
      marginBottom: 2,
    },
  }), [colors, isDark]);

  const fetchMessages = useCallback(async () => {
    if (!group.id) return;
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', group.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, primary_language')
        .in('id', senderIds);

      const transformedMessages: Message[] = messagesData.map(msg => {
        const profile = profilesData?.find(p => p.id === msg.sender_id);
        return {
          id: msg.id,
          text: msg.text,
          sender_id: msg.sender_id,
          conversation_id: msg.conversation_id,
          type: msg.type,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
          media_url: msg.media_url,
          senderName: profile?.full_name || 'Unknown User',
          senderAvatar: profile?.avatar_url || profile?.full_name?.charAt(0).toUpperCase() || 'U',
          isTranslationVisible: false,
          audio_url: msg.type === 'voice' ? msg.media_url : undefined,
          duration: msg.type === 'voice' ? 0 : undefined,
        };
      });

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error in fetchMessages:', error);
    }
  }, [group.id]);

  const fetchGroupMembers = useCallback(async () => {
    if (!group.id) return;
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('conversation_members')
        .select('*')
        .eq('conversation_id', group.id);

      if (membersError) {
        console.error('Error fetching group members:', membersError);
        return;
      }

      const userIds = membersData.map(member => member.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, primary_language')
        .in('id', userIds);

      const transformedMembers: GroupMember[] = membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          id: member.conversation_id + '_' + member.user_id,
          user_id: member.user_id,
          conversation_id: member.conversation_id,
          role: member.role,
          joined_at: member.joined_at,
          full_name: profile?.full_name || 'Unknown User',
          username: profile?.username || 'user',
          avatar_url: profile?.avatar_url,
          primary_language: profile?.primary_language || 'English',
        };
      });

      setGroupMembers(transformedMembers);
    } catch (error) {
      console.error('Error in fetchGroupMembers:', error);
    }
  }, [group.id]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMessages(), fetchGroupMembers()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchMessages, fetchGroupMembers]);

  useEffect(() => {
    if (!group.id) return;
    const channel = supabase
      .channel(`group-chat-${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${group.id}` }, async (payload) => {
        if (payload.new.sender_id === user?.id) return;
        fetchMessages();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [group.id, fetchMessages, user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
    }, [fetchMessages])
  );

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{group.avatar}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{group.name}</Text>
            <Text style={styles.headerStatus}>
              {groupMembers.length} members • {group.language}
            </Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('GroupCall', { group })}
          >
            <Ionicons name="call" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('GroupCall', { group })}
          >
            <Ionicons name="videocam" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="people" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      ),
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerShadowVisible: !isDark,
      headerTintColor: Colors.primary,
    });
  }, [navigation, group, groupMembers.length, styles, colors, isDark]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || isSending) return;
    setIsSending(true);
    const messageText = newMessage.trim();
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      text: messageText,
      sender_id: user.id,
      conversation_id: group.id,
      type: 'text',
      created_at: new Date().toISOString(),
      senderName: 'You',
      senderAvatar: '👤',
      isTranslationVisible: false,
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setTimeout(() => { scrollViewRef.current?.scrollToEnd({ animated: true }); }, 100);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: group.id,
          sender_id: user.id,
          text: messageText,
          type: 'text',
        })
        .select()
        .single();
      if (error) throw error;
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticMessage.id ? { ...data, senderName: 'You', senderAvatar: 'You', isTranslationVisible: false } as Message : msg
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isMe = message.sender_id === user?.id;
    return (
      <View key={message.id || index} style={{ marginBottom: 12 }}>
        {!isMe && <Text style={styles.senderName}>{message.senderName}</Text>}
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
          <Text style={isMe ? styles.messageText : styles.theirMessageText}>{message.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {isDark && <LinearGradient colors={['#1F0800', '#0D0200']} style={StyleSheet.absoluteFill} />}

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
      >
        {messages.map((msg, idx) => renderMessage(msg, idx))}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        style={styles.inputContainer}
      >
        <View style={[styles.inputRow, { marginBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
          </View>
          {newMessage.trim().length > 0 ? (
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.voiceButton}>
              <Ionicons name="mic" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default GroupChatScreen;