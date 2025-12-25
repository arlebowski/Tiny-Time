---
name: Analytics Highlight Cards Phase 1
overview: Transform the three Analytics highlight cards to match the mock design by wrapping existing chart rendering in a reusable HighlightCard container with header, static insight text, divider, and clipped mini visualizations. No new chart logic, data fetching, or insight generation.
todos:
  - id: add-icons
    content: Add Moon and Bottle SVG icon components after existing icon definitions (around line 7777)
    status: pending
  - id: add-css-vars
    content: Add CSS variables for category accent colors (daily=blue, sleep=indigo, eating=magenta) in a style tag or inline
    status: pending
  - id: create-highlight-card
    content: Create reusable HighlightCard container component that accepts icon, label, insight text, category color, onClick, and children (chart content)
    status: pending
  - id: locate-chart-markup
    content: Locate and extract exact chart rendering markup from Volume History (line ~5640), Sleep History (line ~5817), and Daily Activity (line ~5506) sections
    status: pending
  - id: transform-daily-activity
    content: Wrap Daily Activity card with HighlightCard, reuse DailyActivityChart rendering with week view, clip visualization area
    status: pending
    dependencies:
      - create-highlight-card
      - locate-chart-markup
      - add-icons
      - add-css-vars
  - id: transform-feeding
    content: Wrap Feeding card with HighlightCard, reuse exact Volume History chart markup (last 5 days), clip visualization area
    status: pending
    dependencies:
      - create-highlight-card
      - locate-chart-markup
      - add-icons
      - add-css-vars
  - id: transform-sleep
    content: Wrap Sleep card with HighlightCard, reuse exact Sleep History chart markup (last 5 days), clip visualization area
    status: pending
    dependencies:
      - create-highlight-card
      - locate-chart-markup
      - add-icons
      - add-css-vars
---

# Analytics Highlight Cards Phase 1 Implementation

## Overview

Transform the three Analytics highlight cards (Daily Activity, Feeding, Sleep) to match the mock design by:

- Creating a reusable `HighlightCard` container component
- Wrapping existing chart rendering logic (no new chart components)
- Adding header (icon + label), static 2-line insight text, divider, and clipped mini visualization area
- Matching exact height of Volume History/Sleep History cards
- Using CSS variables for category accent colors

## Hard Constraints

- **Preserve existing navigation/click behavior** - Keep `onClick: () => setActiveModal('...')` handlers
- **Reuse exact existing chart rendering** - Copy the exact JSX/DOM blocks from Volume History, Sleep History, and Daily Activity sections
- **No new chart components or data logic** - Only wrap, clip, and style existing chart output
- **No new data fetching or state** - Use static placeholder insight text for now
- **No insight generation** - Hardcode 2-line messages as placeholders

## Implementation Details

### 1. Card Height Reference

Volume History and Sleep History cards (lines ~5640, ~5817) use:

- Container: `className: 'bg-white rounded-2xl shadow-lg p-6'` (24px padding all around)
- Title: `className: 'text-sm font-medium text-gray-600 mb-2.5 text-center'` (~20px + 10px margin)
- Chart area: `style: { height: '180px' }` for the bar container
- Labels below: Date + count text (~40px)
- **Total approximate height: ~298px** (24px top + 30px title + 180px chart + 40px labels + 24px bottom)

Since these cards don't have explicit fixed heights, the HighlightCard should use the same structure and let content determine height, OR set a fixed height of ~298px to match. For clipping purposes, we'll set a fixed height.

### 2. Create Missing Icons

Add SVG icon components in [script.js](script.js) after existing icons (around line 7777):

- **Moon icon** for Sleep card (crescent moon SVG)
- **Bottle icon** for Feeding card (baby bottle SVG)
- **BarChart** already exists (line 7739) for Daily Activity

### 3. CSS Variables for Category Colors

Add CSS variables (in a `<style>` tag in index.html or inline styles):

- `--color-daily: #3B82F6` (blue)
- `--color-sleep: #4F46E5` (indigo - existing app accent)
- `--color-eating: #EC4899` (magenta - already used for feeds)

Apply these ONLY to:

- Icon color
- Label text color
- Selected chart marks (e.g., current day bar)

### 4. Create HighlightCard Component

Create a reusable container component that accepts:

