# Tiny Tracker Design System

**Version**: 1.0  
**Last Updated**: January 2025  
**Primary Design**: v3 variant2 (production standard)

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Patterns](#component-patterns)
6. [Animation Standards](#animation-standards)
7. [Interaction Patterns](#interaction-patterns)
8. [Data Formatting](#data-formatting)
9. [Feature Flags](#feature-flags)

---

## Design Philosophy

### Core Principles

1. **Apple Health-Inspired Aesthetics**: Understated, refined, information-first
2. **Token-First Design**: Never hardcode colors - always use CSS variables
3. **Consistent Hierarchy**: Clear visual priority through size, weight, color
4. **Mobile-First**: Thumb-friendly, iOS-optimized interactions
5. **Smooth Transitions**: Everything animates, nothing pops

### Design Language

- **Information is beautiful when understated**
- **Favor subtle over bold** (except primary actions)
- **Consistency over creativity** (patterns scale)
- **Polish the edges** (handle empty states, loading, transitions)

---

## Color System

### CSS Variable Tokens

**Never hardcode hex values. Always use tokens.**

```css
/* Category Colors - Feeding */
--tt-feed: #d45d5c;           /* Primary: icons, buttons, progress */
--tt-feed-soft: [lighter];     /* Secondary: backgrounds, yesterday */
--tt-feed-softer: [even lighter]; /* Tertiary: subtle backgrounds */
--tt-feed-strong: [darker];    /* Hover/active states */

/* Category Colors - Sleep */
--tt-sleep: #4a8ac2;          /* Primary: icons, buttons, progress */
--tt-sleep-soft: [lighter];    /* Secondary: naps, backgrounds */
--tt-sleep-softer: [even lighter]; /* Tertiary: active pill background */
--tt-sleep-strong: [darker];   /* Hover/active states */

/* Neutral Tokens */
--tt-text-primary: [main text];     /* Big numbers, primary labels */
--tt-text-secondary: [secondary];   /* Units, timeline text */
--tt-text-tertiary: [tertiary];     /* Placeholders, metadata */

--tt-card-bg: [card background];    /* Card backgrounds */
--tt-card-border: [card border];    /* Card borders, dividers */
--tt-input-bg: [input background];  /* Input fields (v2) */
--tt-subtle-surface: [subtle];      /* Timeline items, pills, track (v3) */
--tt-app-bg: [app background];      /* Main app background */
```

### Usage Rules

1. **Category colors**: Use for primary UI (icons, buttons, progress)
2. **Soft variants**: Use for secondary UI (pills, backgrounds)
3. **Text hierarchy**: primary > secondary > tertiary (decreasing emphasis)
4. **Dark mode**: Tokens auto-adapt (no manual `dark:` variants needed)

### Opacity Standards

```javascript
opacity: 1.0   // Default (full)
opacity: 0.85  // Reference lines
opacity: 0.72  // Sleep blocks
opacity: 0.7   // Yesterday number
opacity: 0.6   // Yesterday bar, labels
opacity: 0.35  // Inactive legend items
opacity: 0.3   // Pulse animation peaks
```

### RGBA Helper

```javascript
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Usage
backgroundColor: hexToRgba(categoryColor, 0.08) // Subtle backgrounds
```

---

## Typography

### Size Scale

```javascript
// Headers
'text-[17.6px] font-semibold'  // Card headers (v3 variant2)
'text-[16px] font-semibold'    // Page titles, section headers

// Display Numbers
'text-[39.6px] font-bold leading-none'  // Main tracker value (v3)
'text-[40px] font-bold leading-none'    // Main tracker value (v2)
'text-[2.25rem] font-bold leading-none' // Chart average (36px)

// Body
'text-[17.6px] font-normal'  // Units, target text (v3)
'text-[15.4px] font-normal'  // Status pills, timeline secondary, stat card units
'text-[15.4px] font-medium'  // Stat card labels
'text-2xl font-bold'          // Stat card main numbers (24px)
'text-sm font-medium'         // Labels (14px)
'text-xs font-normal'        // Stat card average labels, tiny labels (12px)
```

### Font Weight

```javascript
font-bold (700)      // Big numbers, key metrics
font-semibold (600)  // Headers, emphasized text
font-medium (500)    // Labels, secondary emphasis
font-normal (400)    // Body text, descriptions
font-light (300)     // zZz animation characters
```

### Number Formatting

```javascript
// formatV3Number - Production standard
// Whole numbers: no decimal
// Non-whole: one decimal
function formatV3Number(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const rounded = Math.round(x);
  if (Math.abs(x - rounded) < 1e-9) return String(rounded); // "7"
  return x.toFixed(1); // "7.3"
}

// Examples
formatV3Number(7) → "7"
formatV3Number(7.3) → "7.3"
formatV3Number(7.0) → "7"
```

### Time Formatting

```javascript
// 12-hour format: "3:45pm" (lowercase, no space)
function formatTime12Hour(timestamp) {
  const d = new Date(timestamp);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  const mins = String(minutes).padStart(2, '0');
  return `${hours}:${mins}${ampm}`;
}

// HMS format (smart formatting)
// < 1 min: "45s" (no leading zero if < 10s)
// < 1 hr:  "34m 12s" (minute can be single digit)
// >= 1 hr: "2h 34m 12s" (all units shown)
function formatElapsedHmsTT(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  
  if (h > 0) {
    const hStr = h >= 10 ? String(h).padStart(2, '0') : String(h);
    const mStr = String(m).padStart(2, '0');
    const sStr = String(s).padStart(2, '0');
    return `${hStr}h ${mStr}m ${sStr}s`;
  }
  
  if (m > 0) {
    const mStr = m >= 10 ? String(m).padStart(2, '0') : String(m);
    const sStr = String(s).padStart(2, '0');
    return `${mStr}m ${sStr}s`;
  }
  
  const sStr = s < 10 ? String(s) : String(s).padStart(2, '0');
  return `${sStr}s`;
}
```

---

## Spacing & Layout

### Card Padding

```javascript
'p-5'  // TrackerCard internal (20px) - v3 standard
'p-6'  // Standard card padding (24px) - Today card, Analytics
```

### Vertical Spacing

```javascript
'mb-8'  // Header to big number (32px)
'mb-6'  // Section spacing (24px)
'mb-4'  // Subsection spacing (16px)
'mb-[13px]' // Big number to progress (v3 specific)
'mb-3'  // Divider to content (12px)
'mb-2'  // Tight row spacing (8px)
'mb-1'  // Minimal spacing (4px)
'mb-0'  // No margin (let other elements handle spacing)
```

### Internal Gaps

```javascript
'gap-1'  // Icon + label (4px)
'gap-2'  // Timeline icon + text (8px)
'gap-3'  // Timeline pills, standard flex gap (12px)
```

### Border Radius

```javascript
'rounded-2xl' (16px)  // Cards, timeline items, major containers
'rounded-xl'  (12px)  // Date nav track, sub-containers
'rounded-lg'  (8px)   // Pills, buttons, inputs
```

### Page Layout

```javascript
// Standard container
className: 'space-y-4'  // Vertical card stack (16px gaps)

// Horizontal padding
className: 'px-4'  // 16px horizontal (standard page padding)

// Full bleed (date navigation)
margin: '0 -1rem'  // Break out of px-4 padding
```

---

## Component Patterns

### 1. TrackerCard (v3 variant2) - Production Standard

#### Structure

```
┌─────────────────────────────────────────────────┐
│ [Icon+Label] .................... [Status Pill] │  Header (48px)
│                                                  │
│ [Big Number][Unit]                               │  Big Number
│                                                  │
│ [========Progress Bar=======]                    │  Progress (15.84px)
│                                                  │
│ [Yesterday Comparison] (optional)                │  Yesterday
│                                                  │
│ ──────────────────────────────────────────────  │  Divider
│                                                  │
│ [Count Pill] [Status Pill] ........ [Chevron]   │  Timeline Header
│                                                  │
│ [Timeline Items] (expandable)                    │  Timeline
└─────────────────────────────────────────────────┘
```

#### Header Pattern (v3 variant2)

```javascript
// Left side: Icon + Label
React.createElement('div', { className: 'flex items-center gap-1' },
  React.createElement(IconComponent, {
    className: 'w-5 h-5', // 20px
    style: { 
      color: 'var(--tt-feed)' or 'var(--tt-sleep)',
      strokeWidth: mode === 'feeding' ? '1.5' : undefined,
      fill: mode === 'feeding' ? 'none' : 'var(--tt-sleep)',
      transform: mode === 'feeding' ? 'rotate(20deg)' : undefined
    }
  }),
  React.createElement('span', {
    className: 'text-[17.6px] font-semibold',
    style: { color: 'var(--tt-feed)' or 'var(--tt-sleep)' }
  }, 'Feeding' or 'Sleep')
)

// Right side: Status Pill
React.createElement('span', {
  className: 'inline-flex items-center h-[35.2px] px-[13.2px] rounded-lg text-[15.4px] font-normal',
  style: {
    backgroundColor: isActive ? 'var(--tt-sleep-softer)' : 'var(--tt-subtle-surface)',
    color: isActive ? 'var(--tt-sleep)' : 'var(--tt-text-tertiary)'
  }
}, statusText)
```

#### Big Number Pattern (v3 variant2)

```javascript
// No icon in variant2 - just number + target
React.createElement('div', { 
  className: 'flex items-baseline gap-1 mb-[13px]'
},
  // Number
  React.createElement('div', { 
    className: 'text-[39.6px] leading-none font-bold',
    style: { color: 'var(--tt-feed)' or 'var(--tt-sleep)' }
  }, formatV3Number(total)),
  
  // Target
  React.createElement('div', { 
    className: 'relative -top-[1px] text-[17.6px] leading-none font-normal',
    style: { color: 'var(--tt-text-secondary)' }
  }, `/ ${formatV3Number(target)} ${unit}`)
)
```

#### Progress Bar Pattern

```javascript
// Track
React.createElement('div', {
  className: 'relative w-full h-[15.84px] rounded-2xl overflow-hidden mb-0',
  style: { backgroundColor: 'var(--tt-subtle-surface)' }
},
  // Fill
  React.createElement('div', {
    className: `absolute left-0 top-0 h-full rounded-2xl ${isActive ? 'tt-sleep-progress-pulse' : ''}`,
    style: {
      width: `${percent}%`,
      backgroundColor: 'var(--tt-feed)' or 'var(--tt-sleep)',
      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      minWidth: '0%'
    }
  })
)
```

#### Yesterday Comparison Pattern

```javascript
// Only show when: isViewingToday && showYesterdayComparison

// Layout
React.createElement('div', { className: 'mb-8 mt-3' },
  // Number + label inline
  React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
    React.createElement('span', {
      className: 'text-[15.4px] font-bold leading-none',
      style: { 
        color: 'var(--tt-feed-soft)' or 'var(--tt-sleep-soft)',
        opacity: 0.7 
      }
    }, `${formattedTotal}${unit}`),
    React.createElement('span', {
      className: 'text-[15.4px] font-normal leading-none',
      style: { color: 'var(--tt-text-tertiary)', opacity: 0.6 }
    }, `as of ${displayTime} yesterday`)
  ),
  
  // Progress bar (40% height of main bar)
  React.createElement('div', {
    className: 'relative w-full rounded-2xl overflow-hidden',
    style: {
      height: '9.6px', // 40% of 15.84px main bar
      backgroundColor: 'var(--tt-subtle-surface)'
    }
  },
    React.createElement('div', {
      className: 'absolute left-0 top-0 h-full rounded-2xl',
      style: {
        width: `${yesterdayPercent}%`,
        backgroundColor: 'var(--tt-feed-soft)' or 'var(--tt-sleep-soft)',
        opacity: 0.6,
        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: yesterdayPercent > 0 ? '2px' : '0px'
      }
    })
  )
)
```

#### Timeline Header Pattern (v3 variant2)

```javascript
// Feeding: Replace "Timeline" with pills
[Count Pill] [Status Pill] ........... [Chevron]

// Sleep: Show pills inline
[Count Pill] [Status Pill] ........... [Chevron]

// Count Pill
React.createElement('span', {
  className: 'inline-flex items-center h-[35.2px] px-[13.2px] rounded-lg text-[15.4px] font-normal',
  style: { 
    backgroundColor: 'var(--tt-subtle-surface)',
    color: 'var(--tt-text-tertiary)' 
  }
}, `${count} ${noun}${count !== 1 ? 's' : ''} today`)

// Status Pill (same as header right pill)
```

#### Timeline Item Pattern

```javascript
// Structure
React.createElement('div', {
  className: 'rounded-2xl tt-tapable',
  style: { backgroundColor: 'var(--tt-subtle-surface)' }
},
  React.createElement('div', { className: 'p-4' },
    // Row 1: Icon + Text + Chevron
    React.createElement('div', { className: 'flex items-center justify-between mb-2' },
      React.createElement('div', { className: 'flex items-center gap-3' },
        // Icon (39.6px - 25% larger than header)
        React.createElement(IconComponent, {
          style: { 
            width: '2.475rem', 
            height: '2.475rem',
            color: 'var(--tt-feed)' or 'var(--tt-sleep)',
            strokeWidth: mode === 'feeding' ? '1.5' : '3',
            fill: mode === 'feeding' ? 'none' : 'var(--tt-sleep)',
            transform: mode === 'feeding' ? 'rotate(20deg)' : undefined
          }
        }),
        // Text
        React.createElement('div', null,
          React.createElement('div', { 
            className: 'font-semibold',
            style: { color: 'var(--tt-text-secondary)' }
          }, primaryText), // "4.5oz" or "2h 34m"
          React.createElement('div', { 
            className: 'text-[15.4px]',
            style: { color: 'var(--tt-text-secondary)' }
          }, secondaryText) // "3:45pm" or "1:30pm – 4:04pm"
        )
      ),
      React.createElement(ChevronRight, { 
        className: 'w-5 h-5',
        style: { color: 'var(--tt-text-secondary)' }
      })
    ),
    // Row 2: Notes (if present)
    hasNote && React.createElement('div', {
      className: 'italic text-[15.4px] mb-3',
      style: { color: 'var(--tt-text-secondary)' }
    }, `Note: ${notes}`),
    // Row 3: Photos (if present - 2-column grid, max 4)
    hasPhotos && React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
      photoURLs.slice(0, 4).map((url, i) =>
        React.createElement('img', {
          key: i,
          src: url,
          className: 'aspect-square rounded-2xl object-cover'
        })
      )
    )
  )
)
```

### 2. Today Card Pattern (Optional Feature)

```javascript
// Toggle: localStorage.getItem('tt_show_today_card') === 'true'

// Structure (v3 variant2)
┌─────────────────────────────────────────────────┐
│ [Icon+Label] Feeding                             │
│ 14.5 / 24.0 oz                                   │
│ [========Progress Bar=======]                    │
│ Last ate at 3:45pm (4.5 oz)                      │
│                                                  │
│ [Icon+Label] Sleep                               │
│ 12.3 / 14.0 hrs                                  │
│ [========Progress Bar=======]                    │
│ Last woke at 6:30am                              │
└─────────────────────────────────────────────────┘
```

```javascript
React.createElement('div', {
  className: 'rounded-2xl shadow-sm p-6',
  style: { backgroundColor: 'var(--tt-card-bg)' }
},
  // Feeding Section
  React.createElement('div', { className: 'mb-8' },
    // Icon + Label
    React.createElement('div', { className: 'flex items-center mb-2' },
      React.createElement('div', {
        className: 'text-sm font-medium inline-flex items-center gap-2',
        style: { color: 'var(--tt-feed)' }
      },
        React.createElement(IconComponent, { className: 'w-[18px] h-[18px]' }),
        React.createElement('span', null, 'Feeding')
      )
    ),
    // Big number
    React.createElement('div', { className: 'flex items-baseline justify-between mb-2' },
      React.createElement('div', {
        className: 'text-2xl font-semibold',
        style: { color: 'var(--tt-feed)' }
      },
        `${formatV3Number(total)} `,
        React.createElement('span', {
          className: 'text-base font-normal',
          style: { color: 'var(--tt-text-secondary)' }
        }, `of ${formatV3Number(target)} oz`)
      )
    ),
    // Progress bar (22px height in Today card)
    React.createElement('div', {
      className: 'relative w-full h-[22px] rounded-2xl overflow-hidden mb-2',
      style: { backgroundColor: 'var(--tt-input-bg)' }
    },
      React.createElement('div', {
        className: 'absolute left-0 top-0 h-full rounded-2xl',
        style: {
          width: `${percent}%`,
          background: 'var(--tt-feed)',
          transition: 'width 0.6s ease-out'
        }
      })
    ),
    // Status text
    React.createElement('div', {
      className: 'text-xs text-right',
      style: { color: 'var(--tt-text-tertiary)' }
    }, statusText)
  ),
  // Sleep Section (same pattern)
)
```

### 3. Date Navigation Pattern

```javascript
React.createElement('div', {
  className: 'date-nav-container',
  style: {
    backgroundColor: 'var(--tt-app-bg)',
    padding: '16px 16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: `0.5px solid ${dividerColor}`,
    margin: '0 -1rem 1rem -1rem' // Full bleed
  }
},
  React.createElement('div', {
    className: 'date-nav',
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      backgroundColor: 'var(--tt-subtle-surface)',
      padding: '8px 16px',
      borderRadius: '12px'
    }
  },
    // Left chevron
    React.createElement('div', {
      onClick: goToPreviousDay,
      className: 'nav-arrow',
      style: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }
    }, React.createElement(ChevronLeft, { 
      className: 'w-5 h-5',
      style: { color: 'var(--tt-text-tertiary)' }
    })),
    // Date label
    React.createElement('div', {
      className: 'date-text',
      style: {
        fontSize: '17px',
        fontWeight: 600,
        color: 'var(--tt-text-primary)',
        flex: 1,
        textAlign: 'center'
      }
    }, formatDate(currentDate)),
    // Right chevron (disabled when viewing today)
    React.createElement('div', {
      onClick: isToday() ? null : goToNextDay,
      className: 'nav-arrow',
      style: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isToday() ? 'not-allowed' : 'pointer'
      }
    }, React.createElement(ChevronRight, { 
      className: 'w-5 h-5',
      style: { 
        color: isToday() 
          ? (isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.24)')
          : 'var(--tt-text-tertiary)'
      }
    }))
  )
)
```

### 4. Icon + Label Header Pattern (Reusable)

**Use case**: Category headers with icon and label (TrackerCard headers, Analytics highlight cards, section headers, etc.)

```javascript
// Standard icon + label header
React.createElement('div', { 
  className: 'flex items-center gap-1' 
},
  React.createElement(IconComponent, {
    className: 'w-5 h-5', // 20px
    style: { 
      color: categoryColor, // 'var(--tt-feed)' or 'var(--tt-sleep)' or custom
      strokeWidth: isFeeding ? '1.5' : undefined,
      fill: isFeeding ? 'none' : categoryColor,
      transform: isFeeding ? 'rotate(20deg)' : undefined
    }
  }),
  React.createElement('span', {
    className: 'text-[17.6px] font-semibold',
    style: { color: categoryColor }
  }, label) // 'Feeding', 'Sleep', 'Daily Activity', etc.
)
```

**Specifications**:
- Icon size: `w-5 h-5` (20px)
- Gap: `gap-1` (4px)
- Text: `text-[17.6px] font-semibold`
- Color: Use category color token (`var(--tt-feed)`, `var(--tt-sleep)`, or custom)
- Icon styling: 
  - Feeding icons: `strokeWidth: 1.5`, `fill: none`, `transform: rotate(20deg)`
  - Sleep icons: `fill: color` (no stroke, no transform)
  - Other icons: Use appropriate styling for the icon type

**Used in**:
- TrackerCard headers (v3 variant2)
- Analytics highlight cards
- Any category header requiring icon + label consistency

### 5. Analytics Highlight Card Pattern

```javascript
// Structure
┌─────────────────────────────────────────────────┐
│ [Icon + Label] .................... [ChevronRight] │
│                                                  │
│ [Insight Text - bold, 2 lines max, clamped]     │
│                                                  │
│ ──────────────────────────────────────────────  │
│                                                  │
│ [Mini Viz - 240px fixed height]                 │
└─────────────────────────────────────────────────┘

React.createElement('div', {
  className: 'rounded-2xl shadow-lg p-6 cursor-pointer',
  style: { backgroundColor: 'var(--tt-card-bg)' },
  onClick: openModal
},
  // Header: icon + label left, chevron right
  // Uses Icon + Label Header Pattern (see section 4)
  // Note: Pass isFeeding={true} for feeding icons to apply rotation and stroke styling
  React.createElement('div', { className: 'flex items-center justify-between mb-3 h-6' },
    React.createElement('div', { className: 'flex items-center gap-1' },
      React.createElement(Icon, {
        className: 'w-5 h-5',
        style: { 
          color: categoryColor,
          strokeWidth: isFeeding ? '1.5' : undefined,
          fill: isFeeding ? 'none' : categoryColor,
          transform: isFeeding ? 'rotate(20deg)' : undefined
        }
      }),
      React.createElement('span', {
        className: 'text-[17.6px] font-semibold leading-6',
        style: { color: categoryColor }
      }, label)
    ),
    React.createElement(ChevronRight, {
      className: 'w-5 h-5',
      style: { color: 'var(--tt-text-tertiary)', strokeWidth: '3' }
    })
  ),
  
  // Insight text (bold, clamped to 2 lines)
  React.createElement('div', { className: 'mb-3' },
    React.createElement('div', {
      className: 'text-base font-bold leading-tight',
      style: {
        color: 'var(--tt-text-primary)',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, insightText)
  ),
  
  // Divider
  React.createElement('div', {
    className: 'border-t mb-3',
    style: { borderColor: 'var(--tt-card-border)' }
  }),
  
  // Mini viz (fixed 240px height)
  React.createElement('div', { style: { height: '240px' } },
    chartComponent
  )
)

// Usage example with feeding icon (requires rotation)
React.createElement(HighlightCard, {
  icon: BottleV2Icon,
  label: 'Feeding',
  insightText: ['Levi has been eating well this week!'],
  categoryColor: 'var(--tt-feed)',
  isFeeding: true, // Applies rotate(20deg), strokeWidth: 1.5, fill: none
  onClick: () => openModal('feeding')
}, chartComponent)

// Usage example with sleep icon (no rotation)
React.createElement(HighlightCard, {
  icon: MoonV2Icon,
  label: 'Sleep',
  insightText: ['Levi has been sleeping great!'],
  categoryColor: 'var(--tt-sleep)',
  // isFeeding defaults to false, so no rotation/stroke applied
  onClick: () => openModal('sleep')
}, chartComponent)
```

**Note**: The `isFeeding` prop is required for feeding icons to apply the 20-degree rotation and stroke styling. This matches the TrackerCard header pattern.

### 6. Segmented Toggle Pattern

```javascript
// Used in: Analytics subtabs (D/W/M timeframe selector)
// Component: SegmentedToggle (components/shared/SegmentedToggle.js)

// Structure
┌─────────────────────────────────────────┐
│ [Track: var(--tt-subtle-surface)]      │
│  ┌─────┐ ┌─────┐ ┌─────┐              │
│  │  D  │ │  W  │ │  M  │              │
│  └─────┘ └─────┘ └─────┘              │
│  ↑ Selected: semi-transparent white    │
└─────────────────────────────────────────┘

// Track (container)
React.createElement('div', {
  className: 'flex rounded-xl w-full px-1 py-[3px]',
  style: { backgroundColor: 'var(--tt-subtle-surface)' }
},
  // Selected button
  React.createElement('button', {
    className: 'rounded-lg transition font-semibold flex-1 text-[13px] px-3 py-[6px] shadow-sm',
    style: {
      backgroundColor: 'rgba(255, 255, 255, 0.12)', // Semi-transparent white
      color: 'var(--tt-text-primary)'
    }
  }, 'D'),
  
  // Unselected buttons
  React.createElement('button', {
    className: 'rounded-lg transition font-semibold flex-1 text-[13px] px-3 py-[6px] bg-transparent text-gray-600'
  }, 'W'),
  React.createElement('button', {
    className: 'rounded-lg transition font-semibold flex-1 text-[13px] px-3 py-[6px] bg-transparent text-gray-600'
  }, 'M')
)
```

**Specifications**:
- **Track**: `backgroundColor: 'var(--tt-subtle-surface)'` (adapts to dark mode)
- **Selected button**: 
  - Background: `rgba(255, 255, 255, 0.12)` (semi-transparent white - lighter than track but not bright)
  - Text: `var(--tt-text-primary)` (adapts to dark mode)
  - Shadow: `shadow-sm`
- **Unselected buttons**: 
  - Background: `transparent`
  - Text: `text-gray-600` (light mode) / `var(--tt-text-secondary)` (dark mode via CSS)
- **Sizing**: 
  - Container padding: `px-1 py-[3px]`
  - Button padding: `px-3 py-[6px]`
  - Text size: `text-[13px]`
  - Border radius: `rounded-xl` (track), `rounded-lg` (buttons)
- **Layout**: `flex` with `flex-1` on buttons for equal distribution

**Dark Mode Behavior**:
- Track uses `var(--tt-subtle-surface)` which is `rgba(255,255,255,0.05)` in dark mode
- Selected button uses `rgba(255, 255, 255, 0.12)` which provides subtle contrast (2.4x lighter than track)
- This creates a visible but not harsh selection indicator

**Used in**:
- Analytics subtabs (FeedingAnalyticsTab, SleepAnalyticsTab, ActivityAnalyticsTab)
- Any segmented control requiring timeframe or option selection

### 7. Chevron Icon Pattern

```javascript
// Used in: Navigation indicators, card headers, back buttons
// Icons: Phosphor ChevronLeftIcon, ChevronRightIcon (from components/shared/icons.js)

// Right Chevron (indicates forward/navigation)
React.createElement(window.TT?.shared?.icons?.ChevronRightIcon || ChevronRight, {
  className: 'w-5 h-5',
  style: { color: 'var(--tt-text-tertiary)' }
})

// Left Chevron (indicates back/previous)
React.createElement(window.TT?.shared?.icons?.ChevronLeftIcon || ChevronLeft, {
  className: 'w-5 h-5',
  style: { color: 'var(--tt-text-secondary)' }
})
```

**Specifications**:
- **Icon Source**: Use Phosphor icons from `window.TT.shared.icons` with fallback to legacy icons
- **Size**: Always `w-5 h-5` (20px × 20px)
- **Colors**:
  - **Right chevrons** (navigation indicators): `var(--tt-text-tertiary)` - subtle, indicates forward action
  - **Left chevrons** (back buttons): `var(--tt-text-secondary)` - more visible for primary navigation
- **No strokeWidth**: Phosphor icons use fill, not stroke (unlike legacy Lucide-style icons)
- **Fallback pattern**: Always include fallback: `window.TT?.shared?.icons?.ChevronRightIcon || ChevronRight`

**Usage Patterns**:

1. **Card Headers** (Highlight cards, navigation indicators):
   ```javascript
   // Right side of header, indicates card is tappable
   React.createElement(window.TT?.shared?.icons?.ChevronRightIcon || ChevronRight, {
     className: 'w-5 h-5',
     style: { color: 'var(--tt-text-tertiary)' }
   })
   ```

2. **Back Buttons** (Subtab headers):
   ```javascript
   // Left side, indicates navigation back
   React.createElement(window.TT?.shared?.icons?.ChevronLeftIcon || ChevronLeft, {
     className: 'w-5 h-5',
     style: { color: 'var(--tt-text-secondary)' }
   })
   ```

3. **Date Navigation** (TrackerTab date picker):
   ```javascript
   // Left/right arrows for date navigation
   React.createElement(window.TT?.shared?.icons?.ChevronLeftIcon || ChevronLeft, {
     className: 'w-5 h-5',
     isTapped: false,
     selectedWeight: 'bold',
     style: { color: chevronColor }
   })
   ```

**Used in**:
- Analytics highlight cards (right chevron)
- Analytics subtab back buttons (left chevron)
- TrackerTab date navigation (left/right chevrons)
- Any navigation or tappable card indicator

**Note**: Always use the Phosphor icon system with fallback for backward compatibility. The Phosphor icons are fill-based (no stroke), so remove any `strokeWidth` properties when migrating from legacy icons.

### 8. Stat Card Pattern (2-Column Grid)

```javascript
// Used in: Analytics subtabs (FeedingAnalyticsTab, SleepAnalyticsTab)
// Structure: 2-column grid with stat cards showing metrics

// Card Container
React.createElement('div', {
  className: 'rounded-2xl shadow-sm p-6 flex flex-col',
  style: { backgroundColor: 'var(--tt-card-bg)' }
},
  // Label (top)
  React.createElement('div', {
    className: 'text-[15.4px] font-medium mb-2',
    style: { color: 'var(--tt-text-secondary)' }
  }, 'Oz / Feed'),
  
  // Value + Unit (main number)
  React.createElement('div', {
    className: 'text-2xl font-bold',
    style: { color: 'var(--tt-feed)' } // or 'var(--tt-sleep)'
  },
    '3.6',
    React.createElement('span', {
      className: 'text-[15.4px] font-normal ml-1',
      style: { color: 'var(--tt-text-tertiary)' }
    }, 'oz')
  ),
  
  // Average label (bottom)
  React.createElement('div', {
    className: 'text-xs mt-1',
    style: { color: 'var(--tt-text-tertiary)' }
  }, '3-day avg')
)
```

**Specifications**:
- **Card Container**:
  - Layout: `flex flex-col` (left-aligned, vertical stack)
  - Padding: `p-6` (24px)
  - Border radius: `rounded-2xl` (16px)
  - Shadow: `shadow-sm`
  - Background: `var(--tt-card-bg)`
- **Label** (e.g., "Oz / Feed", "Total Sleep"):
  - Font size: `text-[15.4px]` (matches status text size)
  - Font weight: `font-medium` (500)
  - Color: `var(--tt-text-secondary)`
  - Margin: `mb-2` (8px bottom)
  - Alignment: Left (no center classes)
- **Main Number**:
  - Font size: `text-2xl` (24px)
  - Font weight: `font-bold` (700)
  - Color: Category color (`var(--tt-feed)` or `var(--tt-sleep)`)
  - Alignment: Left
- **Unit** (inline with number, e.g., "oz", "hrs"):
  - Font size: `text-[15.4px]` (matches status text size)
  - Font weight: `font-normal` (400)
  - Color: `var(--tt-text-tertiary)`
  - Margin: `ml-1` (4px left) or `gap-1` (when using flex)
- **Average Label** (e.g., "3-day avg"):
  - Font size: `text-xs` (12px)
  - Font weight: `font-normal` (400, default)
  - Color: `var(--tt-text-tertiary)`
  - Margin: `mt-1` (4px top)
  - Alignment: Left

**Layout**:
- Grid: `grid grid-cols-2 gap-4` (2-column grid, 16px gap)
- All content left-aligned (no `text-center` or `items-center` on container)

**Used in**:
- FeedingAnalyticsTab (4 stat cards: Oz/Feed, Oz/Day, Feedings/Day, Time Between Feeds)
- SleepAnalyticsTab (4 stat cards: Total Sleep, Day Sleep, Night Sleep, Sleeps/Day)

**Note**: The label and unit both use `text-[15.4px]` to match the status text size used in TrackerCard, ensuring consistency across the app.

### 9. Bar Chart Pattern (Week View)

```javascript
// Used in: Highlight cards, analytics detail pages

// Dimensions
const chartHeight = 130;
const barWidth = 32;
const barGap = 16;

// Structure
┌─────────────────────────────────────────────────┐
│ Average sleep                                    │
│ 12.3 hrs                                         │
│                                                  │
│     ┃     ┃     ┃     ┃     ┃     ┃  ┃          │
│     ┃     ┃     ┃     ┃     ┃     ┃  ┃          │
│ ────────────────────────────────────────────────│ Reference line
│     ┃     ┃     ┃     ┃     ┃     ┃  ┃          │
│     ┃     ┃     ┃     ┃     ┃     ┃  ┃          │
│   Su  M  Tu  W  Th  F  Sa                       │
└─────────────────────────────────────────────────┘

// Average display
React.createElement('div', { className: 'flex flex-col mb-1' },
  React.createElement('span', {
    className: 'text-xs font-medium text-gray-400 tracking-wider mb-1'
  }, 'Average sleep'),
  React.createElement('div', { className: 'flex items-baseline space-x-1' },
    React.createElement('span', {
      className: 'text-[2.25rem] font-bold leading-none',
      style: { color: categoryColor }
    }, average.toFixed(1)),
    React.createElement('span', {
      className: 'text-sm font-medium text-gray-400'
    }, 'hrs')
  )
)

// SVG chart
React.createElement('svg', {
  width: '100%',
  height: '100%',
  viewBox: `0 0 ${totalWidth} ${chartHeight + 25}`,
  preserveAspectRatio: 'xMidYMax meet'
},
  // Bars (animate on scroll into view)
  bars.map((bar, index) =>
    React.createElement('rect', {
      key: `bar-${index}`,
      x: bar.x,
      y: isVisible ? bar.y : chartHeight,
      width: barWidth,
      height: isVisible ? bar.height : 0,
      fill: bar.isToday ? categoryColor : '#e5e7eb',
      rx: 6,
      ry: 6,
      style: {
        transition: 'height 0.6s ease-out, y 0.6s ease-out',
        transitionDelay: `${index * 0.05}s`
      }
    })
  ),
  
  // Day labels
  bars.map((bar, index) =>
    React.createElement('text', {
      key: `label-${index}`,
      x: bar.x + barWidth / 2,
      y: chartHeight + 18,
      textAnchor: 'middle',
      fill: '#9ca3af',
      fontSize: 12,
      fontWeight: 500
    }, bar.day)
  ),
  
  // Reference line (average)
  React.createElement('line', {
    x1: 0,
    y1: refLineY,
    x2: totalWidth,
    y2: refLineY,
    stroke: categoryColor,
    strokeWidth: 3,
    opacity: 0.85
  })
)
```

---

## Animation Standards

### Progress Bars

```javascript
// Standard easing (all progress bars)
transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
transitionDelay: '0s' // Stagger if multiple: 0s, 0.05s, 0.1s

// Initial state (use cardVisible or isVisible flag)
width: isVisible ? `${percent}%` : '0%'
```

### Active Sleep Pulse Animation

```css
/* Progress bar sheen (BMW-style charging animation) */
@keyframes ttSleepPulse {
  0% {
    transform: translateX(-100%) skewX(-20deg);
    opacity: 0;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    transform: translateX(200%) skewX(-20deg);
    opacity: 0;
  }
}

.tt-sleep-progress-pulse {
  position: relative;
  overflow: hidden;
}

.tt-sleep-progress-pulse::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: ttSleepPulse 3.5s ease-in-out infinite;
  border-radius: inherit;
  pointer-events: none;
}

/* Dark mode: more subtle */
.dark .tt-sleep-progress-pulse::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
}
```

### Status Pill Border Pulse (Active Sleep)

```css
/* Rotating border highlight (iOS-style) */
@keyframes ttSleepPulsePillBorder {
  0% {
    transform: rotate(0deg);
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    transform: rotate(360deg);
    opacity: 0.3;
  }
}

button.tt-sleep-progress-pulse::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    transparent 240deg,
    rgba(255, 255, 255, 0.15) 270deg,
    rgba(255, 255, 255, 0.15) 300deg,
    transparent 330deg,
    transparent 360deg
  );
  animation: ttSleepPulsePillBorder 4.5s linear infinite;
  pointer-events: none;
}

/* Dark mode: even more subtle */
.dark button.tt-sleep-progress-pulse::after {
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    transparent 240deg,
    rgba(255, 255, 255, 0.08) 270deg,
    rgba(255, 255, 255, 0.08) 300deg,
    transparent 330deg,
    transparent 360deg
  );
  animation: ttSleepPulsePillBorder 5.0s linear infinite;
}
```

### Timeline Item Entry/Exit

```css
/* Entry animation */
@keyframes slideInDown {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
    max-height: 0;
  }
  50% {
    opacity: 1;
    max-height: 100px;
  }
  70% {
    transform: translateY(2px) scale(1.01);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    max-height: 100px;
  }
}

/* Exit animation */
@keyframes slideOutUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
    max-height: 100px;
    margin-bottom: 1rem;
  }
  100% {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
    max-height: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
}

.timeline-item-enter {
  animation: slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.timeline-item-exit {
  animation: slideOutUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  overflow: hidden;
}
```

### Tap Feedback

```css
/* iOS-style tap overlay */
.tt-tapable {
  position: relative;
  overflow: hidden;
}

.tt-tapable::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.05);
  opacity: 0;
  transition: opacity 0.1s ease-out;
  pointer-events: none;
  border-radius: inherit;
  z-index: 1;
}

.tt-tapable:active::before {
  opacity: 1;
}

/* Dark mode: lighter overlay */
.dark .tt-tapable::before {
  background: rgba(255, 255, 255, 0.1);
}
```

### Floating zZz Animation

```css
/* Active sleep indicator */
@keyframes floatingZs {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-4px) scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: translateY(-8px) scale(1);
    opacity: 0;
  }
}

.zzz {
  display: inline-block;
}

.zzz > span {
  display: inline-block;
  animation: floatingZs 2s ease-in-out infinite;
}

.zzz > span:nth-child(1) { animation-delay: 0s; }
.zzz > span:nth-child(2) { animation-delay: 0.3s; }
.zzz > span:nth-child(3) { animation-delay: 0.6s; }
```

### Chart Bar Animation (Scroll-triggered)

```javascript
// Use Intersection Observer to trigger animation
const [isVisible, setIsVisible] = useState(false);

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px' }
  );
  
  if (elementRef.current) {
    observer.observe(elementRef.current);
  }
  
  return () => observer.disconnect();
}, [isVisible]);

// In render
style: {
  y: isVisible ? calculatedY : chartHeight,
  height: isVisible ? calculatedHeight : 0,
  transition: 'height 0.6s ease-out, y 0.6s ease-out',
  transitionDelay: `${index * 0.05}s`
}
```

---

## Interaction Patterns

### 1. Swipe-to-Delete (iOS Messages Style)

#### Gesture Thresholds

```javascript
const SWIPE_THRESHOLD = 80;           // Pixels to reveal delete button
const DELETE_BUTTON_WIDTH = 80;       // Base button width
const DELETE_BUTTON_MAX_WIDTH = 100;  // Elastic maximum
const FULL_SWIPE_THRESHOLD = 120;     // Instant delete threshold
```

#### Behavior States

```javascript
// 1. Tiny swipe (< 80px)
// → Snap back to closed

// 2. Partial swipe (80px - 120px)
// → Reveal delete button, snap to 80px width

// 3. Full swipe (> 120px)
// → Instant delete (no confirmation modal)
```

#### Implementation

```javascript
// Touch handlers (non-passive for preventDefault)
const handleTouchStart = (e) => {
  const touch = e.touches[0];
  touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  setIsSwiping(false);
};

const handleTouchMove = (e) => {
  if (!touchStartRef.current) return;
  
  const touch = e.touches[0];
  const deltaX = touch.clientX - touchStartRef.current.x;
  const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
  
  // Only handle horizontal swipes
  if (Math.abs(deltaX) > deltaY && deltaX < 0) {
    setIsSwiping(true);
    e.preventDefault(); // Prevent scroll
    const newOffset = Math.max(-DELETE_BUTTON_WIDTH * 2, deltaX);
    setSwipeOffset(newOffset);
  }
};

const handleTouchEnd = () => {
  if (!isSwiping) return;
  
  const currentOffset = swipeOffset;
  
  // Full swipe delete (> 1.5x width = 120px)
  if (currentOffset < -FULL_SWIPE_THRESHOLD) {
    if (navigator.vibrate) navigator.vibrate(10);
    handleDelete();
  }
  // Partial swipe - reveal button
  else if (currentOffset < -SWIPE_THRESHOLD) {
    if (navigator.vibrate) navigator.vibrate(5);
    setSwipeOffset(-DELETE_BUTTON_WIDTH);
  }
  // Snap back
  else {
    setSwipeOffset(0);
  }
  
  setIsSwiping(false);
};

// Delete button (elastic width growth)
style: {
  width: swipeOffset < 0 
    ? (() => {
        const absOffset = Math.abs(swipeOffset);
        // 1:1 growth to base width
        if (absOffset <= DELETE_BUTTON_WIDTH) {
          return `${absOffset}px`;
        }
        // Elastic expansion beyond base (0.3x)
        const extra = absOffset - DELETE_BUTTON_WIDTH;
        return `${Math.min(DELETE_BUTTON_MAX_WIDTH, DELETE_BUTTON_WIDTH + extra * 0.3)}px`;
      })()
    : '0px',
  backgroundColor: '#ef4444',
  transition: isSwiping ? 'none' : 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: swipeOffset < 0 ? Math.min(1, Math.abs(swipeOffset) / 60) : 0
}
```

### 2. Card Tap for Yesterday Toggle

```javascript
// Card-level tap handler
const handleCardTap = (e) => {
  // Ignore taps on interactive elements
  if (e.target.closest('button') || 
      e.target.closest('[class*="swipeable-content"]') ||
      e.target.closest('.tt-sleep-progress-pulse')) {
    return;
  }
  
  // Only allow toggling when viewing today
  if (isViewingToday) {
    setShowYesterdayComparison(!showYesterdayComparison);
  }
};

// Apply to card root
onClick={handleCardTap}
cursor: 'pointer'
```

### 3. Active Sleep Tap for Input Sheet

```javascript
// Status pill becomes tappable when sleep is active
{sleepState === 'running' && 
  React.createElement('button', {
    type: 'button',
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation(); // Don't trigger card tap
      onActiveSleepClick(); // Opens input sheet
    },
    className: 'tt-tapable tt-sleep-progress-pulse',
    style: {
      backgroundColor: 'var(--tt-sleep-softer)',
      color: 'var(--tt-sleep)',
      touchAction: 'manipulation'
    }
  }, timerDisplay)
}
```

### 4. Timeline Item Tap for Detail Sheet

```javascript
const handleItemClick = (entry) => {
  // If active sleep, open input sheet instead
  if (entry && entry.isActive) {
    setInputSheetMode('sleep');
    setShowInputSheet(true);
    return;
  }
  
  // Otherwise open detail sheet
  setSelectedEntry(entry);
  setShowDetailSheet(true);
};

// Apply to timeline item
onClick={() => handleItemClick(entry)}
className: 'cursor-pointer tt-tapable'
```

### 5. Touch Target Sizing

```javascript
// Minimum touch target: 44x44px (iOS HIG guideline)

// Navigation arrows
style: { width: '32px', height: '32px' } // Close to minimum

// Pills (tappable)
style: { height: '35.2px', minWidth: '44px' } // Meets minimum

// Timeline items
padding: '16px' // Full item is tappable, exceeds minimum

// Delete button
width: '80px' // Well above minimum
```

---

## Data Formatting

### Numbers

```javascript
// formatV3Number - Production standard
// Whole numbers: no decimal ("7")
// Non-whole: one decimal ("7.3")
function formatV3Number(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const rounded = Math.round(x);
  if (Math.abs(x - rounded) < 1e-9) return String(rounded);
  return x.toFixed(1);
}

// Whole numbers only (month view)
function fmtOz0(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v <= 0) return '';
  return `${Math.round(v)} oz`;
}

// Short format with unit (charts)
function fmtHrs1Short(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v <= 0) return '';
  return `${v.toFixed(1)} h`;
}
```

### Time

```javascript
// 12-hour format: "3:45pm"
function formatTime12Hour(timestamp) {
  const d = new Date(timestamp);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  const mins = String(minutes).padStart(2, '0');
  return `${hours}:${mins}${ampm}`;
}

// HMS format (smart)
// < 1 min: "45s"
// < 1 hr:  "34m 12s"
// >= 1 hr: "2h 34m 12s"
function formatElapsedHmsTT(ms) {
  const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');

  if (h > 0) {
    const hStr = h >= 10 ? pad2(h) : String(h);
    const mStr = pad2(m);
    const sStr = pad2(s);
    return `${hStr}h ${mStr}m ${sStr}s`;
  }

  if (m > 0) {
    const mStr = m >= 10 ? pad2(m) : String(m);
    const sStr = pad2(s);
    return `${mStr}m ${sStr}s`;
  }

  const sStr = s < 10 ? String(s) : pad2(s);
  return `${sStr}s`;
}
```

### Dates

```javascript
// Date key for aggregation (YYYY-MM-DD)
function _dateKeyLocal(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Day abbreviation
function getDayAbbrev(date) {
  const day = date.getDay();
  const abbrevs = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
  return abbrevs[day];
}

// Display format
function formatDate(date) {
  if (isToday()) return 'Today';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
```

---

## Feature Flags

### UI Version System

```javascript
// Storage keys
localStorage.getItem('tt_ui_version')        // 'v1' | 'v2' | 'v3'
localStorage.getItem('tt_v3_card_variant')   // 'variant1' | 'variant2'
localStorage.getItem('tt_show_today_card')   // 'true' | 'false'

// Centralized helpers
window.TT.shared.uiVersion = {
  getUIVersion: () => {
    const version = localStorage.getItem('tt_ui_version');
    if (version && ['v1', 'v2', 'v3'].includes(version)) {
      return version;
    }
    return 'v2'; // default
  },
  
  shouldUseNewUI: (version) => version !== 'v1',
  
  getCardDesign: (version) => version === 'v3' ? 'new' : 'current',
  
  getV3Variant: () => {
    const variant = localStorage.getItem('tt_v3_card_variant');
    if (variant && ['variant1', 'variant2'].includes(variant)) {
      return variant;
    }
    return 'variant1'; // default
  }
};

// Usage in components
const [uiVersion, setUiVersion] = useState(() => {
  return window.TT.shared.uiVersion.getUIVersion();
});

const useNewUI = window.TT.shared.uiVersion.shouldUseNewUI(uiVersion);
const cardDesign = window.TT.shared.uiVersion.getCardDesign(uiVersion);
const v3Variant = window.TT.shared.uiVersion.getV3Variant();
```

### Listening for Changes

```javascript
// Pattern for all feature flag listeners
useEffect(() => {
  const handleStorageChange = () => {
    const version = window.TT.shared.uiVersion.getUIVersion();
    setUiVersion(version);
    
    const variant = window.TT.shared.uiVersion.getV3Variant();
    setV3Variant(variant);
    
    const showCard = localStorage.getItem('tt_show_today_card') === 'true';
    setShowTodayCard(showCard);
  };
  
  // Listen to storage events (cross-tab)
  window.addEventListener('storage', handleStorageChange);
  
  // Poll for same-tab changes (100ms interval)
  const interval = setInterval(handleStorageChange, 100);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    clearInterval(interval);
  };
}, []);
```

### Date Transition Smoothing

```javascript
// Prevent zeros flashing when changing dates
const [prevCardData, setPrevCardData] = useState(null);
const [isDateTransitioning, setIsDateTransitioning] = useState(false);
const [transitionPending, setTransitionPending] = useState(0);

// Before date change
const handleDateChange = (newDate) => {
  // Capture current state
  setPrevCardData({
    feeding: { total, target, percent, status },
    sleep: { total, target, percent, status }
  });
  
  // Start transition
  setIsDateTransitioning(true);
  setTransitionPending(2); // Number of cards loading
  
  // Change date
  setCurrentDate(newDate);
};

// As each card loads
useEffect(() => {
  if (isDateTransitioning && dataLoaded) {
    setTransitionPending(prev => prev - 1);
  }
}, [dataLoaded, isDateTransitioning]);

// Clear transition when all loaded
useEffect(() => {
  if (transitionPending === 0) {
    setIsDateTransitioning(false);
    setPrevCardData(null);
  }
}, [transitionPending]);

// Display logic
const displayData = isDateTransitioning ? prevCardData : currentData;
```

---

## Quick Reference

### Most Common Patterns

```javascript
// Card container
className: 'rounded-2xl shadow-sm p-5'
style: { backgroundColor: 'var(--tt-card-bg)' }

// Header row
className: 'flex items-center justify-between mb-8'

// Icon
className: 'w-5 h-5'
style: { color: 'var(--tt-feed)' or 'var(--tt-sleep)' }

// Big number
className: 'text-[39.6px] font-bold leading-none'
style: { color: 'var(--tt-feed)' or 'var(--tt-sleep)' }

// Progress bar
className: 'relative w-full h-[15.84px] rounded-2xl overflow-hidden'
transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'

// Status pill
className: 'inline-flex items-center h-[35.2px] px-[13.2px] rounded-lg text-[15.4px]'
style: { 
  backgroundColor: 'var(--tt-subtle-surface)',
  color: 'var(--tt-text-tertiary)'
}

// Timeline item
className: 'rounded-2xl tt-tapable p-4'
style: { backgroundColor: 'var(--tt-subtle-surface)' }
```

### Color Token Quick Reference

```javascript
// Category colors (primary use)
'var(--tt-feed)'   // #d45d5c
'var(--tt-sleep)'  // #4a8ac2

// Text hierarchy
'var(--tt-text-primary)'    // Main text
'var(--tt-text-secondary)'  // Supporting text
'var(--tt-text-tertiary)'   // De-emphasized text

// Surfaces
'var(--tt-card-bg)'         // Cards
'var(--tt-subtle-surface)'  // Timeline items, pills
'var(--tt-app-bg)'          // Background
```

### Animation Quick Reference

```javascript
// Progress bars
transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'

// Chart bars
transition: 'height 0.6s ease-out, y 0.6s ease-out'
transitionDelay: `${index * 0.05}s`

// Timeline entry/exit
animation: 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
animation: 'slideOutUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'

// Tap feedback
transition: 'opacity 0.1s ease-out'

// Active sleep pulse
animation: 'ttSleepPulse 3.5s ease-in-out infinite'
animation: 'ttSleepPulsePillBorder 4.5s linear infinite'
```

---

## Usage Guidelines

### When to Use This Document

1. **Creating new components** → Reference structure patterns, color tokens, spacing
2. **Matching existing styles** → Use typography scale, animation standards
3. **Implementing interactions** → Follow gesture patterns, touch targets
4. **Debugging inconsistencies** → Compare against documented standards

### Handing This to AI

When asking AI to implement features:

1. **Provide this document** as context
2. **Specify which pattern** to follow (e.g., "Use v3 variant2 TrackerCard pattern")
3. **Include screenshots** of current state for visual reference
4. **Point to specific sections** (e.g., "See Animation Standards > Progress Bars")

---

## Version History

- **v1.0** (January 2025): Initial comprehensive documentation
  - Codified v3 variant2 as production standard
  - Documented all component patterns, animations, interactions
  - Established token-first color system
  - Created quick reference for common patterns