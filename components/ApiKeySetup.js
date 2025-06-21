/**
 * API Key Setup Component
 * Guides users through setting up their API keys securely
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { validateApiKeys, getApiKeyStatus } from '../config/api';

export const ApiKeySetup = ({ onComplete }) => {
  const [apiStatus, setApiStatus] = useState({
    openAI: 'checking',
    googleVision: 'checking',
    allConfigured: false,
  });

  useEffect(() => {
    checkApiKeys();
  }, []);

  const checkApiKeys = () => {
    const status = getApiKeyStatus();
    setApiStatus(status);
    
    if (status.allConfigured && onComplete) {
      onComplete();
    }
  };

  const openOpenAISignup = () => {
    Linking.openURL('https://platform.openai.com/api-keys');
  };

  const showSetupInstructions = () => {
    Alert.alert(
      'API Key Setup Instructions',
      `To enable voice input and AI features, you need to add your OpenAI API key:

1. Create a file called '.env' in your project folder
2. Copy this line into the .env file:
   EXPO_PUBLIC_OPENAI_API_KEY=your_actual_api_key_here
3. Replace 'your_actual_api_key_here' with your real OpenAI API key
4. Restart the app

Your API key will be stored securely and never shared.`,
      [
        { text: 'Get API Key', onPress: openOpenAISignup },
        { text: 'OK' }
      ]
    );
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'configured':
        return <Ionicons name="checkmark-circle" size={24} color="#10B981" />;
      case 'missing':
        return <Ionicons name="alert-circle" size={24} color="#EF4444" />;
      default:
        return <Ionicons name="time" size={24} color="#F59E0B" />;
    }
  };

  const StatusText = ({ status }) => {
    switch (status) {
      case 'configured':
        return <Text style={styles.statusConfigured}>Configured</Text>;
      case 'missing':
        return <Text style={styles.statusMissing}>Not configured</Text>;
      default:
        return <Text style={styles.statusChecking}>Checking...</Text>;
    }
  };

  if (apiStatus.allConfigured) {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        <Text style={styles.successTitle}>API Keys Configured!</Text>
        <Text style={styles.successMessage}>
          Voice input and AI features are ready to use.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="key" size={32} color="#7C3AED" />
        <Text style={styles.title}>API Setup Required</Text>
        <Text style={styles.subtitle}>
          Configure API keys to enable advanced features
        </Text>
      </View>

      <View style={styles.statusList}>
        <View style={styles.statusItem}>
          <StatusIcon status={apiStatus.openAI} />
          <View style={styles.statusInfo}>
            <Text style={styles.statusName}>OpenAI API</Text>
            <Text style={styles.statusDescription}>
              Required for voice input and AI medication parsing
            </Text>
            <StatusText status={apiStatus.openAI} />
          </View>
        </View>

        <View style={styles.statusItem}>
          <StatusIcon status={apiStatus.googleVision} />
          <View style={styles.statusInfo}>
            <Text style={styles.statusName}>Google Vision API</Text>
            <Text style={styles.statusDescription}>
              Optional for camera-based medication scanning
            </Text>
            <StatusText status={apiStatus.googleVision} />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.setupButton}
          onPress={showSetupInstructions}
        >
          <Ionicons name="settings" size={20} color="#FFFFFF" />
          <Text style={styles.setupButtonText}>Setup Instructions</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={checkApiKeys}
        >
          <Ionicons name="refresh" size={20} color="#7C3AED" />
          <Text style={styles.refreshButtonText}>Check Again</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipButton}
          onPress={onComplete}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#3B82F6" />
        <Text style={styles.infoText}>
          Your API keys are stored locally and never shared. 
          You can use the app without API keys, but voice input will be disabled.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    justifyContent: 'center',
  },
  successContainer: {
    alignItems: 'center',
    padding: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusList: {
    marginBottom: 32,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  statusConfigured: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  statusMissing: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  statusChecking: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7C3AED',
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
}); 