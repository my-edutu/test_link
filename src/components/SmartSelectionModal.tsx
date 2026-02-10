import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    Platform,
    KeyboardAvoidingView,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // Or just use a colored view if expo-blur is not available, but user said "glassmorphism"
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/Theme';

const { height } = Dimensions.get('window');

interface SmartSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    items: any[];
    onSelect: (item: any) => void;
    searchPlaceholder?: string;
    renderItem: (item: any, isSelected: boolean) => React.ReactNode;
    selectedItems?: any[]; // For multi-select checks, or single select check
    multiSelect?: boolean;
}

export const SmartSelectionModal: React.FC<SmartSelectionModalProps> = ({
    visible,
    onClose,
    title,
    items,
    onSelect,
    searchPlaceholder = 'Search...',
    renderItem,
    selectedItems = [],
    multiSelect = false
}) => {
    const { colors, isDark } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchQuery) return items;
        const lowerQuery = searchQuery.toLowerCase();
        return items.filter(item => {
            // Primitive search based on object values
            return Object.values(item).some(val =>
                String(val).toLowerCase().includes(lowerQuery)
            );
        });
    }, [items, searchQuery]);

    const isSelected = (item: any) => {
        // Simple equality check or based on ID if available
        return selectedItems.some(selected =>
            (selected.id && selected.id === item.id) ||
            (selected.code && selected.code === item.code) ||
            selected === item
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Close by tapping outside area logic could be added here */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                >
                    <BlurView
                        intensity={isDark ? 80 : 90}
                        tint={isDark ? 'dark' : 'light'}
                        style={styles.blurContainer}
                    >
                        <View style={styles.container}>
                            {/* Handle bar */}
                            <View style={styles.handleContainer}>
                                <View style={styles.handle} />
                            </View>

                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Search */}
                            <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.text }]}
                                    placeholder={searchPlaceholder}
                                    placeholderTextColor={colors.textSecondary}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoCapitalize="none"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* List */}
                            <FlatList
                                data={filteredItems}
                                keyExtractor={(item, index) => item.id || item.code || item.name || index.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.itemContainer,
                                            { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                        ]}
                                        onPress={() => onSelect(item)}
                                    >
                                        {renderItem(item, isSelected(item))}
                                        {isSelected(item) && (
                                            <Ionicons name="checkmark-circle" size={24} color={Colors.dark.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No results found</Text>
                                    </View>
                                }
                            />
                        </View>
                    </BlurView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
        height: '85%', // Take up most of the screen
    },
    blurContainer: {
        flex: 1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    container: {
        flex: 1,
        paddingTop: 8,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 16,
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 8,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    }
});
