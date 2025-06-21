import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { scannerService } from '../services/scannerService';

export const CameraScanner = ({ onScanComplete, onClose }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef(null);

  const handleCapture = async () => {
    if (cameraRef.current) {
      setIsLoading(true);
      try {
        // First test if API key is working
        console.log('Testing API key...');
        const apiTest = await scannerService.testApiKey();
        
        if (!apiTest) {
          Alert.alert(
            'API Configuration Error', 
            'There seems to be an issue with the Gemini API setup. Please check your API key and internet connection.'
          );
          return;
        }

        console.log('API key test passed, taking photo...');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });

        console.log('Photo taken, analyzing...');
        const result = await scannerService.recognizeMedicine(photo.base64);
        
        if (result) {
          console.log('Scan successful:', result);
          onScanComplete(result);
        } else {
          Alert.alert('Scan Failed', 'Could not recognize the medication. Please try again with a clearer image or check the error logs.');
        }

      } catch (error) {
        console.error('Error during capture or scan:', error);
        Alert.alert('Error', `An unexpected error occurred: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.backButton}>
          <Text style={styles.backButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={[styles.backButton, { marginTop: 10, backgroundColor: '#666' }]}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back" />
      
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={32} color="white" />
        </TouchableOpacity>

        <View style={styles.viewfinder}>
          <View style={[styles.viewfinderCorner, styles.topLeft]} />
          <View style={[styles.viewfinderCorner, styles.topRight]} />
          <View style={[styles.viewfinderCorner, styles.bottomLeft]} />
          <View style={[styles.viewfinderCorner, styles.bottomRight]} />
        </View>
        
        <View style={styles.captureContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
              <Ionicons name="camera" size={40} color="#7C3AED" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
      },
      camera: {
        flex: 1,
      },
      overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
      },
      permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
      },
      permissionText: {
        color: 'white',
        fontSize: 18,
        marginBottom: 20,
      },
      backButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#7C3AED',
      },
      backButtonText: {
        color: 'white',
        fontSize: 16,
      },
      closeButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        padding: 10,
      },
      viewfinder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      },
      viewfinderCorner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: 'white',
        borderWidth: 4,
      },
      topLeft: {
        top: '20%',
        left: '10%',
        borderRightWidth: 0,
        borderBottomWidth: 0,
      },
      topRight: {
        top: '20%',
        right: '10%',
        borderLeftWidth: 0,
        borderBottomWidth: 0,
      },
      bottomLeft: {
        bottom: '20%',
        left: '10%',
        borderRightWidth: 0,
        borderTopWidth: 0,
      },
      bottomRight: {
        bottom: '20%',
        right: '10%',
        borderLeftWidth: 0,
        borderTopWidth: 0,
      },
      captureContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
      },
      captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
      },
}); 