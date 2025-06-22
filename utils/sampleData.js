import { storageService } from '../services/storageService';

// Sample medications data
const SAMPLE_MEDICATIONS = [
  {
    id: 'sample-aspirin-1',
    name: 'Aspirin',
    genericName: 'Acetylsalicylic acid',
    dosage: '100mg',
    unit: 'mg',
    form: 'tablet',
    color: 'white',
    shape: 'round',
    imageUri: null,
    barcode: '123456789012',
    
    // Inventory tracking
    currentStock: 30,
    refillThreshold: 5,
    refillReminder: true,
    
    // Medical info
    purpose: 'Blood thinner and heart protection',
    sideEffects: ['stomach irritation', 'bleeding risk'],
    interactions: ['warfarin', 'ibuprofen'],
    foodRequirements: 'Take with food to reduce stomach irritation',
    
    // Schedule
    schedule: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: null, // ongoing
      frequency: {
        type: 'daily',
        times: 1,
        specificDays: [],
        specificTimes: ['09:00']
      }
    },
    
    // Notifications
    notificationSettings: {
      enabled: true,
      customPreDose: null,
      customSound: null
    },
    
    active: true,
    packageColor: '#EF4444'
  },
  
  {
    id: 'sample-vitamin-d-2',
    name: 'Vitamin D3',
    genericName: 'Cholecalciferol',
    dosage: '1000 IU',
    unit: 'IU',
    form: 'capsule',
    color: 'yellow',
    shape: 'oval',
    imageUri: null,
    barcode: '234567890123',
    
    currentStock: 60,
    refillThreshold: 10,
    refillReminder: true,
    
    purpose: 'Bone health and immune system support',
    sideEffects: ['nausea if taken in excess'],
    interactions: [],
    foodRequirements: 'Take with a meal containing fat for better absorption',
    
    schedule: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      frequency: {
        type: 'daily',
        times: 1,
        specificDays: [],
        specificTimes: ['08:00']
      }
    },
    
    notificationSettings: {
      enabled: true,
      customPreDose: 15, // 15 minutes before
      customSound: null
    },
    
    active: true,
    packageColor: '#F59E0B'
  },
  
  {
    id: 'sample-omega-3-3',
    name: 'Omega-3 Fish Oil',
    genericName: 'EPA/DHA',
    dosage: '1000mg',
    unit: 'mg',
    form: 'capsule',
    color: 'amber',
    shape: 'oval',
    imageUri: null,
    barcode: '345678901234',
    
    currentStock: 45,
    refillThreshold: 8,
    refillReminder: true,
    
    purpose: 'Heart health and brain function',
    sideEffects: ['fishy aftertaste', 'stomach upset'],
    interactions: ['blood thinners'],
    foodRequirements: 'Take with meals to reduce stomach upset',
    
    schedule: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      frequency: {
        type: 'daily',
        times: 2,
        specificDays: [],
        specificTimes: ['08:00', '20:00']
      }
    },
    
    notificationSettings: {
      enabled: true,
      customPreDose: null,
      customSound: null
    },
    
    active: true,
    packageColor: '#10B981'
  },
  
  {
    id: 'sample-antibiotic-4',
    name: 'Amoxicillin',
    genericName: 'Amoxicillin',
    dosage: '500mg',
    unit: 'mg',
    form: 'capsule',
    color: 'pink',
    shape: 'capsule',
    imageUri: null,
    barcode: '456789012345',
    
    currentStock: 14,
    refillThreshold: 3,
    refillReminder: true,
    
    purpose: 'Antibiotic for bacterial infections',
    sideEffects: ['nausea', 'diarrhea', 'allergic reactions'],
    interactions: ['birth control pills', 'methotrexate'],
    foodRequirements: 'Can be taken with or without food',
    
    schedule: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: (() => {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7); // 7-day course
        return endDate.toISOString().split('T')[0];
      })(),
      frequency: {
        type: 'daily',
        times: 3,
        specificDays: [],
        specificTimes: ['08:00', '14:00', '20:00']
      }
    },
    
    notificationSettings: {
      enabled: true,
      customPreDose: 30,
      customSound: null
    },
    
    active: true,
    packageColor: '#8B5CF6'
  },
  
  {
    id: 'sample-multivitamin-5',
    name: 'Daily Multivitamin',
    genericName: 'Multivitamin/Mineral',
    dosage: '1 tablet',
    unit: 'tablet',
    form: 'tablet',
    color: 'orange',
    shape: 'round',
    imageUri: null,
    barcode: '567890123456',
    
    currentStock: 90,
    refillThreshold: 15,
    refillReminder: true,
    
    purpose: 'Daily nutritional supplement',
    sideEffects: ['stomach upset if taken on empty stomach'],
    interactions: [],
    foodRequirements: 'Take with breakfast for best absorption',
    
    schedule: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      frequency: {
        type: 'daily',
        times: 1,
        specificDays: [],
        specificTimes: ['07:30']
      }
    },
    
    notificationSettings: {
      enabled: true,
      customPreDose: null,
      customSound: null
    },
    
    active: true,
    packageColor: '#F97316'
  }
];

