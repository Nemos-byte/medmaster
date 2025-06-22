import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';

// Hook for user profile
export const useUserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userProfile = await storageService.getUserProfile();
      setProfile(userProfile);
    } catch (err) {
      setError(err);
      console.error('Error loading user profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    try {
      setError(null);
      const updatedProfile = await storageService.updateUserProfile(updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      setError(err);
      console.error('Error updating user profile:', err);
      throw err;
    }
  }, []);

  const saveProfile = useCallback(async (newProfile) => {
    try {
      setError(null);
      const savedProfile = await storageService.saveUserProfile(newProfile);
      setProfile(savedProfile);
      return savedProfile;
    } catch (err) {
      setError(err);
      console.error('Error saving user profile:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    refetch: loadProfile,
    updateProfile,
    saveProfile
  };
};

// Hook for app settings
export const useAppSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const appSettings = await storageService.getAppSettings();
      setSettings(appSettings);
    } catch (err) {
      setError(err);
      console.error('Error loading app settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates) => {
    try {
      setError(null);
      const updatedSettings = await storageService.updateAppSettings(updates);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      setError(err);
      console.error('Error updating app settings:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    refetch: loadSettings,
    updateSettings
  };
};

// Hook for medications
export const useMedications = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMedications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allMedications = await storageService.getAllMedications();
      setMedications(allMedications || []);
    } catch (err) {
      setError(err);
      console.error('Error loading medications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMedication = useCallback(async (medication) => {
    try {
      setError(null);
      const savedMedication = await storageService.saveMedication(medication);
      await loadMedications(); // Reload all medications
      return savedMedication;
    } catch (err) {
      setError(err);
      console.error('Error saving medication:', err);
      throw err;
    }
  }, [loadMedications]);

  const updateMedication = useCallback(async (id, updates) => {
    try {
      setError(null);
      const updatedMedication = await storageService.updateMedication(id, updates);
      await loadMedications(); // Reload all medications
      return updatedMedication;
    } catch (err) {
      setError(err);
      console.error('Error updating medication:', err);
      throw err;
    }
  }, [loadMedications]);

  const deleteMedication = useCallback(async (id) => {
    try {
      setError(null);
      await storageService.deleteMedication(id);
      await loadMedications(); // Reload all medications
      return true;
    } catch (err) {
      setError(err);
      console.error('Error deleting medication:', err);
      throw err;
    }
  }, [loadMedications]);

  const getMedication = useCallback(async (id) => {
    try {
      return await storageService.getMedication(id);
    } catch (err) {
      console.error('Error getting medication:', err);
      return null;
    }
  }, []);

  const getActiveMedications = useCallback(() => {
    return medications.filter(med => med.active !== false);
  }, [medications]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  return {
    medications,
    activeMedications: getActiveMedications(),
    loading,
    error,
    refetch: loadMedications,
    saveMedication,
    updateMedication,
    deleteMedication,
    getMedication
  };
};

// Hook for dose history
export const useDoseHistory = (medicationId = null, days = 30) => {
  const [doseHistory, setDoseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDoseHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      const history = await storageService.getDoseHistory(
        medicationId,
        startDate.toISOString(),
        endDate.toISOString()
      );
      setDoseHistory(history || []);
    } catch (err) {
      setError(err);
      console.error('Error loading dose history:', err);
    } finally {
      setLoading(false);
    }
  }, [medicationId, days]);

  const recordDose = useCallback(async (doseRecord) => {
    try {
      setError(null);
      const savedDose = await storageService.recordDose(doseRecord);
      await loadDoseHistory(); // Reload history
      return savedDose;
    } catch (err) {
      setError(err);
      console.error('Error recording dose:', err);
      throw err;
    }
  }, [loadDoseHistory]);

  useEffect(() => {
    loadDoseHistory();
  }, [loadDoseHistory]);

  return {
    doseHistory,
    loading,
    error,
    refetch: loadDoseHistory,
    recordDose
  };
};

// Hook for adherence statistics
export const useAdherenceStats = (medicationId, days = 30) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const adherenceStats = await storageService.getAdherenceStats(medicationId, days);
      setStats(adherenceStats);
    } catch (err) {
      setError(err);
      console.error('Error loading adherence stats:', err);
    } finally {
      setLoading(false);
    }
  }, [medicationId, days]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refetch: loadStats
  };
};

