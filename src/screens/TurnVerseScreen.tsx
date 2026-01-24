// src/screens/TurnVerseScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Player {
  id: string;
  name: string;
  avatar: string;
  language: string;
  isHost: boolean;
  isOnStage: boolean;
  score: number;
  status: 'active' | 'eliminated' | 'waiting';
}

interface LiveRoom {
  id: string;
  title: string;
  host: Player;
  currentPlayers: Player[];
  viewers: number;
  category: string;
  language: string;
  isLive: boolean;
  thumbnail: string;
}

const mockLiveRooms: LiveRoom[] = [
  {
    id: 'live_1',
    title: 'Nigerian Foods Challenge 🍲',
    host: {
      id: 'host_1',
      name: 'Chidi',
      avatar: '👨🏾',
      language: 'Igbo',
      isHost: true,
      isOnStage: true,
      score: 0,
      status: 'active',
    },
    currentPlayers: [
      {
        id: 'player_1',
        name: 'Aisha',
        avatar: '👩🏾',
        language: 'Hausa',
        isHost: false,
        isOnStage: true,
        score: 150,
        status: 'active',
      },
      {
        id: 'player_2',
        name: 'Kemi',
        avatar: '👸🏾',
        language: 'Yoruba',
        isHost: false,
        isOnStage: true,
        score: 200,
        status: 'active',
      },
      {
        id: 'player_3',
        name: 'Fatima',
        avatar: '👩🏾‍💼',
        language: 'Hausa',
        isHost: false,
        isOnStage: true,
        score: 120,
        status: 'active',
      },
      {
        id: 'player_4',
        name: 'Chidi',
        avatar: '👨🏾',
        language: 'Igbo',
        isHost: false,
        isOnStage: true,
        score: 180,
        status: 'active',
      },
      {
        id: 'player_5',
        name: 'Bola',
        avatar: '👩🏾‍🎓',
        language: 'Yoruba',
        isHost: false,
        isOnStage: true,
        score: 90,
        status: 'active',
      },
    ],
    viewers: 234,
    category: 'Foods',
    language: 'Multi-Language',
    isLive: true,
    thumbnail: '🎮',
  },
  {
    id: 'live_2',
    title: 'Animal Names in Yoruba 🦁',
    host: {
      id: 'host_2',
      name: 'Tunde',
      avatar: '👨🏾‍🎓',
      language: 'Yoruba',
      isHost: true,
      isOnStage: true,
      score: 0,
      status: 'active',
    },
    currentPlayers: [
      {
        id: 'player_6',
        name: 'Tunde',
        avatar: '👨🏾‍🎓',
        language: 'Yoruba',
        isHost: false,
        isOnStage: true,
        score: 0,
        status: 'active',
      },
    ],
    viewers: 89,
    category: 'Animals',
    language: 'Yoruba',
    isLive: true,
    thumbnail: '🎯',
  },
];

