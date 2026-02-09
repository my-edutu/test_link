import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatContact } from '../../types/chat.types';
import { Colors, Typography, Layout, Gradients } from '../../constants/Theme';
import { GlassCard } from '../GlassCard';
import { LinearGradient } from 'expo-linear-gradient';

interface ChatListItemProps {
    contact: ChatContact;
    navigation: any;
    showTranslations?: boolean;
    onPress?: (contact: ChatContact) => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ contact, navigation, showTranslations = true, onPress }) => {
    return (
        <GlassCard intensity={15} style={styles.chatItem}>
            <TouchableOpacity
                style={styles.chatItemBody}
                onPress={() => {
                    if (onPress) {
                        onPress(contact);
                    } else {
                        navigation.navigate('ChatDetail', { contact, conversationId: contact.id });
                    }
                }}
            >
                <View style={styles.chatItemLeft}>
                    <View style={[styles.avatar, contact.isOnline && styles.onlineAvatar]}>
                        {contact.avatarUrl ? (
                            <Image
                                source={{ uri: contact.avatarUrl }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Text style={styles.avatarText}>{contact.avatar}</Text>
                        )}
                        {contact.isOnline && <View style={styles.onlineIndicator} />}
                    </View>
                </View>

                <View style={styles.chatItemCenter}>
                    <View style={styles.chatItemHeader}>
                        <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                        <View style={styles.languageTag}>
                            <Text style={styles.languageText}>{contact.language}</Text>
                        </View>
                    </View>

                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {contact.lastMessage}
                    </Text>

                    {showTranslations && contact.lastMessageTranslated && (
                        <Text style={styles.translatedMessage} numberOfLines={1}>
                            📝 {contact.lastMessageTranslated}
                        </Text>
                    )}
                </View>

                <View style={styles.chatItemRight}>
                    <Text style={styles.lastMessageTime}>{contact.lastMessageTime}</Text>
                    <View style={styles.rightActions}>
                        {contact.unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <LinearGradient colors={Gradients.primary} style={StyleSheet.absoluteFill} />
                                <Text style={styles.unreadCount}>{contact.unreadCount}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('VoiceCall', { contact })}
                        >
                            <Ionicons name="call" size={14} color="#10B981" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    chatItem: {
        marginBottom: 12,
        borderRadius: Layout.radius.l,
        overflow: 'hidden',
    },
    chatItemBody: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    chatItemLeft: {
        marginRight: 16,
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    onlineAvatar: {
        borderColor: '#10B981',
        borderWidth: 2,
    },
    avatarImage: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    avatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#1A0800',
    },
    chatItemCenter: {
        flex: 1,
        justifyContent: 'center',
    },
    chatItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    contactName: {
        ...Typography.h4,
        color: '#FFFFFF',
        flex: 1,
    },
    languageTag: {
        backgroundColor: 'rgba(255, 138, 0, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    languageText: {
        ...Typography.caption,
        fontSize: 10,
        color: Colors.primary,
    },
    lastMessage: {
        ...Typography.body,
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    translatedMessage: {
        ...Typography.body,
        fontSize: 12,
        color: Colors.primary,
        fontStyle: 'italic',
        marginTop: 2,
    },
    chatItemRight: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    lastMessageTime: {
        ...Typography.body,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 8,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    unreadBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        overflow: 'hidden',
    },
    unreadCount: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    actionButton: {
        width: 32,
        height: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
