import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';

// Storage keys structure
export const STORAGE_KEYS = {
  // Single documents
  USER_PROFILE: '@PillReminder:userProfile',
  APP_SETTINGS: '@PillReminder:appSettings',
  ONBOARDING_COMPLETE: '@PillReminder:onboardingComplete',
  
  // Collections (store as JSON arrays)
  MEDICATIONS: '@PillReminder:medications',
  DOSE_RECORDS: '@PillReminder:doseRecords',
  NOTIFICATIONS: '@PillReminder:notifications',
  
  // Metadata
  LAST_BACKUP: '@PillReminder:lastBackup',
  DATA_VERSION: '@PillReminder:dataVersion',
  
  // Cache
  SCAN_HISTORY: '@PillReminder:scanHistory',
};

// Current data version for migrations
const CURRENT_DATA_VERSION = '1.0.0';

// Default user profile structure
const DEFAULT_USER_PROFILE = {
  id: null,
  name: '',
  dateOfBirth: null,
  allergies: [],
  conditions: [],
  emergencyContact: {
    name: '',
    phone: '',
    relationship: ''
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
  createdAt: null,
  lastModified: null
};

// Default app settings
const DEFAULT_APP_SETTINGS = {
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  },
  backup: {
    autoBackup: true,
    lastAutoBackup: null,
    backupFrequency: 'daily' // daily, weekly, monthly
  },
  privacy: {
    requireAuth: false,
    dataEncryption: false
  }
};

