# Bug Bash Checklist - Input Half Sheet (Sleep Timer)

## Initial State & Mode Detection

- [ ] **Sheet opens to "Feed" mode by default** (when no sleep is running)
- [ ] **Sheet opens to "Sleep" mode** when a sleep is running (check localStorage)
- [ ] **Running sleep state is restored** from localStorage on open
- [ ] **Timer continues from persisted start time** when sheet reopens with running sleep

## Toggle Behavior

- [ ] **Toggle switches between Feed and Sleep modes**
- [ ] **Start time auto-populates** when toggle switches to Sleep (if in idle state)
- [ ] **Start time shows current date/time** when first switching to Sleep
- [ ] **End time is cleared** when switching to Sleep (if not in idle_with_times)

## Time Field Editing - IDLE State

- [ ] **Both start and end time fields are editable** in IDLE state
- [ ] **Start time can be set** via time picker
- [ ] **End time can be set** via time picker
- [ ] **When both times are entered, Save button appears**
- [ ] **When both times are entered, "Start Sleep" button remains visible**
- [ ] **When both times are entered, X/swipe shows confirmation dialog** (like COMPLETED)
- [ ] **If only one time is entered, Save button is hidden**
- [ ] **If times are cleared, Save button disappears**

## Time Field Editing - RUNNING State

- [ ] **Both start and end time fields are editable** in RUNNING state (NOT read-only)
- [ ] **Editing start time recalculates elapsed time** and timer continues running
- [ ] **Timer does NOT stop** when start time is edited
- [ ] **Editing end time stops the timer** and enters idle_with_times state
- [ ] **When end time is edited, timer stops immediately**
- [ ] **When end time is edited, Save button appears**
- [ ] **When end time is edited, "Start Sleep" button remains visible**

## Time Field Editing - COMPLETED State

- [ ] **Both start and end time fields are editable** in COMPLETED state
- [ ] **Editing times updates duration calculation**
- [ ] **Invalid times (end before start) show error state**
- [ ] **Save button is visible** in COMPLETED state

## Primary CTA Button (Start Sleep / End Sleep)

- [ ] **"Start Sleep" button appears** in IDLE state
- [ ] **"Start Sleep" button appears** in IDLE_WITH_TIMES state
- [ ] **"End Sleep" button appears** in RUNNING state
- [ ] **Button is hidden** in COMPLETED state
- [ ] **Tapping "Start Sleep" in IDLE** starts timer, sets start time to now, clears end time
- [ ] **Tapping "Start Sleep" in IDLE_WITH_TIMES** starts timer, sets start time to now, clears end time
- [ ] **Tapping "End Sleep" in RUNNING** stops timer, sets end time to now, enters COMPLETED

## Save Button

- [ ] **Save button is visible** in Feed mode (always)
- [ ] **Save button is visible** in Sleep mode when COMPLETED
- [ ] **Save button is visible** in Sleep mode when IDLE_WITH_TIMES
- [ ] **Save button is hidden** in Sleep mode when IDLE (no times)
- [ ] **Save button is hidden** in Sleep mode when RUNNING
- [ ] **Save button is disabled** when times are invalid (end before start)
- [ ] **Save button is enabled** when times are valid
- [ ] **Tapping Save in Feed mode** saves and closes sheet
- [ ] **Tapping Save in Sleep mode** saves, resets to IDLE, and closes sheet

## Timer Display

- [ ] **Timer shows elapsed time** when RUNNING (updates every second)
- [ ] **Timer shows calculated duration** when COMPLETED
- [ ] **Timer shows calculated duration** when IDLE_WITH_TIMES
- [ ] **Timer shows 0m 00s** when IDLE (no times)
- [ ] **Hours appear only when hours > 0**
- [ ] **Minutes are single/double digit when no hours**
- [ ] **Minutes are 2 digits when hours are present**
- [ ] **Seconds are always 2 digits**
- [ ] **Labels (h, m, s) are 16px Light, grey 500, bottom-aligned**

## Dismissal Behavior - IDLE State

- [ ] **X button closes immediately** in IDLE (no times)
- [ ] **Swipe down closes immediately** in IDLE (no times)
- [ ] **No confirmation dialog** in IDLE (no times)

