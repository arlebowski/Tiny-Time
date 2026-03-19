# TinyTime Web → React Native Migration Guide

## Overview
This guide helps migrate TinyTime from web (React + Tailwind) to React Native.

## Architecture

### Monorepo Structure
```
/web              - Current web app (untouched)
/native           - React Native app (Expo)
/shared           - Shared code (Firebase, business logic, theme)
```

### What Transfers Directly (No Changes Needed)
- ✅ Firebase configuration & queries
- ✅ Business logic (feeding patterns, sleep analysis, calculations)
- ✅ AI context building & Gemini integration
- ✅ Date/time utilities
- ✅ Data structures & algorithms

### What Needs Translation
- ❌ UI Components (div → View, button → Pressable)
- ❌ Styling (Tailwind classes → StyleSheet)
- ❌ Navigation (web state → React Navigation)
- ❌ Animations (Framer Motion → Reanimated)
- ❌ Modals/Sheets (custom DOM → native bottom sheets)

## Component Migration Priority

### Phase 1: Core Tracking (Week 1-2)
1. . FeedSheet/SleepSheet/DiaperSheet → Bottom sheet modals
3. Timeline → FlatList with timeline items
4. FloatingTrackerMenu → Floating add button

### Phase 2: Analytics (Week 2-3)
1. Charts (use Victory Native or react-native-chart-kit)
2. Calendar components
3. Segmented controls
4. Stats cards

### Phase 3: Family & Settings (Week 3-4)
1. Family member list
2. Settings screens
3. Photo upload

### Phase 4: Polish (Week 4-5)
1. Animations
2. Haptics
3. Push notifications

## Component Conversion Templates

See COMPONENT_CONVERSION.md for detailed examples.

## Tailwind → StyleSheet Cheat Sheet

See TAILWIND_TO_RN.md for complete mappings.

## Firebase Integration

Firebase configuration is already set up in `/shared/config/firebase.js`.

Your existing Firestore queries will work with minimal changes:
- Import from `@react-native-firebase/firestore` instead of web SDK
- Syntax is nearly identical

## Next Steps

1. Start with TrackerScreen
2. Migrate one tracker card as proof of concept
3. Use that ate for other cards
4. Build out from there