// Sample user profile
const SAMPLE_USER_PROFILE = {
  id: 'sample-user-1',
  name: 'John Doe',
  dateOfBirth: '1985-03-15',
  allergies: ['penicillin', 'shellfish'],
  conditions: ['hypertension', 'high cholesterol'],
  emergencyContact: {
    name: 'Jane Doe',
    phone: '+1-555-0123',
    relationship: 'spouse'
  },
  preferences: {
    theme: 'light',
    language: 'en',
    measurementSystem: 'metric',
    reminderDefaults: {
      preDoseMinutes: 30,
      overdueAlerts: [30, 60, 120]
    }
  },
  createdAt: new Date().toISOString(),
  lastModified: new Date().toISOString()
};

// Sample dose records (for the last 7 days)
const generateSampleDoseRecords = () => {
  const records = [];
  const now = new Date();
  
  // Generate records for the last 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    
    SAMPLE_MEDICATIONS.forEach(medication => {
      medication.schedule.frequency.specificTimes.forEach((time, timeIndex) => {
        const scheduledDateTime = new Date(date);
        const [hours, minutes] = time.split(':');
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Only create records for past times
        if (scheduledDateTime < now) {
          // Simulate realistic adherence (85% taken, 10% skipped, 5% missed)
          const random = Math.random();
          let status, actualTime;
          
          if (random < 0.85) {
            status = 'taken';
            // Add some realistic variation to actual time (±15 minutes)
            const variation = (Math.random() - 0.5) * 30; // ±15 minutes in minutes
            actualTime = new Date(scheduledDateTime.getTime() + (variation * 60 * 1000));
          } else if (random < 0.95) {
            status = 'skipped';
            actualTime = new Date(scheduledDateTime.getTime() + (Math.random() * 60 * 60 * 1000)); // Within an hour
          } else {
            status = 'missed';
            actualTime = null;
          }
          
          records.push({
            id: `sample-dose-${medication.id}-${dayOffset}-${timeIndex}`,
            medicationId: medication.id,
            scheduledTime: scheduledDateTime.toISOString(),
            actualTime: actualTime ? actualTime.toISOString() : null,
            status,
            notes: status === 'skipped' ? 'Felt nauseous' : '',
            sideEffectsReported: status === 'taken' && Math.random() < 0.1 ? ['mild nausea'] : [],
            createdAt: actualTime ? actualTime.toISOString() : scheduledDateTime.toISOString()
          });
        }
      });
    });
  }
  
  return records.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
};

// Sample app settings
const SAMPLE_APP_SETTINGS = {
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    }
  },
  backup: {
    autoBackup: true,
    lastAutoBackup: new Date().toISOString(),
    backupFrequency: 'daily'
  },
  privacy: {
    requireAuth: false,
    dataEncryption: false
  }
};

// Main function to populate sample data
export const populateSampleData = async (clearExisting = true) => {
  try {
    console.log('🎭 Populating sample data...');
    
    if (clearExisting) {
      await storageService.clearAllData();
      console.log('🗑️ Cleared existing data');
    }
    
    // Initialize storage
    await storageService.initialize();
    
    // Save user profile
    await storageService.saveUserProfile(SAMPLE_USER_PROFILE);
    console.log('👤 Sample user profile saved');
    
    // Save app settings
    await storageService.saveAppSettings(SAMPLE_APP_SETTINGS);
    console.log('⚙️ Sample app settings saved');
    
    // Save medications
    for (const medication of SAMPLE_MEDICATIONS) {
      await storageService.saveMedication(medication);
    }
    console.log(`💊 ${SAMPLE_MEDICATIONS.length} sample medications saved`);
    
    // Generate and save dose records
    const doseRecords = generateSampleDoseRecords();
    for (const record of doseRecords) {
      await storageService.recordDose(record);
    }
    console.log(`📝 ${doseRecords.length} sample dose records saved`);
    
    console.log('✅ Sample data population completed!');
    
    return {
      userProfile: SAMPLE_USER_PROFILE,
      medications: SAMPLE_MEDICATIONS,
      doseRecords: doseRecords,
      appSettings: SAMPLE_APP_SETTINGS
    };
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error);
    throw error;
  }
};

