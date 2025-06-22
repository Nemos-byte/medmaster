import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

export const ConfirmScheduleModal = ({ visible, prescriptionData, onClose, onConfirm }) => {
  const [medicines, setMedicines] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    // When the modal is shown with new data, update the state
    if (prescriptionData) {
      setMedicines(prescriptionData);
    }
  }, [prescriptionData]);

  const handleUpdate = (index, field, value) => {
    const updatedMedicines = [...medicines];
    updatedMedicines[index][field] = value;
    setMedicines(updatedMedicines);
  };

  const handleRemove = (index) => {
    Alert.alert(
      'Remove Medication',
      'Are you sure you want to remove this medication entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedMedicines = medicines.filter((_, i) => i !== index);
            setMedicines(updatedMedicines);
            setEditingIndex(null);
          }
        }
      ]
    );
  };

  const handleConfirm = () => {
    // Basic validation before confirming
    for (const med of medicines) {
      if (!med.medicineName || !med.dosage) {
        Alert.alert('Missing Information', `Please ensure all medications have a name and dosage.`);
        return;
      }
    }
    onConfirm(medicines);
  };

  // Group medicines by date for better organization
  const groupedByDate = medicines.reduce((groups, med, index) => {
    const date = med.startDate || 'No Date';
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push({ ...med, originalIndex: index });
    return groups;
  }, {});

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'No Date') return 'No Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTimes = (times) => {
    if (Array.isArray(times)) {
      return times.join(', ');
    }
    return times || '';
  };

  // Swipeable Card Component
  const SwipeableCard = ({ children, onSwipeDelete, index }) => {
    const translateX = new Animated.Value(0);
    const cardOpacity = new Animated.Value(1);

    const onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: translateX } }],
      { useNativeDriver: true }
    );

    const onHandlerStateChange = (event) => {
      if (event.nativeEvent.state === State.END) {
        const { translationX, velocityX } = event.nativeEvent;
        
        // If swiped far enough or with enough velocity, delete
        if (translationX < -100 || velocityX < -500) {
          // Animate out
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -400,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start(() => {
            onSwipeDelete(index);
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View 
          style={[
            styles.swipeableContainer,
            {
              transform: [{ translateX }],
              opacity: cardOpacity,
            }
          ]}
        >
          {/* Delete background */}
          <View style={styles.deleteBackground}>
            <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
            <Text style={styles.deleteText}>Delete</Text>
          </View>
          
          {/* Card content */}
          <View style={styles.cardContent}>
            {children}
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const renderCompactCard = (med, index) => {
    const isEditing = editingIndex === index;
    
    if (isEditing) {
      return (
        <View key={index} style={styles.editCard}>
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>Edit Entry #{index + 1}</Text>
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => setEditingIndex(null)}
              >
                <Ionicons name="checkmark" size={18} color="#10B981" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleRemove(index)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.editForm}>
            <View style={styles.editRow}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={med.medicineName || ''}
                  onChangeText={(text) => handleUpdate(index, 'medicineName', text)}
                  placeholder="Medicine name"
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Dosage</Text>
                <TextInput
                  style={styles.editInput}
                  value={med.dosage || ''}
                  onChangeText={(text) => handleUpdate(index, 'dosage', text)}
                  placeholder="Dosage"
                />
              </View>
            </View>
            
            <View style={styles.editRow}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Times</Text>
                <TextInput
                  style={styles.editInput}
                  value={formatTimes(med.intakeTimes)}
                  onChangeText={(text) => handleUpdate(index, 'intakeTimes', text.split(',').map(t => t.trim()))}
                  placeholder="morning, evening"
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Date</Text>
                <TextInput
                  style={styles.editInput}
                  value={med.startDate || ''}
                  onChangeText={(text) => handleUpdate(index, 'startDate', text)}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            
            <View style={styles.editFieldFull}>
              <Text style={styles.editLabel}>Notes</Text>
              <TextInput
                style={[styles.editInput, styles.notesInput]}
                value={med.notes || ''}
                onChangeText={(text) => handleUpdate(index, 'notes', text)}
                placeholder="Special instructions"
                multiline
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <SwipeableCard 
        key={index}
        index={index} 
        onSwipeDelete={handleRemove}
      >
        <TouchableOpacity 
          style={styles.compactCard}
          onPress={() => setEditingIndex(index)}
        >
          <View style={styles.cardMain}>
            <View style={styles.cardHeader}>
              <View style={styles.medicineNameRow}>
                {med.packageColor && (
                  <View style={[styles.colorIndicator, { backgroundColor: med.packageColor }]} />
                )}
                <Text style={styles.medicineName}>{med.medicineName || 'Unknown'}</Text>
              </View>
              <View style={styles.cardBadges}>
                {med.frequencyPerDay && (
                  <View style={styles.frequencyBadge}>
                    <Text style={styles.frequencyText}>{med.frequencyPerDay}x</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.deleteIconSmall}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                >
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.editIcon}
                  onPress={(e) => {
                    e.stopPropagation();
                    setEditingIndex(index);
                  }}
                >
                  <Ionicons name="pencil" size={14} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.cardDetails}>
              <Text style={styles.dosageText}>{med.dosage || 'No dosage'}</Text>
              <Text style={styles.timesText}>{formatTimes(med.intakeTimes) || 'No times'}</Text>
            </View>
            
            {med.notes && (
              <Text style={styles.notesText} numberOfLines={2}>{med.notes}</Text>
            )}
          </View>
        </TouchableOpacity>
      </SwipeableCard>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Schedule</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{medicines.length}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{Object.keys(groupedByDate).length}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{new Set(medicines.map(m => m.medicineName)).size}</Text>
              <Text style={styles.statLabel}>Medicines</Text>
            </View>
          </View>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {Object.keys(groupedByDate).sort().map(date => (
              <View key={date} style={styles.dateSection}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateText}>{formatDate(date)}</Text>
                  <Text style={styles.dateCount}>{groupedByDate[date].length} entries</Text>
                </View>
                
                <View style={styles.cardsGrid}>
                  {groupedByDate[date].map(med => 
                    renderCompactCard(med, med.originalIndex)
                  )}
                </View>
              </View>
            ))}
            
            {medicines.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No medications found</Text>
                <Text style={styles.emptyStateSubtext}>Try scanning again with better lighting</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.confirmButton, medicines.length === 0 && styles.disabledButton]} 
              onPress={handleConfirm}
              disabled={medicines.length === 0}
            >
              <Text style={styles.confirmButtonText}>
                Add {medicines.length} {medicines.length === 1 ? 'Entry' : 'Entries'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '95%',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dateSection: {
    marginBottom: 20,
  },
  dateBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  dateCount: {
    fontSize: 12,
    color: '#6B46C1',
  },
  cardsGrid: {
    gap: 8,
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardMain: {
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medicineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  frequencyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  frequencyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  editIcon: {
    padding: 2,
  },
  deleteIconSmall: {
    padding: 2,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dosageText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  timesText: {
    fontSize: 13,
    color: '#7C3AED',
  },
  notesText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  editCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#0EA5E9',
    marginBottom: 8,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    padding: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
  },
  deleteButton: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  editForm: {
    gap: 12,
  },
  editRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editField: {
    flex: 1,
  },
  editFieldFull: {
    width: '100%',
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Swipe styles
  swipeableContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 10,
    width: 100,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
}); 