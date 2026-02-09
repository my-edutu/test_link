import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthProvider';
import {
    Story,
    ChatContact,
    StoryResponse,
    ProfileResponse
} from '../types/chat.types';
import { chatService } from '../services/chatService';

export const useStories = () => {
    const { user } = useAuth();
    const [stories, setStories] = useState<Story[]>([]);

    const fetchStories = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data: rows, error } = await chatService.getStories(user.id);
            if (error) throw error;

            const storyRows = rows || [];
            // Get story IDs to check view status
            const storyIds = storyRows.map(r => r.id);
            const userIds = Array.from(new Set(storyRows.map(r => r.user_id)));

            // Fetch profiles and views in parallel using service
            const [profilesResult, viewsResult] = await Promise.all([
                chatService.getProfiles(userIds),
                chatService.getStoryViews(user.id, storyIds)
            ]);

            const profilesMap: Record<string, ProfileResponse> = {};
            (profilesResult.data || []).forEach(p => { profilesMap[p.id] = p; });

            const viewedStoryIds = new Set((viewsResult.data || []).map(v => v.story_id));

            const mapped: Story[] = storyRows.map(row => {
                const p = profilesMap[row.user_id];
                const name: string = p?.full_name || p?.username || 'User';
                const userAvatar = name ? name.trim().charAt(0).toUpperCase() : '👤';
                const contactUser: ChatContact = {
                    id: row.user_id,
                    name,
                    username: p?.username || 'user',
                    avatar: userAvatar,
                    language: p?.primary_language || '—',
                    lastMessage: '',
                    lastMessageTime: '',
                    unreadCount: 0,
                    isOnline: false,
                };
                return {
                    id: row.id,
                    user: contactUser,
                    thumbnail: '🎬',
                    timestamp: '',
                    viewed: viewedStoryIds.has(row.id),
                    mediaUrl: row.media_url,
                    created_at: row.created_at,
                };
            });

            // Sort stories: unviewed first (newest first), then viewed (newest first)
            const sortedStories = mapped.sort((a, b) => {
                // First sort by viewed status (unviewed first)
                if (a.viewed !== b.viewed) {
                    return a.viewed ? 1 : -1;
                }
                // Then sort by creation date (newest first) within each group
                const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                return bTime - aTime;
            });

            setStories(sortedStories);
        } catch (e) {
            console.log('fetchStories error', e);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchStories();
        if (!user?.id) return;
        const ch = supabase
            .channel('stories-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, (payload) => {
                const row = payload.new as StoryResponse;
                if (row.is_public && new Date(row.expires_at).getTime() > Date.now()) {
                    // Fetch profile for the new author (small follow-up query)
                    chatService.getProfile(row.user_id)
                        .then(({ data: prof }) => {
                            const name: string = prof?.full_name || prof?.username || 'User';
                            const userAvatar = name.trim().charAt(0).toUpperCase();
                            const contactUser: ChatContact = {
                                id: row.user_id,
                                name,
                                username: prof?.username || 'user',
                                avatar: userAvatar,
                                language: prof?.primary_language || '—',
                                lastMessage: '',
                                lastMessageTime: '',
                                unreadCount: 0,
                                isOnline: false,
                            };
                            setStories(prev => {
                                const newStory = {
                                    id: row.id,
                                    user: contactUser,
                                    thumbnail: '🎬',
                                    timestamp: '',
                                    viewed: false,
                                    mediaUrl: row.media_url,
                                    created_at: row.created_at
                                };
                                const updated = [newStory, ...prev];
                                // Re-sort to maintain unviewed first order
                                return updated.sort((a, b) => {
                                    if (a.viewed !== b.viewed) {
                                        return a.viewed ? 1 : -1;
                                    }
                                    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                                    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                                    return bTime - aTime;
                                });
                            });
                        });
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stories' }, (payload) => {
                const row = payload.new as StoryResponse;
                setStories(prev => {
                    // remove if expired or no longer public
                    if (!row.is_public || new Date(row.expires_at).getTime() <= Date.now()) {
                        return prev.filter(s => s.id !== row.id);
                    }
                    return prev;
                });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, (payload) => {
                const row = payload.old as { id: string };
                setStories(prev => prev.filter(s => s.id !== row.id));
            })
            // Real-time story view updates
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'story_views' }, (payload) => {
                const view = payload.new as { user_id: string; story_id: string };
                if (view.user_id === user?.id) {
                    // User viewed a story - mark it as viewed and re-sort
                    setStories(prev => {
                        const updated = prev.map(story =>
                            story.id === view.story_id ? { ...story, viewed: true } : story
                        );
                        // Re-sort: unviewed first (newest first), then viewed (newest first)
                        return updated.sort((a, b) => {
                            if (a.viewed !== b.viewed) {
                                return a.viewed ? 1 : -1;
                            }
                            // Sort by creation date within each group
                            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
                            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
                            return bTime - aTime;
                        });
                    });
                }
            })
            .subscribe();

        return () => { ch.unsubscribe(); };
    }, [user?.id, fetchStories]);

    return {
        stories,
        fetchStories
    };
};
