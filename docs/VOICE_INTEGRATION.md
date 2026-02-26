# Voice Interaction & Phone Assistant Integration Guide

## Overview

DW-Ai includes voice interaction capabilities and phone assistant integration, allowing users to interact with the app through voice commands and integrate with Siri (iOS) and Google Assistant (Android).

## Single-Loop Milestone

The app is aligned around a **single wellness loop** that runs on every open:

```
Open app → DW Briefing → user confirms plan → schedule shows it →
DW speaks next step → user completes one block → DW celebrates + recap
```

### DW Briefing Card

On app open the **Command Center** (`/command-center`) shows a **DW Briefing Card** at the top of the page. It:

- Displays the user's _next recommended focus_ (derived from upcoming calendar events, active habits, goals, or Life Blueprint gaps)
- Has a **"Hear it"** button that speaks the next step aloud via TTS — visible whenever the browser supports `SpeechSynthesis`, regardless of Voice Settings, so fresh-install users can experience voice immediately
- Has a **"Start with DW"** button that opens the Talk It Out thread (`/talk`) to begin the loop
- Can be dismissed if the user doesn't want it right now

This card bridges the moment of opening the app with the first spoken step from DW.

### Talk It Out (`/talk`)

The Talk It Out thread is the primary voice-enabled conversation space. It provides:

- **"Listen"** button on every DW response — visible and clickable only when **Voice Settings → Enable Voice Responses** is on
- **"Read back"** button on every user message — also gated by Voice Settings
- **Auto-speak** option (enabled in Voice Settings): new DW responses speak automatically

> **Note:** The "Listen" and "Read back" controls in the Talk It Out thread require **Voice Responses** to be enabled in **Settings → Voice Settings**. The "Hear it" button on the Briefing Card is an exception and works without that setting.

## Features

### 1. Speech-to-Text (STT)
- **Voice Input**: Click the microphone button in any chat interface to speak your message
- **Continuous Listening**: Enable continuous mode for hands-free conversation
- **Multi-language Support**: Supports multiple languages through Web Speech API
- **Auto-submission**: Voice input automatically submits after transcription

### 2. Text-to-Speech (TTS)
- **Voice Responses**: AI assistant can speak its responses aloud
- **Auto-speak**: Enable automatic speaking of AI responses
- **Customization**: Adjust voice, speaking rate, pitch, and volume
- **Voice Selection**: Choose from available system voices
- **Manual Control**: Click "Listen" button on any AI response to hear it
- **Read Back**: Click "Read back" on any user message to hear it spoken

### 3. Voice Personality

DW can speak in three distinct personalities. Select one in **Settings → Voice Settings → Voice Personality**:

| Personality | Description | Rate | Pitch |
|---|---|---|---|
| **Calm** | Gentle, soothing pace — ideal for reflection | 0.85× | 0.9 |
| **Motivating** | Energetic, uplifting tone — great for action | 1.15× | 1.1 |
| **Direct** | Clear, neutral delivery — focused and precise | 1.0× | 1.0 |

The selected personality is saved to `localStorage` under the key `tts-settings` and applied to every TTS utterance.

### 4. Voice Settings
Access voice settings through: **Settings → Voice Settings**

Available options:
- Enable/Disable voice responses
- Toggle auto-speak for AI responses
- **Voice Personality** (Calm / Motivating / Direct)
- Select preferred voice
- Adjust speaking rate (0.5x - 2x)
- Adjust voice pitch (0.5 - 2.0)
- Control volume (0% - 100%)
- Test voice settings

### 5. Phone Assistant Integration

#### iOS (Siri)
You can use Siri to interact with DW-Ai through deep links:

**Example Commands:**
- "Hey Siri, open dwai://action?type=chat&message=How%20am%20I%20doing%20today"
- "Hey Siri, open dwai://action?type=schedule"
- "Hey Siri, open dwai://action?type=tasks"
- "Hey Siri, open dwai://action?type=meditation"

**Note:** Messages with spaces or special characters should be URL-encoded. For example, spaces become `%20`.

**Setting up Siri Shortcuts:**
1. Open the Shortcuts app on your iPhone
2. Create a new shortcut
3. Add "Open URL" action
4. Enter a DW-Ai deep link (e.g., `dwai://action?type=chat&message=check my schedule`)
5. Add to Siri with a phrase like "Check my wellness"

#### Android (Google Assistant)
Use Google Assistant with App Actions:

**Example Commands:**
- "Hey Google, ask DW-Ai to check my tasks"
- "Hey Google, open DW-Ai schedule"
- "Hey Google, start DW-Ai meditation"

**Deep Link Format:**
```
dwai://action?type=<action-name>&param1=value1&param2=value2
```

**Available Actions:**
- `chat` - Open chat with optional message parameter
- `schedule` - View schedule
- `tasks` - View tasks
- `meditation` - Browse meditation
- `workout` - Browse workouts
- `journal` - Open journal
- `checkin` - Start wellness check-in

### 6. Wake Word Activation

