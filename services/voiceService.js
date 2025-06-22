/**
 * Voice Service Module
 * Handles voice recording and transcription for medication input
 */

import axios from 'axios';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const SPEECH_TO_TEXT_API_KEY = process.env.EXPO_PUBLIC_SPEECH_TO_TEXT_API_KEY;

const getGeminiPrompt = (transcript, currentDate) => {
  const prompt = `
You are a precise medical scheduling AI. Your only function is to convert a user's voice transcript into a structured JSON array of medication schedules.

**TRANSCRIPT TO ANALYZE:**
"${transcript}"

**CURRENT DATE:** ${currentDate}

**CRITICAL PROCESSING RULES:**
1.  **VALIDATION:** If the transcript is ambiguous, conversational (e.g., "hello"), or does not contain a clear medication instruction, you **MUST** return an empty array: \`[]\`.
2.  **REQUIRED FIELDS:** Every object in the JSON array **MUST** contain a non-empty \`medicineName\` and \`dosage\`.
    *   **Medication Name Extraction:** Your primary goal is to identify the medication name. If the name seems misspelled or is not a common drug, **use the name exactly as it appears in the transcript**. Do not replace it with "Unknown Medication". For example, if you hear "separate seen", use "separate seen" as the \`medicineName\`.
    *   **Dosage:** If the dosage is unclear, use the placeholder "1 dose".
3.  **DAILY ENTRIES:** For multi-day schedules (e.g., "for 3 days"), you **MUST** create a separate JSON object for each individual day. Do not create a single object spanning multiple days.
4.  **OUTPUT FORMAT:** The final output **MUST BE A VALID JSON ARRAY** only. Do not include any other text, explanations, or markdown formatting like \`\`\`json.

**JSON OBJECT STRUCTURE (PER DAY):**
\`\`\`json
{
  "medicineName": "string",
  "dosage": "string",
  "frequencyPerDay": "number",
  "intakeTimes": ["string"],
  "durationDays": 1,
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "notes": "string"
}
\`\`\`

**INTAKE TIME MAPPING:**
- "once a day" or "daily": ["morning"]
- "twice a day": ["morning", "evening"]
- "three times a day": ["morning", "afternoon", "evening"]
- If specific times are mentioned, use them directly (e.g., ["10:00", "22:00"]).

**EXAMPLE:**
- Transcript: "add 500mg of paracetamol twice a day for 2 days starting tomorrow"
- Expected JSON output (assuming today is 2023-10-26):
  \`\`\`json
  [
    {
      "medicineName": "paracetamol",
      "dosage": "500mg",
      "frequencyPerDay": 2,
      "intakeTimes": ["morning", "evening"],
      "durationDays": 1,
      "startDate": "2023-10-27",
      "endDate": "2023-10-27",
      "notes": "Added via voice"
    },
    {
      "medicineName": "paracetamol",
      "dosage": "500mg",
      "frequencyPerDay": 2,
      "intakeTimes": ["morning", "evening"],
      "durationDays": 1,
      "startDate": "2023-10-28",
      "endDate": "2023-10-28",
      "notes": "Added via voice"
    }
  ]
  \`\`\`
`;
  return prompt;
};

// Function to get structured schedule from a transcript
export const scheduleFromText = async (transcript) => {
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

export const transcribeAudioWithGoogle = async (audioBase64, encoding) => {
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