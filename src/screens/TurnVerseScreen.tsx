// src/screens/TurnVerseScreen.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
  Animated,
  Modal,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthProvider';
import { turnVerseService } from '../services/turnVerseService';
import { TurnVerseRoom, TurnVersePlayer } from '../types/turnVerse.types';
import { supabase } from '../supabaseClient';
import { LiveKitRoom, useRoomContext, useParticipants } from '@livekit/react-native';
import { liveService } from '../services/liveService';

const { width, height } = Dimensions.get('window');

const TurnVerseScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<'Live' | 'Create' | 'Trending'>('Live');
  const [rooms, setRooms] = useState<TurnVerseRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<TurnVerseRoom | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<TurnVersePlayer[]>([]);

  // Game State
  const [isInGame, setIsInGame] = useState(false);
  const [gameTimer, setGameTimer] = useState(10);
  const [currentTurn, setCurrentTurn] = useState(0); // 0-indexed player in list

  // LiveKit State
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  // Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameCategory, setNewGameCategory] = useState('Foods');
  const [newGameLanguage, setNewGameLanguage] = useState('Multi-Language');

  // Animation values
  const timerAnim = useRef(new Animated.Value(1)).current;
  const stageAnim = useRef(new Animated.Value(0)).current;

  // Initial Load
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000); // Poll for new rooms
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    const active = await turnVerseService.getActiveRooms();
    setRooms(active);
  };

  /**
   * JOIN ROOM LOGIC
   */
  const joinRoom = async (room: TurnVerseRoom) => {
    if (!user?.id) {
      Alert.alert('Sign In', 'You must be signed in to play.');
      return;
    }

    try {
      // 1. Get LiveKit Token
      const participantName = user.user_metadata?.username || 'Player';
      const { token: lkToken, serverUrl: lkUrl } = await liveService.getJoinToken(room.id, participantName);

      setToken(lkToken);
      setServerUrl(lkUrl);

      // 2. Join via Supabase Service
      await turnVerseService.joinRoom(room.id, user.id);

      // 3. Set Local State
      setSelectedRoom(room);
      setIsInGame(true);

      // 4. Animate entry
      Animated.timing(stageAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

    } catch (e: any) {
      Alert.alert('Error', 'Failed to join game room.');
      console.error(e);
    }
  };

  /**
   * CREATE ROOM LOGIC
   */
  const createRoom = async () => {
    if (!user?.id || !newGameTitle.trim()) return;

    try {
      const room = await turnVerseService.createRoom(
        newGameTitle,
        newGameCategory,
        newGameLanguage,
        user.id
      );

      if (room) {
        setShowCreateModal(false);
        // Auto-join the created room
        joinRoom(room);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create room');
    }
  };

  const leaveRoom = async () => {
    if (selectedRoom && user?.id) {
      await turnVerseService.leaveRoom(selectedRoom.id, user.id);
    }
    setIsInGame(false);
    setSelectedRoom(null);
    setToken(null);

    Animated.timing(stageAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* Main List View */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TurnVerse</Text>
        <TouchableOpacity onPress={fetchRooms}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {['Live', 'Create', 'Trending'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => tab === 'Create' ? setShowCreateModal(true) : setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {activeTab === 'Live' && (
          <FlatList
            data={rooms}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.liveRoomCard} onPress={() => joinRoom(item)}>
                <View style={styles.liveRoomHeader}>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>{item.status === 'active' ? 'PLAYING' : 'WAITING'}</Text>
                  </View>
                </View>
                <View style={styles.liveRoomContent}>
                  <Text style={styles.liveRoomThumbnail}>🎮</Text>
                  <Text style={styles.liveRoomTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.liveRoomHost}>by {item.host?.username || 'Unknown'}</Text>
                  <View style={styles.liveRoomMeta}>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{item.category}</Text>
                    </View>
                    <Text style={styles.languageText}>{item.language}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.liveRoomsList}
            ListEmptyComponent={
              <Text style={{ color: '#666', textAlign: 'center', marginTop: 50 }}>No active games found. Create one!</Text>
            }
          />
        )}
      </View>

      {/* Floating Create Button */}
      <TouchableOpacity
        style={styles.createFloatingButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <Text style={styles.createModalTitle}>Create Game</Text>

            <TextInput
              style={styles.input}
              placeholder="Game Title"
              placeholderTextColor="#999"
              value={newGameTitle}
              onChangeText={setNewGameTitle}
            />

            <Text style={styles.formLabel}>Category</Text>
            <ScrollView horizontal style={{ maxHeight: 50, marginBottom: 16 }}>
              {['Foods', 'Animals', 'Colors', 'Names', 'Places'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryPill, newGameCategory === c && styles.categoryPillActive]}
                  onPress={() => setNewGameCategory(c)}
                >
                  <Text style={[styles.categoryPillText, newGameCategory === c && styles.categoryPillTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.createButton} onPress={createRoom}>
              <Text style={styles.createButtonText}>Start Room</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setShowCreateModal(false)}>
              <Text style={{ color: '#999', textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Game Room Modal (LiveKit Integration) */}
      {selectedRoom && isInGame && (
        <Modal visible={true} animationType="slide" onRequestClose={leaveRoom}>
          {token && serverUrl ? (
            <LiveKitRoom
              token={token}
              serverUrl={serverUrl}
              connect={true}
              video={false} // Audio only for TurnVerse usually, enable video if desired
              audio={true}
            >
              <GameRoomView
                room={selectedRoom}
                onLeave={leaveRoom}
                isHost={selectedRoom.host_id === user?.id}
                currentUser={user}
              />
            </LiveKitRoom>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={{ color: 'white' }}>Connecting to Game Server...</Text>
            </View>
          )}
        </Modal>
      )}

    </SafeAreaView>
  );
};

// Sub-component for the Active Game Room
const GameRoomView = ({ room, onLeave, isHost, currentUser }: any) => {
  const [players, setPlayers] = useState<TurnVersePlayer[]>([]);
  const [gameState, setGameState] = useState<TurnVerseRoom>(room);
  const insets = useSafeAreaInsets();

  // LiveKit Hooks
  const lkParticipants = useParticipants();

  // Subscribe to Room State & Players
  useEffect(() => {
    // Fetch initial players
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('turnverse_players')
        .select('*, profile:profiles(username, avatar_url)')
        .eq('room_id', room.id);
      if (data) setPlayers(data as any);
    };
    fetchPlayers();

    // Realtime Subscription
    const channel = supabase.channel(`turnverse:${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnverse_rooms', filter: `id=eq.${room.id}` },
        (payload) => setGameState(payload.new as TurnVerseRoom)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnverse_players', filter: `room_id=eq.${room.id}` },
        () => fetchPlayers() // Refresh list on any change
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  const handleStartGame = async () => {
    await turnVerseService.startGame(room.id);
  };

  return (
    <SafeAreaView style={styles.gameContainer}>
      <View style={[styles.gameHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={onLeave}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <View>
          <Text style={styles.gameTitle}>{gameState.title}</Text>
          <Text style={styles.gameStatus}>{gameState.status === 'active' ? 'IN PROGRESS' : 'WAITING FOR PLAYERS'}</Text>
        </View>
        <View style={styles.viewerCount}>
          <Ionicons name="people" size={16} color="#FFF" />
          <Text style={styles.viewerCountText}>{lkParticipants.length}</Text>
        </View>
      </View>

      {gameState.status === 'active' && (
        <View style={styles.gamePrompt}>
          <Text style={styles.promptLabel}>Current Word</Text>
          <Text style={styles.promptWord}>{gameState.current_word}</Text>

          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>🎤 LIVE</Text>
          </View>
        </View>
      )}

      <View style={styles.stageArea}>
        <Text style={styles.stageLabel}>Players ({players.length})</Text>
        <FlatList
          data={players}
          keyExtractor={p => p.id}
          numColumns={3}
          renderItem={({ item }) => (
            <View style={styles.playerSpot}>
              <Text style={styles.playerAvatar}>👤</Text>
              <Text style={styles.playerName} numberOfLines={1}>{item.profile?.username || 'Player'}</Text>
              <Text style={styles.playerScore}>{item.score} pts</Text>
            </View>
          )}
        />
      </View>

      {isHost && gameState.status === 'waiting' && (
        <View style={styles.gameControls}>
          <TouchableOpacity style={styles.startGameButton} onPress={handleStartGame}>
            <Text style={styles.startGameText}>START GAME</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937' },
  loadingContainer: { flex: 1, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: width * 0.05, paddingBottom: 16, backgroundColor: '#1F2937' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#374151', marginHorizontal: width * 0.05, borderRadius: 25, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 },
  activeTab: { backgroundColor: '#FF8A00' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#D1D5DB' },
  activeTabText: { color: '#FFFFFF' },
  content: { flex: 1 },
  liveRoomsList: { paddingHorizontal: width * 0.05 },
  liveRoomCard: { backgroundColor: '#374151', borderRadius: 16, margin: 8, overflow: 'hidden', flex: 1, maxWidth: (width - width * 0.1 - 32) / 2 },
  liveRoomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  viewerCount: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  viewerCountText: { fontSize: 10, color: '#FFFFFF', marginLeft: 2 },
  liveRoomContent: { padding: 12, paddingTop: 40 },
  liveRoomThumbnail: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  liveRoomInfo: { alignItems: 'center' },
  liveRoomTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 4, textAlign: 'center' },
  liveRoomHost: { fontSize: 12, color: '#D1D5DB', marginBottom: 6 },
  liveRoomMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  categoryTag: { backgroundColor: '#FF8A00', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginRight: 6 },
  categoryTagText: { fontSize: 10, color: '#FFFFFF', fontWeight: '500' },
  languageText: { fontSize: 10, color: '#9CA3AF' },
  createFloatingButton: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', elevation: 8 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  createModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  createModalTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, marginBottom: 16, color: '#1F2937' },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  categoryPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  categoryPillActive: { backgroundColor: '#FEF3E2', borderColor: '#FF8A00' },
  categoryPillText: { color: '#6B7280' },
  categoryPillTextActive: { color: '#FF8A00', fontWeight: 'bold' },
  createButton: { backgroundColor: '#FF8A00', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  createButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // Game Room Styles
  gameContainer: { flex: 1, backgroundColor: '#000' },
  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  gameTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  gameStatus: { color: '#AAAAAA', fontSize: 12 },
  gamePrompt: { alignItems: 'center', padding: 20, backgroundColor: '#111', margin: 16, borderRadius: 16 },
  promptLabel: { color: '#888', textTransform: 'uppercase', fontSize: 12 },
  promptWord: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginVertical: 10 },
  timerContainer: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timerText: { color: '#FFF', fontWeight: 'bold' },
  stageArea: { flex: 1, padding: 16 },
  stageLabel: { color: '#FFF', marginBottom: 16, fontWeight: '600' },
  playerSpot: { flex: 1 / 3, alignItems: 'center', marginBottom: 24 },
  playerAvatar: { fontSize: 30, marginBottom: 8 },
  playerName: { color: '#FFF', fontSize: 12 },
  playerScore: { color: '#FCD34D', fontSize: 12, fontWeight: 'bold' },
  gameControls: { padding: 16, alignItems: 'center' },
  startGameButton: { backgroundColor: '#10B981', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30 },
  startGameText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default TurnVerseScreen;