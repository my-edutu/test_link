export interface ChatContact {
    id: string;
    name: string;
    username: string;
    avatar: string;
    avatarUrl?: string;
    otherUserId?: string;
    language: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    isOnline: boolean;
    lastMessageTranslated?: string;
    isFollowing?: boolean;
    followers?: number;
    posts?: number;
}

export interface Story {
    id: string;
    user: ChatContact;
    thumbnail: string;
    timestamp: string;
    viewed: boolean;
    mediaUrl?: string;
    created_at?: string;
}

export interface ProfileResponse {
    id: string;
    full_name: string | null;
    username: string | null;
    primary_language: string | null;
    avatar_url: string | null;
}

export interface StoryResponse {
    id: string;
    user_id: string;
    media_url: string;
    created_at: string;
    expires_at: string;
    is_public: boolean;
}

export interface ConversationResponse {
    id: string;
    title: string | null;
    created_by: string;
    created_at: string;
    last_message_at: string | null;
    last_message_preview: string | null;
    is_group: boolean;
}

export interface MessageResponse {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
}

export interface ConversationWithUnreadResponse {
    id: string;
    title: string | null;
    is_group: boolean;
    last_message_at: string | null;
    last_message_preview: string | null;
    unread_count: number;
}

export interface OtherParticipantResponse {
    user_id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    primary_language: string | null;
}


