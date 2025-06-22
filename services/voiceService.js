/**
 * Voice Service Module
 * Handles voice recording and transcription for medication input
 */

import axios from 'axios';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const SPEECH_TO_TEXT_API_KEY = process.env.EXPO_PUBLIC_SPEECH_TO_TEXT_API_KEY;

const getGeminiPrompt = (transcript, currentDate) => {
  const prompt = `You are an expert AI medical scheduler. Your task is to analyze the user's voice transcript, identify all medications, and structure them into a valid JSON array for scheduling.

IMPORTANT SCHEDULING RULES:
1. If a user says "X mg a day for Y days" or "over the next Y days", create SEPARATE entries for EACH day
2. If a user mentions multiple medications, create separate entries for each medication
3. Each medication entry should represent ONE medication for ONE specific day
4. Calculate proper start and end dates based on duration

The user's local date is ${currentDate}. 

INTAKE TIME GUIDELINES:
- Use these preferred time slots: "morning", "afternoon", "evening", "night"
- For "once daily": use "morning"
- For "twice daily": use "morning,evening"
- For "three times daily": use "morning,afternoon,evening"
- For "four times daily": use "morning,afternoon,evening,night"
- For specific times mentioned, use the closest time slot or keep the specific time

EXAMPLES:
- "500mg paracetamol a day for 3 days" = 3 separate entries (one for each day)
- "paracetamol twice daily and ibuprofen once daily for 2 days" = 4 entries total (2 for paracetamol, 2 for ibuprofen)

You MUST return a single, valid JSON array. Each object must have this structure:
{
  "medicineName": "string",
  "dosage": "string", 
  "frequencyPerDay": "number",
  "intakeTimes": ["string"],
  "durationDays": "number",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD", 
  "notes": "string"
}

For multi-day schedules:
- Set startDate to the appropriate day for each entry
- Set endDate to the same as startDate for each daily entry
- Set durationDays to 1 for each daily entry
- Use the preferred time slots for intakeTimes when possible

Use null for unavailable information.

User transcript: "${transcript}"`;
  return prompt;
};

// Function to call the Speech-to-Text API
const transcribeAudioWithGoogle = async (audioBase64, encoding) => {
  if (!SPEECH_TO_TEXT_API_KEY) throw new Error("Speech-to-Text API key is not configured.");

  const GOOGLE_STT_ENDPOINT = `https://speech.googleapis.com/v1/speech:recognize`;
  
  const requestBody = {
    config: {
      encoding: encoding,
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
    audio: {
      content: audioBase64,
    },
  };

  const { data } = await axios.post(GOOGLE_STT_ENDPOINT, requestBody, {
    params: { key: SPEECH_TO_TEXT_API_KEY }
  });
  
  if (data.results && data.results.length > 0) {
    return data.results[0].alternatives[0].transcript;
  }
  console.log("Google STT Response did not contain a transcript:", data);
  return null;
};

// Function to get structured schedule from a transcript
const scheduleFromText = async (transcript) => {
  if (!GEMINI_API_KEY) throw new Error("API key is not configured.");

  const today = new Date().toISOString().slice(0, 10);
  const prompt = getGeminiPrompt(transcript, today);

  console.log("Calling Gemini API with transcript:", transcript);
  
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
        },
      },
      {
        params: { key: GEMINI_API_KEY },
      }
    );

    let resultText = response.data.candidates[0].content.parts[0].text;
    return JSON.parse(resultText);
    } catch (error) {
    console.error("Gemini API Error Details:");
    console.error("Status:", error.response?.status);
    console.error("Status Text:", error.response?.statusText);
    console.error("Response Data:", error.response?.data);
    console.error("Request URL:", error.config?.url);
    console.error("Request Params:", error.config?.params);
    throw error;
  }
};

export const voiceService = {
  transcribeAudioWithGoogle,
  scheduleFromText,
}; 