class StorageService {
  constructor() {
    this.initialized = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Initialize storage and run migrations
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('📦 Initializing StorageService...');
      
      // Check and run migrations
      await this.runMigrations();
      
      // Initialize default data if needed
      await this.initializeDefaults();
      
      // Setup automatic backup if enabled
      await this.setupAutoBackup();
      
      this.initialized = true;
      console.log('✅ StorageService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize StorageService:', error);
      throw error;
    }
  }

  // Initialize default data
  async initializeDefaults() {
    try {
      // Initialize user profile if not exists
      const profile = await this.getUserProfile();
      if (!profile) {
        const defaultProfile = {
          ...DEFAULT_USER_PROFILE,
          id: await this.generateUUID(),
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        await this.saveUserProfile(defaultProfile);
      }

      // Initialize app settings if not exists
      const settings = await this.getAppSettings();
      if (!settings) {
        await this.saveAppSettings(DEFAULT_APP_SETTINGS);
      }

      // Initialize empty collections if not exists
      const medications = await this.getAllMedications();
      if (!medications) {
        await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify([]));
      }

      const doseRecords = await this.getDoseRecords();
      if (!doseRecords) {
        await AsyncStorage.setItem(STORAGE_KEYS.DOSE_RECORDS, JSON.stringify([]));
      }

    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  }

  // Generate UUID for IDs
  async generateUUID() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Cached get method for performance
  async getCached(key) {
    if (this.cache.has(key)) {
      const { value, timestamp } = this.cache.get(key);
      if (Date.now() - timestamp < this.cacheTimeout) {
        return value;
      }
    }

    const value = await AsyncStorage.getItem(key);
    const parsedValue = value ? JSON.parse(value) : null;
    this.cache.set(key, { value: parsedValue, timestamp: Date.now() });
    return parsedValue;
  }

  // Clear cache for a specific key
  clearCache(key) {
    this.cache.delete(key);
  }

  // Clear all cache
  clearAllCache() {
    this.cache.clear();
  }

  // USER PROFILE METHODS
  async saveUserProfile(profile) {
    try {
      const updatedProfile = {
        ...profile,
        lastModified: new Date().toISOString()
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
      this.clearCache(STORAGE_KEYS.USER_PROFILE);
      console.log('👤 User profile saved');
      return updatedProfile;
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  }

  async getUserProfile() {
    try {
      return await this.getCached(STORAGE_KEYS.USER_PROFILE);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async updateUserProfile(updates) {
    try {
      const currentProfile = await this.getUserProfile();
      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      const updatedProfile = {
        ...currentProfile,
        ...updates,
        lastModified: new Date().toISOString()
      };

      return await this.saveUserProfile(updatedProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // APP SETTINGS METHODS
  async saveAppSettings(settings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
      this.clearCache(STORAGE_KEYS.APP_SETTINGS);
      console.log('⚙️ App settings saved');
      return settings;
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw error;
    }
  }

  async getAppSettings() {
    try {
      return await this.getCached(STORAGE_KEYS.APP_SETTINGS);
    } catch (error) {
      console.error('Error getting app settings:', error);
      return DEFAULT_APP_SETTINGS;
    }
  }

  async updateAppSettings(updates) {
    try {
      const currentSettings = await this.getAppSettings();
      const updatedSettings = this.deepMerge(currentSettings, updates);
      return await this.saveAppSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating app settings:', error);
      throw error;
    }
  }

  // MEDICATION METHODS
  async saveMedication(medication) {
    try {
      const medications = await this.getAllMedications() || [];
      
      // Generate ID if not provided
      if (!medication.id) {
        medication.id = await this.generateUUID();
      }

      // Add timestamps
      const now = new Date().toISOString();
      const medicationWithTimestamps = {
        ...medication,
        createdAt: medication.createdAt || now,
        lastModified: now
      };

      // Check if medication exists (update) or is new (create)
      const existingIndex = medications.findIndex(med => med.id === medication.id);
      
      if (existingIndex >= 0) {
        medications[existingIndex] = medicationWithTimestamps;
      } else {
        medications.push(medicationWithTimestamps);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
      this.clearCache(STORAGE_KEYS.MEDICATIONS);
      
      console.log(`💊 Medication ${existingIndex >= 0 ? 'updated' : 'saved'}:`, medication.name || medication.medicineName);
      return medicationWithTimestamps;
    } catch (error) {
      console.error('Error saving medication:', error);
      throw error;
    }
  }

  async getMedication(id) {
    try {
      const medications = await this.getAllMedications();
      return medications ? medications.find(med => med.id === id) : null;
    } catch (error) {
      console.error('Error getting medication:', error);
      return null;
    }
  }

  async getAllMedications() {
    try {
      return await this.getCached(STORAGE_KEYS.MEDICATIONS);
    } catch (error) {
      console.error('Error getting all medications:', error);
      return [];
    }
  }

  async updateMedication(id, updates) {
    try {
      const medication = await this.getMedication(id);
      if (!medication) {
        throw new Error(`Medication with id ${id} not found`);
      }

      const updatedMedication = {
        ...medication,
        ...updates,
        lastModified: new Date().toISOString()
      };

      return await this.saveMedication(updatedMedication);
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  }

  async deleteMedication(id) {
    try {
      const medications = await this.getAllMedications() || [];
      const filteredMedications = medications.filter(med => med.id !== id);
      
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(filteredMedications));
      this.clearCache(STORAGE_KEYS.MEDICATIONS);
      
      // Also delete related dose records
      await this.deleteDoseRecordsForMedication(id);
      
      console.log(`🗑️ Medication deleted: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  }

  async getActiveMedications() {
    try {
      const medications = await this.getAllMedications();
      return medications ? medications.filter(med => med.active !== false) : [];
    } catch (error) {
      console.error('Error getting active medications:', error);
      return [];
    }
  }

  // DOSE RECORD METHODS
  async recordDose(doseRecord) {
    try {
      const doseRecords = await this.getDoseRecords() || [];
      
      if (!doseRecord.id) {
        doseRecord.id = await this.generateUUID();
      }

      const doseWithTimestamp = {
        ...doseRecord,
        createdAt: doseRecord.createdAt || new Date().toISOString()
      };

      doseRecords.push(doseWithTimestamp);
      
      await AsyncStorage.setItem(STORAGE_KEYS.DOSE_RECORDS, JSON.stringify(doseRecords));
      this.clearCache(STORAGE_KEYS.DOSE_RECORDS);
      
      console.log('📝 Dose recorded:', doseRecord.status);
      return doseWithTimestamp;
    } catch (error) {
      console.error('Error recording dose:', error);
      throw error;
    }
  }

  async getDoseRecords() {
    try {
      return await this.getCached(STORAGE_KEYS.DOSE_RECORDS);
    } catch (error) {
      console.error('Error getting dose records:', error);
      return [];
    }
  }

  async getDoseHistory(medicationId, startDate, endDate) {
    try {
      const allRecords = await this.getDoseRecords() || [];
      
      let filteredRecords = allRecords;
      
      if (medicationId) {
        filteredRecords = filteredRecords.filter(record => record.medicationId === medicationId);
      }
      
      if (startDate) {
        const start = new Date(startDate);
        filteredRecords = filteredRecords.filter(record => new Date(record.scheduledTime) >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate);
        filteredRecords = filteredRecords.filter(record => new Date(record.scheduledTime) <= end);
      }
      
      return filteredRecords.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
    } catch (error) {
      console.error('Error getting dose history:', error);
      return [];
    }
  }

  async getAdherenceStats(medicationId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const records = await this.getDoseHistory(medicationId, startDate.toISOString(), endDate.toISOString());
      
      const total = records.length;
      const taken = records.filter(record => record.status === 'taken').length;
      const missed = records.filter(record => record.status === 'missed').length;
      const skipped = records.filter(record => record.status === 'skipped').length;
      
      const adherenceRate = total > 0 ? (taken / total) * 100 : 0;
      
      return {
        total,
        taken,
        missed,
        skipped,
        adherenceRate: Math.round(adherenceRate * 100) / 100,
        period: days
      };
    } catch (error) {
      console.error('Error calculating adherence stats:', error);
      return {
        total: 0,
        taken: 0,
        missed: 0,
        skipped: 0,
        adherenceRate: 0,
        period: days
      };
    }
  }

  async getMissedDoses(date) {
    try {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const records = await this.getDoseHistory(null, startOfDay.toISOString(), endOfDay.toISOString());
      
      return records.filter(record => record.status === 'missed');
    } catch (error) {
      console.error('Error getting missed doses:', error);
      return [];
    }
  }

  async deleteDoseRecordsForMedication(medicationId) {
    try {
      const allRecords = await this.getDoseRecords() || [];
      const filteredRecords = allRecords.filter(record => record.medicationId !== medicationId);
      
      await AsyncStorage.setItem(STORAGE_KEYS.DOSE_RECORDS, JSON.stringify(filteredRecords));
      this.clearCache(STORAGE_KEYS.DOSE_RECORDS);
      
      console.log(`🗑️ Dose records deleted for medication: ${medicationId}`);
    } catch (error) {
      console.error('Error deleting dose records:', error);
    }
  }

  // UTILITY METHODS
  deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  // DATA MIGRATION METHODS
  async runMigrations() {
    try {
      const currentVersion = await AsyncStorage.getItem(STORAGE_KEYS.DATA_VERSION);
      
      if (!currentVersion) {
        // First time installation
        await AsyncStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
        console.log('📦 First installation - data version set to', CURRENT_DATA_VERSION);
        return;
      }

      if (currentVersion !== CURRENT_DATA_VERSION) {
        console.log(`🔄 Running migrations from ${currentVersion} to ${CURRENT_DATA_VERSION}`);
        
        // Add migration logic here as needed
        // await this.migrateFrom(currentVersion);
        
        await AsyncStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
        console.log('✅ Migrations completed');
      }
    } catch (error) {
      console.error('Error running migrations:', error);
    }
  }

  // BACKUP AND RESTORE METHODS
  async createBackup() {
    try {
      console.log('💾 Creating backup...');
      
      const backupData = {
        version: CURRENT_DATA_VERSION,
        exportDate: new Date().toISOString(),
        data: {
          userProfile: await this.getUserProfile(),
          appSettings: await this.getAppSettings(),
          medications: await this.getAllMedications(),
          doseRecords: await this.getDoseRecords(),
        }
      };

      // Generate checksum for integrity
      const dataString = JSON.stringify(backupData.data);
      backupData.checksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      const fileName = `pill-reminder-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2));
      
      // Update last backup time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
      
      console.log('✅ Backup created:', fileUri);
      return fileUri;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(fileUri) {
    try {
      console.log('📥 Restoring from backup...');
      
      const backupContent = await FileSystem.readAsStringAsync(fileUri);
      const backupData = JSON.parse(backupContent);
      
      // Verify checksum
      const dataString = JSON.stringify(backupData.data);
      const calculatedChecksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      
      if (calculatedChecksum !== backupData.checksum) {
        throw new Error('Backup file integrity check failed');
      }

      // Clear existing data
      await this.clearAllData();
      
      // Restore data
      if (backupData.data.userProfile) {
        await this.saveUserProfile(backupData.data.userProfile);
      }
      
      if (backupData.data.appSettings) {
        await this.saveAppSettings(backupData.data.appSettings);
      }
      
      if (backupData.data.medications) {
        await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(backupData.data.medications));
      }
      
      if (backupData.data.doseRecords) {
        await AsyncStorage.setItem(STORAGE_KEYS.DOSE_RECORDS, JSON.stringify(backupData.data.doseRecords));
      }

      // Clear cache to force reload
      this.clearAllCache();
      
      console.log('✅ Backup restored successfully');
      return true;
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }

  async exportToJSON() {
    try {
      const fileUri = await this.createBackup();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Pill Reminder Data'
        });
      }
      
      return fileUri;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importFromJSON() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: false
      });

      if (result.type === 'success') {
        await this.restoreFromBackup(result.uri);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  // STORAGE MANAGEMENT
  async clearAllData() {
    try {
      console.log('🗑️ Clearing all data...');
      
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      this.clearAllCache();
      
      console.log('✅ All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  async getStorageInfo() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      
      let totalSize = 0;
      let itemCount = 0;
      
      const keyInfo = stores.map(([key, value]) => {
        const size = new Blob([value || '']).size;
        totalSize += size;
        itemCount++;
        
        return {
          key,
          size,
          sizeFormatted: this.formatBytes(size)
        };
      });

      return {
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        itemCount,
        keys: keyInfo
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        totalSize: 0,
        totalSizeFormatted: '0 B',
        itemCount: 0,
        keys: []
      };
    }
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async optimizeStorage() {
    try {
      console.log('🧹 Optimizing storage...');
      
      // Clean up old dose records (keep last 90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      const allRecords = await this.getDoseRecords() || [];
      const recentRecords = allRecords.filter(record => 
        new Date(record.scheduledTime) > cutoffDate
      );
      
      if (recentRecords.length !== allRecords.length) {
        await AsyncStorage.setItem(STORAGE_KEYS.DOSE_RECORDS, JSON.stringify(recentRecords));
        this.clearCache(STORAGE_KEYS.DOSE_RECORDS);
        console.log(`🧹 Cleaned up ${allRecords.length - recentRecords.length} old dose records`);
      }
      
      // Clear old cache
      this.clearAllCache();
      
      console.log('✅ Storage optimization completed');
    } catch (error) {
      console.error('Error optimizing storage:', error);
    }
  }

  async setupAutoBackup() {
    try {
      const settings = await this.getAppSettings();
      
      if (settings?.backup?.autoBackup) {
        const lastBackup = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
        
        if (!lastBackup) {
          // First time - create backup
          await this.createBackup();
        } else {
          const lastBackupDate = new Date(lastBackup);
          const now = new Date();
          const daysSinceBackup = Math.floor((now - lastBackupDate) / (1000 * 60 * 60 * 24));
          
          const frequency = settings.backup.backupFrequency || 'daily';
          let shouldBackup = false;
          
          switch (frequency) {
            case 'daily':
              shouldBackup = daysSinceBackup >= 1;
              break;
            case 'weekly':
              shouldBackup = daysSinceBackup >= 7;
              break;
            case 'monthly':
              shouldBackup = daysSinceBackup >= 30;
              break;
          }
          
          if (shouldBackup) {
            await this.createBackup();
          }
        }
      }
    } catch (error) {
      console.error('Error setting up auto backup:', error);
    }
  }
}

// Create and export singleton instance
export const storageService = new StorageService();

// Helper functions for easy access
export const initializeStorage = () => storageService.initialize();
export const getUserProfile = () => storageService.getUserProfile();
export const saveMedication = (medication) => storageService.saveMedication(medication);
export const getAllMedications = () => storageService.getAllMedications();
export const recordDose = (doseRecord) => storageService.recordDose(doseRecord);
export const getAdherenceStats = (medicationId, days) => storageService.getAdherenceStats(medicationId, days);
export const createBackup = () => storageService.createBackup();
export const exportData = () => storageService.exportToJSON();
export const importData = () => storageService.importFromJSON();

export default storageService; 