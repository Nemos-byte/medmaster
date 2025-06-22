import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';
import { Button } from './ui/Button';

export const NotificationCenter = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      setNotifications(notificationService.notificationHistory || []);
      setPreferences(notificationService.preferences || {});
    } catch (error) {
      console.error('Error loading notification data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllNotificationsAsRead();
      await loadData();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
      Alert.alert('Test Sent', 'A test notification has been sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const updateGlobalPreference = async (key, value) => {
    try {
      const newPreferences = {
        ...preferences,
        global: {
          ...preferences.global,
          [key]: value,
        },
      };
      setPreferences(newPreferences);
      await notificationService.updatePreferences(newPreferences);
    } catch (error) {
      console.error('Error updating preference:', error);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffTime = Math.abs(now - notificationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return notificationDate.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'PRE_DOSE': return 'time-outline';
      case 'DUE_DOSE': return 'medical-outline';
      case 'OVERDUE_DOSE': return 'warning-outline';
      case 'ACHIEVEMENT': return 'trophy-outline';
      default: return 'notifications-outline';
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      await loadData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => !item.read && handleMarkAsRead(item.id)}
      activeOpacity={item.read ? 1 : 0.7}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIconContainer}>
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={20}
            color="#7C3AED"
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>
            {item.type === 'PRE_DOSE' && 'Upcoming Medication'}
            {item.type === 'DUE_DOSE' && 'Time for Medication'}
            {item.type === 'OVERDUE_DOSE' && 'Missed Medication'}
            {item.type === 'ACHIEVEMENT' && 'Achievement'}
            {item.type === 'TEST' && 'Test Notification'}
          </Text>
          <Text style={styles.notificationMessage}>
            {item.medicationName ? `${item.medicationName} ${item.dosage || ''}` : 'Test notification from your app'}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.createdAt)} at {formatTime(item.createdAt)}
          </Text>
          {!item.read && (
            <Text style={styles.tapToMarkRead}>
              Tap to mark as read
            </Text>
          )}
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const renderNotificationsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.notificationActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleMarkAllAsRead}
          disabled={notifications.filter(n => !n.read).length === 0}
        >
          <Text style={[
            styles.actionButtonText,
            notifications.filter(n => !n.read).length === 0 && styles.disabledText
          ]}>
            Mark All Read
          </Text>
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No Notifications</Text>
          <Text style={styles.emptyStateMessage}>
            You're all caught up! Notification reminders will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item, index) => item.id || index.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notificationsList}
        />
      )}
    </View>
  );

  const renderSettingsTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>General Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive medication reminders and alerts
            </Text>
          </View>
          <Switch
            value={preferences?.global?.enabled || false}
            onValueChange={(value) => updateGlobalPreference('enabled', value)}
            trackColor={{ false: '#D1D5DB', true: '#7C3AED' }}
            thumbColor={preferences?.global?.enabled ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Sound</Text>
            <Text style={styles.settingDescription}>
              Play sound with notifications
            </Text>
          </View>
          <Switch
            value={preferences?.global?.sound || false}
            onValueChange={(value) => updateGlobalPreference('sound', value)}
            trackColor={{ false: '#D1D5DB', true: '#7C3AED' }}
            thumbColor={preferences?.global?.sound ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Achievement Notifications</Text>
            <Text style={styles.settingDescription}>
              Get notified when you complete daily goals
            </Text>
          </View>
          <Switch
            value={preferences?.global?.achievementNotifications || false}
            onValueChange={(value) => updateGlobalPreference('achievementNotifications', value)}
            trackColor={{ false: '#D1D5DB', true: '#7C3AED' }}
            thumbColor={preferences?.global?.achievementNotifications ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Testing</Text>
        
        <Button
          title="Send Test Notification"
          onPress={handleTestNotification}
          style={styles.testButton}
        />
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{notifications.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {notifications.filter(n => !n.read).length}
            </Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {notifications.filter(n => n.read).length}
            </Text>
            <Text style={styles.statLabel}>Read</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
            onPress={() => setActiveTab('notifications')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'notifications' && styles.activeTabText
            ]}>
              Notifications
            </Text>
            {notifications.filter(n => !n.read).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {notifications.filter(n => !n.read).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'settings' && styles.activeTabText
            ]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'notifications' ? renderNotificationsTab() : renderSettingsTab()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#7C3AED',
  },
  tabBadge: {
    marginLeft: 8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledText: {
    color: '#D1D5DB',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  notificationsList: {
    paddingBottom: 20,
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tapToMarkRead: {
    fontSize: 12,
    color: '#7C3AED',
    fontStyle: 'italic',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    marginTop: 4,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  testButton: {
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
});
