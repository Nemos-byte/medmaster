import axios from 'axios';

// Try to import AsyncStorage, but don't fail if it's not available
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.log('AsyncStorage not available, scan history will not be persisted');
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Safe date handling utility
const getSafeDate = (dateInput) => {
  if (!dateInput) {
    return new Date().toISOString().slice(0, 10);
  }
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date provided, using today:', dateInput);
      return new Date().toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  } catch (error) {
    console.warn('Date parsing error, using today:', error);
    return new Date().toISOString().slice(0, 10);
  }
};

// Enhanced configuration with fallback support
const API_CONFIG = {
  primary: {
    key: GEMINI_API_KEY,
    model: 'gemini-1.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
  },
  fallback: {
    key: process.env.EXPO_PUBLIC_GEMINI_BACKUP_KEY || GEMINI_API_KEY,
    model: 'gemini-1.5-pro',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'
  }
};

// Medicine knowledge base for validation and enrichment
const MEDICINE_DATABASE = {
  commonMedications: {
    'piriteze': { generic: 'cetirizine', category: 'antihistamine', defaultDuration: 30 },
    'zyrtec': { generic: 'cetirizine', category: 'antihistamine', defaultDuration: 30 },
    'dexamethasone': { generic: 'dexamethasone', category: 'corticosteroid', defaultDuration: 7 },
    'amoxicillin': { generic: 'amoxicillin', category: 'antibiotic', defaultDuration: 7 },
    'augmentin': { generic: 'amoxicillin/clavulanate', category: 'antibiotic', defaultDuration: 7 },
    'ibuprofen': { generic: 'ibuprofen', category: 'nsaid', defaultDuration: 3 },
    'advil': { generic: 'ibuprofen', category: 'nsaid', defaultDuration: 3 },
    'tylenol': { generic: 'acetaminophen', category: 'analgesic', defaultDuration: 3 },
    'paracetamol': { generic: 'acetaminophen', category: 'analgesic', defaultDuration: 3 },
  },
  
  dosagePatterns: {
    'od': { times: 1, schedule: ['morning'] },
    'bd': { times: 2, schedule: ['morning', 'evening'] },
    'bid': { times: 2, schedule: ['morning', 'evening'] },
    'tds': { times: 3, schedule: ['morning', 'afternoon', 'evening'] },
    'tid': { times: 3, schedule: ['morning', 'afternoon', 'evening'] },
    'qds': { times: 4, schedule: ['morning', 'noon', 'evening', 'night'] },
    'qid': { times: 4, schedule: ['morning', 'noon', 'evening', 'night'] },
    'prn': { times: 1, schedule: ['as needed'] },
  },
  
  interactions: {
    'warfarin': ['aspirin', 'ibuprofen', 'vitamin k', 'nsaid'],
    'ssri': ['tramadol', 'triptans', 'maoi'],
    'maoi': ['ssri', 'tyramine', 'decongestants'],
    'metformin': ['alcohol', 'contrast dye'],
  }
};

// Simple cache implementation
class ScanCache {
  static cache = new Map();
  static MAX_CACHE_SIZE = 50;
  static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  static get(imageHash) {
    const cached = this.cache.get(imageHash);
    if (cached && Date.now() - new Date(cached.metadata.timestamp).getTime() < this.CACHE_DURATION) {
      console.log('📋 Using cached scan result');
      return cached;
    }
    return null;
  }
  
  static set(imageHash, result) {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(imageHash, result);
  }
  
  static clear() {
    this.cache.clear();
  }
}

// Generate image hash for caching
const generateImageHash = (base64) => {
  const size = base64.length;
  const start = base64.slice(0, 100);
  const end = base64.slice(-100);
  return `${size}-${start}-${end}`;
};

