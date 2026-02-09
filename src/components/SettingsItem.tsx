import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightContent?: React.ReactNode;
};

const SettingsItem: React.FC<Props> = ({ title, subtitle, onPress, showArrow = true, rightContent }) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: colors.borderLight || 'rgba(255, 255, 255, 0.05)' }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemContent}>
        <Text style={[styles.settingsItemTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.settingsItemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {rightContent || (showArrow && onPress ? <Ionicons name="chevron-forward" size={18} color={isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"} /> : null)}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '500',
  },
  settingsItemSubtitle: {
    ...Typography.body,
    fontSize: 13,
    marginTop: 2,
  },
});

export default SettingsItem;


