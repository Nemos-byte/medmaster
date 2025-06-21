import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CameraScanner } from './components/CameraScanner';

// Sample medication data to match the screenshot
const mockMedications = [
  {
    id: "1",
    name: "Omega 3",
    dosage: "1 pill",
    time: "08:00",
    taken: false,
    date: "2024-03-24",
    cardColor: "#FFFFFF",
  },
  {
    id: "2",
    name: "Vitamin B12",
    dosage: "1 pill",
    time: "09:00",
    taken: false,
    date: "2024-03-24",
    notes: "Take on an empty stomach",
    cardColor: "#F0FDFA", // teal background like in screenshot
  },
];

export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date(2024, 2, 24)); // March 24, 2024
  const [medications, setMedications] = useState(mockMedications);
  const [showAddModal, setShowAddModal] = useState(false);
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
  const toggleMedication = (id) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          const updatedMed = { ...med, taken: !med.taken };
          if (updatedMed.taken) {
            updatedMed.takenAt = new Date().toISOString();
          } else {
            delete updatedMed.takenAt;
          }
          return updatedMed;
        }
        return med;
      }),
    );
  };

  const getMedicationsForDate = (date) => {
    const dateString = date.toISOString().split("T")[0];
    return medications.filter((med) => med.date === dateString).sort((a, b) => a.time.localeCompare(b.time));
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
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "pm" : "am";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
  };

  const getWeekRange = () => {
    const weekDays = getWeekDays();
    const startDate = weekDays[0];
    const endDate = weekDays[6];

    if (startDate.getMonth() === endDate.getMonth()) {
      return startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    }

    const startMonth = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endMonth = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${startMonth} - ${endMonth}`;
  };

  const weekDays = getWeekDays();
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

  const addNewMedication = () => {
    if (!formData.name.trim() || !formData.dosage.trim()) {
      alert('Please fill in medication name and dosage');
      return;
    }

    // Handle multiple doses per day based on frequency
    const medications = [];
    const baseDate = formData.startDate.toISOString().split('T')[0];
    
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
        cardColor: '#FFFFFF',
        pillColor: formData.pillColor,
        frequency: formData.frequency,
      };
    }

    // Add all medications to the list
    setMedications(prev => [...prev, ...medications]);
    
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
    // Pre-fill the form with data from the Gemini API
    setFormData(prev => ({
      ...prev,
      name: scannedData.name || '',
      dosage: scannedData.dosage || '',
      notes: scannedData.quantity ? `Quantity: ${scannedData.quantity}` : '',
    }));
    setShowCameraScanner(false);
    setShowManualForm(true);
  };

  return (
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
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="notifications-outline" size={24} color="#374151" />
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
                const dayMedications = getMedicationsForDate(date);
                const dayCompletedCount = dayMedications.filter((med) => med.taken).length;
                const dayTotalCount = dayMedications.length;

                return (
                  <View key={index} style={styles.dayColumn}>
                    <Text style={styles.dayLabel}>{dayNames[index]}</Text>
                    <TouchableOpacity
                      style={[
                        styles.dayButton,
                        isSelected && styles.selectedDay,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      {isSelected && <View style={styles.selectedDot} />}
                    </TouchableOpacity>
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
            <Text style={styles.contentTitle}>
              Pills for {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>

            {/* Timeline */}
            {Object.keys(medicationsByTime).length > 0 ? (
              <View style={styles.timeline}>
                {Object.keys(medicationsByTime)
                  .sort()
                  .map((timeSlot) => (
                    <View key={timeSlot} style={styles.timeSlot}>
                      <View style={styles.timeSlotHeader}>
                        <View style={styles.timeBadge}>
                          <Text style={styles.timeText}>{formatTime(timeSlot)}</Text>
                        </View>
                        <View style={styles.medications}>
                          {medicationsByTime[timeSlot].map((medication) => (
                            <View key={medication.id} style={[styles.medicationCard, { backgroundColor: medication.cardColor }]}>
                              <View style={styles.medicationContent}>
                                <View style={styles.medicationInfo}>
                                  <View style={styles.medicationDetails}>
                                    <Text style={styles.dosage}>{medication.dosage}</Text>
                                    <Text style={styles.medicationName}>{medication.name}</Text>
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
                                  <TouchableOpacity style={styles.moreButton}>
                                    <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
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
                <Ionicons name="medical-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No medications scheduled</Text>
                <Text style={styles.emptyMessage}>Add your first medication for this day</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <View style={styles.navigation}>
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="home-outline" size={24} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.navItem}>
              <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
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
                    setShowAddModal(false);
                    setShowCameraScanner(true);
                  }}
                >
                  <View style={styles.optionContent}>
                    <View style={[styles.optionIcon, styles.cameraIcon]}>
                      <Ionicons name="camera" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>Camera Capture</Text>
                      <Text style={styles.optionDescription}>Scan medication bottle or package</Text>
                    </View>
                    <View style={styles.radioButton}>
                      <View style={styles.radioButtonInner} />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Voice Input Option - Disabled for now */}
                <TouchableOpacity 
                  style={[styles.optionCard, styles.voiceOption, styles.disabledOption]}
                  onPress={() => alert('Voice input is being upgraded!')}
                >
                  <View style={styles.optionContent}>
                    <View style={[styles.optionIcon, styles.voiceIcon]}>
                      <Ionicons name="mic-off" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>Voice Input</Text>
                      <Text style={styles.optionDescription}>Feature currently being upgraded</Text>
                    </View>
                    <View style={styles.radioButton}>
                      <View style={styles.radioButtonInner} />
                    </View>
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
                       {formData.startDate.toLocaleDateString('en-US', { 
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
                             date.toDateString() === formData.startDate.toDateString() && styles.selectedDropdownOption
                           ]}
                           onPress={() => {
                             setFormData(prev => ({...prev, startDate: date}));
                             setShowDateDropdown(false);
                           }}
                         >
                           <Text style={[
                             styles.dropdownOptionText,
                             date.toDateString() === formData.startDate.toDateString() && styles.selectedDropdownOptionText
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
           transparent={false}
           animationType="slide"
           onRequestClose={() => setShowCameraScanner(false)}
         >
           <CameraScanner 
             onScanComplete={handleScanComplete}
             onClose={() => setShowCameraScanner(false)}
           />
         </Modal>
      </LinearGradient>
    </SafeAreaView>
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
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  selectedDay: {
    backgroundColor: '#7C3AED',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  selectedDot: {
    width: 4,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    position: 'absolute',
    bottom: 8,
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
  contentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
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
    flex: 1,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9CA3AF',
    gap: 12,
  },
  addMedicationText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
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
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
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
 });
