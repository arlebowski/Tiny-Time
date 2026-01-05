---
name: Wire New Tracker Cards to Production
overview: Integrate the new TrackerCard components, detail sheets, and input half sheet with Firebase production data. Wire up real-time data, add notes/photos support, create floating create button, and migrate the new system to replace the old tracker tab UI.
todos:
  - id: extend-firestore-api
    content: Extend firestoreStorage API in script.js to support notes and photoURLs fields for feedings and sleep sessions
    status: completed
  - id: update-tracker-card-props
    content: Update TrackerCard component in TrackerCard.js to accept real data props (total, target, timelineItems, onItemClick)
    status: completed
  - id: create-data-helpers
    content: Create data transformation helpers in TrackerTab.js (formatFeedingsForCard, formatSleepSessionsForCard, formatTimelineItem)
    status: completed
    dependencies:
      - extend-firestore-api
  - id: update-timeline-item
    content: Update TimelineItem component to accept real entry data and handle onClick events
    status: completed
    dependencies:
      - update-tracker-card-props
  - id: add-realtime-listeners
    content: Keep manual refresh for feedings/sleep, use existing subscribeActiveSleep for active sleep only
    status: completed
    dependencies:
      - extend-firestore-api
  - id: wire-timeline-clicks
    content: Add onClick handlers to timeline items that pass full entry object to detail sheets
    status: completed
    dependencies:
      - update-timeline-item
  - id: wire-feed-detail-sheet
    content: Wire TTFeedDetailSheet to load, edit, save, and delete feedings from Firebase
    status: completed
    dependencies:
      - extend-firestore-api
      - wire-timeline-clicks
  - id: wire-sleep-detail-sheet
    content: Wire TTSleepDetailSheet to load, edit, save, and delete sleep sessions from Firebase
    status: completed
    dependencies:
      - extend-firestore-api
      - wire-timeline-clicks
  - id: create-floating-button
    content: Add inline floating create button to TrackerTab (no separate component)
    status: completed
  - id: wire-input-sheet-feeding
    content: Wire TTInputHalfSheet feeding mode to create new feedings in Firebase
    status: completed
    dependencies:
      - extend-firestore-api
      - create-floating-button
  - id: wire-input-sheet-sleep
    content: Wire TTInputHalfSheet sleep mode to use existing startSleep/endSleep methods, sync active sleep state
    status: completed
    dependencies:
      - extend-firestore-api
      - create-floating-button
  - id: replace-tracker-tab-ui
    content: Add feature flag (USE_NEW_UI), conditionally show new TrackerCard components, keep old UI below for testing
    status: completed
    dependencies:
      - create-data-helpers
      - wire-feed-detail-sheet
      - wire-sleep-detail-sheet
  - id: add-image-compression
    content: Add image compression helper (max 1200px width) before uploading to Firebase Storage
    status: completed
    dependencies:
      - extend-firestore-api
  - id: verify-storage-rules
    content: Verify Firebase Storage rules allow authenticated writes to photos path
    status: pending
---

# Wire New Tracker Cards to Production Data

## Overview

This plan integrates the new TrackerCard components, detail sheets (TTFeedDetailSheet, TTSleepDetailSheet), and input half sheet (TTInputHalfSheet) with Firebase production data. The implementation follows the 9-step approach with additional considerations for data model updates, real-time updates, and migration.

## Architecture

### Data Flow

```javascript
Firebase Firestore
  ├─ feedings/{id} → { ounces, timestamp, notes?, photoURLs? }
  └─ sleepSessions/{id} → { startTime, endTime, isActive, notes?, photoURLs? }
         ↓
firestoreStorage API (script.js)
         ↓
TrackerTab Component
         ↓
TrackerCard Components (feeding/sleep)
         ↓
Detail Sheets (edit/view)
Input Half Sheet (create)
```

### Component Structure

- [components/TrackerCard.js](components/TrackerCard.js): Contains TrackerCard, TimelineItem, detail sheets, and input sheet (currently demo data)
- [components/tabs/TrackerTab.js](components/tabs/TrackerTab.js): Main tracker tab (currently old UI)
- [script.js](script.js): Contains firestoreStorage API and Firebase methods

## Implementation Steps

### Phase 1: Data Model & Storage Layer Updates

#### 1.1 Extend firestoreStorage API for Notes/Photos

