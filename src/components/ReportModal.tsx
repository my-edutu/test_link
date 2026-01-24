import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// Report reason types matching backend constants
export const REPORT_REASONS = {
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    INAPPROPRIATE: 'inappropriate',
    OTHER: 'other',
} as const;

export type ReportReason = typeof REPORT_REASONS[keyof typeof REPORT_REASONS];

interface ReportReasonOption {
    value: ReportReason;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
}

const REASON_OPTIONS: ReportReasonOption[] = [
    {
        value: REPORT_REASONS.SPAM,
        label: 'Spam',
        description: 'Unwanted promotional content or repetitive posts',
        icon: 'megaphone-outline',
    },
    {
        value: REPORT_REASONS.HARASSMENT,
        label: 'Harassment',
        description: 'Bullying, threats, or targeted abuse',
        icon: 'warning-outline',
    },
    {
        value: REPORT_REASONS.INAPPROPRIATE,
        label: 'Inappropriate Content',
        description: 'Nudity, violence, or harmful content',
        icon: 'eye-off-outline',
    },
    {
        value: REPORT_REASONS.OTHER,
        label: 'Other',
        description: 'Something else not listed above',
        icon: 'ellipsis-horizontal-outline',
    },
];

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (reason: ReportReason, details?: string) => Promise<void>;
    reportedUserName?: string;
}

const ReportModal: React.FC<Props> = ({
    visible,
    onClose,
    onSubmit,
    reportedUserName = 'this user',
}) => {
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [additionalDetails, setAdditionalDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            Alert.alert('Select Reason', 'Please select a reason for your report.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(selectedReason, additionalDetails.trim() || undefined);
            Alert.alert(
                'Report Submitted',
                'Thank you for your report. Our team will review it shortly.',
                [{ text: 'OK', onPress: handleClose }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedReason(null);
        setAdditionalDetails('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Report {reportedUserName}</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleClose}
                            disabled={isSubmitting}
                        >
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        Why are you reporting this content?
                    </Text>

                    {/* Reason Options */}
                    <View style={styles.reasonsContainer}>
                        {REASON_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.reasonOption,
                                    selectedReason === option.value && styles.reasonOptionSelected,
                                ]}
                                onPress={() => setSelectedReason(option.value)}
                                disabled={isSubmitting}
                            >
                                <View style={styles.reasonIconContainer}>
                                    <Ionicons
                                        name={option.icon}
                                        size={22}
                                        color={selectedReason === option.value ? '#ff6d00' : 'rgba(255,255,255,0.6)'}
                                    />
                                </View>
                                <View style={styles.reasonTextContainer}>
                                    <Text
                                        style={[
                                            styles.reasonLabel,
                                            selectedReason === option.value && styles.reasonLabelSelected,
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                    <Text style={styles.reasonDescription}>{option.description}</Text>
                                </View>
                                {selectedReason === option.value && (
                                    <Ionicons name="checkmark-circle" size={22} color="#ff6d00" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Additional Details */}
                    <View style={styles.detailsContainer}>
                        <Text style={styles.detailsLabel}>Additional Details (Optional)</Text>
                        <TextInput
                            style={styles.detailsInput}
                            placeholder="Provide more context about your report..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            multiline
                            numberOfLines={3}
                            value={additionalDetails}
                            onChangeText={setAdditionalDetails}
                            editable={!isSubmitting}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (!selectedReason || isSubmitting) && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!selectedReason || isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <Ionicons name="flag" size={18} color="#FFF" />
                                <Text style={styles.submitButtonText}>Submit Report</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        Reports are reviewed by our moderation team. Abuse of this feature may result in account restrictions.
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.9,
        maxHeight: '85%',
        backgroundColor: '#1c1022',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    closeButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 16,
    },
    reasonsContainer: {
        marginBottom: 16,
    },
    reasonOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    reasonOptionSelected: {
        backgroundColor: 'rgba(255,109,0,0.1)',
        borderColor: '#ff6d00',
    },
    reasonIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    reasonTextContainer: {
        flex: 1,
    },
    reasonLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 2,
    },
    reasonLabelSelected: {
        color: '#ff6d00',
    },
    reasonDescription: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
    detailsContainer: {
        marginBottom: 16,
    },
    detailsLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    detailsInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        color: '#FFF',
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ff4444',
        paddingVertical: 14,
        borderRadius: 30,
        marginBottom: 12,
        shadowColor: '#ff4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    disclaimer: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
        lineHeight: 16,
    },
});

export default ReportModal;
