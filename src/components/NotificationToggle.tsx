import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

const NotificationToggle: React.FC<Props> = ({ title, subtitle, value, onChange }) => {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#D1D5DB', true: '#FF8A00' }}
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 16, fontWeight: '500', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 18 },
});

export default NotificationToggle;


