import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const FAQS = [
    { q: "How do I earn XP?", a: "Complete lessons, maintain your streak, and participate in challenges." },
    { q: "Can I learn multiple languages?", a: "Yes! You can switch languages from your profile settings." },
    { q: "Is LinguaLink free?", a: "The core features are free. Premium features unlock more content." },
];

const FAQScreen = () => {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const handleContact = () => {
        Linking.openURL('mailto:info@lingualink.com');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>FAQ</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {FAQS.map((faq, index) => (
                    <View key={index} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.question, { color: colors.text }]}>{faq.q}</Text>
                        <Text style={[styles.answer, { color: colors.textSecondary }]}>{faq.a}</Text>
                    </View>
                ))}

                <TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.primary }]} onPress={handleContact}>
                    <Text style={styles.contactText}>Contact Support</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    item: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    question: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    answer: { fontSize: 14, lineHeight: 20 },
    contactBtn: { marginTop: 24, padding: 16, borderRadius: 12, alignItems: 'center' },
    contactText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default FAQScreen;