**File**: [script.js](script.js) (around line 796-828)

Add methods to support notes and photos:

- `updateFeedingWithNotes(id, ounces, timestamp, notes, photoURLs)` - Update feeding with optional notes/photos
- `addFeedingWithNotes(ounces, timestamp, notes, photoURLs)` - Create feeding with notes/photos
- `updateSleepSessionWithNotes(id, data)` - Update sleep session (already exists, extend to handle notes/photos)

**Photo Storage Strategy**: Use Firebase Storage (NOT base64 in Firestore)

- `uploadFeedingPhoto(base64DataUrl)` - Upload to Storage path: `/families/{familyId}/kids/{kidId}/photos/{photoId}`, return download URL
- `uploadSleepPhoto(base64DataUrl)` - Same pattern for sleep photos
- Store download URLs in `photoURLs` array in Firestore documents
- Add image compression before upload (max 1200px width) to reduce file size

#### 1.2 Update Firebase Schema Support

Ensure Firestore can handle:

- `notes` (string, optional) on feedings and sleepSessions
- `photoURLs` (array of strings, optional) on feedings and sleepSessions - stores Firebase Storage download URLs

No migration needed - Firestore is schema-less, just add fields when saving.

#### 1.3 Verify Firebase Storage Rules

**File**: Firebase Console / Storage Rules

Verify Storage rules allow authenticated writes to:

- `/families/{familyId}/kids/{kidId}/photos/{photoId}`

Rules should check user authentication and family membership.

### Phase 2: Wire TrackerCard to Production Data

#### 2.1 Update TrackerCard Component Props

**File**: [components/TrackerCard.js](components/TrackerCard.js) (line 267)Change TrackerCard to accept real data props:

```javascript
const TrackerCard = ({ 
  mode = 'sleep',
  // New props:
  total,           // e.g., 14.5 (oz or hrs)
  target,           // e.g., 14.5 (oz or hrs)
  timelineItems,    // Array of log entries
  lastEntryTime,    // For status text
  onItemClick       // Callback when timeline item clicked
})
```

#### 2.2 Create Data Transformation Helpers

**File**: [components/tabs/TrackerTab.js](components/tabs/TrackerTab.js)

Add helper functions:

- `formatFeedingsForCard(feedings, targetOunces, currentDate)` - Calculate totals, percent, timeline items
- `formatSleepSessionsForCard(sessions, targetHours, currentDate)` - Calculate totals, percent, timeline items
- `formatTimelineItem(entry, mode)` - Format single entry for TimelineItem component
- **Filter timeline to today only**: Only include entries from `currentDate` in timeline items

#### 2.3 Update TimelineItem to Accept Real Data

**File**: [components/TrackerCard.js](components/TrackerCard.js) (line 210)Change TimelineItem props:

```javascript
const TimelineItem = ({ 
  entry,      // { id, ounces/startTime/endTime, timestamp, notes?, photoURLs? }
  mode,       // 'sleep' | 'feeding'
  onClick     // Callback when clicked
})
```

### Phase 3: Data Loading (Manual Refresh)

#### 3.1 Keep Manual Refresh for Feedings/Sleep

**File**: [components/tabs/TrackerTab.js](components/tabs/TrackerTab.js)

- Keep existing polling/refresh pattern for feedings and sleep sessions
- Real-time updates are too expensive for full collections
- Manual refresh on date change or pull-to-refresh

#### 3.2 Handle Active Sleep State (Real-Time)

**File**: [components/tabs/TrackerTab.js](components/tabs/TrackerTab.js)

- Use existing `subscribeActiveSleep` (already implemented) for real-time active sleep updates
- When input sheet starts sleep, call existing `firestoreStorage.startSleep(startTime)`
- When input sheet ends sleep, call existing `firestoreStorage.endSleep(sessionId, endTime)`
- Existing subscription handles UI updates automatically

### Phase 4: Make Timeline Items Tappable

#### 4.1 Add onClick Handler to TimelineItem

**File**: [components/TrackerCard.js](components/TrackerCard.js) (line 210)Add click handler that calls `onClick(entry.id, entry)` when timeline item is clicked.

#### 4.2 Wire TimelineItem Clicks to Detail Sheets

**File**: [components/tabs/TrackerTab.js](components/tabs/TrackerTab.js)

