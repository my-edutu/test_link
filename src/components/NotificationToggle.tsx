import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Typography } from '../constants/Theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

const NotificationToggle: React.FC<Props> = ({ title, subtitle, value, onChange }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.borderLight || 'rgba(255, 255, 255, 0.05)' }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          true: colors.primary
        }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});

export default NotificationToggle;


