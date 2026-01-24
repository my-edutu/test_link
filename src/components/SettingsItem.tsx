import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightContent?: React.ReactNode;
};

const SettingsItem: React.FC<Props> = ({ title, subtitle, onPress, showArrow = true, rightContent }) => {
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingsItemContent}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        {subtitle ? <Text style={styles.settingsItemSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightContent || (showArrow && onPress ? <Ionicons name="chevron-forward" size={20} color="#9CA3AF" /> : null)}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default SettingsItem;