Add state for detail sheets:

- `showFeedDetailSheet` (boolean)
- `showSleepDetailSheet` (boolean)
- `selectedEntry` (object | null) - Full entry object, not just ID

When timeline item clicked, pass full entry object and open detail sheet. No Firebase query needed.

### Phase 5: Wire Detail Sheets to Firebase

#### 5.1 Update TTFeedDetailSheet to Accept Entry Data

**File**: [components/TrackerCard.js](components/TrackerCard.js) (line 918)

Add props:

```javascript
const TTFeedDetailSheet = ({ 
  isOpen, 
  onClose,
  entry        // Full entry object: { id, ounces, timestamp, notes?, photoURLs? }
})
```

#### 5.2 Populate Form from Entry Data

When `isOpen` becomes true and `entry` exists:

- Populate form fields directly from `entry` object
- No Firebase query needed - data passed from parent

#### 5.3 Implement Save Handler

**File**: [components/TrackerCard.js](components/TrackerCard.js) (line 926)

Update `handleSave`:

- If `entry.id` exists: call `firestoreStorage.updateFeedingWithNotes(entry.id, ...)`
- If `entry` is null: call `firestoreStorage.addFeedingWithNotes(...)` (create mode)
- Upload photos to Firebase Storage first, get URLs, then save to Firestore
- Show loading state during save
- Close sheet on success
- Handle errors gracefully

#### 5.4 Implement Delete Handler

**File**: [components/TrackerCard.js](components/TrackerCard.js) (line 932)Update `handleDelete`:

- Call `firestoreStorage.deleteFeeding(entryId)`
- Show confirmation dialog before deleting
- Close sheet after delete

#### 5.5 Repeat for TTSleepDetailSheet

Same pattern for sleep detail sheet:

- Load sleep session data
- Save updates via `firestoreStorage.updateSleepSessionWithNotes(...)`
- Delete via `firestoreStorage.deleteSleepSession(id)`

### Phase 6: Add Notes & Photos Support

#### 6.1 Update Detail Sheet Photo Handling

**File**: [components/TrackerCard.js](components/TrackerCard.js)

Photo handling already exists in detail sheets (lines 937-957 for feed, 1170-1190 for sleep). Update to:

- Compress images before upload (max 1200px width)
- Upload photos to Firebase Storage via `firestoreStorage.uploadFeedingPhoto()` or `uploadSleepPhoto()`
- Store download URLs in `photoURLs` array
- Load photos from `entry.photoURLs` when editing (display from Storage URLs)

#### 6.2 Display Photos in TimelineItem

**File**: [components/TrackerCard.js](components/TrackerCard.js) (line 210)Update TimelineItem to show photo thumbnails if `entry.photoURLs` exists (similar to current `withNote` demo).

### Phase 7: Create Floating Create Button

#### 7.1 Add Inline Floating Button to TrackerTab

**File**: [components/tabs/TrackerTab.js](components/tabs/TrackerTab.js)

Add inline floating action button (no separate component):

- Fixed position: bottom-right
- Thumb-friendly spacing (account for safe area insets)
- Plus icon (circle with +)
- z-index: high enough to be above content
- onClick: opens input half sheet
- Only show on TrackerTab (not all tabs)

### Phase 8: Wire Input Half Sheet to Firebase

#### 8.1 Update TTInputHalfSheet Save Handlers

**File**: [components/TrackerCard.js](components/TrackerCard.js) (line 1642, 1722)

Update `handleAddFeeding`:

- Upload photos to Firebase Storage first (get URLs)
- Call `firestoreStorage.addFeedingWithNotes(ounces, feedingDateTime, feedingNotes, photoURLs)`
- Reset form after successful save
- Close sheet

Update `handleSave` for sleep:

- Use existing `firestoreStorage.startSleep(startTime)` and `endSleep(sessionId, endTime)` methods
- If `sleepState === 'completed'` or `isIdleWithTimes`:
  - Call `firestoreStorage.startSleep(startTime)` to create session
  - Then immediately call `firestoreStorage.endSleep(sessionId, endTime)`
  - Upload photos to Storage
  - Then call `firestoreStorage.updateSleepSessionWithNotes(sessionId, { notes, photoURLs })`
- Existing `subscribeActiveSleep` in TrackerTab handles UI updates automatically

#### 8.2 Sync Active Sleep Timer