**"Flip the Switch"** - The app is designed with wake word support in mind. When enabled through device settings:
- Say "Flip the Switch" to activate voice listening
- App must have microphone permissions granted
- Works best in quiet environments

### 7. Privacy & Security

#### Data Protection
- Voice data is processed locally using Web Speech API when possible
- **No voice recordings are stored** — audio never leaves the device
- Voice transcripts follow the same privacy policy as text input
- TTS output is rendered locally via the browser's SpeechSynthesis API — no audio is sent to any server
- End-to-end encryption for data transmission

#### Permissions Required

**iOS:**
- Microphone access: "DW-Ai needs microphone access to enable voice input"
- Speech recognition: "DW-Ai uses speech recognition to convert your voice into text"

**Android:**
- RECORD_AUDIO: For voice input
- MODIFY_AUDIO_SETTINGS: For audio output control

#### Privacy Controls
- Voice features can be completely disabled in Settings → Voice Settings
- Clear voice data by clearing app data
- Review Privacy Policy for more details

### 8. Accessibility Features

Voice features enhance accessibility for:
- Users with mobility challenges
- Users who prefer verbal communication
- Users multitasking or on-the-go
- Users with vision impairments (when combined with screen readers)

**Accessibility Settings:**
- Large touch targets for voice buttons
- Visual feedback for voice status
- Error messages with clear guidance
- Fallback to text input always available

## Usage Examples

### Basic Voice Chat
1. Open any chat interface (Talk It Out, AI Workspace, etc.)
2. Click the microphone button
3. Speak your message
4. Message is automatically transcribed and sent
5. AI responds (with voice if enabled)

### DW Briefing (Single Loop)
1. Open the app → land on Command Center
2. DW Briefing Card shows your next recommended focus
3. Tap **"Hear it"** to let DW speak the next step aloud
4. Tap **"Start with DW"** to open Talk It Out
5. Chat with DW to confirm your plan
6. Navigate to schedule/calendar to see it
7. Complete one block and return to Talk to recap

### Continuous Voice Mode
1. Enable continuous mode in voice button settings
2. Speak multiple messages without clicking
3. Pause between messages for auto-submission
4. Disable when done

### Voice-Activated Scheduling
1. Say to Siri: "Hey Siri, open dwai://action?type=chat&message=Schedule%20meditation%20for%206%20PM"
2. App opens with the command pre-filled
3. AI processes and creates the schedule

**Note:** The URL will be URL-encoded automatically by most systems, but for manual creation, encode spaces as `%20` and special characters appropriately.

### Quick Check-in via Voice
1. Enable auto-speak in settings
2. Open Talk It Out
3. Use voice input to share your thoughts
4. Listen to AI's spoken response
5. Continue conversation naturally

## Troubleshooting

### Voice Input Not Working
- Check microphone permissions in device settings
- Ensure browser supports Web Speech API (Chrome, Safari, Edge)
- Check microphone hardware
- Try a different browser
- Ensure you're in a quiet environment

### Voice Output Not Working
- Check if TTS is enabled in settings
- Verify volume is not at 0
- Check device audio settings
- Try selecting a different voice
- Ensure browser supports Speech Synthesis API

### Deep Links Not Working
- Verify URL format is correct
- Ensure app is installed
- Check if deep link is registered (iOS) or intent filter is set (Android)
- Try rebuilding the app for native platforms

### Permission Denied
- Go to device Settings → Apps → DW-Ai → Permissions
- Enable Microphone permission
- Restart the app

## Technical Details

### Browser Support
- **Chrome/Edge**: Full support for STT and TTS
- **Safari**: Full support for STT and TTS
- **Firefox**: Limited support (Web Speech API may vary)
- **Mobile Browsers**: Support varies by platform and browser

### TTS Implementation
- Uses the browser-native `window.speechSynthesis` (Web Speech API)
- No external audio service — works offline with local voices, no data leaves the device
- Settings persisted to `localStorage` under the key `tts-settings`
- Service singleton exposed as `ttsService` from `client/src/lib/tts-service.ts`
- `TTSButton` component (`client/src/components/tts-button.tsx`) wraps the service for easy use in any page

### Supported Languages
The app currently uses English (en-US) by default but can be extended to support:
- Spanish (es-ES, es-MX)
- French (fr-FR)
- German (de-DE)
- And more depending on browser/device support

### Performance Considerations
- Voice recognition requires internet connection for cloud processing
- TTS may work offline with local voices
- Continuous mode uses more battery
- Background listening not supported for privacy reasons

## Future Enhancements

Planned features:
- Custom wake word detection
- Multi-language voice interface
- Voice training for better accuracy
- Offline voice recognition
- Voice biometric authentication
- Voice command shortcuts
- Conversation analytics

## Support

For issues or questions:
- Use the in-app feedback button
- Check Privacy Policy and Terms of Service
- Contact support through settings

---

**Note**: Voice features respect all existing privacy settings and consent requirements. Users maintain full control over when and how voice features are used. No audio is ever recorded or stored — TTS output is rendered locally only.

