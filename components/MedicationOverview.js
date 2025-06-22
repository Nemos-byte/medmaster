import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Medication card colors for visual variety
const medicationColors = [
  { bg: '#E8F5E8', border: '#4CAF50', icon: '#2E7D32' }, // Green
  { bg: '#E3F2FD', border: '#2196F3', icon: '#1565C0' }, // Blue
  { bg: '#FFF3E0', border: '#FF9800', icon: '#E65100' }, // Orange
  { bg: '#F3E5F5', border: '#9C27B0', icon: '#6A1B9A' }, // Purple
  { bg: '#FFEBEE', border: '#F44336', icon: '#C62828' }, // Red
  { bg: '#E0F2F1', border: '#009688', icon: '#00695C' }, // Teal
  { bg: '#FFF8E1', border: '#FFC107', icon: '#F57F17' }, // Amber
  { bg: '#E8EAF6', border: '#3F51B5', icon: '#283593' }, // Indigo
];

export const MedicationOverview = ({ onBack, medications = [], onAddClick }) => {
  const [processedMedications, setProcessedMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadAndProcessMedications();
  }, [medications]);

  const loadAndProcessMedications = async () => {
    try {
      // If medications prop is provided, use it; otherwise load from AsyncStorage
      let medicationsToProcess = medications;
      
      if (!medications || medications.length === 0) {
        const storedMedications = await AsyncStorage.getItem('medications');
        if (storedMedications) {
          medicationsToProcess = JSON.parse(storedMedications);
        }
      }
      
      if (medicationsToProcess && medicationsToProcess.length > 0) {
        const processed = processMedicationData(medicationsToProcess);
        setProcessedMedications(processed);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMedicationData = (rawMedications) => {
    // Group medications by name to calculate totals
    const medicationGroups = {};
    
    rawMedications.forEach(med => {
      const key = (med.medicineName || med.name || '').toLowerCase();
      if (!medicationGroups[key]) {
        medicationGroups[key] = {
          name: med.medicineName || med.name || 'Unknown',
          dosage: med.dosage || 'Unknown dosage',
          entries: [],
          totalDays: 0,
          completedDays: 0,
          totalPills: 0,
          takenPills: 0,
          startDate: med.startDate || med.date,
          endDate: med.endDate || med.date,
          frequencyPerDay: med.frequencyPerDay || 1,
          durationDays: med.durationDays || 1,
        };
      }
      
      medicationGroups[key].entries.push(med);
      medicationGroups[key].totalDays += 1;
      medicationGroups[key].totalPills += med.frequencyPerDay || 1;
      
      // Count completed medications
      if (med.taken) {
        medicationGroups[key].completedDays += 1;
        medicationGroups[key].takenPills += med.frequencyPerDay || 1;
      }
      
      // Update date range
      const currentStart = new Date(medicationGroups[key].startDate);
      const currentEnd = new Date(medicationGroups[key].endDate);
      const medStart = new Date(med.startDate || med.date);
      const medEnd = new Date(med.endDate || med.date);
      
      if (medStart < currentStart) {
        medicationGroups[key].startDate = med.startDate || med.date;
      }
      if (medEnd > currentEnd) {
        medicationGroups[key].endDate = med.endDate || med.date;
      }
    });

    // Convert to array and add calculated fields
    return Object.values(medicationGroups).map((group, index) => {
      const today = new Date();
      const endDate = new Date(group.endDate);
      const isActive = endDate >= today;
      
      const adherencePercentage = group.totalDays > 0 
        ? Math.round((group.completedDays / group.totalDays) * 100) 
        : 0;
      
      const remainingDays = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
      const remainingPills = Math.max(0, group.totalPills - group.takenPills);
      
      // Extract dosage amount (mg, mcg, etc.)
      const dosageMatch = group.dosage.match(/(\d+)\s*(mg|mcg|g|ml|iu)/i);
      const dosageAmount = dosageMatch ? parseInt(dosageMatch[1]) : 0;
      const dosageUnit = dosageMatch ? dosageMatch[2] : 'mg';
      
      const totalDosageAmount = dosageAmount * group.totalPills;
      const takenDosageAmount = dosageAmount * group.takenPills;
      
      return {
        id: `med-${index}`,
        name: group.name,
        dosage: group.dosage,
        startDate: group.startDate,
        endDate: group.endDate,
        isActive,
        totalDays: group.totalDays,
        completedDays: group.completedDays,
        remainingDays,
        totalPills: group.totalPills,
        takenPills: group.takenPills,
        remainingPills,
        adherencePercentage,
        frequencyPerDay: group.frequencyPerDay,
        dosageAmount: totalDosageAmount,
        takenDosageAmount,
        colorScheme: medicationColors[index % medicationColors.length],
      };
    });
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const formatDate = (date) => {
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      return `${day} ${month}`;
    };
    
    return `${formatDate(start)} — ${formatDate(end)}`;
  };

  const getMedicationIcon = (medicationName) => {
    const name = medicationName.toLowerCase();
    if (name.includes('vitamin') || name.includes('supplement')) {
      return 'nutrition';
    } else if (name.includes('injection') || name.includes('insulin')) {
      return 'medical';
    } else if (name.includes('cream') || name.includes('gel')) {
      return 'hand-left';
    } else {
      return 'medical-outline';
    }
  };

  const handleMedicationPress = async (medication) => {
    // Get detailed medication entries for this medication
    try {
      const storedMedications = await AsyncStorage.getItem('medications');
      if (storedMedications) {
        const allMedications = JSON.parse(storedMedications);
        const medicationEntries = allMedications.filter(med => 
          (med.medicineName || med.name || '').toLowerCase() === medication.name.toLowerCase()
        );
        
        setSelectedMedication({
          ...medication,
          entries: medicationEntries
        });
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error loading medication details:', error);
      setSelectedMedication(medication);
      setShowDetailModal(true);
    }
  };

  const renderMedicationCard = (medication) => {
    const { colorScheme } = medication;
    
    return (
      <TouchableOpacity
        key={medication.id}
        style={[styles.medicationCard, { borderColor: colorScheme.border }]}
        accessibilityLabel={`${medication.name} medication card`}
        accessibilityHint="Tap to view medication details"
        onPress={() => handleMedicationPress(medication)}
        activeOpacity={0.7}
      >
        {/* Header Section with Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.headerTop}>
            <Text style={styles.medicationName} numberOfLines={1}>
              {medication.name}
            </Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: medication.isActive ? '#E8F5E8' : '#F5F5F5' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: medication.isActive ? '#2E7D32' : '#757575' }
              ]}>
                {medication.isActive ? 'ACTIVE' : 'PAST'}
              </Text>
            </View>
          </View>
          <Text style={styles.dateRange}>
            {formatDateRange(medication.startDate, medication.endDate)}
          </Text>
        </View>

        {/* Icon Section */}
        <View style={styles.iconSection}>
          <View style={[styles.iconCircle, { backgroundColor: colorScheme.bg }]}>
            <Ionicons
              name={getMedicationIcon(medication.name)}
              size={28}
              color={colorScheme.icon}
            />
          </View>
        </View>

        {/* Progress Section */}
        <View style={[styles.progressSection, { backgroundColor: colorScheme.bg }]}>
          <Text style={[styles.progressLabel, { color: colorScheme.icon }]}>
            {medication.isActive ? 'Days Remaining' : 'Days Completed'}
          </Text>
          <Text style={[styles.progressValue, { color: colorScheme.icon }]}>
            {medication.isActive 
              ? `${medication.remainingDays}/${medication.totalDays}`
              : `${medication.completedDays}/${medication.totalDays}`
            }
          </Text>
          <Text style={[styles.progressUnit, { color: colorScheme.icon }]}>
            days
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pills</Text>
            <Text style={styles.statValue}>
              {medication.isActive ? medication.remainingPills : medication.takenPills}
              <Text style={styles.statTotal}>/{medication.totalPills}</Text>
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Adherence</Text>
            <Text style={[
              styles.statValue,
              { color: medication.adherencePercentage >= 80 ? '#10B981' : medication.adherencePercentage >= 60 ? '#F59E0B' : '#EF4444' }
            ]}>
              {medication.adherencePercentage}%
            </Text>
          </View>
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <View style={styles.dosageInfo}>
            <Text style={styles.dosageLabel}>Dosage</Text>
            <Text style={styles.dosageValue}>{medication.dosage}</Text>
          </View>
          <View style={styles.frequencyInfo}>
            <Text style={styles.frequencyLabel}>Frequency</Text>
            <Text style={styles.frequencyValue}>{medication.frequencyPerDay}x/day</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.title}>Your medicine cabinet</Text>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading medications...</Text>
          </View>
        </View>
        
        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <View style={styles.navigation}>
            <TouchableOpacity style={styles.navItem} onPress={onBack}>
              <Ionicons name="calendar" size={24} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="medical-outline" size={24} color="#7C3AED" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={onAddClick}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="stats-chart-outline" size={24} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="person-outline" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>Your medicine cabinet</Text>
        </View>

        <View style={styles.subtitle}>
          <Text style={styles.subtitleText}>
            {(() => {
              const filteredCount = processedMedications.filter(med => 
                activeTab === 'active' ? med.isActive : !med.isActive
              ).length;
              return `${filteredCount} ${activeTab} medication${filteredCount !== 1 ? 's' : ''}`;
            })()}
          </Text>
        </View>

        {/* Toggle Buttons */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'active' && styles.activeToggleButton
            ]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[
              styles.toggleButtonText,
              activeTab === 'active' && styles.activeToggleButtonText
            ]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              activeTab === 'past' && styles.activeToggleButton
            ]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[
              styles.toggleButtonText,
              activeTab === 'past' && styles.activeToggleButtonText
            ]}>
              Past
            </Text>
          </TouchableOpacity>
        </View>

        {processedMedications.filter(med => 
          activeTab === 'active' ? med.isActive : !med.isActive
        ).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>
              No {activeTab} medications
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active' 
                ? 'Add medications using the camera or voice recorder'
                : 'Past medications will appear here once they expire'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.medicationGrid}>
            {processedMedications
              .filter(med => activeTab === 'active' ? med.isActive : !med.isActive)
              .map(renderMedicationCard)}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <View style={styles.navigation}>
          <TouchableOpacity style={styles.navItem} onPress={onBack}>
            <Ionicons name="calendar" size={24} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="medical-outline" size={24} color="#7C3AED" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={onAddClick}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="stats-chart-outline" size={24} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="person-outline" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Medication Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedMedication && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity 
                    onPress={() => setShowDetailModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#666666" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>{selectedMedication.name}</Text>
                  <TouchableOpacity style={styles.editButton}>
                    <Ionicons name="create-outline" size={24} color="#7C3AED" />
                  </TouchableOpacity>
                </View>

                {/* Medication Summary */}
                <View style={styles.medicationSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Dosage:</Text>
                    <Text style={styles.summaryValue}>{selectedMedication.dosage}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Frequency:</Text>
                    <Text style={styles.summaryValue}>{selectedMedication.frequencyPerDay}x per day</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Duration:</Text>
                    <Text style={styles.summaryValue}>
                      {formatDateRange(selectedMedication.startDate, selectedMedication.endDate)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Status:</Text>
                    <Text style={[
                      styles.summaryValue,
                      { color: selectedMedication.isActive ? '#10B981' : '#6B7280' }
                    ]}>
                      {selectedMedication.isActive ? 'Active' : 'Completed'}
                    </Text>
                  </View>
                </View>

                {/* Schedule List */}
                <View style={styles.scheduleSection}>
                  <Text style={styles.sectionTitle}>Schedule</Text>
                  <FlatList
                    data={selectedMedication.entries || []}
                    keyExtractor={(item, index) => `${item.id || index}`}
                    renderItem={({ item }) => (
                      <View style={styles.scheduleItem}>
                        <View style={styles.scheduleDate}>
                          <Text style={styles.scheduleDateText}>
                            {new Date(item.startDate || item.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Text>
                        </View>
                        <View style={styles.scheduleDetails}>
                          <Text style={styles.scheduleTime}>
                            {Array.isArray(item.intakeTimes) 
                              ? item.intakeTimes.join(', ') 
                              : item.time || 'Not specified'
                            }
                          </Text>
                          {item.notes && (
                            <Text style={styles.scheduleNotes}>{item.notes}</Text>
                          )}
                        </View>
                        <View style={styles.scheduleStatus}>
                          <View style={[
                            styles.statusDot,
                            { backgroundColor: item.taken ? '#10B981' : '#E5E7EB' }
                          ]} />
                          <Text style={[
                            styles.statusText,
                            { color: item.taken ? '#10B981' : '#6B7280' }
                          ]}>
                            {item.taken ? 'Taken' : 'Pending'}
                          </Text>
                        </View>
                      </View>
                    )}
                    style={styles.scheduleList}
                    showsVerticalScrollIndicator={false}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.editActionButton]}
                    onPress={() => {
                      // TODO: Implement edit functionality
                      Alert.alert('Edit Medication', 'Edit functionality will be implemented here');
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#7C3AED" />
                    <Text style={[styles.actionButtonText, { color: '#7C3AED' }]}>
                      Edit Schedule
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => {
                      Alert.alert(
                        'Delete Medication',
                        `Are you sure you want to delete ${selectedMedication.name}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Delete', 
                            style: 'destructive',
                            onPress: () => {
                              // TODO: Implement delete functionality
                              setShowDetailModal(false);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#F8F9FA',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  subtitle: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  medicationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  medicationCard: {
    width: (width - 48) / 2, // 2 columns with proper spacing
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 320,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  medicationName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 20,
    flex: 1,
    marginRight: 8,
  },
  dateRange: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 8,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressSection: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  progressUnit: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statTotal: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 4,
  },
  dosageInfo: {
    flex: 1,
    alignItems: 'center',
  },
  dosageLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dosageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  frequencyInfo: {
    flex: 1,
    alignItems: 'center',
  },
  frequencyLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  frequencyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#7C3AED',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  activeToggleButtonText: {
    color: '#FFFFFF',
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 34, // Safe area padding for iPhone
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  navItem: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#7C3AED',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: 4,
  },
  medicationSummary: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'right',
  },
  scheduleSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  scheduleList: {
    flex: 1,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
  },
  scheduleDate: {
    width: 80,
    marginRight: 12,
  },
  scheduleDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  scheduleDetails: {
    flex: 1,
    marginRight: 12,
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  scheduleNotes: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
  },
  scheduleStatus: {
    alignItems: 'center',
    minWidth: 60,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  editActionButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#7C3AED',
  },
  deleteActionButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 