// Hook for missed doses
export const useMissedDoses = (date = new Date()) => {
  const [missedDoses, setMissedDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMissedDoses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const missed = await storageService.getMissedDoses(date);
      setMissedDoses(missed || []);
    } catch (err) {
      setError(err);
      console.error('Error loading missed doses:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadMissedDoses();
  }, [loadMissedDoses]);

  return {
    missedDoses,
    loading,
    error,
    refetch: loadMissedDoses
  };
};

// Hook for storage management
export const useStorageInfo = () => {
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStorageInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await storageService.getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      setError(err);
      console.error('Error loading storage info:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const optimizeStorage = useCallback(async () => {
    try {
      setError(null);
      await storageService.optimizeStorage();
      await loadStorageInfo(); // Reload info after optimization
      return true;
    } catch (err) {
      setError(err);
      console.error('Error optimizing storage:', err);
      throw err;
    }
  }, [loadStorageInfo]);

  const clearAllData = useCallback(async () => {
    try {
      setError(null);
      await storageService.clearAllData();
      await loadStorageInfo(); // Reload info after clearing
      return true;
    } catch (err) {
      setError(err);
      console.error('Error clearing data:', err);
      throw err;
    }
  }, [loadStorageInfo]);

  useEffect(() => {
    loadStorageInfo();
  }, [loadStorageInfo]);

  return {
    storageInfo,
    loading,
    error,
    refetch: loadStorageInfo,
    optimizeStorage,
    clearAllData
  };
};

// Hook for backup and restore
export const useBackup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createBackup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fileUri = await storageService.createBackup();
      return fileUri;
    } catch (err) {
      setError(err);
      console.error('Error creating backup:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fileUri = await storageService.exportToJSON();
      return fileUri;
    } catch (err) {
      setError(err);
      console.error('Error exporting data:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const importData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const success = await storageService.importFromJSON();
      return success;
    } catch (err) {
      setError(err);
      console.error('Error importing data:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreFromBackup = useCallback(async (fileUri) => {
    try {
      setLoading(true);
      setError(null);
      const success = await storageService.restoreFromBackup(fileUri);
      return success;
    } catch (err) {
      setError(err);
      console.error('Error restoring backup:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createBackup,
    exportData,
    importData,
    restoreFromBackup
  };
};

// Combined hook for easy medication management
export const useMedicationManager = () => {
  const {
    medications,
    activeMedications,
    loading: medicationsLoading,
    error: medicationsError,
    saveMedication,
    updateMedication,
    deleteMedication,
    refetch: refetchMedications
  } = useMedications();

  const {
    recordDose,
    loading: doseLoading,
    error: doseError
  } = useDoseHistory();

  const addMedication = useCallback(async (medicationData) => {
    try {
      const savedMedication = await saveMedication(medicationData);
      return savedMedication;
    } catch (error) {
      console.error('Error adding medication:', error);
      throw error;
    }
  }, [saveMedication]);

  const markDoseTaken = useCallback(async (medicationId, scheduledTime, notes = '') => {
    try {
      const doseRecord = {
        medicationId,
        scheduledTime,
        actualTime: new Date().toISOString(),
        status: 'taken',
        notes
      };
      
      const savedDose = await recordDose(doseRecord);
      return savedDose;
    } catch (error) {
      console.error('Error marking dose as taken:', error);
      throw error;
    }
  }, [recordDose]);

  const markDoseSkipped = useCallback(async (medicationId, scheduledTime, notes = '') => {
    try {
      const doseRecord = {
        medicationId,
        scheduledTime,
        actualTime: new Date().toISOString(),
        status: 'skipped',
        notes
      };
      
      const savedDose = await recordDose(doseRecord);
      return savedDose;
    } catch (error) {
      console.error('Error marking dose as skipped:', error);
      throw error;
    }
  }, [recordDose]);

  const markDoseMissed = useCallback(async (medicationId, scheduledTime, notes = '') => {
    try {
      const doseRecord = {
        medicationId,
        scheduledTime,
        actualTime: null,
        status: 'missed',
        notes
      };
      
      const savedDose = await recordDose(doseRecord);
      return savedDose;
    } catch (error) {
      console.error('Error marking dose as missed:', error);
      throw error;
    }
  }, [recordDose]);

  return {
    medications,
    activeMedications,
    loading: medicationsLoading || doseLoading,
    error: medicationsError || doseError,
    addMedication,
    updateMedication,
    deleteMedication,
    markDoseTaken,
    markDoseSkipped,
    markDoseMissed,
    refetch: refetchMedications
  };
};

export default {
  useUserProfile,
  useAppSettings,
  useMedications,
  useDoseHistory,
  useAdherenceStats,
  useMissedDoses,
  useStorageInfo,
  useBackup,
  useMedicationManager
}; 