import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification types
export const NOTIFICATION_TYPES = {
  PRE_DOSE: 'PRE_DOSE',
  DUE_DOSE: 'DUE_DOSE',
  OVERDUE_DOSE: 'OVERDUE_DOSE',
  CRITICAL: 'CRITICAL',
  INVENTORY: 'INVENTORY',
  ACHIEVEMENT: 'ACHIEVEMENT'
};

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  NOTIFICATION_HISTORY: 'notification_history',
  BADGE_COUNT: 'badge_count'
};

// Default notification preferences
const DEFAULT_PREFERENCES = {
  global: {
    enabled: true,
    preDoseMinutes: 30,
    overdueAlerts: [30, 60, 120],
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    sound: true,
    vibration: true,
    achievementNotifications: true
  },
  medications: {}
};

class NotificationService {
  constructor() {
    this.preferences = DEFAULT_PREFERENCES;
    this.notificationHistory = [];
    this.badgeCount = 0;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.loadPreferences();
      await this.loadNotificationHistory();
      await this.loadBadgeCount();
      await this.requestPermissions();
      this.setupNotificationListeners();
      
      this.initialized = true;
      console.log('📱 Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async setupAndroidChannels() {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('critical-alerts', {
      name: 'Critical Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#EF4444',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Achievements',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#10B981',
      sound: 'default',
      showBadge: false,
    });
  }

  setupNotificationListeners() {
    Notifications.addNotificationReceivedListener((notification) => {
      this.handleNotificationReceived(notification);
    });

    Notifications.addNotificationResponseReceivedListener((response) => {
      this.handleNotificationResponse(response);
    });
  }

  async handleNotificationReceived(notification) {
    const { data } = notification.request.content;
    
    const notificationRecord = {
      id: notification.request.identifier,
      type: data.type,
      medicationName: data.medicationName,
      medicationId: data.medicationId,
      dosage: data.dosage,
      scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : new Date(),
      createdAt: new Date(),
      read: false,
      actionTaken: null,
      priority: data.priority || PRIORITY_LEVELS.MEDIUM
    };

    await this.addNotificationToHistory(notificationRecord);
    await this.incrementBadgeCount();
  }

  async handleNotificationResponse(response) {
    const notificationId = response.notification.request.identifier;
    await this.markNotificationAsRead(notificationId);
    await this.decrementBadgeCount();
  }

  async sendTestNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification",
          body: "This is a test notification from your medication app",
          data: { type: 'TEST' },
        },
        ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  async sendAchievementNotification(message, type = 'daily_complete') {
    if (!this.preferences.global.achievementNotifications) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 Great Job!",
          body: message,
          data: {
            type: NOTIFICATION_TYPES.ACHIEVEMENT,
            achievementType: type,
            priority: PRIORITY_LEVELS.LOW
          },
          sound: this.preferences.global.sound ? 'default' : null,
        },
        ...(Platform.OS === 'android' && { channelId: 'achievements' }),
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending achievement notification:', error);
    }
  }

  async addNotificationToHistory(notification) {
    try {
      this.notificationHistory.unshift(notification);
      if (this.notificationHistory.length > 100) {
        this.notificationHistory = this.notificationHistory.slice(0, 100);
      }
      await this.saveNotificationHistory();
    } catch (error) {
      console.error('Error adding notification to history:', error);
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const notification = this.notificationHistory.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        await this.saveNotificationHistory();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllNotificationsAsRead() {
    try {
      this.notificationHistory.forEach(notification => {
        notification.read = true;
      });
      await this.saveNotificationHistory();
      await this.setBadgeCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async incrementBadgeCount() {
    this.badgeCount += 1;
    await this.setBadgeCount(this.badgeCount);
  }

  async decrementBadgeCount() {
    this.badgeCount = Math.max(0, this.badgeCount - 1);
    await this.setBadgeCount(this.badgeCount);
  }

  async setBadgeCount(count) {
    try {
      this.badgeCount = count;
      await Notifications.setBadgeCountAsync(count);
      await AsyncStorage.setItem(STORAGE_KEYS.BADGE_COUNT, count.toString());
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  getUnreadNotificationCount() {
    return this.notificationHistory.filter(n => !n.read).length;
  }

  async updatePreferences(newPreferences) {
    try {
      this.preferences = { ...this.preferences, ...newPreferences };
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_PREFERENCES,
        JSON.stringify(this.preferences)
      );
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }

  async loadPreferences() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  async loadNotificationHistory() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      if (stored) {
        this.notificationHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  }

  async saveNotificationHistory() {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_HISTORY,
        JSON.stringify(this.notificationHistory)
      );
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  }

  async loadBadgeCount() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.BADGE_COUNT);
      if (stored) {
        this.badgeCount = parseInt(stored, 10) || 0;
        await Notifications.setBadgeCountAsync(this.badgeCount);
      }
    } catch (error) {
      console.error('Error loading badge count:', error);
    }
  }

  // Schedule notifications for a medication
  async scheduleNotificationsForMedication(medication, doses) {
    try {
      if (!this.preferences.global.enabled) {
        console.log('📵 Notifications disabled globally, skipping scheduling');
        return;
      }

      const medicationPrefs = this.preferences.medications[medication.id] || {
        enabled: true,
        preDose: true,
        dueDose: true,
        overdueDose: true,
        customPreDoseMinutes: null
      };

      if (!medicationPrefs.enabled) {
        console.log(`📵 Notifications disabled for medication ${medication.id}, skipping scheduling`);
        return;
      }

      console.log(`📅 Scheduling notifications for medication: ${medication.name || medication.medicineName}`, {
        medicationId: medication.id,
        dosesCount: doses.length
      });

      const notifications = [];

      for (const dose of doses) {
        // Handle different date formats and ensure we have a valid time
        let doseTime;
        try {
          if (dose.time) {
            // If we have a separate time field
            doseTime = new Date(dose.date + 'T' + dose.time);
          } else if (dose.startDate && dose.intakeTimes && dose.intakeTimes.length > 0) {
            // Use the intake time from the medication data
            const timeString = this.getTimeFromIntakeTime(dose.intakeTimes[0]);
            doseTime = new Date(dose.startDate + 'T' + timeString);
          } else {
            // Default to morning time if no specific time is provided
            doseTime = new Date(dose.date + 'T09:00:00');
          }
          
          // Validate the date
          if (isNaN(doseTime.getTime())) {
            console.warn('Invalid date created for dose:', dose);
            continue;
          }

          // Check if date is too far in the future (more than 1 year)
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          
          if (doseTime > oneYearFromNow) {
            console.warn('Date too far in future, skipping notification scheduling:', doseTime.toISOString());
            continue;
          }

          // Check if date is more than 1 year in the past
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          if (doseTime < oneYearAgo) {
            console.warn('Date too far in past, skipping notification scheduling:', doseTime.toISOString());
            continue;
          }
        } catch (error) {
          console.error('Error parsing dose date:', error, dose);
          continue;
        }

        const now = new Date();

        // Skip past doses
        if (doseTime <= now) continue;

        // Pre-dose notification
        if (medicationPrefs.preDose) {
          const preDoseMinutes = medicationPrefs.customPreDoseMinutes || this.preferences.global.preDoseMinutes;
          const preDoseTime = new Date(doseTime.getTime() - (preDoseMinutes * 60 * 1000));

          if (preDoseTime > now && !this.isInQuietHours(preDoseTime)) {
            notifications.push({
              identifier: `pre_${medication.id}_${dose.id}`,
              content: {
                title: "Medication Reminder",
                body: `Take ${medication.name || medication.medicineName} ${medication.dosage} in ${preDoseMinutes} minutes`,
                data: {
                  type: NOTIFICATION_TYPES.PRE_DOSE,
                  medicationId: medication.id,
                  medicationName: medication.name || medication.medicineName,
                  dosage: medication.dosage,
                  doseId: dose.id,
                  scheduledTime: doseTime.toISOString(),
                  priority: PRIORITY_LEVELS.MEDIUM
                },
                sound: this.preferences.global.sound ? 'default' : null,
                badge: 1
              },
              ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
              trigger: {
                date: preDoseTime,
              },
            });
          }
        }

        // Due dose notification
        if (medicationPrefs.dueDose && !this.isInQuietHours(doseTime)) {
          notifications.push({
            identifier: `due_${medication.id}_${dose.id}`,
            content: {
              title: `Time for ${medication.name || medication.medicineName}`,
              body: `Take ${medication.dosage} now`,
              data: {
                type: NOTIFICATION_TYPES.DUE_DOSE,
                medicationId: medication.id,
                medicationName: medication.name || medication.medicineName,
                dosage: medication.dosage,
                doseId: dose.id,
                scheduledTime: doseTime.toISOString(),
                priority: PRIORITY_LEVELS.HIGH
              },
              sound: this.preferences.global.sound ? 'default' : null,
              badge: 1
            },
            ...(Platform.OS === 'android' && { channelId: 'medication-reminders' }),
            trigger: {
              date: doseTime,
            },
          });
        }

        // Overdue notifications
        if (medicationPrefs.overdueDose) {
          for (const overdueMinutes of this.preferences.global.overdueAlerts) {
            const overdueTime = new Date(doseTime.getTime() + (overdueMinutes * 60 * 1000));
            
            notifications.push({
              identifier: `overdue_${medication.id}_${dose.id}_${overdueMinutes}`,
              content: {
                title: "⚠️ Missed Medication",
                body: `${medication.name || medication.medicineName} was due ${overdueMinutes} minutes ago`,
                data: {
                  type: NOTIFICATION_TYPES.OVERDUE_DOSE,
                  medicationId: medication.id,
                  medicationName: medication.name || medication.medicineName,
                  dosage: medication.dosage,
                  doseId: dose.id,
                  scheduledTime: doseTime.toISOString(),
                  overdueMinutes,
                  priority: PRIORITY_LEVELS.CRITICAL
                },
                sound: this.preferences.global.sound ? 'default' : null,
                badge: 1
              },
              ...(Platform.OS === 'android' && { channelId: 'critical-alerts' }),
              trigger: {
                date: overdueTime,
              },
            });
          }
        }
      }

      // Schedule all notifications in batches
      await this.batchScheduleNotifications(notifications);
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  // Batch schedule notifications to avoid overwhelming the system
  async batchScheduleNotifications(notifications) {
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
      const batch = notifications.slice(i, i + BATCH_SIZE);
      
      try {
        // Schedule each notification individually to isolate errors
        for (const notification of batch) {
          try {
            // Validate trigger date before scheduling
            if (notification.trigger && notification.trigger.date) {
              const triggerDate = new Date(notification.trigger.date);
              if (isNaN(triggerDate.getTime())) {
                console.warn('Invalid trigger date, skipping notification:', notification.identifier);
                continue;
              }
              
              // Check if date is reasonable (not too far in future/past)
              const now = new Date();
              const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
              const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
              
              if (triggerDate > oneYearFromNow || triggerDate < oneYearAgo) {
                console.warn('Trigger date out of reasonable range, skipping:', triggerDate.toISOString());
                continue;
              }
            }
            
            await Notifications.scheduleNotificationAsync(notification);
          } catch (notificationError) {
            console.error('Error scheduling individual notification:', {
              identifier: notification.identifier,
              error: notificationError.message,
              triggerDate: notification.trigger?.date
            });
          }
        }
        
        console.log(`📅 Processed batch of ${batch.length} notifications`);
        
        // Small delay between batches
        if (i + BATCH_SIZE < notifications.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('Error in notification batch processing:', error);
      }
    }
  }

  // Cancel all notifications for a medication
  async cancelNotificationsForMedication(medicationId) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduledNotifications.filter(notification => 
        notification.content.data?.medicationId === medicationId
      );

      for (const notification of toCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      console.log(`🗑️ Cancelled ${toCancel.length} notifications for medication ${medicationId}`);
    } catch (error) {
      console.error('Error cancelling notifications for medication:', error);
    }
  }

  // Check if time is in quiet hours
  isInQuietHours(date) {
    if (!this.preferences.global.quietHoursStart || !this.preferences.global.quietHoursEnd) {
      return false;
    }

    const time = date.toTimeString().slice(0, 5); // HH:MM format
    const start = this.preferences.global.quietHoursStart;
    const end = this.preferences.global.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return time >= start || time <= end;
    } else {
      return time >= start && time <= end;
    }
  }

  // Convert intake time strings to actual time
  getTimeFromIntakeTime(intakeTime) {
    const timeMap = {
      'morning': '09:00:00',
      'afternoon': '14:00:00',
      'evening': '18:00:00',
      'night': '21:00:00',
      'before_breakfast': '08:00:00',
      'after_breakfast': '09:30:00',
      'before_lunch': '12:00:00',
      'after_lunch': '13:30:00',
      'before_dinner': '17:30:00',
      'after_dinner': '19:30:00',
      'bedtime': '22:00:00'
    };

    // If it's already a time format (HH:MM or HH:MM:SS), return it
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(intakeTime)) {
      return intakeTime.includes(':') && intakeTime.split(':').length === 2 
        ? intakeTime + ':00' 
        : intakeTime;
    }

    // Return mapped time or default to morning
    return timeMap[intakeTime.toLowerCase()] || '09:00:00';
  }
}

export const notificationService = new NotificationService();
export const initializeNotifications = () => notificationService.initialize();
export const getUnreadNotificationCount = () => notificationService.getUnreadNotificationCount();
export const scheduleNotificationsForMedication = (medication, doses) => 
  notificationService.scheduleNotificationsForMedication(medication, doses);
export const cancelNotificationsForMedication = (medicationId) => 
  notificationService.cancelNotificationsForMedication(medicationId);
export const sendAchievementNotification = (message, type) => 
  notificationService.sendAchievementNotification(message, type);
