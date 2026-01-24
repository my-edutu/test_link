import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';

export default function ModernAuthLanding() {
    const navigation = useNavigation<any>();
    const { colors, theme } = useTheme();

    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            <StatusBar style={theme === 'dark' ? "light" : "dark"} />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                {/* LinguaLink text removed as per request */}
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.hero}>
                <View style={styles.iconBox}>
                    <MaterialIcons name="language" size={40} color={colors.primary} />
                </View>
                <Text style={styles.title}>Welcome to LinguaLink! 👋</Text>
                <Text style={styles.subtitle}>Preserving our voices, one word at a time.</Text>
            </View>

            <View style={styles.authContainer}>
                <TouchableOpacity style={styles.socialBtn}>
                    <Ionicons name="logo-google" size={20} color={colors.text} />
                    <Text style={styles.socialBtnText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Apple Login Removed */}

                <View style={styles.divider}>
                    <View style={styles.line} />
                    <Text style={styles.dividerText}>OR SIGN UP WITH EMAIL</Text>
                    <View style={styles.line} />
                </View>

                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => navigation.navigate('SignUp')}
                >
                    <Text style={styles.primaryBtnText}>Create Account</Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                    <Text style={styles.footerText}>Already have an account? <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Log In</Text></Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20 },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.border },
    hero: { alignItems: 'center', paddingVertical: 40 },
    iconBox: { width: 80, height: 80, backgroundColor: colors.secondary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    title: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
    subtitle: { color: colors.textSecondary, fontSize: 16, textAlign: 'center' },
    authContainer: { flex: 1, paddingHorizontal: 24, paddingBottom: 40, gap: 16 },
    socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    socialBtnText: { color: colors.text, fontSize: 16, fontWeight: '600' },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 16 },
    line: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    primaryBtn: { backgroundColor: colors.primary, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10 },
    primaryBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    footerText: { color: colors.textSecondary, textAlign: 'center' }
});
