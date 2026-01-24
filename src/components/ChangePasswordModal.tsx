import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  newPassword: string;
  confirmPassword: string;
  loading?: boolean;
  onChange: (fields: Partial<{ newPassword: string; confirmPassword: string }>) => void;
  onClose: () => void;
  onSave: () => void;
};

const ChangePasswordModal: React.FC<Props> = ({ visible, newPassword, confirmPassword, loading, onChange, onClose, onSave }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.label}>New Password</Text>
          <TextInput value={newPassword} onChangeText={(t) => onChange({ newPassword: t })} placeholder="Enter new password" secureTextEntry style={styles.input} />
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput value={confirmPassword} onChangeText={(t) => onChange({ confirmPassword: t })} placeholder="Confirm new password" secureTextEntry style={styles.input} />
          <View style={styles.rowEnd}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose}><Text style={[styles.btnText, { color: '#111827' }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onSave} disabled={loading}><Text style={styles.btnText}>{loading ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 10 },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginLeft: 8 },
  btnGhost: { backgroundColor: '#E5E7EB' },
  btnPrimary: { backgroundColor: '#FF8A00' },
  btnText: { color: '#FFFFFF', fontWeight: '600' },
});

export default ChangePasswordModal;


