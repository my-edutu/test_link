import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import {
    ChatContact,
    OtherParticipantResponse,
    ConversationWithUnreadResponse
} from '../types/chat.types';
import { chatService } from '../services/chatService';

const timeAgo = (dateIso?: string) => {
    if (!dateIso) return '';
    const date = new Date(dateIso);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
};

export const useChatSync = () => {
    const { user } = useAuth();
    const [contacts, setContacts] = useState<ChatContact[]>([]);
    const [joinedGroups, setJoinedGroups] = useState<ChatContact[]>([]);
    const [mutuals, setMutuals] = useState<ChatContact[]>([]);
    const [loadingChats, setLoadingChats] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch individual chats
    const fetchChats = useCallback(async () => {
        if (!user?.id) return;
        try {
            if (!refreshing) setLoadingChats(true);
            const { data: convs, error } = await chatService.getConversationsWithUnread();
            if (error) throw error;
            const results: ChatContact[] = [];
            for (const c of (convs || [])) {
                // Only include individual chats, not groups
                if (c.is_group) continue;
                // Fetch the other participant
                let name = c.title || 'Conversation';
                let username = 'user';
                let language = '—';
                let avatar = name.trim().charAt(0).toUpperCase() || 'U';
                let avatarUrl: string | undefined = undefined;
                let otherUserId: string | undefined = undefined;

                const { data: other } = await chatService.getOtherParticipant(c.id);
                if (other && other.length > 0) {
                    const p = other[0] as OtherParticipantResponse;
                    name = p.full_name || name;
                    username = p.username || username;
                    language = p.primary_language || language;
                    avatarUrl = p.avatar_url || undefined;
                    // Use avatar URL if available, otherwise use first letter of name
                    if (!avatarUrl && name) {
                        avatar = name.trim().charAt(0).toUpperCase();
                    }
                    // store other user's id for presence in detail screen
                    otherUserId = p.user_id;

                    results.push({
                        id: c.id,
                        name,
                        username,
                        avatar: avatar,
                        avatarUrl,
                        otherUserId,
                        language,
                        lastMessage: c.last_message_preview || '',
                        lastMessageTime: timeAgo(c.last_message_at || undefined),
                        unreadCount: (c.unread_count as number) || 0,
                        isOnline: false,
                    });
                    continue;
                }
                results.push({
                    id: c.id,
                    name,
                    username,
                    avatar: avatar,
                    avatarUrl,
                    language,
                    lastMessage: c.last_message_preview || '',
                    lastMessageTime: timeAgo(c.last_message_at || undefined),
                    unreadCount: (c.unread_count as number) || 0,
                    isOnline: false,
                });
            }
            setContacts(results);
        } catch (e) {
            console.error('load chats failed', e);
        } finally {
            setLoadingChats(false);
        }
    }, [user?.id, refreshing]);

    // Fetch user's joined groups
    const fetchJoinedGroups = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data: memberships, error } = await chatService.getJoinedGroups(user.id);
            if (error) throw error;

            // Get member counts for user's groups
            const groupIds = memberships?.map(m => m.conversation_id) || [];
            const memberCounts = await Promise.all(
                groupIds.map(async (groupId: string) => {
                    const count = await chatService.getGroupMemberCount(groupId);
                    return { groupId, count };
                })
            );

            const memberCountMap = memberCounts.reduce((acc, { groupId, count }) => {
                acc[groupId] = count;
                return acc;
            }, {} as Record<string, number>);

            const mappedGroups: ChatContact[] = (memberships || []).map(membership => ({
                id: membership.conversation_id,
                name: membership.conversations?.title || 'Untitled Group',
                username: membership.conversations?.title?.toLowerCase().replace(/\s+/g, '_') || 'group',
                avatar: (membership.conversations?.title || 'G').trim().charAt(0).toUpperCase(),
                language: 'Multiple',
                lastMessage: membership.conversations?.last_message_preview || '',
                lastMessageTime: timeAgo(membership.conversations?.last_message_at || undefined),
                unreadCount: 0,
                isOnline: true,
                isFollowing: true,
                followers: memberCountMap[membership.conversation_id] || 0,
                posts: 0,
            }));

            setJoinedGroups(mappedGroups);
        } catch (error) {
            console.error('Error fetching joined groups:', error);
        }
    }, [user?.id]);

    // Fetch mutuals (contacts)
    const fetchMutuals = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data: mutualsData, error } = await chatService.getMutualFollows();
            if (error) throw error;

            const results: ChatContact[] = (mutualsData || []).map((m: any) => ({
                id: m.id,
                name: m.full_name || m.username || 'User',
                username: m.username || 'user',
                avatar: (m.full_name || m.username || 'U').trim().charAt(0).toUpperCase(),
                avatarUrl: m.avatar_url,
                language: m.primary_language || '—',
                lastMessage: '',
                lastMessageTime: '',
                unreadCount: 0,
                isOnline: false,
                otherUserId: m.id
            }));
            setMutuals(results);
        } catch (error) {
            console.error('Error fetching mutuals:', error);
        }
    }, [user?.id]);


    // Realtime updates
    useEffect(() => {
        fetchChats();
        fetchJoinedGroups();
        fetchMutuals();

        if (!user?.id) return;

        const channel = supabase
            .channel('chatlist-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
                const m = payload.new;
                setContacts(prev => {
                    const updated = prev.map(c => c.id === m.conversation_id ? {
                        ...c,
                        lastMessage: m.text || (m.media_url ? '[media]' : c.lastMessage),
                        lastMessageTime: timeAgo(m.created_at),
                        unreadCount: c.unreadCount + 1,
                    } : c);
                    // move the updated conversation to top
                    const idx = updated.findIndex(c => c.id === m.conversation_id);
                    if (idx > 0) {
                        const [item] = updated.splice(idx, 1);
                        updated.unshift(item);
                    }
                    return [...updated];
                });
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reads' }, (payload: any) => {
                const r = payload.new;
                if (r.user_id === user?.id) {
                    chatService.getMessage(r.message_id)
                        .then(({ data }) => {
                            if (data?.conversation_id) {
                                setContacts(prev => prev.map(c => c.id === data.conversation_id ? {
                                    ...c,
                                    unreadCount: Math.max(0, c.unreadCount - 1),
                                } : c));
                            }
                        });
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members' }, () => {
                fetchJoinedGroups();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'conversation_members' }, () => {
                fetchJoinedGroups();
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [user?.id, fetchChats, fetchJoinedGroups, fetchMutuals]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchChats(), fetchJoinedGroups(), fetchMutuals()]);
        setRefreshing(false);
    }, [fetchChats, fetchJoinedGroups, fetchMutuals]);

    return {
        contacts,
        joinedGroups,
        mutuals,
        loadingChats,
        refreshing,
        onRefresh,
        fetchChats,
        fetchJoinedGroups
    };
};
