import { supabase } from '../supabaseClient';
import {
    ProfileResponse,
    StoryResponse,
    ConversationResponse,
    MessageResponse,
    ConversationWithUnreadResponse,
    OtherParticipantResponse
} from '../types/chat.types';
import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

export const chatService = {
    async getConversationsWithUnread(): Promise<PostgrestResponse<ConversationWithUnreadResponse>> {
        return await supabase.rpc('get_conversations_with_unread');
    },

    async getMutualFollows(): Promise<PostgrestResponse<OtherParticipantResponse>> {
        return await supabase.rpc('get_mutual_follows');
    },

    async getOtherParticipant(conversationId: string): Promise<PostgrestResponse<OtherParticipantResponse>> {
        return await supabase.rpc('get_other_participant', { p_conversation_id: conversationId });
    },

    async getJoinedGroups(userId: string): Promise<PostgrestResponse<{
        conversation_id: string;
        conversations: ConversationResponse;
    }>> {
        return await supabase
            .from('conversation_members')
            .select(`
conversation_id,
    conversations(
        id,
        title,
        created_by,
        created_at,
        last_message_at,
        last_message_preview,
        is_group
    )
        `)
            .eq('user_id', userId)
            .eq('conversations.is_group', true) as any; // Cast because nested joins are complex for TS
    },

    async getGroupMemberCount(groupId: string): Promise<number> {
        const { count } = await supabase
            .from('conversation_members')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', groupId);
        return count || 0;
    },

    async getStories(userId: string): Promise<PostgrestResponse<StoryResponse>> {
        return await supabase
            .from('stories')
            .select('id, user_id, media_url, created_at, expires_at, is_public')
            .gt('expires_at', new Date().toISOString())
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(50);
    },

    async getProfiles(userIds: string[]): Promise<PostgrestResponse<ProfileResponse>> {
        if (userIds.length === 0) return { data: [], error: null, count: 0, status: 200, statusText: 'OK' };
        return await supabase
            .from('profiles')
            .select('id, full_name, username, primary_language, avatar_url')
            .in('id', userIds);
    },

    async getProfile(userId: string): Promise<PostgrestSingleResponse<ProfileResponse | null>> {
        return await supabase
            .from('profiles')
            .select('id, full_name, username, primary_language, avatar_url')
            .eq('id', userId)
            .maybeSingle();
    },

    async getStoryViews(userId: string, storyIds: string[]): Promise<PostgrestResponse<{ story_id: string }>> {
        if (storyIds.length === 0) return { data: [], error: null, count: 0, status: 200, statusText: 'OK' };
        return await supabase
            .from('story_views')
            .select('story_id')
            .eq('user_id', userId)
            .in('story_id', storyIds);
    },

    async getMessage(messageId: string): Promise<PostgrestSingleResponse<{ conversation_id: string } | null>> {
        return await supabase
            .from('messages')
            .select('conversation_id')
            .eq('id', messageId)
            .maybeSingle();
    }
};