## Dismissal Behavior - IDLE_WITH_TIMES State

- [ ] **X button shows confirmation dialog** in IDLE_WITH_TIMES
- [ ] **Swipe down shows confirmation dialog** in IDLE_WITH_TIMES
- [ ] **Confirmation dialog says "Delete entry?"**
- [ ] **Cancel button keeps sheet open** and stays in IDLE_WITH_TIMES
- [ ] **Delete button resets to IDLE and closes sheet**

## Dismissal Behavior - RUNNING State

- [ ] **X button closes sheet** but timer continues running
- [ ] **Swipe down closes sheet** but timer continues running
- [ ] **Timer persists in localStorage** when sheet closes
- [ ] **No confirmation dialog** in RUNNING state
- [ ] **Reopening sheet shows timer still running**

## Dismissal Behavior - COMPLETED State

- [ ] **X button shows confirmation dialog** in COMPLETED
- [ ] **Swipe down shows confirmation dialog** in COMPLETED
- [ ] **Confirmation dialog says "Delete entry?"**
- [ ] **Cancel button keeps sheet open** and stays in COMPLETED
- [ ] **Delete button resets to IDLE and closes sheet**

## Confirmation Dialog

- [ ] **Dialog is smaller** (max-w-xs instead of max-w-sm)
- [ ] **Dialog says "Delete entry?"** (no extra text)
- [ ] **Cancel button uses border-gray-300, text-gray-700**
- [ ] **Delete button uses bg-black, text-white** (not red)
- [ ] **Dialog has proper z-index** (z-[103]) above sheet
- [ ] **Clicking backdrop cancels** the dialog

## Timer Persistence (localStorage)

- [ ] **Running state is saved to localStorage** when sheet closes during RUNNING
- [ ] **localStorage key is "tt_active_sleep"**
- [ ] **localStorage stores startTime and endTime (null)**
- [ ] **localStorage is cleared** when timer stops or is saved
- [ ] **Timer continues running** even after page refresh (if localStorage exists)
- [ ] **Timer state is restored** when sheet reopens

## State Transitions

- [ ] **IDLE → RUNNING**: Start Sleep button → timer starts
- [ ] **IDLE_WITH_TIMES → RUNNING**: Start Sleep button → timer starts, end time cleared
- [ ] **RUNNING → COMPLETED**: End Sleep button → timer stops, end time set
- [ ] **RUNNING → IDLE_WITH_TIMES**: Edit end time → timer stops
- [ ] **COMPLETED → IDLE**: Save button → state resets
- [ ] **IDLE_WITH_TIMES → IDLE**: Delete confirmation → state resets

## Edge Cases

- [ ] **Switching to Feed mode while RUNNING** - timer continues in background
- [ ] **Switching back to Sleep mode while RUNNING** - timer still running
- [ ] **Editing start time while RUNNING** - timer recalculates, doesn't stop
- [ ] **Editing end time while RUNNING** - timer stops, enters IDLE_WITH_TIMES
- [ ] **Setting end time before start time** - shows invalid state, Save disabled
- [ ] **Clearing start time** - resets to IDLE
- [ ] **Clearing end time** - removes IDLE_WITH_TIMES state
- [ ] **Multiple rapid state changes** - no race conditions
- [ ] **Timer accuracy** - elapsed time matches actual time passed

## UI/UX

- [ ] **Sheet height is fixed** (doesn't grow/shrink when toggling)
- [ ] **No flashing artifacts** when toggling between modes
- [ ] **Toggle is centered** in header
- [ ] **Header is 60px tall**
- [ ] **Time fields show "--:--"** when empty
- [ ] **Time fields show formatted time** when set
- [ ] **Invalid time fields show red text**
- [ ] **Photos section works** in both modes
- [ ] **Notes field works** in both modes

## Integration

- [ ] **Component works in UI Lab** (Settings tab)
- [ ] **Component can be opened/closed** multiple times
- [ ] **State persists correctly** across open/close cycles
- [ ] **No memory leaks** (intervals are cleaned up)
- [ ] **No console errors** during normal operation

