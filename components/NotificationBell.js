import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';

export const NotificationBell = ({ onPress, style }) => {
  const [badgeCount, setBadgeCount] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Initial badge count
    updateBadgeCount();

    // Set up interval to update badge count
    const interval = setInterval(updateBadgeCount, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const updateBadgeCount = () => {
    const count = notificationService.getUnreadNotificationCount();
    setBadgeCount(count);

    // Start pulsing animation for critical notifications
    if (count > 0) {
      startPulseAnimation();
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const getBadgeColor = () => {
    if (badgeCount === 0) return 'transparent';
    if (badgeCount > 5) return '#EF4444'; // Red for many notifications
    if (badgeCount > 2) return '#F97316'; // Orange for several notifications
    return '#7C3AED'; // Purple for few notifications
  };

  const handlePress = () => {
    // Stop pulsing when user opens notifications
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.bellContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Ionicons 
          name="notifications" 
          size={24} 
          color={badgeCount > 0 ? "#7C3AED" : "#6B7280"} 
        />
        
        {badgeCount > 0 && (
          <View style={[styles.badge, { backgroundColor: getBadgeColor() }]}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount.toString()}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 