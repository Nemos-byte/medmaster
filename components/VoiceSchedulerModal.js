import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { transcribeAudioWithGoogle, scheduleFromText } from '../services/voiceService.js';

export const VoiceSchedulerModal = ({ visible, onClose, onSchedule }) => {
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    async function startRecording() {
        setError(null);
        try {
            const perm = await Audio.requestPermissionsAsync();
            if (perm.status !== 'granted') {
                throw new Error("Please grant permission to this app to access the microphone.");
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            
            console.log('Starting recording with specific config...');

            // Define a compatible recording configuration
            const recordingOptions = {
                android: {
                    extension: '.amr',
                    outputFormat: Audio.AndroidOutputFormat.AMR_WB,
                    audioEncoder: Audio.AndroidAudioEncoder.AMR_WB,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 28500,
                },
                ios: {
                    extension: '.wav',
                    audioQuality: Audio.IOSAudioQuality.HIGH,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    outputFormat: Audio.IOSOutputFormat.LINEARPCM, // This is key for .wav
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
            };

            const { recording } = await Audio.Recording.createAsync(recordingOptions);
            
            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            setError(err.message);
        }
    }

    async function stopRecording() {
        if (!recording) return;
        
        setIsLoading(true);
        setIsRecording(false);
        console.log('Stopping recording..');

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            console.log('Recording stopped and stored at', uri);

            // Determine encoding based on platform
            const encoding = Platform.OS === 'ios' ? 'LINEAR16' : 'AMR_WB';

            const audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const transcript = await transcribeAudioWithGoogle(audioBase64, encoding);

            if (!transcript) {
                throw new Error("Could not understand audio. Please try speaking clearly.");
            }
            console.log("Transcript:", transcript);
            
            const schedule = await scheduleFromText(transcript);
            onSchedule(schedule); // Pass the result to the App component
            onClose(); // Close this modal

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
            setRecording(null);
        }
    }

    const handleMicPress = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.container}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={30} color="#6B7280" />
                    </TouchableOpacity>
                    
                    <Text style={styles.title}>{isRecording ? 'Recording...' : 'Tap to Speak'}</Text>
                    <Text style={styles.subtitle}>Tell me your prescription, for example: "Add 500mg of Paracetamol, twice a day for 3 days."</Text>

                    <TouchableOpacity style={[styles.micButton, isRecording && styles.micButtonRecording]} onPress={handleMicPress}>
                        {isLoading ? (
                            <ActivityIndicator size="large" color="#FFFFFF" />
                        ) : (
                            <Ionicons name="mic" size={48} color="white" />
                        )}
                    </TouchableOpacity>
                    
                    {error && <Text style={styles.errorText}>{error}</Text>}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
    container: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center' },
    closeButton: { position: 'absolute', top: 16, right: 16 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
    micButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#8B5CF6',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    micButtonRecording: {
        backgroundColor: '#EF4444', // Red when recording
    },
    errorText: { color: 'red', marginTop: 20, fontSize: 16 },
}); 