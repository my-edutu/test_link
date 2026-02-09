import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Layout } from '../constants/Theme';
import { GlassCard } from './GlassCard';
import { useTheme } from '../context/ThemeContext';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
};

const SettingsSection: React.FC<Props> = ({ title, icon, iconColor, children }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' }]}>{title}</Text>
      </View>
      <GlassCard
        intensity={10}
        style={[
          styles.sectionContent,
          { borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }
        ]}
      >
        {children}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginLeft: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    ...Typography.h4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  sectionContent: {
    borderRadius: Layout.radius.l,
    overflow: 'hidden',
    borderWidth: 1,
  },
});

export default SettingsSection;


