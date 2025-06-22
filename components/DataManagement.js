import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStorageInfo, useBackup, useUserProfile, useMedications } from '../hooks/useStorage';
import { populateSampleData, resetToCleanState, simulateStorageUsage } from '../utils/sampleData';

const DataManagement = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  
  const {
    storageInfo,
    loading: storageLoading,
    refetch: refetchStorage,
    optimizeStorage,
    clearAllData
  } = useStorageInfo();

  const {
    loading: backupLoading,
    createBackup,
    exportData,
    importData
  } = useBackup();

  const { profile } = useUserProfile();
  const { medications } = useMedications();

  if (!visible) return null;

  const handlePopulateSampleData = async () => {
    try {
      setLoading(true);
      await populateSampleData(false); // Don't clear existing data
      Alert.alert('Success', 'Sample data populated successfully!');
      await refetchStorage();
    } catch (error) {
      console.error('Error populating sample data:', error);
      Alert.alert('Error', 'Failed to populate sample data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your medications, dose records, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await resetToCleanState();
              Alert.alert('Success', 'All data has been reset');
              await refetchStorage();
            } catch (error) {
              console.error('Error resetting data:', error);
              Alert.alert('Error', 'Failed to reset data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleOptimizeStorage = async () => {
    try {
      setLoading(true);
      await optimizeStorage();
      Alert.alert('Success', 'Storage optimized successfully!');
      await refetchStorage();
    } catch (error) {
      console.error('Error optimizing storage:', error);
      Alert.alert('Error', 'Failed to optimize storage');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      const fileUri = await createBackup();
      Alert.alert('Success', `Backup created successfully!\nSaved to: ${fileUri}`);
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Error', 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      await exportData();
      Alert.alert('Success', 'Data exported successfully! You can now share the backup file.');
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async () => {
    Alert.alert(
      'Import Data',
      'This will replace all current data with the imported data. Make sure to backup your current data first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await importData();
              if (success) {
                Alert.alert('Success', 'Data imported successfully!');
                await refetchStorage();
              } else {
                Alert.alert('Cancelled', 'Import was cancelled');
              }
            } catch (error) {
              console.error('Error importing data:', error);
              Alert.alert('Error', 'Failed to import data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSimulateUsage = async () => {
    try {
      setLoading(true);
      await simulateStorageUsage();
      Alert.alert('Success', 'Storage usage simulated with test data!');
      await refetchStorage();
    } catch (error) {
      console.error('Error simulating storage usage:', error);
      Alert.alert('Error', 'Failed to simulate storage usage');
    } finally {
      setLoading(false);
    }
  };

  const DataCard = ({ title, value, subtitle, icon, color = '#7C3AED' }) => (
    <View style={[styles.dataCard, { borderLeftColor: color }]}>
      <View style={styles.dataCardHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.dataCardTitle}>{title}</Text>
      </View>
      <Text style={styles.dataCardValue}>{value}</Text>
      {subtitle && <Text style={styles.dataCardSubtitle}>{subtitle}</Text>}
    </View>
  );

  const ActionButton = ({ title, subtitle, icon, onPress, color = '#7C3AED', destructive = false }) => (
    <TouchableOpacity
      style={[styles.actionButton, destructive && styles.destructiveButton]}
      onPress={onPress}
      disabled={loading || backupLoading}
    >
      <View style={styles.actionButtonContent}>
        <Ionicons 
          name={icon} 
          size={24} 
          color={destructive ? '#EF4444' : color} 
        />
        <View style={styles.actionButtonText}>
          <Text style={[styles.actionButtonTitle, destructive && styles.destructiveText]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.actionButtonSubtitle, destructive && styles.destructiveSubtitle]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {(loading || backupLoading) && (
        <ActivityIndicator size="small" color={destructive ? '#EF4444' : color} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Data Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Data Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Current Data</Text>
            <View style={styles.dataGrid}>
              <DataCard
                title="User Profile"
                value={profile ? '✓ Set up' : '⚠ Not set up'}
                subtitle={profile?.name || 'No profile'}
                icon="person"
                color={profile ? '#10B981' : '#F59E0B'}
              />
              <DataCard
                title="Medications"
                value={medications?.length || 0}
                subtitle="Active medications"
                icon="medical"
                color="#7C3AED"
              />
              <DataCard
                title="Storage Used"
                value={storageInfo?.totalSizeFormatted || 'Loading...'}
                subtitle={`${storageInfo?.itemCount || 0} items stored`}
                icon="folder"
                color="#3B82F6"
              />
            </View>
          </View>

          {/* Sample Data Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎭 Sample Data</Text>
            <ActionButton
              title="Populate Sample Data"
              subtitle="Add realistic medication data for testing"
              icon="flask"
              onPress={handlePopulateSampleData}
              color="#10B981"
            />
            <ActionButton
              title="Simulate Heavy Usage"
              subtitle="Generate lots of test data to test storage limits"
              icon="speedometer"
              onPress={handleSimulateUsage}
              color="#F59E0B"
            />
          </View>

          {/* Backup & Restore */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💾 Backup & Restore</Text>
            <ActionButton
              title="Create Backup"
              subtitle="Save current data to device storage"
              icon="save"
              onPress={handleCreateBackup}
              color="#3B82F6"
            />
            <ActionButton
              title="Export Data"
              subtitle="Share your data as a file"
              icon="share"
              onPress={handleExportData}
              color="#8B5CF6"
            />
            <ActionButton
              title="Import Data"
              subtitle="Restore data from a backup file"
              icon="download"
              onPress={handleImportData}
              color="#EC4899"
            />
          </View>

          {/* Storage Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧹 Storage Management</Text>
            <ActionButton
              title="Optimize Storage"
              subtitle="Clean up old data and free space"
              icon="refresh"
              onPress={handleOptimizeStorage}
              color="#F97316"
            />
            <ActionButton
              title="Reset All Data"
              subtitle="Permanently delete everything"
              icon="trash"
              onPress={handleResetData}
              destructive={true}
            />
          </View>

          {/* Storage Details */}
          {storageInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Storage Details</Text>
              <View style={styles.storageDetails}>
                {storageInfo.keys.map((keyInfo, index) => (
                  <View key={index} style={styles.storageItem}>
                    <Text style={styles.storageKey}>{keyInfo.key.replace('@PillReminder:', '')}</Text>
                    <Text style={styles.storageSize}>{keyInfo.sizeFormatted}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  dataGrid: {
    gap: 12,
  },
  dataCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  dataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  dataCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  dataCardSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  destructiveButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 12,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  destructiveText: {
    color: '#EF4444',
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  destructiveSubtitle: {
    color: '#B91C1C',
  },
  storageDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  storageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storageKey: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  storageSize: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
});

export default DataManagement; 