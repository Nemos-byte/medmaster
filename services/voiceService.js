/**
 * Voice Service Module
 * Handles voice recording and transcription for medication input
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { openAIConfig, getOpenAIHeaders, validateApiKeys } from '../config/api';

/**
 * Voice recording and transcription service
 */
export class VoiceService {
  constructor() {
    this.recording = null;
    this.isRecording = false;
  }

  /**
   * Initialize audio permissions and settings
   */
  async initialize() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start recording audio
   */
  async startRecording() {
    try {
      if (this.isRecording) {
        throw new Error('Already recording');
      }

      // Check API key
      const validation = validateApiKeys();
      if (!validation.hasOpenAI) {
        throw new Error('OpenAI API key not configured');
      }

      // Initialize if needed
      await this.initialize();

      // Start recording
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      await this.recording.startAsync();
      this.isRecording = true;

      return { success: true };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop recording and return the audio file URI
   */
  async stopRecording() {
    try {
      if (!this.isRecording || !this.recording) {
        throw new Error('Not currently recording');
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.isRecording = false;
      this.recording = null;

      return { success: true, uri };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transcribe audio file using OpenAI Whisper
   */
  async transcribeAudio(audioUri) {
    try {
      if (!audioUri) {
        throw new Error('No audio file provided');
      }

      // Check API key
      const validation = validateApiKeys();
      if (!validation.hasOpenAI) {
        throw new Error('OpenAI API key not configured. Please add your API key to the .env file.');
      }

      // Read the audio file
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioInfo.exists) {
        throw new Error('Audio file not found');
      }

      // Create FormData for the API request
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
      formData.append('model', openAIConfig.speechToText.model);
      formData.append('language', 'en'); // English
      formData.append('prompt', 'This is a medication name and dosage. Please transcribe accurately.');

      // Make the API request
      const response = await fetch(openAIConfig.speechToText.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIConfig.apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      // Clean up the audio file
      await FileSystem.deleteAsync(audioUri, { idempotent: true });

      return {
        success: true,
        transcription: result.text,
        confidence: result.confidence || null,
      };
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse medication information from transcribed text using GPT
   */
  async parseMedicationFromText(transcription) {
    try {
      const validation = validateApiKeys();
      if (!validation.hasOpenAI) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = `Parse the following medication information and return a JSON object with these fields:
- name: medication name
- dosage: dosage amount (e.g., "1 tablet", "5mg", "2 capsules")
- notes: any additional instructions

Text to parse: "${transcription}"

Return only valid JSON, no other text.`;

      const response = await fetch(openAIConfig.textCompletion.url, {
        method: 'POST',
        headers: getOpenAIHeaders(),
        body: JSON.stringify({
          model: openAIConfig.textCompletion.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that parses medication information. Always return valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const parsedText = result.choices[0].message.content;
      
      try {
        const medicationData = JSON.parse(parsedText);
        return {
          success: true,
          medication: {
            name: medicationData.name || '',
            dosage: medicationData.dosage || '',
            notes: medicationData.notes || '',
          }
        };
      } catch (parseError) {
        // Fallback: return the transcription as-is
        return {
          success: true,
          medication: {
            name: transcription,
            dosage: '',
            notes: 'Parsed from voice input',
          }
        };
      }
    } catch (error) {
      console.error('Failed to parse medication:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete voice-to-medication workflow
   */
  async recordAndParseMedication() {
    try {
      // Start recording
      const startResult = await this.startRecording();
      if (!startResult.success) {
        return startResult;
      }

      return { success: true, message: 'Recording started' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete the recording and get parsed medication data
   */
  async completeRecordingAndParse() {
    try {
      // Stop recording
      const stopResult = await this.stopRecording();
      if (!stopResult.success) {
        return stopResult;
      }

      // Transcribe audio
      const transcriptionResult = await this.transcribeAudio(stopResult.uri);
      if (!transcriptionResult.success) {
        return transcriptionResult;
      }

      // Parse medication info
      const parseResult = await this.parseMedicationFromText(transcriptionResult.transcription);
      if (!parseResult.success) {
        return parseResult;
      }

      return {
        success: true,
        transcription: transcriptionResult.transcription,
        medication: parseResult.medication,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const voiceService = new VoiceService(); 