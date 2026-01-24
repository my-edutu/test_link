
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const COLORS = {
    primary: '#a413ec',
    accentGreen: '#0bda76',
    backgroundDark: '#1c1022',
    cardBg: 'rgba(255,255,255,0.05)',
    white: '#FFFFFF',
};

export default function ModernHomeScreen() {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatarBorder}>
                    <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWIluzWQnX_e-XoQljT1qEK3W1TepJPuBa6NQm_5wTZVYVniax_zYOr3XAUNrEEreEnwMQoAE94yRVPEwf4WQ4K4XoWaKEVq4kUF-c3SZ6km-aP9-rtYjA3joMykOQClSxcNeWCdddL9HgCtAlf9vzoeS2KctdFfAZDkKLtxFI0qBbVYhd6C1BR-T7YW9D2IMnO-OeGk_RqAo1AJmgNk1iMNwWHAsRgi3mYTO0NGr5htGA0ehmdKqm9xpO7NZo9E2tFBb6JCCrrs1C' }}
                        style={styles.avatar}
                    />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={styles.appName}>LinguaLink</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn}>
                    <MaterialIcons name="notifications-none" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.greeting}>
                    <Text style={styles.greetTitle}>Ekaabo, Tunde! 👋</Text>
                    <Text style={styles.greetSub}>Ready to record your first prompt?</Text>
                    <Text style={styles.greetBody}>Your voice helps preserve the beauty of Yoruba for generations.</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Daily Goal</Text>
                        <View style={styles.statValueRow}>
                            <Text style={styles.statValue}>2/10</Text>
                            <Text style={styles.statTrend}>+20%</Text>
                        </View>
                        <View style={styles.progressBg}>
                            <View style={styles.progressFill} />
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Global Rank</Text>
                        <View style={styles.statValueRow}>
                            <Text style={styles.statValue}>#42</Text>
                            <Text style={styles.statTrend}>↑ 5</Text>
                        </View>
                        <Text style={styles.rankText}>TOP 5% TODAY</Text>
                    </View>
                </View>

                <View style={styles.leaderSection}>
                    <View style={styles.leaderHeader}>
                        <Text style={styles.leaderTitle}>Top Contributors</Text>
                        <Text style={styles.viewAll}>View all</Text>
                    </View>

                    <View style={styles.leaderRow}>
                        <Text style={styles.rankNum}>1</Text>
                        <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYvLMj1x3TTNEWWqlnxsFgKY_SYTUzLFq-vliJ7afxGyURRtFfgfb9dVshcEize6ymP46Q9BhdF0-pxWOM8YoiJlBacUTgpBSvnyCAAGz5vzJ3u25-EmAqg8iw0ZJhpJGhbNQrkI3LYfiuFij-H9qQ9XBmOfiePHfytrY9seaRm-UI6w585Muhfr25J8cLUA0_XBCyD4nuYnRlUXwxuC4HgzFe3Ehg9KsWTS4pjTDR4-v7OvGen2ruHFl0C0wL-kRmYK_PLVDx_eHk' }} style={styles.leaderAvatar} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.leaderName}>Amaka O.</Text>
                            <Text style={styles.leaderDetails}>Igbo • 1,240 pts</Text>
                        </View>
                        <MaterialIcons name="workspace-premium" size={20} color="#fbbf24" />
                    </View>

                    <View style={styles.leaderRow}>
                        <Text style={[styles.rankNum, { color: 'rgba(255,255,255,0.4)' }]}>2</Text>
                        <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFwV2koN6Sjrm9Bv1Jg2mCxCwYgiiMF9-H98mk19BZ-xL26D3TZRlnZTwVOWHa47uG8AA6z8wQ9E8GrEQDgA1idO0e9OCq3dQJMBVFZj-SqlbDRms6sXGUJAfEWqPYmog9yQI8pjNfKTBxW1UQZ434LS0sKhOqWxvs8kcdzyiDRoG33xBw1HaqPx1_tVtANeCIuhIw_LVozsmvJSTJZcOhE_ClVepVC7CFpOvG1XEhSD_KwYBPpSf_QQko_ctYNZRyKDjBcTF8uUxy' }} style={styles.leaderAvatar} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.leaderName}>Bolu T.</Text>
                            <Text style={styles.leaderDetails}>Yoruba • 980 pts</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottomArea}>
                <View style={styles.coachMark}>
                    <MaterialIcons name="auto-awesome" size={16} color={COLORS.primary} />
                    <Text style={styles.coachText}>Tap here to start!</Text>
                </View>

                <TouchableOpacity style={styles.recBtnOuter}>
                    <View style={styles.recBtnInner}>
                        <MaterialIcons name="mic" size={40} color="white" />
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.navBar}>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcons name="home-filled" size={24} color={COLORS.primary} />
                    <Text style={[styles.navText, { color: COLORS.primary }]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcons name="library-music" size={24} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.navText}>Library</Text>
                </TouchableOpacity>
                <View style={{ width: 60 }} />
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcons name="groups" size={24} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.navText}>Community</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <MaterialIcons name="person" size={24} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.navText}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16 },
    avatarBorder: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: COLORS.primary, padding: 2 },
    avatar: { width: '100%', height: '100%', borderRadius: 20 },
    appName: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    content: { padding: 16 },
    greeting: { marginBottom: 24 },
    greetTitle: { color: 'white', fontSize: 32, fontWeight: '800' },
    greetSub: { color: COLORS.primary, fontSize: 22, fontWeight: 'bold', marginTop: 4 },
    greetBody: { color: 'rgba(255,255,255,0.6)', marginTop: 8 },
    statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    statCard: { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 },
    statValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
    statValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    statTrend: { color: COLORS.accentGreen, fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
    progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 },
    progressFill: { width: '20%', height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
    rankText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    leaderSection: {},
    leaderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    leaderTitle: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    viewAll: { color: COLORS.primary, fontWeight: 'bold' },
    leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.cardBg, padding: 12, borderRadius: 16, marginBottom: 8 },
    rankNum: { color: COLORS.primary, fontWeight: 'bold', width: 20, textAlign: 'center' },
    leaderAvatar: { width: 40, height: 40, borderRadius: 20 },
    leaderName: { color: 'white', fontWeight: 'bold' },
    leaderDetails: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
    bottomArea: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
    coachMark: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 16, shadowColor: 'white', shadowOpacity: 0.2 },
    coachText: { color: COLORS.backgroundDark, fontWeight: 'bold', fontSize: 13 },
    recBtnOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(164,19,236,0.3)', alignItems: 'center', justifyContent: 'center' },
    recBtnInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' },
    navBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(28, 16, 34, 0.9)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    navItem: { alignItems: 'center' },
    navText: { fontSize: 10, fontWeight: 'bold', marginTop: 4, color: 'rgba(255,255,255,0.4)' }
});
