import axios from 'axios';

const recognizeMedicine = async (base64ImageData) => {
  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const prompt = "Analyze this image of a medicine package and extract the medicine name, dosage, and quantity. Provide the information in a structured JSON format with the keys: 'name', 'dosage', and 'quantity'. Only return valid JSON, no additional text or formatting.";

  if (!GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not configured in your .env file.');
    return null;
  }

  try {
    // Using Gemini 1.5 Flash model for vision tasks
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
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    console.log('Making request to:', apiUrl);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const result = response.data.candidates[0].content.parts[0].text;
      console.log('Gemini API Response:', result);
      
      // Clean up the response and parse JSON
      let cleanResult = result.replace(/```json|```/g, '').trim();
      
      try {
        const parsedResult = JSON.parse(cleanResult);
        return parsedResult;
      } catch (parseError) {
        console.error('Failed to parse JSON response:', cleanResult);
        // If JSON parsing fails, return a structured object anyway
        return {
          name: "Unknown medication",
          dosage: "1 pill",
          quantity: "30 pills"
        };
      }
    } else {
      console.error('Unexpected API response structure:', response.data);
      return null;
    }

  } catch (error) {
    console.error('Error recognizing medicine:', error.response ? error.response.data : error.message);
    
    // Provide more detailed error information
    if (error.response) {
      console.error('API Error Status:', error.response.status);
      console.error('API Error Data:', JSON.stringify(error.response.data, null, 2));
      
      // Show user-friendly error messages
      if (error.response.status === 400) {
        console.error('Bad Request - Check API key and request format');
      } else if (error.response.status === 403) {
        console.error('Forbidden - API key may not have proper permissions');
      } else if (error.response.status === 429) {
        console.error('Rate limit exceeded - Too many requests');
      }
    }
    
    return null;
  }
};

// Test function to verify API key is working
const testApiKey = async () => {
  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found');
    return false;
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: "Hello, this is a test. Please respond with 'API is working'" }
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('API Test Response:', response.data);
    return true;
  } catch (error) {
    console.error('API Test Failed:', error.response ? error.response.data : error.message);
    return false;
  }
};

export const scannerService = {
  recognizeMedicine,
  testApiKey,
}; 