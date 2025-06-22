import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Button } from './ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { getSoftCardColor } from '../utils/colorUtils';

export const EditMedicationModal = ({ open, onClose, medication, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    selectedTime: 'morning',
    customTime: '',
    showCustomTime: false,
    notes: '',
    pillColor: '#7C3AED'
  });

  // Predefined time slots (matching the add form)
  const timeSlots = [
    { id: 'morning', label: 'Morning, before breakfast', time: '8:00 AM', icon: 'sunny' },
    { id: 'afternoon', label: 'Afternoon', time: '2:00 PM', icon: 'partly-sunny' },
    { id: 'evening', label: 'Evening, before dinner', time: '6:00 PM', icon: 'moon' },
    { id: 'night', label: 'Night, before bed', time: '10:00 PM', icon: 'moon' },
  ];

  // Pill color options
  const pillColors = [
    '#7C3AED', // purple
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#A855F7', // light purple
    '#EC4899', // pink
    '#F97316', // orange
    '#6B7280', // gray
  ];

  // Helper function to determine time slot from time string
  const getTimeSlotFromTime = (timeString) => {
    if (!timeString) return 'morning';
    
    const lowerTime = timeString.toLowerCase();
    if (lowerTime.includes('morning') || lowerTime.includes('8:') || lowerTime.includes('08:')) return 'morning';
    if (lowerTime.includes('afternoon') || lowerTime.includes('2:') || lowerTime.includes('14:')) return 'afternoon';
    if (lowerTime.includes('evening') || lowerTime.includes('6:') || lowerTime.includes('18:')) return 'evening';
    if (lowerTime.includes('night') || lowerTime.includes('10:') || lowerTime.includes('22:')) return 'night';
    
    // If it's a custom time format, enable custom time
    return 'custom';
  };

  // Update form data when medication changes
  useEffect(() => {
    if (medication) {
      const timeSlot = getTimeSlotFromTime(medication.time);
      setFormData({
        name: medication.name || '',
        dosage: medication.dosage || '',
        selectedTime: timeSlot,
        customTime: timeSlot === 'custom' ? medication.time : '',
        showCustomTime: timeSlot === 'custom',
        notes: medication.notes || '',
        pillColor: medication.pillColor || medication.cardColor || '#7C3AED'
      });
    }
  }, [medication]);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.dosage.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Determine the time value based on selection
    let timeValue = '';
    if (formData.selectedTime === 'custom' && formData.customTime) {
      timeValue = formData.customTime.trim();
    } else {
      const selectedSlot = timeSlots.find(slot => slot.id === formData.selectedTime);
      timeValue = selectedSlot ? formData.selectedTime : 'morning';
    }

    const updatedMedication = {
      ...medication,
      name: formData.name.trim(),
      dosage: formData.dosage.trim(),
      time: timeValue,
      notes: formData.notes.trim(),
      pillColor: formData.pillColor,
      cardColor: getSoftCardColor(formData.pillColor)
    };

    onUpdate(updatedMedication);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete "${medication?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onDelete(medication.id);
            onClose();
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Medication</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Medication Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Medication Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter medication name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Dosage */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Dosage <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.dosage}
                onChangeText={(text) => setFormData(prev => ({ ...prev, dosage: text }))}
                placeholder="e.g., 1 tablet, 5mg, 2 capsules"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Pill Color */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Pill Color</Text>
              <View style={styles.colorGrid}>
                {pillColors.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.pillColor === color && styles.selectedColor
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, pillColor: color }))}
                  />
                ))}
              </View>
            </View>

            {/* When to take */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                When do you want to take it? <Text style={styles.required}>*</Text>
              </Text>
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.timeSlotOption,
                    formData.selectedTime === slot.id && styles.selectedTimeSlot
                  ]}
                  onPress={() => setFormData(prev => ({...prev, selectedTime: slot.id, showCustomTime: false}))}
                >
                  <View style={styles.timeSlotContent}>
                    <View style={styles.timeSlotIcon}>
                      <Ionicons name={slot.icon} size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.timeSlotText}>
                      <Text style={styles.timeSlotLabel}>{slot.label}</Text>
                      <Text style={styles.timeSlotTime}>Alarm set for {slot.time}</Text>
                    </View>
                    <View style={[
                      styles.radioButton,
                      formData.selectedTime === slot.id && styles.radioButtonSelected
                    ]}>
                      {formData.selectedTime === slot.id && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              
              {/* Custom Time Option */}
              <TouchableOpacity
                style={styles.addCustomTimeButton}
                onPress={() => setFormData(prev => ({...prev, selectedTime: 'custom', showCustomTime: true}))}
              >
                <Ionicons name="add" size={20} color="#7C3AED" />
                <Text style={styles.addCustomTimeText}>Add custom time</Text>
              </TouchableOpacity>
              
              {formData.showCustomTime && (
                <View style={styles.customTimeContainer}>
                  <Text style={styles.customTimeLabel}>Custom Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={formData.customTime}
                    onChangeText={(text) => setFormData(prev => ({...prev, customTime: text}))}
                    placeholder="e.g., 09:30, after lunch"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Additional notes (optional)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.buttonContainer}>
              <Button onPress={handleSave} style={styles.saveButton}>
                Save Changes
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#374151',
    borderWidth: 3,
  },
  timeSlotOption: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedTimeSlot: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  timeSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  timeSlotIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotText: {
    flex: 1,
  },
  timeSlotLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  timeSlotTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#7C3AED',
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  addCustomTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#7C3AED',
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  addCustomTimeText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '500',
  },
  customTimeContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  customTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  buttonContainer: {
    marginTop: 20,
    paddingBottom: 20,
  },
  saveButton: {
    backgroundColor: '#7C3AED',
  },
}); 