import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Modal, TextInput, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';
import { CameraScanner } from './components/CameraScanner';
import { ConfirmScheduleModal } from './components/ConfirmScheduleModal';
import { VoiceSchedulerModal } from './components/VoiceSchedulerModal';
import { EditMedicationModal } from './components/EditMedicationModal';
import { MedicationOverview } from './components/MedicationOverview';
import { NotificationBell } from './components/NotificationBell';
import { NotificationCenter } from './components/NotificationCenter';
import { getSoftCardColor } from './utils/colorUtils';
import { initializeNotifications, notificationService } from './services/notificationService';
import { storageService, initializeStorage, getAllMedications, deleteMedication } from './services/storageService';
import { useMedicationManager } from './hooks/useStorage';
// Sample data is now managed through DataManagement component
import DataManagement from './components/DataManagement';

export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [storageInitialized, setStorageInitialized] = useState(false);
  
  // Use the medication manager hook for data management
  const {
    medications,
    activeMedications,
    loading: medicationsLoading,
    error: medicationsError,
    addMedication,
    updateMedication,
    deleteMedication,
    markDoseTaken,
    markDoseSkipped,
    markDoseMissed,
    refetch: refetchMedications
  } = useMedicationManager();
  const [showManualForm, setShowManualForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    selectedTime: 'morning',
    frequency: 'once_daily',
    notes: '',
    pillColor: '#7C3AED',
    startDate: new Date(), // Default to today
    customTime: '',
    showCustomTime: false,
  });
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scanMode, setScanMode] = useState('package'); // 'package' or 'prescription'
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [scannedPrescription, setScannedPrescription] = useState(null);
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [showMedicationOverview, setShowMedicationOverview] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);

  // Initialize storage and notifications when app loads
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Initialize storage first
        await initializeStorage();
        console.log('✅ Storage initialized successfully');
        
        // Clean up any invalid medications
        await cleanupInvalidMedications();
        
        // Initialize notifications
        await initializeNotifications();
        console.log('✅ Notifications initialized successfully');
        
        setStorageInitialized(true);
        console.log('🎉 App initialization completed');
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        // Still allow the app to work without storage
        setStorageInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Clean up medications with invalid names
  const cleanupInvalidMedications = async () => {
    try {
      const allMedications = await getAllMedications();
      if (!allMedications || allMedications.length === 0) return;
      
      const invalidMedications = allMedications.filter(med => {
        const name = med.name || med.medicineName;
        return !name || name === 'null' || name === 'undefined' || name.trim() === '';
      });
      
      if (invalidMedications.length > 0) {
        console.log(`🧹 Found ${invalidMedications.length} invalid medications, cleaning up...`);
        
        for (const invalidMed of invalidMedications) {
          await deleteMedication(invalidMed.id);
          console.log(`🗑️ Deleted invalid medication: ${invalidMed.id}`);
        }
        
        console.log('✅ Invalid medications cleaned up');
      }
    } catch (error) {
      console.error('❌ Error cleaning up invalid medications:', error);
    }
  };

  // Predefined time slots
  const timeSlots = [
    { id: 'morning', label: 'Morning, before breakfast', time: '8:00 AM', icon: 'sunny' },
    { id: 'afternoon', label: 'Afternoon', time: '2:00 PM', icon: 'partly-sunny' },
    { id: 'evening', label: 'Evening, before dinner', time: '6:00 PM', icon: 'moon' },
    { id: 'night', label: 'Night, before bed', time: '10:00 PM', icon: 'moon' },
  ];

  // Generate date options (today + next 6 days)
  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Frequency options - Enhanced for real medication schedules
  const frequencyOptions = [
    { value: 'once_daily', label: 'Once daily' },
    { value: 'twice_daily', label: 'Twice daily (every 12 hours)' },
    { value: 'three_times_daily', label: '3 times daily (every 8 hours)' },
    { value: 'four_times_daily', label: '4 times daily (every 6 hours)' },
    { value: 'every_other_day', label: 'Every other day' },
    { value: 'weekly', label: 'Once weekly' },
    { value: 'twice_weekly', label: 'Twice weekly' },
    { value: 'monthly', label: 'Once monthly' },
    { value: 'as_needed', label: 'As needed (PRN)' },
    { value: 'with_meals', label: 'With meals (3 times daily)' },
    { value: 'before_meals', label: 'Before meals (3 times daily)' },
    { value: 'at_bedtime', label: 'At bedtime only' },
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

  // Medication management functions
  const toggleMedication = async (id) => {
    try {
      console.log('🔄 Toggling medication:', id);
      
      // Find the medication in the transformed list
      const todayMeds = getMedicationsForDate(selectedDate);
      const medication = todayMeds.find(med => med.id === id);
      
      if (!medication) {
        console.warn('Medication not found:', id);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const scheduledTime = new Date(`${today}T${medication.schedule?.time || '09:00'}:00`).toISOString();

      if (medication.taken) {
        // Mark as not taken - update the medication directly
        await updateMedication(id, { 
          taken: false, 
          takenAt: null,
          lastModified: new Date().toISOString()
        });
        console.log('✅ Medication marked as not taken');
          } else {
        // Mark as taken - record dose and update medication
        await markDoseTaken(id, scheduledTime, 'Marked as taken from daily view');
        await updateMedication(id, { 
          taken: true, 
          takenAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        });
        console.log('✅ Medication marked as taken');
      }

      // Check if all medications for today are completed
      const allCompleted = todayMeds.length > 0 && todayMeds.every(med => 
        med.id === id ? !med.taken : med.taken // Toggle the current one
      );

      // Send achievement notification if all medications completed
      if (allCompleted && !medication.taken) {
        try {
          await notificationService.sendAchievementNotification(
            "All medications taken today! Keep up the great work! 🎉",
            "daily_complete"
          );
        } catch (error) {
          console.error('Error sending achievement notification:', error);
        }
      }

      // Refresh medications
      await refetchMedications();
    } catch (error) {
      console.error('❌ Error toggling medication:', error);
      Alert.alert('Error', 'Failed to update medication. Please try again.');
    }
  };

  const getMedicationsForDate = (date) => {
    const dateString = date.toISOString().split("T")[0];
    
    // Filter medications that are active and scheduled for this date
    const filteredMeds = activeMedications.filter((med) => {
      // Check if medication has a specific date or if it's a daily medication
      if (med.date === dateString) return true;
      
      // Check if it's a daily medication that should appear today
      if (med.schedule?.frequency?.type === 'daily') {
        const startDate = new Date(med.schedule.startDate);
        const endDate = med.schedule.endDate ? new Date(med.schedule.endDate) : null;
        const currentDate = new Date(dateString);
        
        return currentDate >= startDate && (!endDate || currentDate <= endDate);
      }
      
      return false;
    }).sort((a, b) => {
      const timeA = a.time || (a.schedule?.frequency?.specificTimes?.[0] || '09:00');
      const timeB = b.time || (b.schedule?.frequency?.specificTimes?.[0] || '09:00');
      return timeA.localeCompare(timeB);
    });

    // Transform medications to ensure proper UI display format
    return filteredMeds.map(med => {
      // Handle both old and new data structures
      const medicationName = med.name || med.medicineName || 'Unknown medication';
      const medicationDosage = med.dosage || 'Unknown dosage';
      const medicationTime = med.time || (med.schedule?.frequency?.specificTimes?.[0] || '09:00');
      const medicationColor = med.cardColor || med.appearance?.color || '#7C3AED';
      
      // Skip medications with null/invalid names
      if (!medicationName || medicationName === 'null' || medicationName === 'undefined' || medicationName === 'Unknown medication' || medicationName.trim() === '') {
        return null;
      }
      
      return {
        ...med,
        // Ensure we have the required fields for UI display
        id: med.id,
        name: medicationName,
        dosage: medicationDosage,
        time: medicationTime,
        cardColor: medicationColor,
        taken: med.taken || false,
        notes: med.notes || '',
        // Keep original data for storage operations
        originalData: med
      };
    }).filter(Boolean); // Remove null entries
  };

  // Generate week days around selected date
  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  // Navigation functions
  const navigateToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const navigateToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  // Helper functions
  const formatTime = (time) => {
    const [hours, minutes] = (time || '').split(":");

    // If minutes is undefined, it means time was not in HH:MM format
    if (minutes === undefined) {
      return time; // Return the original string, e.g., "morning"
    }

    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "pm" : "am";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
  };

    const weekDays = getWeekDays();

  const getWeekRange = () => {
    const startDate = weekDays[0];
    const endDate = weekDays[6];

    const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
    const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });

    if (startMonth === endMonth) {
      // e.g. "June 15 - 21"
      return `${startDate.toLocaleDateString("en-US", {
        month: "long",
      })} ${startDate.getDate()} - ${endDate.getDate()}`;
    } else {
      // e.g. "Mar 31 - Apr 6"
      const startFormat = startDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endFormat = endDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `${startFormat} - ${endFormat}`;
    }
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayMedications = getMedicationsForDate(selectedDate);

  // Group medications by time
  const medicationsByTime = todayMedications.reduce((groups, med) => {
    const timeSlot = med.time;
    if (!groups[timeSlot]) {
      groups[timeSlot] = [];
    }
    groups[timeSlot].push(med);
    return groups;
  }, {});

  // Calculate completion stats
  const completedCount = todayMedications.filter((med) => med.taken).length;
  const totalCount = todayMedications.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Circular Progress Component
  const CircularProgress = ({ progress, size = 44, strokeWidth = 3 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <Svg width={size} height={size} style={styles.circularProgress}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#10B981"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    );
  };

  // Swipeable Medication Card Component
  const SwipeableMedicationCard = ({ medication, onDelete }) => {
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
            onDelete(medication.id);
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
            styles.swipeableMedicationContainer,
            {
              transform: [{ translateX }],
              opacity: cardOpacity,
            }
          ]}
        >
          {/* Delete background - Orange like in attachment */}
          <View style={styles.medicationDeleteBackground}>
            <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
          </View>
          
          {/* Card content */}
          <View style={[styles.medicationCard, { backgroundColor: medication.cardColor || medication.appearance?.color || '#7C3AED' }]}>
            <View style={styles.medicationContent}>
              <View style={styles.medicationInfo}>
                <View style={styles.medicationDetails}>
                  <Text style={styles.medicationName}>{medication.name || 'Unknown medication'}</Text>
                  <Text style={styles.dosage}>{medication.dosage || 'Unknown dosage'}</Text>
                  {medication.notes && (
                    <Text style={styles.notes}>{medication.notes}</Text>
                  )}
                </View>
              </View>
              <View style={styles.medicationActions}>
                <TouchableOpacity
                  onPress={() => toggleMedication(medication.id)}
                  style={[
                    styles.checkButton,
                    medication.taken && styles.checkedButton,
                  ]}
                >
                  {medication.taken && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.moreButton}
                  onPress={() => handleEditMedication(medication)}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const addNewMedication = async () => {
    if (!formData.name.trim() || !formData.dosage.trim()) {
      alert('Please fill in medication name and dosage');
      return;
    }

    // Handle multiple doses per day based on frequency
    const medications = [];
    const baseDate = selectedDate.toISOString().split('T')[0];
    
    switch (formData.frequency) {
      case 'twice_daily':
        // Morning and evening doses
        medications.push(
          createMedicationObject('08:00', 'Morning dose'),
          createMedicationObject('20:00', 'Evening dose')
        );
        break;
        
      case 'three_times_daily':
      case 'with_meals':
      case 'before_meals':
        // Breakfast, lunch, dinner
        const mealLabel = formData.frequency === 'before_meals' ? 'before' : 'with';
        medications.push(
          createMedicationObject('08:00', `Take ${mealLabel} breakfast`),
          createMedicationObject('13:00', `Take ${mealLabel} lunch`),
          createMedicationObject('19:00', `Take ${mealLabel} dinner`)
        );
        break;
        
      case 'four_times_daily':
        // Every 6 hours
        medications.push(
          createMedicationObject('06:00', 'Morning dose'),
          createMedicationObject('12:00', 'Noon dose'),
          createMedicationObject('18:00', 'Evening dose'),
          createMedicationObject('00:00', 'Bedtime dose')
        );
        break;
        
      case 'at_bedtime':
        medications.push(createMedicationObject('22:00', 'Bedtime dose'));
        break;
        
      default:
        // Single dose - use selected time or custom time
        let timeString = '';
        if (formData.selectedTime === 'custom' && formData.customTime) {
          const [hours, minutes] = formData.customTime.split(':');
          timeString = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        } else {
          const timeSlot = timeSlots.find(slot => slot.id === formData.selectedTime);
          if (timeSlot) {
            if (timeSlot.time.includes('AM')) {
              const hour = timeSlot.time.split(':')[0];
              timeString = hour === '12' ? '00:00' : hour.padStart(2, '0') + ':00';
            } else {
              const hour = parseInt(timeSlot.time.split(':')[0]);
              timeString = hour === 12 ? '12:00' : (hour + 12).toString() + ':00';
            }
          }
        }
        medications.push(createMedicationObject(timeString, ''));
        break;
    }

    // Helper function to create medication object
    function createMedicationObject(time, note) {
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name,
        dosage: formData.dosage,
        time: time,
        taken: false,
        date: baseDate,
        notes: note || formData.notes,
        cardColor: getSoftCardColor(formData.pillColor),
        pillColor: formData.pillColor,
        frequency: formData.frequency,
      };
    }

    // Add all medications to the storage
    try {
      for (const medication of medications) {
        const medicationData = {
          name: medication.name,
          dosage: medication.dosage,
          notes: medication.notes || '',
          schedule: {
            frequency: {
              type: 'daily',
              specificTimes: [medication.time]
            },
            startDate: medication.date,
            endDate: medication.date // Single day entry
          },
          appearance: {
            color: medication.cardColor || '#7C3AED',
            shape: 'round'
          }
        };
        
        await addMedication(medicationData);
      }
      
      // Refresh medications list
      await refetchMedications();
      
      console.log('✅ Added medications to storage successfully');
    } catch (error) {
      console.error('❌ Error adding medications to storage:', error);
    }
    
    // Reset form
    setFormData({
      name: '',
      dosage: '',
      selectedTime: 'morning',
      frequency: 'once_daily', // Changed default
      notes: '',
      pillColor: '#7C3AED',
      startDate: new Date(),
      customTime: '',
      showCustomTime: false,
    });
    
    // Reset dropdown states
    setShowDateDropdown(false);
    setShowFrequencyDropdown(false);
    
    setShowManualForm(false);
    
    const doseCount = medications.length;
    alert(`${doseCount} dose${doseCount > 1 ? 's' : ''} added successfully!`);
  };

  const handleScanComplete = (scannedData) => {
    setShowCameraScanner(false);
    if (!scannedData) {
      Alert.alert('Scan Failed', 'Could not extract any information. Please try again with a clearer image.');
      return;
    }

    // Route based on scan mode and data structure
    if (scanMode === 'prescription' && Array.isArray(scannedData)) {
      // Prescription scan - always show confirmation modal
      setScannedPrescription(scannedData);
      setIsConfirmModalVisible(true);
    } else if (Array.isArray(scannedData) && scannedData.length > 0) {
      // Single package scan with duration-based entries - show confirmation modal
      setScannedPrescription(scannedData);
      setIsConfirmModalVisible(true);
    } else {
      // Legacy single package scan - pre-fill the form
    setFormData(prev => ({
      ...prev,
        name: scannedData.name || scannedData.medicineName || '',
      dosage: scannedData.dosage || '',
        notes: scannedData.quantity ? `Quantity: ${scannedData.quantity}` : (scannedData.notes || ''),
        pillColor: scannedData.packageColor || prev.pillColor,
    }));
    setShowManualForm(true);
    }
  };

  const handleConfirmAndAdd = async (confirmedMedicines) => {
    try {
      console.log('📝 Adding confirmed medications to storage:', confirmedMedicines.length);
      let addedCount = 0;

      for (const med of confirmedMedicines) {
        try {
          // Check if this is already an individual daily entry
          const isAlreadyDailyEntry = med.notes && med.notes.includes("Day ") && med.notes.includes(" of ");
          
          if (isAlreadyDailyEntry) {
            // This is already a daily entry, add it directly
            const medicationName = med.medicineName || med.name;
            if (!medicationName || medicationName === 'null' || medicationName === 'undefined' || medicationName.trim() === '') {
              console.warn('❌ Skipping medication with invalid name:', med);
              continue;
            }
            
            const medicationData = {
              name: medicationName,
              dosage: med.dosage || '1 dose', // <-- FIX: Added fallback
              notes: med.notes || '',
              schedule: {
                frequency: {
                  type: 'daily',
                  specificTimes: med.intakeTimes || ['morning']
                },
                startDate: med.startDate,
                endDate: med.startDate // Single day entry
              },
              appearance: {
                color: med.packageColor || '#7C3AED',
                shape: 'round'
              }
            };
            
            await addMedication(medicationData);
            addedCount++;
          } else {
            // This is a summary entry, add as a multi-day medication
            let startDate = new Date();
            
            // Try to use the medication's start date
            if (med.startDate) {
              const testDate = new Date(med.startDate);
              if (!isNaN(testDate.getTime())) {
                startDate = testDate;
              }
            }
            
            // Calculate end date
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + (med.durationDays || 1) - 1);
            
            const medicationName = med.medicineName || med.name;
            if (!medicationName || medicationName === 'null' || medicationName === 'undefined' || medicationName.trim() === '') {
              console.warn('❌ Skipping medication with invalid name:', med);
              continue;
            }
            
            const medicationData = {
              name: medicationName,
              dosage: med.dosage || '1 dose', // <-- FIX: Added fallback
              notes: med.notes || '',
              schedule: {
                frequency: {
                  type: 'daily',
                  specificTimes: med.intakeTimes || ['morning']
                },
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
              },
              appearance: {
                color: med.packageColor || '#7C3AED',
                shape: 'round'
              }
            };
            
            await addMedication(medicationData);
            addedCount++;
          }
        } catch (error) {
          console.error('Error adding individual medication:', error);
        }
      }
      
      // Refresh medications list
      await refetchMedications();
      
      setIsConfirmModalVisible(false);
      setScannedPrescription(null);
      
      Alert.alert('Success', `${addedCount} medication${addedCount === 1 ? '' : 's'} added to your schedule!`);
      
      console.log('✅ Successfully added medications to storage');
    } catch (error) {
      console.error('❌ Error adding confirmed medications:', error);
      Alert.alert('Error', 'Failed to add medications. Please try again.');
    }
  };

  const handleVoiceSchedule = (data) => {
    setIsVoiceModalVisible(false);
    if (data && data.length > 0) {
      setScannedPrescription(data);
      setIsConfirmModalVisible(true);
    } else {
      Alert.alert('Scheduling Failed', 'Could not extract a valid schedule from your voice. Please try again.');
    }
  };

  // Edit medication functions
  const handleEditMedication = (medication) => {
    setSelectedMedication(medication);
    setIsEditModalVisible(true);
  };

  const handleUpdateMedication = async (updatedMedication) => {
    try {
      if (!updatedMedication || !updatedMedication.id) {
        Alert.alert('Error', 'Invalid medication data provided for update.');
        return;
      }
      
      const { id, ...updates } = updatedMedication;
      
      await updateMedication(id, updates);
      
      // Close the modal and refresh the list
      setIsEditModalVisible(false);
      await refetchMedications();
      
      Alert.alert('Success', 'Medication updated successfully!');
    } catch (error) {
      console.error('Error updating medication:', error);
      Alert.alert('Error', 'Failed to update medication');
    }
  };

  const handleDeleteMedication = async (medicationId) => {
    try {
      // Cancel notifications for this medication
      await notificationService.cancelNotificationsForMedication(medicationId);
      console.log('🗑️ Cancelled notifications for deleted medication');
      
      // Delete from storage
      await deleteMedication(medicationId);
      Alert.alert('Success', 'Medication deleted successfully!');
    } catch (error) {
      console.error('Error deleting medication:', error);
      Alert.alert('Error', 'Failed to delete medication');
    }
  };

  // Show medication overview if requested
  if (showMedicationOverview) {
  return (
      <MedicationOverview 
        medications={medications}
        onBack={() => setShowMedicationOverview(false)}
        onAddClick={() => {
          setShowMedicationOverview(false);
          setShowAddModal(true);
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E5E7EB" />
      <LinearGradient colors={['#E5E7EB', '#F3F4F6']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topNav}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.topNavRight}>
              <NotificationBell 
                onPress={() => setShowNotificationCenter(true)}
                style={styles.iconButton}
              />
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => setShowDataManagement(true)}
              >
                <Ionicons name="server-outline" size={24} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="settings-outline" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>SJ</Text>
              </View>
              <View style={styles.welcomeText}>
                <Text style={styles.welcomeTitle}>Hello, Sarah</Text>
                <Text style={styles.welcomeSubtitle}>Let's manage your medications today</Text>
              </View>
            </View>
          </View>

          {/* Date Header */}
          <View style={styles.dateSection}>
            <View style={styles.weekNavigation}>
              <Text style={styles.weekRange}>{getWeekRange()}</Text>
              <View style={styles.navButtons}>
                <TouchableOpacity onPress={navigateToPreviousWeek} style={styles.navButton}>
                  <Ionicons name="chevron-back" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={navigateToNextWeek} style={styles.navButton}>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekly Calendar */}
            <View style={styles.weekCalendar}>
              {weekDays.map((date, index) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const isToday = date.toDateString() === new Date().toDateString();
                const dayMedications = getMedicationsForDate(date);
                const dayCompletedCount = dayMedications.filter((med) => med.taken).length;
                const dayTotalCount = dayMedications.length;
                const dayProgress = dayTotalCount > 0 ? (dayCompletedCount / dayTotalCount) * 100 : 0;

                return (
                  <View key={index} style={styles.dayColumn}>
                    <Text style={styles.dayLabel}>{dayNames[index]}</Text>
                    <View style={styles.dayButtonContainer}>
                      {/* Circular Progress Background */}
                      {dayTotalCount > 0 && (
                        <View style={styles.progressContainer}>
                          <CircularProgress progress={dayProgress} size={52} strokeWidth={3} />
                        </View>
                      )}
                      {/* Day Button */}
                    <TouchableOpacity
                      style={[
                        styles.dayButton,
                          dayTotalCount > 0 && !isSelected && styles.dayButtonWithProgress,
                          isToday && !isSelected && styles.todayDay,
                        isSelected && styles.selectedDay,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                            isToday && !isSelected && styles.todayDayText,
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      {isSelected && <View style={styles.selectedDot} />}
                    </TouchableOpacity>
                    </View>
                    {/* Today label */}
                    {isToday && (
                      <Text style={[
                        styles.todayLabel,
                        isSelected && styles.todayLabelSelected
                      ]}>today</Text>
                    )}
                    {dayTotalCount > 0 && (
                      <Text style={styles.dayCount}>
                        {dayCompletedCount}/{dayTotalCount}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Progress Section - Simplified */}
            <View style={styles.progressSection}>
              <View style={styles.simpleProgress}>
                <Text style={styles.progressSummary}>
                  {completedCount} of {totalCount} medications taken today
                </Text>
                {totalCount > 0 && (
                  <View style={styles.simpleProgressBar}>
                    <View style={[styles.simpleProgressFill, { width: `${completionPercentage}%` }]} />
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            {/* Timeline */}
            {Object.keys(medicationsByTime).length > 0 ? (
              <View style={styles.timeline}>
                {Object.keys(medicationsByTime)
                  .sort((a, b) => {
                    // Define time order for proper chronological sorting
                    const timeOrder = {
                      'morning': 1,
                      'afternoon': 2, 
                      'evening': 3,
                      'night': 4
                    };
                    
                    // Handle HH:MM format times
                    const timeA = timeOrder[a] || parseInt(a.split(':')[0]) || 99;
                    const timeB = timeOrder[b] || parseInt(b.split(':')[0]) || 99;
                    
                    return timeA - timeB;
                  })
                  .map((timeSlot) => (
                    <View key={timeSlot} style={styles.timeSlot}>
                      <View style={styles.timeSlotHeader}>
                        <View style={styles.timeBadge}>
                          <Text style={styles.timeText}>{formatTime(timeSlot)}</Text>
                        </View>
                        <View style={styles.medications}>
                          {medicationsByTime[timeSlot].map((medication) => (
                            <SwipeableMedicationCard 
                              key={medication.id}
                              medication={medication}
                              onDelete={handleDeleteMedication}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  ))}

                {/* Add More Section */}
                <View style={styles.timeSlot}>
                  <View style={styles.timeSlotHeader}>
                    <View style={[styles.timeBadge, styles.addTimeBadge]}>
                      <Text style={[styles.timeText, styles.addTimeText]}>Add more</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.addMedicationButton}
                      onPress={() => setShowAddModal(true)}
                    >
                      <Ionicons name="add" size={20} color="#6B7280" />
                      <Text style={styles.addMedicationText}>Add medication</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="medical-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>No medications scheduled</Text>
                <Text style={styles.emptyStateSubtitle}>Add your first medication for this day</Text>
                <TouchableOpacity 
                  style={styles.addMedicationButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Ionicons name="add" size={20} color="#8B5CF6" />
                  <Text style={styles.addMedicationButtonText}>Add medication</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <View style={styles.navigation}>
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="calendar" size={24} color="#7C3AED" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => setShowMedicationOverview(true)}
            >
              <Ionicons name="medical-outline" size={24} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
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

        {/* Add Medication Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1}
              onPress={() => setShowAddModal(false)}
            />
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Medication</Text>
                <TouchableOpacity 
                  onPress={() => setShowAddModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>Choose how you'd like to add your medication</Text>
              
              <View style={styles.optionsContainer}>
                {/* Camera Capture Option */}
                <TouchableOpacity 
                  style={[styles.optionCard, styles.cameraOption]}
                  onPress={() => {
                    setScanMode('package');
                    setShowAddModal(false);
                    setShowCameraScanner(true);
                  }}
                >
                  <View style={styles.optionContent}>
                    <View style={[styles.optionIcon, styles.cameraIcon]}>
                      <Ionicons name="medkit-outline" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>Scan Package</Text>
                      <Text style={styles.optionDescription}>Scan a single medicine box</Text>
                    </View>
                    <View style={styles.radioButton}>
                      <View style={styles.radioButtonInner} />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Prescription Scan Option */}
                <TouchableOpacity 
                  style={[styles.optionCard, {backgroundColor: '#10B981'}]}
                  onPress={() => {
                    setScanMode('prescription');
                    setShowAddModal(false);
                    setShowCameraScanner(true);
                  }}
                >
                  <View style={styles.optionContent}>
                    <View style={[styles.optionIcon, {backgroundColor: '#059669'}]}>
                      <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>Scan Prescription</Text>
                      <Text style={styles.optionDescription}>Scan a full prescription document</Text>
                    </View>
                    <View style={styles.radioButton}>
                      <View style={styles.radioButtonInner} />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Voice Input Option */}
                <TouchableOpacity 
                  style={[styles.optionCard, styles.voiceOption]}
                  onPress={() => {
                    setShowAddModal(false);
                    setIsVoiceModalVisible(true);
                  }}
                >
                  <View style={styles.optionContent}>
                    <View style={[styles.optionIcon, styles.voiceIcon]}>
                      <Ionicons name="mic-outline" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>Voice Input</Text>
                      <Text style={styles.optionDescription}>Schedule using your voice</Text>
                    </View>
                    <View style={styles.radioButton}><View style={styles.radioButtonInner} /></View>
                  </View>
                </TouchableOpacity>

                                 {/* Manual Input Option */}
                 <TouchableOpacity 
                   style={[styles.optionCard, styles.manualOption]}
                   onPress={() => {
                     setShowAddModal(false);
                     setShowManualForm(true);
                   }}
                 >
                  <View style={styles.optionContent}>
                    <View style={[styles.optionIcon, styles.manualIcon]}>
                      <Ionicons name="create" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>Manual Input</Text>
                      <Text style={styles.optionDescription}>Enter medication details manually</Text>
                    </View>
                    <View style={styles.radioButton}>
                      <View style={styles.radioButtonInner} />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
                     </View>
         </Modal>

         {/* Manual Input Form Modal */}
         <Modal
           visible={showManualForm}
           transparent={true}
           animationType="slide"
           onRequestClose={() => setShowManualForm(false)}
         >
           <View style={styles.formModalOverlay}>
             <View style={styles.formModalContainer}>
               {/* Header */}
               <View style={styles.formHeader}>
                 <TouchableOpacity 
                   onPress={() => {
                     setShowManualForm(false);
                     setShowDateDropdown(false);
                     setShowFrequencyDropdown(false);
                   }}
                   style={styles.backButton}
                 >
                   <Ionicons name="arrow-back" size={24} color="#374151" />
                 </TouchableOpacity>
                 <Text style={styles.formTitle}>Add New Medication</Text>
                 <View style={styles.headerSpacer} />
               </View>

               <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                 {/* Medication Name */}
                 <View style={styles.formGroup}>
                   <Text style={styles.formLabel}>
                     Medication Name <Text style={styles.required}>*</Text>
                   </Text>
                   <TextInput
                     style={styles.textInput}
                     placeholder="Enter medication name"
                     value={formData.name}
                     onChangeText={(text) => setFormData(prev => ({...prev, name: text}))}
                   />
                 </View>

                 {/* Dosage */}
                 <View style={styles.formGroup}>
                   <Text style={styles.formLabel}>
                     Dosage <Text style={styles.required}>*</Text>
                   </Text>
                   <TextInput
                     style={styles.textInput}
                     placeholder="e.g., 1 tablet, 5mg, 2 capsules"
                     value={formData.dosage}
                     onChangeText={(text) => setFormData(prev => ({...prev, dosage: text}))}
                   />
                 </View>

                 {/* Pill Color */}
                 <View style={styles.formGroup}>
                   <Text style={styles.formLabel}>Pill Color</Text>
                   <View style={styles.colorGrid}>
                     {pillColors.map((color, index) => (
                       <TouchableOpacity
                         key={index}
                         style={[
                           styles.colorOption,
                           { backgroundColor: color },
                           formData.pillColor === color && styles.selectedColor
                         ]}
                         onPress={() => setFormData(prev => ({...prev, pillColor: color}))}
                       />
                     ))}
                   </View>
                 </View>

                 {/* When to take - Only show for single dose frequencies */}
                 {!['twice_daily', 'three_times_daily', 'four_times_daily', 'with_meals', 'before_meals', 'at_bedtime'].includes(formData.frequency) && (
                   <View style={styles.formGroup}>
                     <Text style={styles.formLabel}>
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
                     {formData.showCustomTime && (
                       <View style={styles.customTimeContainer}>
                         <Text style={styles.customTimeLabel}>Custom Time</Text>
                         <TextInput
                           style={styles.timeInput}
                           placeholder="HH:MM (e.g., 14:30)"
                           value={formData.customTime}
                           onChangeText={(text) => setFormData(prev => ({...prev, customTime: text, selectedTime: 'custom'}))}
                           keyboardType="numeric"
                         />
                       </View>
                     )}
                     
                     {/* Add Custom Time Button */}
                     <TouchableOpacity 
                       style={styles.addCustomTimeButton}
                       onPress={() => setFormData(prev => ({...prev, showCustomTime: !prev.showCustomTime}))}
                     >
                       <Ionicons name="add" size={20} color="#7C3AED" />
                       <Text style={styles.addCustomTimeText}>
                         {formData.showCustomTime ? 'Cancel Custom Time' : 'Add Custom Time'}
                       </Text>
                     </TouchableOpacity>
                   </View>
                 )}

                 {/* Frequency Info Display - Show what times will be scheduled */}
                 {['twice_daily', 'three_times_daily', 'four_times_daily', 'with_meals', 'before_meals', 'at_bedtime'].includes(formData.frequency) && (
                   <View style={styles.formGroup}>
                     <Text style={styles.formLabel}>Scheduled Times</Text>
                     <View style={styles.scheduledTimesContainer}>
                       {formData.frequency === 'twice_daily' && (
                         <>
                           <View style={styles.scheduledTime}>
                             <Ionicons name="time-outline" size={16} color="#7C3AED" />
                             <Text style={styles.scheduledTimeText}>8:00 AM - Morning dose</Text>
                           </View>
                           <View style={styles.scheduledTime}>
                             <Ionicons name="time-outline" size={16} color="#7C3AED" />
                             <Text style={styles.scheduledTimeText}>8:00 PM - Evening dose</Text>
                           </View>
                         </>
                       )}
                       {(formData.frequency === 'three_times_daily' || formData.frequency === 'with_meals' || formData.frequency === 'before_meals') && (
                         <>
                           <View style={styles.scheduledTime}>
                             <Ionicons name="time-outline" size={16} color="#7C3AED" />
                             <Text style={styles.scheduledTimeText}>8:00 AM - {formData.frequency === 'before_meals' ? 'Before' : 'With'} breakfast</Text>
                           </View>
                           <View style={styles.scheduledTime}>
                             <Ionicons name="time-outline" size={16} color="#7C3AED" />
                             <Text style={styles.scheduledTimeText}>1:00 PM - {formData.frequency === 'before_meals' ? 'Before' : 'With'} lunch</Text>
                           </View>
                           <View style={styles.scheduledTime}>
                             <Ionicons name="time-outline" size={16} color="#7C3AED" />
                             <Text style={styles.scheduledTimeText}>7:00 PM - {formData.frequency === 'before_meals' ? 'Before' : 'With'} dinner</Text>
                           </View>
                         </>
                       )}
                       {formData.frequency === 'four_times_daily' && (
                         <>
                           <View style={styles.scheduledTime}>
                             <Ionicons name="time-outline" size={16} color="#7C3AED" />
                             <Text style={styles.scheduledTimeText}>6:00 AM - Morning dose</Text>
                           </View>
                           <View style={styles.scheduledTime}>
                             <Ionicons name="time-outline" size={16} color="#7C3AED" />
                             <Text style={styles.scheduledTimeText}>12:00 PM - Noon dose</Text>
                           </View>
                           <View style={styles.scheduledTime}>
                             <Ionicons name="time-outline" size={16} color="#7C3AED" />
                             <Text style={styles.scheduledTimeText}>6:00 PM - Evening dose</Text>
                           </View>
                           <View style={styles.scheduledTime}>
                             <Ionicons name="time-outline" size={16} color="#7C3AED" />
                             <Text style={styles.scheduledTimeText}>12:00 AM - Bedtime dose</Text>
                           </View>
                         </>
                       )}
                       {formData.frequency === 'at_bedtime' && (
                         <View style={styles.scheduledTime}>
                           <Ionicons name="time-outline" size={16} color="#7C3AED" />
                           <Text style={styles.scheduledTimeText}>10:00 PM - Bedtime dose</Text>
                         </View>
                       )}
                     </View>
                   </View>
                 )}

                 {/* Start Date */}
                 <View style={styles.formGroup}>
                   <Text style={styles.formLabel}>Start Date</Text>
                   <TouchableOpacity 
                     style={styles.dateButton}
                     onPress={() => {
                       setShowDateDropdown(!showDateDropdown);
                       setShowFrequencyDropdown(false); // Close other dropdown
                     }}
                   >
                     <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                     <Text style={styles.dateButtonText}>
                      {selectedDate.toLocaleDateString('en-US', { 
                         weekday: 'long', 
                         month: 'long', 
                         day: 'numeric' 
                       })}
                     </Text>
                     <Ionicons 
                       name={showDateDropdown ? "chevron-up" : "chevron-down"} 
                       size={20} 
                       color="#6B7280" 
                     />
                   </TouchableOpacity>
                   
                   {/* Date Dropdown Options */}
                   {showDateDropdown && (
                     <View style={styles.dropdownOptions}>
                       {getDateOptions().map((date, index) => (
                         <TouchableOpacity
                           key={index}
                           style={[
                             styles.dropdownOption,
                            date.toDateString() === selectedDate.toDateString() && styles.selectedDropdownOption
                           ]}
                           onPress={() => {
                            setSelectedDate(date);
                             setShowDateDropdown(false);
                           }}
                         >
                           <Text style={[
                             styles.dropdownOptionText,
                            date.toDateString() === selectedDate.toDateString() && styles.selectedDropdownOptionText
                           ]}>
                             {date.toLocaleDateString('en-US', { 
                               weekday: 'long', 
                               month: 'long', 
                               day: 'numeric' 
                             })}
                             {index === 0 && ' (Today)'}
                             {index === 1 && ' (Tomorrow)'}
                           </Text>
                         </TouchableOpacity>
                       ))}
                     </View>
                   )}
                 </View>

                 {/* How often */}
                 <View style={styles.formGroup}>
                   <Text style={styles.formLabel}>How often?</Text>
                   <TouchableOpacity 
                     style={styles.dropdown}
                     onPress={() => {
                       setShowFrequencyDropdown(!showFrequencyDropdown);
                       setShowDateDropdown(false); // Close other dropdown
                     }}
                   >
                     <Text style={styles.dropdownText}>
                       {frequencyOptions.find(opt => opt.value === formData.frequency)?.label}
                     </Text>
                     <Ionicons 
                       name={showFrequencyDropdown ? "chevron-up" : "chevron-down"} 
                       size={20} 
                       color="#6B7280" 
                     />
                   </TouchableOpacity>
                   
                   {/* Frequency Dropdown Options */}
                   {showFrequencyDropdown && (
                     <View style={styles.dropdownOptions}>
                       {frequencyOptions.map((option, index) => (
                         <TouchableOpacity
                           key={index}
                           style={[
                             styles.dropdownOption,
                             option.value === formData.frequency && styles.selectedDropdownOption
                           ]}
                           onPress={() => {
                             setFormData(prev => ({...prev, frequency: option.value}));
                             setShowFrequencyDropdown(false);
                           }}
                         >
                           <Text style={[
                             styles.dropdownOptionText,
                             option.value === formData.frequency && styles.selectedDropdownOptionText
                           ]}>
                             {option.label}
                           </Text>
                         </TouchableOpacity>
                       ))}
                     </View>
                   )}
                 </View>

                 {/* Notes */}
                 <View style={styles.formGroup}>
                   <Text style={styles.formLabel}>Notes (Optional)</Text>
                   <TextInput
                     style={[styles.textInput, styles.notesInput]}
                     placeholder="Any additional notes (e.g., take with food, side effects to watch for...)"
                     value={formData.notes}
                     onChangeText={(text) => setFormData(prev => ({...prev, notes: text}))}
                     multiline
                     numberOfLines={3}
                   />
                 </View>
               </ScrollView>

               {/* Bottom Buttons */}
               <View style={styles.formButtons}>
                 <TouchableOpacity 
                   style={styles.cancelButton}
                   onPress={() => {
                     setShowManualForm(false);
                     setShowDateDropdown(false);
                     setShowFrequencyDropdown(false);
                   }}
                 >
                   <Text style={styles.cancelButtonText}>Back</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={styles.submitButton}
                   onPress={addNewMedication}
                 >
                   <Text style={styles.submitButtonText}>Add Medication</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </Modal>

         {/* Camera Scanner Modal */}
         <Modal
           visible={showCameraScanner}
           animationType="slide"
           onRequestClose={() => setShowCameraScanner(false)}
         >
           <CameraScanner 
             onClose={() => setShowCameraScanner(false)}
            onScanComplete={handleScanComplete}
            scanMode={scanMode}
           />
         </Modal>

        <ConfirmScheduleModal
          visible={isConfirmModalVisible}
          prescriptionData={scannedPrescription}
          onClose={() => setIsConfirmModalVisible(false)}
          onConfirm={handleConfirmAndAdd}
        />

        <VoiceSchedulerModal
          visible={isVoiceModalVisible}
          onClose={() => setIsVoiceModalVisible(false)}
          onSchedule={handleVoiceSchedule}
        />

        <EditMedicationModal
          open={isEditModalVisible}
          onClose={() => setIsEditModalVisible(false)}
          medication={selectedMedication}
          onUpdate={handleUpdateMedication}
          onDelete={handleDeleteMedication}
        />

        <NotificationCenter
          visible={showNotificationCenter}
          onClose={() => setShowNotificationCenter(false)}
        />

        <DataManagement
          visible={showDataManagement}
          onClose={() => setShowDataManagement(false)}
        />
      </LinearGradient>
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
  },
  topNavRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  dateSection: {
    marginBottom: 20,
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  weekRange: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 12,
  },
   dayButtonContainer: {
     position: 'relative',
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 8,
   },
   progressContainer: {
     position: 'absolute',
     top: 0,
     left: 0,
     right: 0,
     bottom: 0,
     alignItems: 'center',
     justifyContent: 'center',
   },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
     zIndex: 1,
     transition: 'transform 0.2s',
   },
   dayButtonWithProgress: {
     backgroundColor: 'rgba(255, 255, 255, 0.9)',
   },
  todayDay: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)', // Light purple background for today
    borderWidth: 2,
    borderColor: '#7C3AED', // Purple border to make it more prominent
  },
  selectedDay: {
    backgroundColor: '#7C3AED', // Solid purple for selected day
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  todayDayText: {
    color: '#7C3AED', // Purple text for today
    fontWeight: '700', // Slightly bolder
  },
  selectedDayText: {
    color: '#FFFFFF', // White text for selected day for better contrast
    fontWeight: '700',
  },
  todayLabel: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  todayLabelSelected: {
    color: '#7C3AED', // Keep purple even when selected to distinguish from regular selected days
  },
  selectedDot: {
    width: 6,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    position: 'absolute',
    bottom: 6,
  },
  dayCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressSection: {
    marginBottom: 20,
  },
  simpleProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressSummary: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  simpleProgressBar: {
    height: 8,
    backgroundColor: '#D1D5DB',
    borderRadius: 4,
    marginTop: 8,
  },
  simpleProgressFill: {
    height: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for bottom navigation
  },
  timeline: {
    gap: 20,
  },
  timeSlot: {
    gap: 12,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  timeBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  addTimeBadge: {
    backgroundColor: '#9CA3AF',
  },
  addTimeText: {
    color: '#FFFFFF',
  },
  medications: {
    flex: 1,
    gap: 12,
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationDetails: {
    flex: 1,
  },
  dosage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  medicationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: '#6B7280',
  },
  medicationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkedButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  moreButton: {
    padding: 4,
  },
  addMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  addMedicationText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#7C3AED', // purple-600
    borderRadius: 25,
    width: 50,
    height: 50,
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
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  addMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  addMedicationButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 20, // Safe area for home indicator
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
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cameraOption: {
    backgroundColor: '#EFF6FF', // blue-50
  },
  voiceOption: {
    backgroundColor: '#F0FDF4', // green-50
  },
  manualOption: {
    backgroundColor: '#F3E8FF', // purple-50
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    backgroundColor: '#3B82F6', // blue-500
  },
  voiceIcon: {
    backgroundColor: '#10B981', // green-500
  },
  manualIcon: {
    backgroundColor: '#7C3AED', // purple-600
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
     radioButtonInner: {
     width: 8,
     height: 8,
     borderRadius: 4,
     backgroundColor: 'transparent',
   },
   
   // Form Modal Styles
   formModalOverlay: {
     flex: 1,
     backgroundColor: 'rgba(0, 0, 0, 0.5)',
   },
   formModalContainer: {
     flex: 1,
     backgroundColor: '#FFFFFF',
     marginTop: 50,
     borderTopLeftRadius: 20,
     borderTopRightRadius: 20,
   },
   formHeader: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     paddingHorizontal: 20,
     paddingVertical: 16,
     borderBottomWidth: 1,
     borderBottomColor: '#E5E7EB',
   },
   backButton: {
     padding: 4,
   },
   formTitle: {
     fontSize: 20,
     fontWeight: 'bold',
     color: '#111827',
   },
   headerSpacer: {
     width: 32,
   },
   formContent: {
     flex: 1,
     paddingHorizontal: 20,
     paddingTop: 20,
   },
   formGroup: {
     marginBottom: 24,
   },
   formLabel: {
     fontSize: 16,
     fontWeight: '600',
     color: '#374151',
     marginBottom: 8,
   },
   required: {
     color: '#EF4444',
   },
   textInput: {
     borderWidth: 1,
     borderColor: '#D1D5DB',
     borderRadius: 12,
     paddingHorizontal: 16,
     paddingVertical: 12,
     fontSize: 16,
     color: '#111827',
     backgroundColor: '#FFFFFF',
   },
   notesInput: {
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
     borderWidth: 3,
     borderColor: 'transparent',
   },
   selectedColor: {
     borderColor: '#374151',
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
   radioButtonSelected: {
     borderColor: '#7C3AED',
     backgroundColor: '#7C3AED',
   },
   formButtons: {
     flexDirection: 'row',
     paddingHorizontal: 20,
     paddingVertical: 20,
     gap: 12,
     borderTopWidth: 1,
     borderTopColor: '#E5E7EB',
   },
   cancelButton: {
     flex: 1,
     paddingVertical: 16,
     borderRadius: 12,
     borderWidth: 1,
     borderColor: '#D1D5DB',
     alignItems: 'center',
     backgroundColor: '#FFFFFF',
   },
   cancelButtonText: {
     fontSize: 16,
     fontWeight: '600',
     color: '#374151',
   },
   submitButton: {
     flex: 2,
     paddingVertical: 16,
     borderRadius: 12,
     alignItems: 'center',
     backgroundColor: '#7C3AED',
   },
   submitButtonText: {
     fontSize: 16,
     fontWeight: '600',
     color: '#FFFFFF',
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
   dateButton: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingVertical: 12,
     paddingHorizontal: 16,
     borderWidth: 1,
     borderColor: '#D1D5DB',
     borderRadius: 12,
     backgroundColor: '#FFFFFF',
     gap: 12,
   },
   dateButtonText: {
     flex: 1,
     fontSize: 16,
     color: '#111827',
   },
   dropdown: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     paddingVertical: 12,
     paddingHorizontal: 16,
     borderWidth: 1,
     borderColor: '#D1D5DB',
     borderRadius: 12,
     backgroundColor: '#FFFFFF',
   },
   dropdownText: {
     fontSize: 16,
     color: '#111827',
   },
   dropdownOptions: {
     marginTop: 4,
     backgroundColor: '#FFFFFF',
     borderWidth: 1,
     borderColor: '#D1D5DB',
     borderRadius: 12,
     shadowColor: '#000000',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.1,
     shadowRadius: 4,
     elevation: 3,
   },
   dropdownOption: {
     paddingVertical: 12,
     paddingHorizontal: 16,
     borderBottomWidth: 1,
     borderBottomColor: '#F3F4F6',
   },
   selectedDropdownOption: {
     backgroundColor: '#F3E8FF',
   },
   dropdownOptionText: {
     fontSize: 16,
     color: '#111827',
   },
   selectedDropdownOptionText: {
     color: '#7C3AED',
     fontWeight: '600',
   },
   scheduledTimesContainer: {
     backgroundColor: '#F3E8FF',
     borderRadius: 12,
     padding: 16,
     gap: 8,
   },
   scheduledTime: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8,
   },
   scheduledTimeText: {
     fontSize: 14,
     color: '#374151',
   },
   disabledOption: {
     opacity: 0.6,
   },
   // Circular progress styles
   circularProgress: {
     position: 'absolute',
   },
   // Swipeable medication card styles
   swipeableMedicationContainer: {
     position: 'relative',
     marginBottom: 8,
   },
   medicationDeleteBackground: {
     position: 'absolute',
     right: 0,
     top: 0,
     bottom: 0,
     backgroundColor: '#F97316', // Orange color like in attachment
     justifyContent: 'center',
     alignItems: 'center',
     paddingHorizontal: 20,
     borderRadius: 16,
     width: 100,
   },
 });