**File**: [components/TrackerCard.js](components/TrackerCard.js) (line 1487)

When sleep state is 'running':

- Call existing `firestoreStorage.startSleep(startTime)` - creates session with `isActive: true`
- When sheet closes, session remains active in Firebase
- TrackerTab's existing `subscribeActiveSleep` subscription will show timer automatically

### Phase 9: Ensure Real-Time Updates in Cards

#### 9.1 Add Feature Flag and Update TrackerTab

**File**: [components/tabs/TrackerTab.js](components/tabs/TrackerTab.js) (around line 6)

Add feature flag at top of component:

```javascript
const USE_NEW_UI = false; // Set to true to show new cards
```

#### 9.2 Update TrackerTab to Use New Cards (Conditional)

**File**: [components/tabs/TrackerTab.js](components/tabs/TrackerTab.js) (around line 722)

When `USE_NEW_UI === true`, show new TrackerCard components:

```javascript
React.createElement(window.TrackerCard, {
  mode: 'feeding',
  total: feedingTotal,
  target: targetOunces,
  timelineItems: formattedFeedingsToday, // Filter to today only
  lastEntryTime: lastFeedingTime,
  onItemClick: (entry) => {
    setSelectedFeedEntry(entry);
    setShowFeedDetailSheet(true);
  }
}),
React.createElement(window.TrackerCard, {
  mode: 'sleep',
  total: sleepTotalHours,
  target: sleepTargetHours,
  timelineItems: formattedSleepSessionsToday, // Filter to today only
  lastEntryTime: lastSleepTime,
  onItemClick: (entry) => {
    setSelectedSleepEntry(entry);
    setShowSleepDetailSheet(true);
  }
})
```

When `USE_NEW_UI === false`, show old UI below new cards (keep both for testing).

#### 9.3 Add Detail Sheet Instances

**File**: [components/tabs/TrackerTab.js](components/tabs/TrackerTab.js)

Add detail sheet components at end of return:

```javascript
window.TTFeedDetailSheet && React.createElement(window.TTFeedDetailSheet, {
  isOpen: showFeedDetailSheet,
  onClose: () => setShowFeedDetailSheet(false),
  entry: selectedFeedEntry
}),
window.TTSleepDetailSheet && React.createElement(window.TTSleepDetailSheet, {
  isOpen: showSleepDetailSheet,
  onClose: () => setShowSleepDetailSheet(false),
  entry: selectedSleepEntry
}),
window.TTInputHalfSheet && React.createElement(window.TTInputHalfSheet, {
  isOpen: showInputSheet,
  onClose: () => setShowInputSheet(false)
})
```

### Phase 10: SKIPPED - Migration Deferred

**Note**: Phase 10 is skipped per requirements. Old UI remains in TrackerTab below new cards for testing. Will be removed after testing is complete.

## Testing Checklist

- [ ] New cards show real data from Firebase
- [ ] Progress bars calculate correctly from real totals
- [ ] Timeline items display real log entries
- [ ] Clicking timeline item opens detail sheet with correct data
- [ ] Detail sheet can edit and save changes to Firebase
- [ ] Detail sheet can delete entries from Firebase
- [ ] Input sheet can create new feedings in Firebase
- [ ] Input sheet can create new sleep sessions in Firebase
- [ ] Active sleep timer syncs with Firebase
- [ ] Active sleep updates in real-time via subscribeActiveSleep
- [ ] Feedings/sleep refresh manually (not real-time)
- [ ] Photos upload to Firebase Storage and load correctly
- [ ] Image compression works (max 1200px width)
- [ ] Notes save and load correctly
- [ ] Floating create button appears on TrackerTab
- [ ] Floating button opens input sheet
- [ ] Timeline shows only today's entries
- [ ] Feature flag toggles between old/new UI
- [ ] Old UI remains below new cards for testing

## Notes

- Photo storage uses Firebase Storage (not base64 in Firestore) for better performance and scalability.
- Real-time updates only for active sleep (via existing subscribeActiveSleep). Feedings/sleep use manual refresh.
- Detail sheets receive full entry objects (no Firebase queries needed).
- Feature flag (USE_NEW_UI) allows safe testing before full migration.
- Old UI kept in TrackerTab below new cards for comparison during testing.
- Timeline filtered to show only today's entries.win