// Function to generate additional test medications
export const generateTestMedications = (count = 5) => {
  const medicationNames = [
    'Lisinopril', 'Metformin', 'Atorvastatin', 'Levothyroxine', 'Amlodipine',
    'Metoprolol', 'Omeprazole', 'Simvastatin', 'Losartan', 'Gabapentin',
    'Hydrochlorothiazide', 'Sertraline', 'Montelukast', 'Furosemide', 'Tramadol'
  ];
  
  const dosages = ['5mg', '10mg', '25mg', '50mg', '100mg', '200mg', '500mg'];
  const forms = ['tablet', 'capsule', 'liquid'];
  const colors = ['white', 'blue', 'pink', 'yellow', 'green', 'orange', 'red'];
  const shapes = ['round', 'oval', 'square', 'capsule'];
  const packageColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F97316'];
  
  const medications = [];
  
  for (let i = 0; i < count; i++) {
    const name = medicationNames[Math.floor(Math.random() * medicationNames.length)];
    const dosage = dosages[Math.floor(Math.random() * dosages.length)];
    const form = forms[Math.floor(Math.random() * forms.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const packageColor = packageColors[Math.floor(Math.random() * packageColors.length)];
    
    // Random schedule
    const timesPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 times per day
    const specificTimes = [];
    
    if (timesPerDay === 1) {
      specificTimes.push('09:00');
    } else if (timesPerDay === 2) {
      specificTimes.push('08:00', '20:00');
    } else {
      specificTimes.push('08:00', '14:00', '20:00');
    }
    
    medications.push({
      id: `test-med-${i + 1}`,
      name: `${name} ${dosage}`,
      genericName: name,
      dosage,
      unit: dosage.replace(/[0-9]/g, ''),
      form,
      color,
      shape,
      imageUri: null,
      barcode: `${Math.floor(Math.random() * 900000000000) + 100000000000}`,
      
      currentStock: Math.floor(Math.random() * 90) + 10,
      refillThreshold: Math.floor(Math.random() * 10) + 5,
      refillReminder: Math.random() > 0.3,
      
      purpose: `Treatment medication ${i + 1}`,
      sideEffects: ['consult your doctor'],
      interactions: [],
      foodRequirements: Math.random() > 0.5 ? 'Take with food' : 'Can be taken with or without food',
      
      schedule: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: Math.random() > 0.7 ? (() => {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 30) + 7);
          return endDate.toISOString().split('T')[0];
        })() : null,
        frequency: {
          type: 'daily',
          times: timesPerDay,
          specificDays: [],
          specificTimes
        }
      },
      
      notificationSettings: {
        enabled: Math.random() > 0.2,
        customPreDose: Math.random() > 0.7 ? Math.floor(Math.random() * 60) + 15 : null,
        customSound: null
      },
      
      active: Math.random() > 0.1,
      packageColor,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    });
  }
  
  return medications;
};

// Function to simulate storage usage
export const simulateStorageUsage = async () => {
  try {
    console.log('📊 Simulating storage usage...');
    
    // Generate a lot of test data
    const testMedications = generateTestMedications(20);
    
    for (const med of testMedications) {
      await storageService.saveMedication(med);
    }
    
    // Generate many dose records
    const records = [];
    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      
      testMedications.forEach(med => {
        med.schedule.frequency.specificTimes.forEach(() => {
          records.push({
            id: `stress-test-${day}-${med.id}-${Math.random()}`,
            medicationId: med.id,
            scheduledTime: date.toISOString(),
            actualTime: Math.random() > 0.2 ? date.toISOString() : null,
            status: Math.random() > 0.2 ? 'taken' : 'missed',
            notes: '',
            sideEffectsReported: [],
            createdAt: date.toISOString()
          });
        });
      });
    }
    
    for (const record of records) {
      await storageService.recordDose(record);
    }
    
    const storageInfo = await storageService.getStorageInfo();
    console.log('📊 Storage usage simulation completed:', storageInfo);
    
    return storageInfo;
    
  } catch (error) {
    console.error('❌ Error simulating storage usage:', error);
    throw error;
  }
};

// Function to reset to clean state
export const resetToCleanState = async () => {
  try {
    console.log('🧹 Resetting to clean state...');
    await storageService.clearAllData();
    await storageService.initialize();
    console.log('✅ Reset completed');
  } catch (error) {
    console.error('❌ Error resetting to clean state:', error);
    throw error;
  }
};

export default {
  populateSampleData,
  generateTestMedications,
  simulateStorageUsage,
  resetToCleanState,
  SAMPLE_MEDICATIONS,
  SAMPLE_USER_PROFILE,
  SAMPLE_APP_SETTINGS
}; 