const TurnVerseScreen: React.FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Live' | 'Create' | 'Trending'>('Live');
  const [selectedRoom, setSelectedRoom] = useState<LiveRoom | null>(null);
  const [isInGame, setIsInGame] = useState(false);
  const [gameTimer, setGameTimer] = useState(10);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [gameWord, setGameWord] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Animation values
  const timerAnim = useRef(new Animated.Value(1)).current;
  const stageAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (gameStarted && gameTimer > 0) {
      const timer = setTimeout(() => {
        setGameTimer(gameTimer - 1);

        // Animate timer
        Animated.sequence([
          Animated.timing(timerAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(timerAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }, 1000);

      return () => clearTimeout(timer);
    } else if (gameTimer === 0) {
      // Player eliminated
      handlePlayerEliminated();
    }
  }, [gameTimer, gameStarted]);

  const handlePlayerEliminated = () => {
    Alert.alert(
      'Time Up!',
      `${selectedRoom?.currentPlayers[currentTurn]?.name || 'Player'} has been eliminated!`,
      [
        {
          text: 'Continue',
          onPress: () => {
            setGameTimer(10);
            setCurrentTurn((currentTurn + 1) % (selectedRoom?.currentPlayers.length || 1));
            generateNewWord();
          },
        },
      ]
    );
  };

  const generateNewWord = () => {
    const words = ['Jollof Rice', 'Plantain', 'Yam', 'Cassava', 'Pepper Soup', 'Suya'];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    setGameWord(randomWord);
  };

  const joinRoom = (room: LiveRoom) => {
    setSelectedRoom(room);
    setIsInGame(true);

    // Animate stage entry
    Animated.timing(stageAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const leaveRoom = () => {
    setIsInGame(false);
    setSelectedRoom(null);
    setGameStarted(false);
    setGameTimer(10);

    Animated.timing(stageAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const startGame = () => {
    setGameStarted(true);
    generateNewWord();
  };

  const CreateGameModal = () => (
    <Modal
      visible={showCreateModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackground}
          onPress={() => setShowCreateModal(false)}
        />
        <View style={styles.createModalContent}>
          <Text style={styles.createModalTitle}>Create TurnVerse Game</Text>

          <View style={styles.createForm}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Game Category</Text>
              <View style={styles.categoryGrid}>
                {['Foods', 'Animals', 'Colors', 'Names', 'Places', 'Objects'].map((category) => (
                  <TouchableOpacity key={category} style={styles.categoryCard}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Primary Language</Text>
              <View style={styles.languageOptions}>
                {['Igbo', 'Yoruba', 'Hausa', 'Multi-Language'].map((lang) => (
                  <TouchableOpacity key={lang} style={styles.languageOption}>
                    <Text style={styles.languageOptionText}>{lang}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => {
                  setShowCreateModal(false);
                  Alert.alert('Game Created!', 'Your TurnVerse game is now live!');
                }}
              >
                <Text style={styles.createButtonText}>Go Live</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderLiveRoom = ({ item }: { item: LiveRoom }) => (
    <TouchableOpacity
      style={styles.liveRoomCard}
      onPress={() => joinRoom(item)}
    >
      <View style={styles.liveRoomHeader}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerCount}>
          <Ionicons name="eye" size={12} color="#FFFFFF" />
          <Text style={styles.viewerCountText}>{item.viewers}</Text>
        </View>
      </View>

      <View style={styles.liveRoomContent}>
        <Text style={styles.liveRoomThumbnail}>{item.thumbnail}</Text>
        <View style={styles.liveRoomInfo}>
          <Text style={styles.liveRoomTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.liveRoomHost}>by {item.host.name}</Text>
          <View style={styles.liveRoomMeta}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.category}</Text>
            </View>
            <Text style={styles.languageText}>{item.language}</Text>
          </View>
          <View style={styles.playersOnStage}>
            <Text style={styles.playersText}>
              {item.currentPlayers.length + 1} on stage
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGameInterface = () => {
    if (!selectedRoom || !isInGame) return null;

    return (
      <Modal
        visible={isInGame}
        transparent={false}
        animationType="slide"
      >
        <SafeAreaView style={styles.gameContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

          {/* Game Header */}
          <View style={[styles.gameHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={leaveRoom}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle}>{selectedRoom.title}</Text>
              <View style={styles.gameMeta}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <Text style={styles.viewerCount}>{selectedRoom.viewers} watching</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Game Stage */}
          <View style={styles.gameStage}>
            {gameStarted && (
              <View style={styles.gamePrompt}>
                <Text style={styles.promptLabel}>Say this in your language:</Text>
                <Text style={styles.promptWord}>{gameWord}</Text>

                <Animated.View style={[
                  styles.timerContainer,
                  { transform: [{ scale: timerAnim }] }
                ]}>
                  <Text style={[
                    styles.timerText,
                    gameTimer <= 3 && styles.timerDanger
                  ]}>
                    {gameTimer}
                  </Text>
                </Animated.View>
              </View>
            )}

            {/* Players on Stage - 6 participants (3x2 grid) */}
            <View style={styles.stageArea}>
              <Text style={styles.stageLabel}>On Stage</Text>
              <View style={styles.playersGrid}>
                {/* Host (always in top-left) */}
                <View style={[
                  styles.playerSpot,
                  selectedRoom.host.isOnStage && styles.activePlayer,
                  currentTurn === 0 && gameStarted && styles.currentTurn
                ]}>
                  <Text style={styles.playerAvatar}>{selectedRoom.host.avatar}</Text>
                  <Text style={styles.playerName}>{selectedRoom.host.name}</Text>
                  <Text style={styles.playerLanguage}>{selectedRoom.host.language}</Text>
                  {selectedRoom.host.isHost && (
                    <View style={styles.hostBadge}>
                      <Text style={styles.hostBadgeText}>HOST</Text>
                    </View>
                  )}
                </View>

                {/* Current players */}
                {selectedRoom.currentPlayers.map((player, index) => (
                  <View
                    key={player.id}
                    style={[
                      styles.playerSpot,
                      player.isOnStage && styles.activePlayer,
                      currentTurn === index + 1 && gameStarted && styles.currentTurn
                    ]}
                  >
                    <Text style={styles.playerAvatar}>{player.avatar}</Text>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerLanguage}>{player.language}</Text>
                    <Text style={styles.playerScore}>{player.score} pts</Text>
                  </View>
                ))}

                {/* Empty spots for remaining slots (up to 5 more players) */}
                {Array.from({ length: Math.max(0, 6 - selectedRoom.currentPlayers.length - 1) }).map((_, index) => (
                  <TouchableOpacity
                    key={`empty_${index}`}
                    style={styles.emptySpot}
                  >
                    <Ionicons name="add" size={20} color="#9CA3AF" />
                    <Text style={styles.emptySpotText}>Join Stage</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Game Controls */}
          <View style={styles.gameControls}>
            {!gameStarted ? (
              <TouchableOpacity
                style={styles.startGameButton}
                onPress={startGame}
              >
                <Text style={styles.startGameText}>Start Game</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.activeGameControls}>
                <TouchableOpacity style={styles.controlButton}>
                  <Ionicons name="mic" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton}>
                  <Ionicons name="hand-right" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton}>
                  <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Viewers */}
          <View style={styles.viewersSection}>
            <Text style={styles.viewersTitle}>Viewers ({selectedRoom.viewers})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.viewersList}>
                {Array.from({ length: 20 }).map((_, index) => (
                  <View key={index} style={styles.viewerItem}>
                    <Text style={styles.viewerAvatar}>
                      {['👨🏾', '👩🏾', '👨🏿', '👩🏿', '🧑🏾'][index % 5]}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TurnVerse</Text>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['Live', 'Create', 'Trending'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab
            ]}
            onPress={() => {
              if (tab === 'Create') {
                setShowCreateModal(true);
              } else {
                setActiveTab(tab as typeof activeTab);
              }
            }}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.activeTabText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'Live' && (
          <FlatList
            data={mockLiveRooms}
            renderItem={renderLiveRoom}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.liveRoomsList}
            showsVerticalScrollIndicator={false}
          />
        )}

        {activeTab === 'Trending' && (
          <View style={styles.trendingSection}>
            <Text style={styles.sectionTitle}>Trending Categories</Text>
            <View style={styles.trendingGrid}>
              {['Foods 🍲', 'Animals 🦁', 'Colors 🎨', 'Names 👥', 'Places 🏠', 'Objects 📱'].map((category) => (
                <TouchableOpacity key={category} style={styles.trendingCard}>
                  <Text style={styles.trendingCategory}>{category}</Text>
                  <Text style={styles.trendingCount}>{Math.floor(Math.random() * 50) + 10} live</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Floating Create Button */}
      <TouchableOpacity
        style={styles.createFloatingButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="radio" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <CreateGameModal />
      {renderGameInterface()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingBottom: 16,
    backgroundColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    marginHorizontal: width * 0.05,
    borderRadius: 25,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#FF8A00',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  liveRoomsList: {
    paddingHorizontal: width * 0.05,
  },
  liveRoomCard: {
    backgroundColor: '#374151',
    borderRadius: 16,
    margin: 8,
    overflow: 'hidden',
    flex: 1,
    maxWidth: (width - width * 0.1 - 32) / 2,
  },
  liveRoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  viewerCountText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  liveRoomContent: {
    padding: 12,
    paddingTop: 40,
  },
  liveRoomThumbnail: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 8,
  },
  liveRoomInfo: {
    alignItems: 'center',
  },
  liveRoomTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  liveRoomHost: {
    fontSize: 12,
    color: '#D1D5DB',
    marginBottom: 6,
  },
  liveRoomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTag: {
    backgroundColor: '#FF8A00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  categoryTagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  languageText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  playersOnStage: {
    marginTop: 4,
  },
  playersText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  trendingSection: {
    paddingHorizontal: width * 0.05,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  trendingCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    width: (width - width * 0.1 - 16) / 2,
    marginBottom: 16,
    alignItems: 'center',
  },
  trendingCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trendingCount: {
    fontSize: 12,
    color: '#10B981',
  },
  createFloatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  createModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: height * 0.8,
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  createForm: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    width: (width - 72) / 3,
    marginBottom: 8,
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  languageOption: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  languageOptionText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  formActions: {
    marginTop: 'auto',
  },
  createButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#374151',
  },
  gameInfo: {
    flex: 1,
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  gameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameStage: {
    flex: 1,
    padding: 16,
  },
  gamePrompt: {
    backgroundColor: '#374151',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  promptLabel: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 8,
  },
  promptWord: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  timerContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF8A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timerDanger: {
    color: '#EF4444',
  },
  stageArea: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  playerSpot: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    width: (width - 80) / 3, // 3 columns instead of 2
    marginBottom: 12,
    position: 'relative',
    minHeight: 100,
  },
  activePlayer: {
    backgroundColor: '#4B5563',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  currentTurn: {
    borderColor: '#FF8A00',
    backgroundColor: '#FEF3E2',
  },
  playerAvatar: {
    fontSize: 32,
    marginBottom: 8,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  playerLanguage: {
    fontSize: 12,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  playerScore: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  hostBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF8A00',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hostBadgeText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptySpot: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    width: (width - 80) / 3, // Match playerSpot width
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4B5563',
    borderStyle: 'dashed',
    minHeight: 100,
    justifyContent: 'center',
  },
  emptySpotText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  gameControls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#374151',
  },
  startGameButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startGameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeGameControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    backgroundColor: '#4B5563',
    borderRadius: 25,
    padding: 12,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewersSection: {
    backgroundColor: '#374151',
    paddingVertical: 12,
  },
  viewersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  viewersList: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  viewerItem: {
    marginRight: 8,
  },
  viewerAvatar: {
    fontSize: 24,
  },
});

export default TurnVerseScreen;