// Safe JSON parsing with multiple strategies
const parseAIResponse = (responseText) => {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(responseText);
  } catch (e1) {
    console.log('Direct parse failed, trying cleanup strategies...');
  }
  
  // Strategy 2: Remove markdown code blocks
  try {
    const cleaned = responseText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e2) {
    console.log('Markdown cleanup failed, trying advanced cleanup...');
  }
  
  // Strategy 3: Fix common JSON issues
  try {
    let fixed = responseText
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/,\s*]/g, ']')
      .replace(/}\s*{/g, '},{') // Add comma between objects
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
      .trim();
    
    // Ensure it's wrapped in array brackets if needed
    if (fixed.startsWith('{') && !fixed.startsWith('[')) {
      fixed = '[' + fixed + ']';
    }
    
    return JSON.parse(fixed);
  } catch (e3) {
    console.log('Advanced cleanup failed, trying regex extraction...');
  }
  
  // Strategy 4: Extract JSON from mixed content
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e4) {
    console.log('Regex extraction failed');
  }
  
  // Final fallback
  console.error('All parsing strategies failed for:', responseText.substring(0, 200));
  return null;
};

// BACKWARD COMPATIBLE: Main functions

const recognizeMedicinePackage = async (base64ImageData) => {
  if (!GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not configured in your .env file.');
    return null;
  }
  
  const today = new Date().toISOString().slice(0, 10);
  
  const prompt = `Analyze this image of a medicine package and extract the medicine information.

🎯 TASK: Extract medication details and create a treatment schedule

Look for:
1. Medicine name (e.g., "Piriteze", "DEXAMETHASONE", "AMOXICILLIN")
2. Dosage/strength (e.g., "10mg", "4mg", "500mg tablet")
3. Duration instructions (e.g., "daily for 14 days", "twice daily for 5 days", "take for 1 week")
4. Frequency instructions (e.g., "once daily", "twice daily", "morning and evening")
5. Package color - identify the dominant color of the packaging (e.g., "red", "blue", "green", "orange", "purple", "pink", "yellow", "white")

📋 OUTPUT FORMAT:
Return a JSON array with ONE object per medication dose. Each object represents a single dose on a single day.

For "Piriteze 10mg once daily for 14 days":
- Create EXACTLY 14 objects (one for each day)
- Use today's date (${today}) as the start date
- Each entry should have consecutive dates

Example output structure:
[
  {
    "medicineName": "Piriteze",
    "dosage": "10mg tablet",
    "frequencyPerDay": 1,
    "intakeTimes": ["morning"],
    "durationDays": 14,
    "startDate": "${today}",
    "endDate": "${today}",
    "notes": "Take once daily for 14 days (Day 1 of 14)",
    "packageColor": "red"
  }
]`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64ImageData,
                },
              },
            ],
          },
        ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.0,
        topK: 1,
        topP: 0.1,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ]
    };

    console.log('Making request to:', apiUrl);

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('Full API response:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const candidate = response.data.candidates[0];
      console.log('Candidate:', JSON.stringify(candidate, null, 2));
      
      // Check if the response was blocked by safety filters
      if (candidate.finishReason === 'SAFETY') {
        console.warn('Response blocked by safety filters');
        const fallbackEntry = {
          medicineName: "Unknown medication",
          dosage: "1 pill",
          frequencyPerDay: 1,
          intakeTimes: ["morning"],
          durationDays: 1,
          startDate: today,
          endDate: today,
          notes: "Image blocked by safety filters - please try a different image",
          packageColor: "#7C3AED"
        };
        return [fallbackEntry];
      }
      
      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        console.error('Invalid candidate structure:', candidate);
        const fallbackEntry = {
          medicineName: "Unknown medication",
          dosage: "1 pill",
          frequencyPerDay: 1,
          intakeTimes: ["morning"],
          durationDays: 1,
          startDate: today,
          endDate: today,
          notes: "Invalid API response structure",
          packageColor: "#7C3AED"
        };
        return [fallbackEntry];
      }
      
      const result = candidate.content.parts[0].text;
      console.log('Gemini API Response:', result);
      
      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
        console.log('✅ Package scan JSON parsed successfully.');
      } catch (parseError) {
        console.warn('Package scan JSON Parse Error:', parseError.message);
        
        // Try enhanced parsing
        parsedResult = parseAIResponse(result);
        if (!parsedResult) {
          const fallbackEntry = {
            medicineName: "Unknown medication",
            dosage: "1 pill",
            frequencyPerDay: 1,
            intakeTimes: ["morning"],
            durationDays: 1,
            startDate: today,
            endDate: today,
            notes: "Scan failed - please verify details manually",
            packageColor: "#7C3AED" // Default purple color
          };
          
          return [fallbackEntry];
        }
      }
      
      // Ensure result is an array
      if (!Array.isArray(parsedResult)) {
        if (typeof parsedResult === 'object' && parsedResult !== null) {
          parsedResult = [parsedResult];
        } else {
          console.error('Unexpected result format:', typeof parsedResult);
          return null;
        }
      }
      
      // Add default color if missing and convert color names to hex values
      const colorMap = {
        'red': '#EF4444',
        'blue': '#3B82F6', 
        'green': '#10B981',
        'orange': '#F97316',
        'purple': '#7C3AED',
        'pink': '#EC4899',
        'yellow': '#F59E0B',
        'white': '#FFFFFF',
        'gray': '#6B7280',
        'grey': '#6B7280',
        'black': '#374151',
        'brown': '#92400E',
        'teal': '#0D9488',
        'cyan': '#06B6D4',
        'lime': '#65A30D',
        'amber': '#D97706',
        'emerald': '#059669',
        'violet': '#7C2D12',
        'indigo': '#4338CA',
        'rose': '#E11D48'
      };
      
      parsedResult = parsedResult.map(med => ({
        ...med,
        packageColor: med.packageColor ? 
          (colorMap[med.packageColor.toLowerCase()] || med.packageColor) : 
          '#7C3AED' // Default purple if no color detected
      }));
      
      console.log(`📦 Package scan: Found ${parsedResult.length} medication entries`);
      return parsedResult;
      
    } else {
      console.error('Unexpected API response structure:', response.data);
      
      // Check for specific error conditions
      if (response.data && response.data.error) {
        console.error('API Error:', response.data.error);
      }
      
      if (response.data && response.data.promptFeedback) {
        console.error('Prompt Feedback:', response.data.promptFeedback);
      }
      
      // Return fallback instead of null
      const fallbackEntry = {
        medicineName: "Unknown medication",
        dosage: "1 pill",
        frequencyPerDay: 1,
        intakeTimes: ["morning"],
        durationDays: 1,
        startDate: today,
        endDate: today,
        notes: "API response structure error - please try again",
        packageColor: "#7C3AED"
      };
      return [fallbackEntry];
    }

  } catch (error) {
    console.error('Error recognizing medicine:', error.response ? error.response.data : error.message);
    
    // Return a fallback entry instead of null to prevent crashes
    const fallbackEntry = {
      medicineName: "Unknown medication",
      dosage: "1 pill",
      frequencyPerDay: 1,
      intakeTimes: ["morning"],
      durationDays: 1,
      startDate: today,
      endDate: today,
      notes: "Scan failed - please verify details manually",
      packageColor: "#7C3AED" // Default purple color
    };
    
    return [fallbackEntry];
  }
};

