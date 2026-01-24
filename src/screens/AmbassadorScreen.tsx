import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    TextInput,
    Alert,
    Share,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

interface AmbassadorStats {
    totalReferrals: number;
    totalConversions: number;
    totalEarnings: number;
}

interface LeaderboardEntry {
    ambassadorId: string;
    totalConversions: number;
    totalEarnings: number;
    // In a real app we'd join with profile to get names
}

const AmbassadorScreen: React.FC = () => {
    const { user, session } = useAuth();
    const { colors: theme } = useTheme();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AmbassadorStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [vanityCode, setVanityCode] = useState<string | null>(null);
    const [claimCodeInput, setClaimCodeInput] = useState('');
    const [isAmbassador, setIsAmbassador] = useState(false);

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = session?.access_token;

            const statsRes = await fetch(`${API_BASE_URL}/ambassador/stats`, {
                headers: {
                    'x-user-id': user?.id || '',
                    Authorization: `Bearer ${token}`
                }
            });

            if (statsRes.ok) {
                const data = await statsRes.json();
                if (data.stats) {
                    setStats(data.stats);
                    // Check if stats exist implies usage
                    setIsAmbassador(true); // Simple assumption, or check profile
                }
            }

            // Check profile for code
            // (Implementation choice: assume we passed it or fetch profile here if needed. 
            // For now, relies on user knowing if they claimed it or stats existing)

            const lbRes = await fetch(`${API_BASE_URL}/ambassador/leaderboard`);
            if (lbRes.ok) {
                const data = await lbRes.json();
                setLeaderboard(data.leaderboard || []);
            }

            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const onClaimCode = async () => {
        try {
            const token = session?.access_token;
            const res = await fetch(`${API_BASE_URL}/ambassador/claim-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user?.id || '',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ code: claimCodeInput }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to claim code');

            setVanityCode(claimCodeInput);
            setIsAmbassador(true);
            Alert.alert('Success', 'Code claimed! Share it to start earning.');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const onShare = async () => {
        if (!vanityCode) return;
        try {
            await Share.share({
                message: `Join LinguaLink with my code ${vanityCode} and we both earn rewards!`,
            });
        } catch (error) {
            console.log(error);
        }
    };

    if (loading) {
        return <View style={[styles.container, styles.center]}><ActivityIndicator color={theme.primary} /></View>;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background, padding: 20 }]}>
            <Text style={[styles.title, { color: theme.text }]}>Ambassador Program</Text>

            {!isAmbassador && !vanityCode ? (
                <View style={[styles.card, { backgroundColor: theme.card }]}>
                    <Text style={[styles.subtitle, { color: theme.text }]}>Become an Ambassador</Text>
                    <Text style={[styles.body, { color: theme.textSecondary }]}>
                        Share your unique code and earn rewards when your friends join and contribute!
                    </Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                        placeholder="Enter your unique code (e.g. ralph_123)"
                        placeholderTextColor={theme.textSecondary}
                        value={claimCodeInput}
                        onChangeText={setClaimCodeInput}
                        autoCapitalize="none"
                    />
                    <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={onClaimCode}>
                        <Text style={styles.btnText}>Claim Code</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <View style={[styles.card, { backgroundColor: theme.card }]}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Your Code</Text>
                        <Text style={[styles.code, { color: theme.primary }]}>{vanityCode}</Text>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary, marginTop: 10 }]} onPress={onShare}>
                            <Text style={styles.btnText}>Share Code</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                            <Text style={[styles.statNum, { color: theme.text }]}>{stats?.totalReferrals || 0}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Referrals</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                            <Text style={[styles.statNum, { color: theme.text }]}>{stats?.totalConversions || 0}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Conversions</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                            <Text style={[styles.statNum, { color: theme.success }]}>${stats?.totalEarnings || 0}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Earnings</Text>
                        </View>
                    </View>
                </View>
            )}

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Leaderboard</Text>
            {leaderboard.length === 0 ? (
                <Text style={{ color: theme.textSecondary }}>No top ambassadors yet.</Text>
            ) : (
                leaderboard.map((entry, index) => (
                    <View key={index} style={[styles.leaderboardItem, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.rank, { color: theme.primary }]}>#{index + 1}</Text>
                        <Text style={[styles.lbText, { color: theme.text }]}>User ...{entry.ambassadorId.slice(-4)}</Text>
                        <Text style={[styles.lbScore, { color: theme.success }]}>{entry.totalConversions} converts</Text>
                    </View>
                ))
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
    body: { fontSize: 14, marginBottom: 15 },
    card: { padding: 20, borderRadius: 12, marginBottom: 20 },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 15 },
    btn: { padding: 15, borderRadius: 8, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: 'bold' },
    label: { fontSize: 12, textTransform: 'uppercase' },
    code: { fontSize: 32, fontWeight: 'bold', letterSpacing: 1 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statCard: { flex: 1, padding: 15, borderRadius: 12, marginHorizontal: 4, alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: 'bold' },
    statLabel: { fontSize: 12, marginTop: 4 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    leaderboardItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center' },
    rank: { width: 40, fontWeight: 'bold' },
    lbText: { flex: 1 },
    lbScore: { fontWeight: '600' },
});

export default AmbassadorScreen;
