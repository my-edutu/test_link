import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  fullName: string;
  username: string;
  bio: string;
  location: string;
  loading?: boolean;
  onChange: (fields: Partial<{ fullName: string; username: string; bio: string; location: string }>) => void;
  onClose: () => void;
  onSave: () => void;
};

const ProfileEditModal: React.FC<Props> = ({ visible, fullName, username, bio, location, loading, onChange, onClose, onSave }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.label}>Full Name</Text>
          <TextInput value={fullName} onChangeText={(t) => onChange({ fullName: t })} placeholder="Full name" style={styles.input} />
          <Text style={styles.label}>Username</Text>
          <TextInput value={username} onChangeText={(t) => onChange({ username: t })} autoCapitalize="none" placeholder="Username" style={styles.input} />
          <Text style={styles.label}>Bio</Text>
          <TextInput value={bio} onChangeText={(t) => onChange({ bio: t })} placeholder="Short bio" multiline style={[styles.input, styles.bio]} />
          <Text style={styles.label}>Location</Text>
          <TextInput value={location} onChangeText={(t) => onChange({ location: t })} placeholder="City, Country" style={styles.input} />
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
  bio: { minHeight: 80, textAlignVertical: 'top' },
  rowEnd: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginLeft: 8 },
  btnGhost: { backgroundColor: '#E5E7EB' },
  btnPrimary: { backgroundColor: '#FF8A00' },
  btnText: { color: '#FFFFFF', fontWeight: '600' },
});

export default ProfileEditModal;