- `icon`: Icon component
- `label`: String (e.g., "Daily Activity", "Sleep", "Eating")
- `insightText`: Array of 2 strings for the 2-line insight
- `categoryColor`: CSS variable name (e.g., "var(--color-daily)")
- `onClick`: Click handler (preserves existing `setActiveModal` behavior)
- `children`: Chart content to render in the clipped visualization area

Structure:

```
<div className="bg-white rounded-2xl shadow-lg" style={{ height: '298px' }}>
  {/* Header: icon + label left, chevron right */}
  <div className="flex items-center justify-between p-4 pb-3">
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5" style={{ color: categoryColor }} />
      <span className="text-sm font-semibold" style={{ color: categoryColor }}>{label}</span>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-400" />
  </div>
  
  {/* Insight Text: 2 lines, bold, clamped with ellipsis */}
  <div className="px-4 pb-3">
    <div className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">
      {insightText[0]}
    </div>
    <div className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 mt-1">
      {insightText[1]}
    </div>
  </div>
  
  {/* Divider */}
  <div className="border-t border-gray-100 mx-4" />
  
  {/* Mini Viz Area: clipped, fixed height */}
  <div className="overflow-hidden" style={{ height: '180px', marginTop: '8px' }}>
    {children}
  </div>
</div>
```

### 5. Locate and Reuse Existing Chart Markup

**Daily Activity Card:**

- Source: `DailyActivityChart` component (line ~3226) used at line ~5506
- Reuse: Render `DailyActivityChart` with `viewMode='week'` inside HighlightCard
- Pass existing props: `feedings={allFeedings}`, `sleepSessions={sleepSessions}`, `sleepSettings={sleepSettings}`, `suppressNow={false}`

**Feeding Card:**

- Source: Volume History chart markup (lines ~5651-5745)
- Reuse: Copy the exact chart rendering logic (the `stats.chartData.map(...)` block)
- Modify: Show only last 5 days, highlight current/latest day with accent color
- Data: Use existing `stats.chartData` and `maxVolume`

**Sleep Card:**

- Source: Sleep History chart markup (lines ~5826-5902)
- Reuse: Copy the exact chart rendering logic (the `sleepBuckets.map(...)` block)
- Modify: Show only last 5 days, highlight current/latest day with accent color
- Data: Use existing `sleepBuckets`

### 6. Static Insight Text (Placeholders)

Use hardcoded 2-line messages for now:

- **Daily Activity**: `["Levi has been eating and sleeping like a champ this week!", "Great work, Levi!"]`
- **Sleep**: `["Levi is right on track to hit his average sleep today!", ""]`
- **Feeding**: `["Levi has been eating a bit less in the last three days.", "But that's totally fine!"]`

### 7. Transform Highlight Cards Section

Replace the three highlight cards (lines 5036-5121) with:

1. HighlightCard for Daily Activity (wraps DailyActivityChart)
2. HighlightCard for Feeding (wraps Volume History chart markup, last 5 days)
3. HighlightCard for Sleep (wraps Sleep History chart markup, last 5 days)

### 8. Files to Modify

- [script.js](script.js):
  - Add Moon and Bottle icon components (~line 7777)
  - Add HighlightCard component (before AnalyticsTab, ~line 4579)
  - Add CSS variables (in style tag or as inline styles in HighlightCard)
  - Transform highlight cards section (lines 5036-5121)

## Implementation Steps

1. **Add icons** - Moon and Bottle SVG components
2. **Add CSS variables** - Category accent colors
3. **Create HighlightCard component** - Reusable container with header, insight, divider, clipped viz area
4. **Locate chart markup** - Identify exact JSX blocks from Volume History, Sleep History, Daily Activity
5. **Transform Daily Activity card** - Wrap DailyActivityChart in HighlightCard
6. **Transform Feeding card** - Wrap Volume History chart markup (last 5 days) in HighlightCard
7. **Transform Sleep card** - Wrap Sleep History chart markup (last 5 days) in HighlightCard

## Constraints Summary

- ✅ Preserve existing `onClick` handlers
- ✅ Reuse exact existing chart rendering (copy JSX blocks)
- ✅ No new chart components or data logic
- ✅ No new data fetching or state
- ✅ Static placeholder insight text
- ✅ Match Volume History/Sleep History card height (~298px)
- ✅ Theme-neutral card background (white)
- ✅ Accent colors only on label/icon and selected marks
- ✅ Single unified diff output