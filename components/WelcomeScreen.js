import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './ui/Button';

export const WelcomeScreen = ({ onClose }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to MedTracker!</Text>
      <Text style={styles.message}>
        Your personal medication management app
      </Text>
      
      <Button onPress={onClose} style={styles.button}>
        Get Started
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
}); 