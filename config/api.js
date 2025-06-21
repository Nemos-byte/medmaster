/**
 * API Configuration Module
 * Handles secure API key management and provides centralized API endpoints
 */

// Import environment variables (these are set in .env file)
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;

/**
 * Validates that required API keys are present
 * @returns {Object} Validation result with status and missing keys
 */
export const validateApiKeys = () => {
  const missingKeys = [];
  
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    missingKeys.push('EXPO_PUBLIC_OPENAI_API_KEY');
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys,
    hasOpenAI: !!OPENAI_API_KEY && OPENAI_API_KEY !== 'your_openai_api_key_here',
    hasGoogleVision: !!GOOGLE_VISION_API_KEY && GOOGLE_VISION_API_KEY !== 'your_google_vision_api_key_here',
  };
};

/**
 * OpenAI API Configuration
 */
export const openAIConfig = {
  apiKey: OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
  
  // Speech-to-Text (Whisper) endpoint
  speechToText: {
    url: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
  },
  
  // Text completion for medication parsing
  textCompletion: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
  },
};

/**
 * Google Cloud Vision API Configuration (optional)
 */
export const googleVisionConfig = {
  apiKey: GOOGLE_VISION_API_KEY,
  baseURL: 'https://vision.googleapis.com/v1',
  
  // Text detection endpoint for medication labels
  textDetection: {
    url: 'https://vision.googleapis.com/v1/images:annotate',
  },
};

/**
 * API Headers factory functions
 */
export const getOpenAIHeaders = () => ({
  'Authorization': `Bearer ${OPENAI_API_KEY}`,
  'Content-Type': 'application/json',
});

export const getGoogleVisionHeaders = () => ({
  'Content-Type': 'application/json',
});

/**
 * Development helper - checks if we're in development mode
 */
export const isDevelopment = __DEV__;

/**
 * Safe API key checker (doesn't expose the actual key)
 */
export const getApiKeyStatus = () => {
  const validation = validateApiKeys();
  return {
    openAI: validation.hasOpenAI ? 'configured' : 'missing',
    googleVision: validation.hasGoogleVision ? 'configured' : 'missing',
    allConfigured: validation.isValid,
  };
}; 