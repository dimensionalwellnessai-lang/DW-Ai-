# Testing Guide for New Features

## Theme System Testing

### Manual Testing Steps:

1. **Theme Selector**:
   - Navigate to Settings page
   - Locate the "Appearance & Mood" card
   - Test selecting different themes:
     - Light
     - Dark
     - Calm Pastels
     - Energetic Neons
     - Earthy Tones
     - Ocean Breeze
     - Sunset Warmth
   - Verify that colors change when theme is selected
   - Check theme preview section updates

2. **Mood-Adaptive Themes**:
   - Toggle "Mood-Adaptive Themes" switch ON
   - Select different moods:
     - Calm (should apply Calm Pastels theme)
     - Energetic (should apply Energetic Neons theme)
     - Stressed (should apply Earthy Tones theme)
     - Focused (should apply Dark theme)
     - Relaxed (should apply Ocean Breeze theme)
     - Neutral (should apply Light theme)
   - Verify theme changes automatically based on mood
   - Toggle mood-adaptive OFF and verify manual theme selection works

## Astrology Calendar Testing

### Manual Testing Steps:

1. **Calendar Display**:
   - Navigate to Astrology page
   - Click on "Calendar" tab
   - Verify interactive calendar is displayed
   - Check current month is shown
   - Verify days have moon phase emojis

2. **Day Details**:
   - Click on different days in the calendar
   - Verify detail dialog opens
   - Check the following elements are displayed:
     - Moon phase name and emoji
     - Energy level (1-10) with progress bar
     - Mood alignment
     - Celestial events (if any)
     - Event descriptions and suggestions
     - Personal insights (if birth chart is set)

3. **Navigation**:
   - Use left/right arrows to navigate months
   - Verify month/year updates correctly
   - Check data loads for different months

## Wearable Device Integration Testing

### Manual Testing Steps:

1. **Device Management**:
   - Navigate to Settings page
   - Scroll to "Wearable Devices" card
   - Click "Add Device" button
   - Fill in device information:
     - Type: Smartwatch / Smart Ring / Fitness Tracker
     - Name: (e.g., "My Apple Watch")
     - Manufacturer: (optional)
   - Click "Add Device"
   - Verify device appears in the list

2. **Data Synchronization**:
   - Click sync button (refresh icon) on a device
   - Verify sync completes successfully
   - Check "Recent Biometric Data" card appears
   - Verify data shows:
     - Timestamp
     - Heart rate (if available)
     - Stress level (if available)
     - Detected mood badge

3. **Mood Detection**:
   - Sync multiple times
   - Observe detected mood changes based on simulated data
   - If mood-adaptive themes are enabled, verify theme changes

## Visual/Animation Testing

### What to Check:

1. **Smooth Transitions**:
   - Theme changes should be smooth (300ms transition)
   - Hover effects on cards should lift slightly
   - Color transitions should be gradual

2. **Animations**:
   - Components should fade in when loaded
   - Interactive elements should have hover states
   - Calendar day selection should have visual feedback

3. **Responsive Design**:
   - Test on different screen sizes
   - Verify calendar is usable on mobile
   - Check theme selector works on smaller screens

## Expected Behavior

### Theme System:
- Themes should persist across page refreshes (stored in localStorage)
- Mood selection should update theme immediately when mood-adaptive is enabled
- Theme preview should show current theme colors

### Astrology Calendar:
- Should display current month by default
- Days with celestial events should have sparkle icon
- Detail view should show personalized insights if birth chart exists

### Wearable Integration:
- Device list should persist across sessions
- Sync should update last synced timestamp
- Detected mood should be stored and displayed in biometric data list

## Known Limitations

1. **Mock Data**: 
   - Wearable sync uses simulated biometric data
   - Celestial events are calculated with basic algorithms (not real ephemeris API)

2. **Real-time Updates**:
   - Wearable data doesn't auto-sync (manual sync only)
   - No actual device connections implemented (proof of concept)

## Success Criteria

✅ All theme options are selectable and apply correctly
✅ Mood-adaptive theming works with mood selection
✅ Astrology calendar displays and is interactive
✅ Day details show comprehensive information
✅ Wearable devices can be added and managed
✅ Sync button triggers data updates
✅ Mood detection works from biometric data
✅ UI is smooth with proper animations
✅ All features work responsively on mobile
