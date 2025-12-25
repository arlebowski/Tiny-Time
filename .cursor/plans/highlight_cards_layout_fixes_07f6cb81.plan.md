---
name: Highlight Cards Layout Fixes
overview: Fix layout for Eating/Sleep bar charts (right-anchored clipping, no scroll) and Daily Activity actogram (hide time axis, full-width) in highlight cards only.
todos:
  - id: eating-remove-scroll
    content: Remove scroll container from Eating chart (lines 5141-5146), replace with overflow-hidden pr-6 clipping frame
    status: pending
  - id: eating-update-flex
    content: Update Eating flex row (lines 5147-5154) to inline-flex, remove justify-end and pr-6
    status: pending
  - id: sleep-remove-scroll
    content: Remove scroll container from Sleep chart (lines 5238-5243), replace with overflow-hidden pr-6 clipping frame
    status: pending
  - id: sleep-update-flex
    content: Update Sleep flex row (lines 5244-5251) to inline-flex, remove justify-end and pr-6
    status: pending
  - id: actogram-hide-axis
    content: Update Daily Activity wrapper (lines 5106-5118) to add translateX(-44px) and expand width to calc(100% + 44px)
    status: pending
---

# Highlight Cards Layout Fixes

## Overview

Fix layout issues in Analytics highlight cards: remove scrolling from bar charts and implement right-anchored clipping, and hide time axis labels in Daily Activity actogram while making it full-width.

## Implementation Details

### A) Eating + Sleep Bar Charts: Right-Anchored Clipping (No Scroll)

**Anchors:**

- Eating: Lines 5141-5154 (scroll container + flex row)
- Sleep: Lines 5238-5251 (scroll container + flex row)

**Changes:**

**1. Remove Scroll Container Behavior**

**Eating Chart (lines 5141-5146):**

Replace:

```javascript
React.createElement(
  'div',
  {
    className: 'overflow-x-auto overflow-y-hidden -mx-6 px-6',
    style: { scrollBehavior: 'smooth' }
  },
```

With:

```javascript
React.createElement(
  'div',
  {
    className: 'overflow-hidden pr-6'
  },
```

**Sleep Chart (lines 5238-5243):**

Replace:

```javascript
React.createElement(
  'div',
  {
    className: 'overflow-x-auto overflow-y-hidden -mx-6 px-6',
    style: { scrollBehavior: 'smooth' }
  },
```

With:

```javascript
React.createElement(
  'div',
  {
    className: 'overflow-hidden pr-6'
  },
```

**2. Update Flex Row Container**

**Eating Chart (lines 5147-5154):**

Replace:

```javascript
React.createElement(
  'div',
  {
    className: 'flex gap-6 pb-2 justify-end pr-6',
    style: {
      width: 'fit-content',
      marginLeft: 'auto'
    }
  },
```

With:

```javascript
React.createElement(
  'div',
  {
    className: 'inline-flex gap-6 pb-2',
    style: {
      width: 'fit-content',
      marginLeft: 'auto'
    }
  },
```

**Sleep Chart (lines 5244-5251):**

Replace:

```javascript
React.createElement(
  'div',
  {
    className: 'flex gap-6 pb-2 justify-end pr-6',
    style: {
      width: 'fit-content',
      marginLeft: 'auto'
    }
  },
```

With:

```javascript
React.createElement(
  'div',
  {
    className: 'inline-flex gap-6 pb-2',
    style: {
      width: 'fit-content',
      marginLeft: 'auto'
    }
  },
```

**Key Points:**

- ✅ Remove `overflow-x-auto` (no scrolling)
- ✅ Remove `-mx-6 px-6` (no horizontal margin/padding on scroll container)
- ✅ Add `pr-6` to clipping frame (right padding aligned to chevron/divider)
- ✅ Change `flex` to `inline-flex` (shrink-wrap)
- ✅ Remove `justify-end` (not needed with `marginLeft: auto`)
- ✅ Remove `pr-6` from flex row (padding is on clipping frame)
- ✅ Keep `marginLeft: auto` (anchors to right edge)
- ✅ Keep `width: fit-content` (shrink-wrap)
- ✅ Preserve all map markup (date labels, count labels unchanged)

**Result:** Rightmost bar (today) is fully visible and flush to right inner margin; left bars can be clipped; no scrolling.

---

### B) Daily Activity Actogram: Hide Time Axis + Full-Width

**Anchor:** Lines 5106-5118 (Daily Activity highlight wrapper)

**Current Structure:**

```javascript
React.createElement(
  'div',
  { className: 'overflow-hidden', style: { height: '180px', width: '100%' } },
  React.createElement(
    'div',
    { style: { transform: 'translateY(-56px)' } },
    React.createElement(DailyActivityChart, { ... })
  )
)
```

**Changes:**

**1. Add Horizontal Padding Alignment**

- The HighlightCard already has `p-6` padding (line 4587)
- The actogram wrapper should respect this padding OR extend to edges
- Since we want full-width (left text margin to right chevron margin), we should NOT add additional padding
- The outer wrapper already has `width: '100%'` which is correct

**2. Crop Time Axis and Expand Width**

Replace lines 5106-5118 with:

```javascript
React.createElement(
  'div',
  { 
    className: 'overflow-hidden', 
    style: { height: '180px', width: '100%' } 
  },
  React.createElement(
    'div',
    { 
      style: { 
        transform: 'translateX(-44px) translateY(-56px)',
        width: 'calc(100% + 44px)'
      } 
    },
    React.createElement(DailyActivityChart, {
      viewMode: 'week',
      feedings: allFeedings,
      sleepSessions: sleepSessions,
      sleepSettings: sleepSettings,
      suppressNow: false
    })
  )
)
```

**Key Points:**

- ✅ `translateX(-44px)` shifts left to hide time axis (TT.axisW = 44px)
- ✅ `translateY(-56px)` hides month header (tunable if needed)
- ✅ `width: calc(100% + 44px)` compensates for left shift, fills card width
- ✅ Keep `overflow-hidden` on outer wrapper
- ✅ Do NOT modify DailyActivityChart component itself

**Result:** Month header hidden, time axis labels hidden, chart spans full width from left text margin to right chevron/divider margin.

---

### C) Preserve Existing Behavior

- ✅ Keep click/navigation behavior (onClick handlers unchanged)
- ✅ Keep charts non-interactive (pointer-events: none already in place)
- ✅ Keep "only today colored" logic (already implemented)
- ✅ Keep all date labels and count labels (map markup unchanged)
- ✅ Do NOT affect subpage charts (only highlight card visualizations)

---

## Files to Modify

1. **script.js:**

   - Lines 5141-5154: Eating chart - remove scroll, update flex row
   - Lines 5238-5251: Sleep chart - remove scroll, update flex row
   - Lines 5106-5118: Daily Activity - add translateX, expand width

## Testing Checklist

- [ ] Eating chart: rightmost bar flush to right margin, no scrolling
- [ ] Sleep chart: rightmost bar flush to right margin, no scrolling
- [ ] Today is rightmost visible bar in both charts
- [ ] Left bars can be partially clipped
- [ ] Daily Activity: month header not visible
- [ ] Daily Activity: time axis labels not visible
- [ ] Daily Activity: chart spans full width
- [ ] Date labels remain under visible bars
- [ ] Card clicks still work
- [ ] Charts remain non-interactive
- [ ] Subpage charts unchanged