import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

interface PendingClip {
    id: string;
    phrase: string;
    language: string;
    validations_count: number;
    created_at: string;
}

interface PendingRewardsProps {
    userId: string;
    onClipPress?: (clipId: string) => void;
}

const REQUIRED_VALIDATIONS = 3;

export const PendingRewards: React.FC<PendingRewardsProps> = ({ userId, onClipPress }) => {
    const [clips, setClips] = useState<PendingClip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingClips();
    }, [userId]);

    const fetchPendingClips = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('voice_clips')
                .select('id, phrase, language, validations_count, created_at')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(10);

            if (fetchError) throw fetchError;
            setClips(data || []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load pending clips');
        } finally {
            setLoading(false);
        }
    };

    const getProgress = (validations: number): number => {
        return Math.min((validations / REQUIRED_VALIDATIONS) * 100, 100);
    };

    const getTimeAgo = (dateString: string): string => {
        const now = new Date();
        const date = new Date(dateString);
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator color="#FF8A00" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchPendingClips} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (clips.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyTitle}>No Pending Clips</Text>
                <Text style={styles.emptySubtitle}>All your clips have been reviewed!</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pending Rewards</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{clips.length}</Text>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
                {clips.map((clip) => {
                    const progress = getProgress(clip.validations_count);
                    const remaining = Math.max(REQUIRED_VALIDATIONS - clip.validations_count, 0);

                    return (
                        <TouchableOpacity
                            key={clip.id}
                            style={styles.clipCard}
                            onPress={() => onClipPress?.(clip.id)}
                        >
                            <View style={styles.clipHeader}>
                                <Text style={styles.clipPhrase} numberOfLines={2}>
                                    {clip.phrase}
                                </Text>
                                <Text style={styles.clipTime}>{getTimeAgo(clip.created_at)}</Text>
                            </View>

                            <View style={styles.progressSection}>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                                </View>
                                <Text style={styles.progressText}>
                                    {remaining > 0
                                        ? `${remaining} more validation${remaining > 1 ? 's' : ''} needed`
                                        : 'Processing...'}
                                </Text>
                            </View>

                            <View style={styles.languageBadge}>
                                <Text style={styles.languageText}>{clip.language}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    countBadge: {
        backgroundColor: '#FF8A00',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFF',
    },
    scrollView: {
        paddingLeft: 16,
    },
    clipCard: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        width: 200,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    clipHeader: {
        marginBottom: 12,
    },
    clipPhrase: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
        lineHeight: 20,
        marginBottom: 4,
    },
    clipTime: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
    progressSection: {
        marginBottom: 12,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FF8A00',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 6,
    },
    languageBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 138, 0, 0.2)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    languageText: {
        fontSize: 11,
        color: '#FF8A00',
        fontWeight: '500',
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    errorText: {
        color: '#EF4444',
        marginBottom: 12,
    },
    retryButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    retryText: {
        color: '#FFF',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
        textAlign: 'center',
    },
});

export default PendingRewards;
