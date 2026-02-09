import { supabase } from '../supabaseClient';
import { TurnVerseRoom, TurnVersePlayer } from '../types/turnVerse.types';
import { trackEvent, AnalyticsEvents } from './analytics';

class TurnVerseService {
    /**
     * Create a new game room
     */
    async createRoom(title: string, category: string, language: string, userId: string): Promise<TurnVerseRoom | null> {
        try {
            const { data, error } = await supabase
                .from('turnverse_rooms')
                .insert({
                    host_id: userId,
                    title,
                    category,
                    language,
                    status: 'waiting'
                })
                .select()
                .single();

            if (error) throw error;

            // Auto-join host as a player
            await this.joinRoom(data.id, userId);

            return data;
        } catch (error) {
            console.error('TurnVerseService.createRoom error:', error);
            return null;
        }
    }

    /**
     * Get active rooms for discovery
     */
    async getActiveRooms(): Promise<TurnVerseRoom[]> {
        const { data, error } = await supabase
            .from('turnverse_rooms')
            .select(`
                *,
                host:profiles!turnverse_rooms_host_id_fkey(username, avatar_url)
            `)
            .neq('status', 'finished')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('TurnVerseService.getActiveRooms error:', error);
            return [];
        }

        // Fetch player counts separately or handle via join if simple
        // For MVP, we'll return the base data.
        return data as TurnVerseRoom[];
    }

    /**
     * Join a room as a player
     */
    async joinRoom(roomId: string, userId: string): Promise<TurnVersePlayer | null> {
        // Check if already joined
        const { data: existing } = await supabase
            .from('turnverse_players')
            .select('*')
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) return existing as TurnVersePlayer;

        const { data, error } = await supabase
            .from('turnverse_players')
            .insert({
                room_id: roomId,
                user_id: userId,
                status: 'active'
            })
            .select()
            .single();

        if (error) {
            console.error('TurnVerseService.joinRoom error:', error);
            return null;
        }
        return data;
    }

    /**
     * Leave a room
     */
    async leaveRoom(roomId: string, userId: string) {
        await supabase
            .from('turnverse_players')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userId);
    }

    /**
     * Start the game (Host only)
     */
    async startGame(roomId: string) {
        // Here we ideally want to fetch the first word from a dictionary or AI
        // For now, we'll pick from a hardcoded list
        const starterWords = ['Hello', 'Welcome', 'Friend', 'Family', 'Love'];
        const randomWord = starterWords[Math.floor(Math.random() * starterWords.length)];

        const { error } = await supabase
            .from('turnverse_rooms')
            .update({
                status: 'active',
                current_word: randomWord,
                current_turn_index: 0,
                turn_deadline: new Date(Date.now() + 30000).toISOString() // 30s turn
            })
            .eq('id', roomId);

        if (error) console.error('Start game error', error);
    }

    /**
     * Get details for a specific room including players
     */
    async getRoomDetails(roomId: string): Promise<TurnVerseRoom | null> {
        const { data, error } = await supabase
            .from('turnverse_rooms')
            .select(`
                *,
                host:profiles!turnverse_rooms_host_id_fkey(username, avatar_url),
                players:turnverse_players(
                    *,
                    profile:profiles(username, avatar_url, primary_language)
                )
            `)
            .eq('id', roomId)
            .single();

        if (error) return null;
        return data as TurnVerseRoom;
    }
}

export const turnVerseService = new TurnVerseService();
