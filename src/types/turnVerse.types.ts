export interface TurnVerseRoom {
    id: string;
    created_at: string;
    host_id: string;
    title: string;
    category: string;
    language: string;
    status: 'waiting' | 'active' | 'finished';
    current_word: string | null;
    current_turn_index: number;
    turn_deadline: string | null;

    // Joined data (often fetched with query)
    host?: {
        username: string;
        avatar_url: string;
    } | null;
    players?: TurnVersePlayer[];
    viewer_count?: number; // Helper for UI
}

export interface TurnVersePlayer {
    id: string; // This is the player entry ID, not user ID
    room_id: string;
    user_id: string;
    score: number;
    status: 'active' | 'eliminated' | 'spectating';
    joined_at: string;

    // Joined data
    profile?: {
        username: string;
        avatar_url: string;
        primary_language?: string;
    } | null;
}
