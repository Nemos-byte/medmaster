# Medication Tracker App

A React Native medication tracking app built with Expo, featuring voice input, AI-powered medication parsing, and smart scheduling.

## Features

- 📱 **Manual Medication Entry**: Add medications with custom dosages and schedules
- 🎤 **Voice Input**: Speak your medication details and let AI parse them automatically
- 📷 **Camera Scanning**: Scan medication bottles and packages (coming soon)
- ⏰ **Smart Scheduling**: Support for multiple doses per day (twice daily, with meals, etc.)
- 📊 **Progress Tracking**: Simple progress overview for daily medication compliance
- 🗓️ **Calendar View**: Navigate through dates and manage medication schedules

## Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device
- OpenAI API key (for voice input features)

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd MyExpoApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   ```

4. **Configure your API keys** (see API Setup section below)

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Open the app**
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Or press `i` for iOS simulator, `a` for Android emulator

## API Setup

### OpenAI API Key (Required for Voice Input)

1. **Get your API key**:
   - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create an account or sign in
   - Click "Create new secret key"
   - Copy the key (starts with `sk-proj-...`)

2. **Add to your .env file**:
   ```bash
   # Open the .env file and replace the placeholder
   EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-your-actual-api-key-here
   ```

3. **Restart the app**:
   ```bash
   # Stop the current server (Ctrl+C) and restart
   npx expo start
   ```

### Google Vision API Key (Optional - for camera features)

1. **Get your API key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Vision API
   - Create credentials (API key)

2. **Add to your .env file**:
   ```bash
   EXPO_PUBLIC_GOOGLE_VISION_API_KEY=your-google-vision-api-key
   ```

## Security

- ✅ **API keys are stored locally** in environment variables
- ✅ **Never committed to version control** (.env is in .gitignore)
- ✅ **Not exposed in the app bundle** (Expo handles this securely)
- ✅ **Used only for your personal app instance**

## Usage

### Manual Entry
1. Tap the purple "+" button
2. Select "Manual Input"
3. Fill in medication details
4. Choose frequency (once daily, twice daily, with meals, etc.)
5. Set start date
6. Add medication

### Voice Input
1. Tap the purple "+" button
2. Select "Voice Input"
3. Speak your medication name and dosage
4. AI will parse and fill the form automatically
5. Review and submit

### Managing Medications
- **Mark as taken**: Tap the checkbox next to each medication
- **View different dates**: Use the calendar navigation
- **Track progress**: See completion status in the header

## Project Structure

```
MyExpoApp/
├── components/           # React components
│   ├── ApiKeySetup.js   # API key configuration UI
│   └── ui/              # Reusable UI components
├── config/              # Configuration files
│   └── api.js           # API key management and endpoints
├── services/            # Business logic services
│   └── voiceService.js  # Voice recording and transcription
├── App.js               # Main application component
├── .env.example         # Example environment variables
├── .env                 # Your actual environment variables (not committed)
└── README.md           # This file
```

## API Costs

### OpenAI API Pricing (as of 2024)
- **Whisper (Speech-to-Text)**: $0.006 per minute of audio
- **GPT-3.5-turbo**: $0.0015 per 1K tokens (~750 words)

**Example usage costs**:
- 10 voice inputs per day (30 seconds each) = ~$0.03/day
- Very affordable for personal use

## Troubleshooting

### "API key not configured" error
1. Check that your `.env` file exists in the project root
2. Verify the API key format: `EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...`
3. Restart the Expo development server
4. Make sure there are no extra spaces or quotes around the key

### Voice input not working
1. Check microphone permissions on your device
2. Ensure you have a valid OpenAI API key
3. Check your internet connection
4. Try the "Check Again" button in the API setup screen

### App not loading
1. Make sure you're in the correct directory (`MyExpoApp`)
2. Run `npm install` to ensure all dependencies are installed
3. Clear Expo cache: `npx expo start --clear`

## Development

### Adding New Features
1. Create new components in `components/`
2. Add services in `services/`
3. Update configuration in `config/`
4. Test with `npx expo start`

### Environment Variables
- All public environment variables must start with `EXPO_PUBLIC_`
- Never commit the `.env` file to version control
- Update `.env.example` when adding new required variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and personal use. Please respect API terms of service and usage limits.

---

**Need help?** Check the troubleshooting section above or create an issue in the repository. 