const recognizePrescription = async (base64ImageData) => {
  if (!GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not configured in your .env file.');
    return null;
  }
  
  const today = new Date().toISOString().slice(0, 10);
  
  const prompt = `Analyze this prescription and extract ALL medications listed.
    
    For EACH medication found, return:
    {
      "medicineName": "exact name as written",
      "dosage": "strength and form (e.g., '500mg tablet')",
      "frequencyPerDay": times per day (e.g., "twice daily" = 2),
      "intakeTimes": appropriate schedule based on frequency,
      "durationDays": total days (e.g., "for 7 days" = 7, "1 week" = 7),
      "notes": "any special instructions",
      "confidence": 0.0-1.0 based on legibility
    }
    
    Common patterns:
    - "bd" or "twice daily" = frequencyPerDay: 2
    - "tds" or "three times daily" = frequencyPerDay: 3
    - "for 1 week" = durationDays: 7
    - "for 14 days" = durationDays: 14
    
    Return a JSON array of ALL medications found.`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64ImageData,
                },
              },
            ],
          },
        ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.1,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ]
    };

    console.log('📋 Starting prescription scan...');

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    });

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const candidate = response.data.candidates[0];
      
      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        console.error('Invalid prescription candidate structure:', candidate);
        return null;
      }
      
      const result = candidate.content.parts[0].text;
      console.log('Prescription scan result:', result);
      
      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
        console.log('✅ Prescription scan JSON parsed successfully.');
      } catch (parseError) {
        console.warn('Prescription scan JSON Parse Error:', parseError.message);
        
        // Try enhanced parsing
        parsedResult = parseAIResponse(result);
        if (!parsedResult) {
          console.error('Could not parse prescription scan result');
          return null;
        }
      }
      
      // Ensure result is an array
      if (!Array.isArray(parsedResult)) {
        if (typeof parsedResult === 'object' && parsedResult !== null) {
          parsedResult = [parsedResult];
        } else {
          console.error('Unexpected result format:', typeof parsedResult);
          return null;
        }
      }
      
      console.log(`📋 Prescription scan: Found ${parsedResult.length} medications`);
      
      // Color mapping for prescription medications (since we can't see package colors)
      const medicationColors = {
        'amoxicillin': '#F59E0B', // yellow/amber
        'dexamethasone': '#EF4444', // red
        'piriteze': '#7C3AED', // purple
        'ibuprofen': '#10B981', // green
        'paracetamol': '#3B82F6', // blue
        'aspirin': '#FFFFFF', // white
        'omeprazole': '#EC4899', // pink
        'simvastatin': '#F97316', // orange
        'metformin': '#6B7280', // gray
        'lisinopril': '#0D9488', // teal
      };
      
      // Expand medications into daily doses
      const expandedResult = [];
      
      parsedResult.forEach(med => {
        const duration = med.durationDays || 7;
        const startDate = new Date(med.startDate || today);
        const timesPerDay = med.frequencyPerDay || 1;
        const intakeTimes = med.intakeTimes || ["morning"];
        
        // Assign color based on medication name or use default
        const medNameLower = (med.medicineName || '').toLowerCase();
        const assignedColor = Object.keys(medicationColors).find(key => 
          medNameLower.includes(key)
        );
        const packageColor = assignedColor ? medicationColors[assignedColor] : '#7C3AED';
        
        for (let day = 0; day < duration; day++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + day);
          const dateString = currentDate.toISOString().slice(0, 10);
          
          // Create separate entries for each intake time
          for (let timeIndex = 0; timeIndex < timesPerDay; timeIndex++) {
            const intakeTime = intakeTimes[timeIndex % intakeTimes.length];
            
            expandedResult.push({
              medicineName: med.medicineName,
              dosage: med.dosage,
              frequencyPerDay: timesPerDay,
              intakeTimes: [intakeTime],
              durationDays: duration,
              startDate: dateString,
              endDate: dateString,
              notes: duration > 1 
                ? `${med.notes || ''} (Day ${day + 1} of ${duration})`.trim()
                : med.notes || '',
              packageColor: packageColor
            });
          }
        }
      });
      
      console.log(`📊 Expanded into ${expandedResult.length} daily medication entries`);
      return expandedResult;
      
    } else {
      console.error('Unexpected API response structure:', response.data);
      return null;
    }

  } catch (error) {
    console.error('Error scanning prescription:', error.response ? error.response.data : error.message);
    return null;
  }
};

const testApiKey = async () => {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found');
    return false;
  }

  try {
    console.log('🔧 Testing API keys...');
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: "Return exactly: {\"status\":\"working\",\"test\":true}" }]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0
        }
      },
      { timeout: 10000 }
    );

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const result = JSON.parse(response.data.candidates[0].content.parts[0].text);
      console.log('✅ API test successful:', result);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('API Test Failed:', error.response ? error.response.data : error.message);
    return false;
  }
};

// Export the service
export const scannerService = {
  recognizeMedicinePackage,
  recognizePrescription,
  testApiKey,
  MEDICINE_DATABASE,
  clearCache: () => ScanCache.clear()
};
