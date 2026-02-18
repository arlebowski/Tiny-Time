// ========================================
// ANALYTICS: SHARED TIMEFRAME TOGGLE (D/W/M)
// - Single source of truth for styling across Analytics page + modals
// - Matches Apple-ish segmented control feel
// - Less “pill-like” inner button radius
// ========================================
const TimeframeToggle = ({ value, onChange, className = '' }) => {
  const items = [
    { key: 'day', label: 'D' },
    { key: 'week', label: 'W' },
    { key: 'month', label: 'M' }
  ];

  return React.createElement(
    'div',
    // Full-width so the control spans the card width (respecting parent padding/margins)
    { className: `w-full ${className}`.trim() },
    React.createElement(
      'div',
      {
        // Track: restore prior style so it shows on grey backgrounds
        // Radius must match selected segment radius
        className: 'w-full grid grid-cols-3 bg-white/70 rounded-xl p-1 shadow-sm'
      },
      items.map((it) =>
        React.createElement(
          'button',
          {
            key: it.key,
            type: 'button',
            onClick: () => { try { onChange(it.key); } catch {} },
            'aria-pressed': value === it.key,
            // Segments: fill equally, center label, radius matches track
            className: `w-full px-4 py-1.5 text-[13px] font-medium rounded-xl transition flex items-center justify-center ${
              value === it.key
                ? 'bg-white shadow'
                : 'text-gray-500 hover:bg-black/5 active:bg-black/10'
            }`,
            style: value === it.key ? { color: 'var(--tt-primary-brand)' } : undefined
          },
          it.label
        )
      )
    )
  );
};

// ========================================
// RECOVERY UI (used when signed-in bootstrap fails)
// ========================================
const TinyRecoveryScreen = ({ title, message, onRetry, onSignOut }) => {
  return React.createElement(
    'div',
    { className: 'min-h-screen w-full flex items-center justify-center px-4 py-10', style: { backgroundColor: 'var(--tt-recovery-bg)' } },
    React.createElement(
      'div',
      { className: 'w-full max-w-md rounded-2xl shadow-sm p-5', style: { backgroundColor: 'var(--tt-card-bg)', border: '1px solid var(--tt-border-subtle)' } },
      React.createElement('div', { className: 'text-[18px] font-semibold mb-2', style: { color: 'var(--tt-text-primary)' } }, title || 'Couldn’t load Tiny Tracker'),
      React.createElement('div', { className: 'text-[14px] leading-relaxed mb-4', style: { color: 'var(--tt-text-secondary)' } },
        message || 'We’re having trouble loading your data. This can happen if your connection is spotty or the app is temporarily out of sync.'
      ),
      React.createElement(
        'div',
        { className: 'flex gap-3' },
        React.createElement(
          'button',
          {
            className: 'flex-1 h-11 rounded-xl font-medium',
            style: { backgroundColor: 'var(--tt-primary-brand)', color: 'var(--tt-text-on-accent)' },
            onClick: onRetry
          },
          'Retry'
        ),
        React.createElement(
          'button',
          {
            className: 'flex-1 h-11 rounded-xl font-medium',
            style: { backgroundColor: 'var(--tt-subtle-surface)', color: 'var(--tt-text-primary)' },
            onClick: onSignOut
          },
          'Sign out'
        )
      )
    )
  );
};

// ========================================
// UI HELPERS: Segmented toggle (Apple-ish)
// ========================================
// NOTE: SegmentedToggle has been moved to components/shared/SegmentedToggle.js
// Use window.TT.shared.SegmentedToggle or window.SegmentedToggle

// ========================================
// UI VERSION: v4 only
// ========================================

// ========================================
// TINY TRACKER - PART 1
// Config, Auth, Family-Based Firestore Layer + AI Functions
// ========================================

// ---------------------------
// FIREBASE CONFIG
// ---------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBUscvx-JB3lNWKVu9bPnYTBHVPvrndc_w",
  authDomain: "baby-feeding-tracker-978e6.firebaseapp.com",
  projectId: "baby-feeding-tracker-978e6",
  storageBucket: "baby-feeding-tracker-978e6.firebasestorage.app",
  messagingSenderId: "775043948126",
  appId: "1:775043948126:web:28d8aefeea99cc7d25decf",
  measurementId: "G-NYQMC8STML"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ---------------------------
// ANALYTICS
// ---------------------------
// Some environments (ad blockers, strict browsers, offline/local dev) can block
// the analytics bundle, which will throw at initialization and prevent the app
// from rendering. Guard the setup so the app still boots even if analytics
// isn’t available.
let analytics = null;
try {
  analytics = firebase.analytics();
} catch (e) {
  console.warn("Analytics unavailable; continuing without analytics", e);
}

const logEvent = (eventName, params) => {
  if (!analytics || typeof analytics.logEvent !== 'function') return;
  try {
    analytics.logEvent(eventName, params);
  } catch (e) {
    console.warn("Analytics failed:", e);
  }
};

logEvent("app_open", {});
window.trackTabSelected = (tab) => logEvent("tab_selected", { tab });

// ========================================
// USER PROFILE MANAGEMENT
// ========================================
const ensureUserProfile = async (user, inviteCode = null) => {
  if (!user) return;

  const userRef = db.collection("users").doc(user.uid);
  const snap = await userRef.get();
  const now = firebase.firestore.FieldValue.serverTimestamp();
  const base = {
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    lastActiveAt: now
  };

  if (!snap.exists) {
    await userRef.set(
      { ...base, createdAt: now, inviteCode: inviteCode || null },
      { merge: true }
    );
  } else {
    await userRef.set(base, { merge: true });
  }
};

// ========================================
// USER APPEARANCE PREFERENCES (Step 1)
// ========================================

const THEME_TOKENS = (window.TT && window.TT.themeTokens) ? window.TT.themeTokens : {};
const COLOR_THEMES = THEME_TOKENS.COLOR_THEMES || {};
const DEFAULT_THEME_KEY = THEME_TOKENS.DEFAULT_THEME_KEY || 'theme1';
const COLOR_THEME_ORDER = THEME_TOKENS.COLOR_THEME_ORDER || Object.keys(COLOR_THEMES || {});

// Default appearance schema
const DEFAULT_APPEARANCE = THEME_TOKENS.DEFAULT_APPEARANCE || {
  darkMode: false
};

// Initialize TT.appearance namespace
window.TT = window.TT || {};
window.TT.appearance = (() => {
  let currentAppearance = { ...DEFAULT_APPEARANCE };
  let initialized = false;
  let initializationPromise = null;
  let lastUid = null; // Track last initialized UID

  // Load appearance from Firestore for a user
  const loadAppearance = async (uid) => {
    if (!uid) {
      currentAppearance = { ...DEFAULT_APPEARANCE };
      // Clear localStorage cache on sign out
      try {
        localStorage.removeItem('tt_appearance_cache');
      } catch (e) {}
      initialized = true;
      return;
    }

    try {
      const userRef = db.collection("users").doc(uid);
      const snap = await userRef.get();
      
      if (snap.exists) {
        const userData = snap.data();
        const stored = userData.appearance;
        
        if (stored && typeof stored === 'object') {
          // Merge stored appearance with defaults (handle partial updates)
          currentAppearance = {
            darkMode: typeof stored.darkMode === 'boolean' ? stored.darkMode : DEFAULT_APPEARANCE.darkMode
          };
        } else {
          // No appearance stored yet - use defaults but don't write yet
          // (will be written on first set() call)
          currentAppearance = { ...DEFAULT_APPEARANCE };
        }
      } else {
        // User doc doesn't exist - use defaults
        currentAppearance = { ...DEFAULT_APPEARANCE };
      }
    } catch (error) {
      console.warn("Failed to load appearance preferences, using defaults:", error);
      // On read failure, use defaults in memory (don't spam writes)
      currentAppearance = { ...DEFAULT_APPEARANCE };
    }
    
    // Cache to localStorage for blocking script
    try {
      localStorage.setItem('tt_appearance_cache', JSON.stringify(currentAppearance));
    } catch (e) {
      // localStorage may be unavailable, non-fatal
    }
    
    initialized = true;
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tt:appearance-ready', { detail: { appearance: currentAppearance } }));
        window.dispatchEvent(new CustomEvent('tt:appearance-changed', { detail: { appearance: currentAppearance } }));
      }
    } catch (e) {}
  };

  // Save appearance to Firestore
  const saveAppearance = async (uid, appearance) => {
    if (!uid) {
      console.warn("Cannot save appearance: no user ID");
      return;
    }

    try {
      const userRef = db.collection("users").doc(uid);
      await userRef.set({ appearance }, { merge: true });
    } catch (error) {
      console.error("Failed to save appearance preferences:", error);
      throw error;
    }
  };

  // Public API
  return {
    // Initialize appearance for a user (called on auth state change)
    init: async (uid) => {
      // If UID changed (including null), reset state and clear cached promise
      if (uid !== lastUid) {
        initializationPromise = null;
        initialized = false;
        lastUid = uid;
      }

      // If we already have a pending promise for this UID, return it
      if (initializationPromise) {
        return initializationPromise;
      }

      // Create new initialization promise
      initializationPromise = (async () => {
        await loadAppearance(uid);
        return currentAppearance;
      })();
      
      return initializationPromise;
    },

    // Get current appearance object
    get: () => {
      if (!initialized) {
        try {
          const cached = localStorage.getItem('tt_appearance_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed.darkMode === 'boolean') {
              return { ...DEFAULT_APPEARANCE, ...parsed };
            }
          }
        } catch (e) {}
        console.warn("Appearance not initialized yet, returning defaults");
        return { ...DEFAULT_APPEARANCE };
      }
      return { ...currentAppearance };
    },

    // Set appearance (merges partial updates and persists)
    set: async (partial) => {
      if (!partial || typeof partial !== 'object') {
        console.warn("TT.appearance.set() requires an object");
        return;
      }

      const user = auth.currentUser;
      if (!user || !user.uid) {
        console.warn("Cannot set appearance: user not authenticated");
        return;
      }

      // Merge partial update with current appearance
      const updated = {
        ...currentAppearance,
        ...partial
      };

      // Validate fields
      if (typeof updated.darkMode !== 'boolean') {
        updated.darkMode = DEFAULT_APPEARANCE.darkMode;
      }

      // Update in-memory state
      currentAppearance = updated;

      // Apply to DOM immediately (offline-first: update UI even if persist fails)
      if (typeof window.TT.applyAppearance === 'function') {
        window.TT.applyAppearance(currentAppearance);
      }

      // Cache to localStorage for blocking script
      try {
        localStorage.setItem('tt_appearance_cache', JSON.stringify(currentAppearance));
      } catch (e) {
        // localStorage may be unavailable, non-fatal
      }
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tt:appearance-changed', { detail: { appearance: currentAppearance } }));
        }
      } catch (e) {}

      // Persist to Firestore
      try {
        await saveAppearance(user.uid, currentAppearance);
      } catch (error) {
        console.error("Failed to persist appearance update:", error);
        // Note: We still update in-memory state and DOM even if persist fails
        // (offline-first approach)
      }
    },

    // Reset to defaults (useful for testing/debugging)
    reset: async () => {
      const user = auth.currentUser;
      if (user && user.uid) {
        currentAppearance = { ...DEFAULT_APPEARANCE };
        try {
          await saveAppearance(user.uid, currentAppearance);
        } catch (error) {
          console.error("Failed to reset appearance:", error);
        }
      }
    }
  };
})();

// ========================================
// APPLY APPEARANCE TO DOM (Step 2)
// ========================================

// Use shared validation (from shared-utils.js → window.TT.utils)
const isValidHex = (hex) => (window.TT && window.TT.utils && window.TT.utils.isValidHex) ? window.TT.utils.isValidHex(hex) : (typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex));

// Helper: Derive softer/soft/strong accent variants from base color
const deriveAccentVariants = (hex, isDark) => {
  // Parse hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Mix function: mix(color1, color2, ratio) where ratio is 0-1
  const mix = (c1, c2, ratio) => Math.round(c1 * (1 - ratio) + c2 * ratio);

  // Soft variant
  const softR = isDark ? mix(r, 0, 0.55) : mix(r, 255, 0.82);
  const softG = isDark ? mix(g, 0, 0.55) : mix(g, 255, 0.82);
  const softB = isDark ? mix(b, 0, 0.55) : mix(b, 255, 0.82);
  const softHex = `#${softR.toString(16).padStart(2, '0')}${softG.toString(16).padStart(2, '0')}${softB.toString(16).padStart(2, '0')}`;

  // Softer variant (one step lighter than "soft")
  const softerR = isDark ? mix(r, 0, 0.65) : mix(r, 255, 0.88);
  const softerG = isDark ? mix(g, 0, 0.65) : mix(g, 255, 0.88);
  const softerB = isDark ? mix(b, 0, 0.65) : mix(b, 255, 0.88);
  const softerHex = `#${softerR.toString(16).padStart(2, '0')}${softerG.toString(16).padStart(2, '0')}${softerB.toString(16).padStart(2, '0')}`;

  // Soft-medium variant (halfway between softer and soft)
  const softMediumR = isDark ? mix(r, 0, 0.60) : mix(r, 255, 0.85);
  const softMediumG = isDark ? mix(g, 0, 0.60) : mix(g, 255, 0.85);
  const softMediumB = isDark ? mix(b, 0, 0.60) : mix(b, 255, 0.85);
  const softMediumHex = `#${softMediumR.toString(16).padStart(2, '0')}${softMediumG.toString(16).padStart(2, '0')}${softMediumB.toString(16).padStart(2, '0')}`;

  // Strong variant
  const strongR = isDark ? mix(r, 255, 0.15) : mix(r, 0, 0.15);
  const strongG = isDark ? mix(g, 255, 0.15) : mix(g, 0, 0.15);
  const strongB = isDark ? mix(b, 255, 0.15) : mix(b, 0, 0.15);
  const strongHex = `#${strongR.toString(16).padStart(2, '0')}${strongG.toString(16).padStart(2, '0')}${strongB.toString(16).padStart(2, '0')}`;

  return { softer: softerHex, softMedium: softMediumHex, soft: softHex, strong: strongHex };
};

// Background theme mapping
const BACKGROUND_THEMES = THEME_TOKENS.BACKGROUND_THEMES || {};

const LIGHT_MODE_TOKENS = THEME_TOKENS.LIGHT_MODE_TOKENS || {};

// Apply appearance to DOM
window.TT.applyAppearance = function(appearance) {
  if (!appearance || typeof appearance !== 'object') {
    console.warn("applyAppearance: invalid appearance object");
    return;
  }

  const { darkMode } = appearance;
  const resolvedThemeKey = (appearance && typeof appearance.themeKey === 'string' && appearance.themeKey.trim())
    || (typeof window !== 'undefined' && window.TT && typeof window.TT.currentThemeKey === 'string' && window.TT.currentThemeKey.trim())
    || DEFAULT_THEME_KEY;

  const fallbackTheme = (COLOR_THEMES && COLOR_THEMES[DEFAULT_THEME_KEY]) || (COLOR_THEMES && Object.values(COLOR_THEMES)[0]) || null;
  const activeTheme = (COLOR_THEMES && COLOR_THEMES[resolvedThemeKey]) || fallbackTheme;
  const resolveAccentSet = (cardKey) => {
    const raw = activeTheme?.cards?.[cardKey];
    const fallback = fallbackTheme?.cards?.[cardKey];
    const primary = isValidHex(raw?.primary) ? raw.primary : (isValidHex(fallback?.primary) ? fallback.primary : "#4F46E5");
    const soft = isValidHex(raw?.soft) ? raw.soft : (isValidHex(fallback?.soft) ? fallback.soft : primary);
    const dark = isValidHex(raw?.dark) ? raw.dark : (isValidHex(fallback?.dark) ? fallback.dark : primary);
    return { primary, soft, dark };
  };

  // Toggle dark mode class
  if (darkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Sanitize accent colors (FIX 1: validate hex format before deriving variants)
  const feedSet = resolveAccentSet('bottle');
  const nursingSet = resolveAccentSet('nursing');
  const solidsSet = resolveAccentSet('solids');
  const sleepSet = resolveAccentSet('sleep');
  const diaperSet = resolveAccentSet('diaper');
  const sanitizedFeedAccent = darkMode ? feedSet.dark : feedSet.primary;
  const sanitizedNursingAccent = darkMode ? nursingSet.dark : nursingSet.primary;
  const sanitizedSolidsAccent = darkMode ? solidsSet.dark : solidsSet.primary;
  const sanitizedSleepAccent = darkMode ? sleepSet.dark : sleepSet.primary;
  const sanitizedDiaperAccent = darkMode ? diaperSet.dark : diaperSet.primary;

  // Get background theme
  const mode = darkMode ? 'dark' : 'light';
  const theme = BACKGROUND_THEMES[mode]
    || { appBg: "#000000", cardBg: "#1C1C1E", cardBorder: "transparent" };

  const darkTokens = THEME_TOKENS.DARK_MODE_TOKENS || {};
  const analyticsColors = THEME_TOKENS.ANALYTICS_CATEGORY_COLORS || {};

  // Derive accent variants
  const feedVariants = deriveAccentVariants(sanitizedFeedAccent, darkMode);
  const nursingVariants = deriveAccentVariants(sanitizedNursingAccent, darkMode);
  const solidsVariants = deriveAccentVariants(sanitizedSolidsAccent, darkMode);
  const sleepVariants = deriveAccentVariants(sanitizedSleepAccent, darkMode);
  const diaperVariants = deriveAccentVariants(sanitizedDiaperAccent, darkMode);

  // Batch all CSS variable updates in a single frame for smooth, synchronized transition
  requestAnimationFrame(() => {
    const root = document.documentElement;

    // Background/surfaces
    root.style.setProperty('--tt-app-bg', theme.appBg);
    root.style.setProperty('--tt-card-bg', theme.cardBg);
    root.style.setProperty('--tt-card-border', theme.cardBorder);

    // Premium surface elevation for chrome:
    // - header/nav blend with app background in both light and dark mode
    root.style.setProperty('--tt-header-bg', theme.appBg);
    root.style.setProperty('--tt-nav-bg', theme.appBg);
    // Reduce/disable nav shadow in dark mode (rely on surface step instead)
    const lightNavShadow = (THEME_TOKENS.LIGHT_MODE_TOKENS && THEME_TOKENS.LIGHT_MODE_TOKENS.navShadow)
      ? THEME_TOKENS.LIGHT_MODE_TOKENS.navShadow
      : 'none';
    const darkNavShadow = darkTokens.navShadow;
    root.style.setProperty('--tt-nav-shadow', darkMode ? (darkNavShadow || 'none') : (lightNavShadow || 'none'));
    // Footer fade gradient with actual color value
    root.style.setProperty('--tt-nav-fade-gradient', `linear-gradient(to top, ${theme.appBg} 0%, ${theme.appBg} 30%, transparent 100%)`);

    // Input/surfaces/text
    if (!darkMode) {
      const lightTokens = LIGHT_MODE_TOKENS || {};
      root.style.setProperty('--tt-input-bg', lightTokens.inputBg);
      root.style.setProperty('--tt-subtle-surface', lightTokens.subtleSurface);
      root.style.setProperty('--tt-surface-subtle', lightTokens.surfaceSubtle);
      root.style.setProperty('--tt-surface-selected', lightTokens.surfaceSelected);
      root.style.setProperty('--tt-surface-hover', lightTokens.surfaceHover);
      root.style.setProperty('--tt-progress-track', lightTokens.progressTrack);
      root.style.setProperty('--tt-timeline-item-bg', lightTokens.timelineItemBg);
      root.style.setProperty('--tt-timeline-track-bg', lightTokens.timelineTrackBg);
      root.style.setProperty('--tt-halfsheet-bg', lightTokens.halfsheetBg);
      root.style.setProperty('--tt-wheelpicker-bar', lightTokens.wheelpickerBar);
      root.style.setProperty('--tt-icon-bg', lightTokens.iconBg);
      root.style.setProperty('--tt-input-border', lightTokens.inputBorder);
      root.style.setProperty('--tt-divider', lightTokens.divider);
      root.style.setProperty('--tt-tracker-card-bg', lightTokens.trackerCardBg);
      root.style.setProperty('--tt-seg-track', lightTokens.segTrack);
      root.style.setProperty('--tt-seg-pill', lightTokens.segPill);
      root.style.setProperty('--tt-calendar-pill', lightTokens.segTrack);
      root.style.setProperty('--tt-swipe-row-bg', lightTokens.swipeRowBg);
      root.style.setProperty('--tt-selected-surface', lightTokens.selectedSurface);
      root.style.setProperty('--tt-plus-bg', lightTokens.plusBg);
      root.style.setProperty('--tt-plus-fg', lightTokens.plusFg);
      root.style.setProperty('--tt-text-primary', lightTokens.textPrimary);
      root.style.setProperty('--tt-text-secondary', lightTokens.textSecondary);
      root.style.setProperty('--tt-text-tertiary', lightTokens.textTertiary);
      root.style.setProperty('--tt-text-disabled', lightTokens.textDisabled);
      root.style.setProperty('--tt-text-on-accent', lightTokens.textOnAccent);
      root.style.setProperty('--tt-tapable-bg', lightTokens.tapableBg);
      root.style.setProperty('--tt-overlay-scrim', lightTokens.overlayScrim);
      root.style.setProperty('--tt-overlay-scrim-strong', lightTokens.overlayScrimStrong);
      root.style.setProperty('--tt-shadow-soft', lightTokens.shadowSoft);
      root.style.setProperty('--tt-shadow-floating', lightTokens.shadowFloating);
      root.style.setProperty('--tt-text-shadow', lightTokens.textShadow);
      root.style.setProperty('--tt-bg-hover', lightTokens.bgHover);
      root.style.setProperty('--tt-border-subtle', lightTokens.borderSubtle);
      root.style.setProperty('--tt-border-strong', lightTokens.borderStrong);
      root.style.setProperty('--tt-outline-strong', lightTokens.outlineStrong);
      root.style.setProperty('--tt-nav-disabled', lightTokens.navDisabled);
      root.style.setProperty('--tt-nav-divider', lightTokens.navDivider);
      root.style.setProperty('--tt-nav-pill-border', lightTokens.navPillBorder);
      root.style.setProperty('--tt-segmented-track-bg', lightTokens.segmentedTrackBg);
      root.style.setProperty('--tt-segmented-shadow', lightTokens.segmentedShadow);
      root.style.setProperty('--tt-segmented-on-bg', lightTokens.segmentedOnBg);
      root.style.setProperty('--tt-segmented-on-text', lightTokens.segmentedOnText);
      root.style.setProperty('--tt-segmented-off-text', lightTokens.segmentedOffText);
      root.style.setProperty('--tt-primary-action-bg', lightTokens.primaryActionBg);
      root.style.setProperty('--tt-primary-action-bg-active', lightTokens.primaryActionBgActive);
      root.style.setProperty('--tt-primary-action-shadow', lightTokens.primaryActionShadow);
      root.style.setProperty('--tt-primary-action-shadow-active', lightTokens.primaryActionShadowActive);
      root.style.setProperty('--tt-primary-action-text', lightTokens.primaryActionText);
      root.style.setProperty('--tt-primary-brand', lightTokens.primaryBrand);
      root.style.setProperty('--tt-primary-brand-soft', lightTokens.primaryBrandSoft);
      root.style.setProperty('--tt-primary-brand-strong', lightTokens.primaryBrandStrong);
      root.style.setProperty('--tt-brand-icon', lightTokens.brandIcon);
      root.style.setProperty('--tt-recovery-bg', lightTokens.recoveryBg);
      root.style.setProperty('--tt-error', lightTokens.error);
      root.style.setProperty('--tt-error-soft', lightTokens.errorSoft);
      root.style.setProperty('--tt-positive', lightTokens.positive);
      root.style.setProperty('--tt-positive-soft', lightTokens.positiveSoft);
      root.style.setProperty('--tt-positive-alt', lightTokens.positiveAlt);
      root.style.setProperty('--tt-positive-alt-soft', lightTokens.positiveAltSoft);
      root.style.setProperty('--tt-negative', lightTokens.negative);
      root.style.setProperty('--tt-negative-soft', lightTokens.negativeSoft);
      root.style.setProperty('--tt-negative-warm', lightTokens.negativeWarm);
      root.style.setProperty('--tt-negative-warm-soft', lightTokens.negativeWarmSoft);
      root.style.setProperty('--tt-pulse-highlight', lightTokens.pulseHighlight);
      root.style.setProperty('--tt-highlight-indigo-soft', lightTokens.highlightIndigoSoft);
      root.style.setProperty('--tt-tray-bg', lightTokens.trayBg);
      root.style.setProperty('--tt-tray-shadow', lightTokens.trayShadow);
      root.style.setProperty('--tt-tray-divider', lightTokens.trayDivider);
    } else {
      // Dark mode: existing palette (current behavior)
      root.style.setProperty('--tt-input-bg', darkTokens.inputBg);
      root.style.setProperty('--tt-subtle-surface', darkTokens.subtleSurface);
      root.style.setProperty('--tt-surface-subtle', darkTokens.surfaceSubtle);
      root.style.setProperty('--tt-surface-selected', darkTokens.surfaceSelected);
      root.style.setProperty('--tt-surface-hover', darkTokens.surfaceHover);
      root.style.setProperty('--tt-progress-track', darkTokens.progressTrack);
      root.style.setProperty('--tt-timeline-item-bg', theme.cardBg);
      root.style.setProperty('--tt-timeline-track-bg', darkTokens.timelineTrackBg);
      root.style.setProperty('--tt-halfsheet-bg', theme.cardBg);
      root.style.setProperty('--tt-wheelpicker-bar', darkTokens.wheelpickerBar);
      root.style.setProperty('--tt-icon-bg', darkTokens.iconBg);
      root.style.setProperty('--tt-input-border', darkTokens.inputBorder);
      root.style.setProperty('--tt-divider', darkTokens.divider);
      root.style.setProperty('--tt-tracker-card-bg', theme.cardBg);
      root.style.setProperty('--tt-seg-track', darkTokens.segTrack);
      root.style.setProperty('--tt-seg-pill', darkTokens.segPill);
      root.style.setProperty('--tt-calendar-pill', darkTokens.segPill);
      root.style.setProperty('--tt-swipe-row-bg', darkTokens.swipeRowBg);
      root.style.setProperty('--tt-selected-surface', darkTokens.selectedSurface);
      root.style.setProperty('--tt-plus-bg', darkTokens.plusBg);
      root.style.setProperty('--tt-plus-fg', darkTokens.plusFg);
      root.style.setProperty('--tt-text-primary', darkTokens.textPrimary);
      root.style.setProperty('--tt-text-secondary', darkTokens.textSecondary);
      root.style.setProperty('--tt-text-tertiary', darkTokens.textTertiary);
      root.style.setProperty('--tt-text-disabled', darkTokens.textDisabled);
      root.style.setProperty('--tt-text-on-accent', darkTokens.textOnAccent);
      root.style.setProperty('--tt-tapable-bg', darkTokens.tapableBg);
      root.style.setProperty('--tt-overlay-scrim', darkTokens.overlayScrim);
      root.style.setProperty('--tt-overlay-scrim-strong', darkTokens.overlayScrimStrong);
      root.style.setProperty('--tt-shadow-soft', darkTokens.shadowSoft);
      root.style.setProperty('--tt-shadow-floating', darkTokens.shadowFloating);
      root.style.setProperty('--tt-text-shadow', darkTokens.textShadow);
      root.style.setProperty('--tt-bg-hover', darkTokens.bgHover);
      root.style.setProperty('--tt-border-subtle', darkTokens.borderSubtle);
      root.style.setProperty('--tt-border-strong', darkTokens.borderStrong);
      root.style.setProperty('--tt-outline-strong', darkTokens.outlineStrong);
      root.style.setProperty('--tt-nav-disabled', darkTokens.navDisabled);
      root.style.setProperty('--tt-nav-divider', darkTokens.navDivider);
      root.style.setProperty('--tt-nav-pill-border', darkTokens.navPillBorder);
      root.style.setProperty('--tt-segmented-track-bg', darkTokens.segmentedTrackBg);
      root.style.setProperty('--tt-segmented-shadow', darkTokens.segmentedShadow);
      root.style.setProperty('--tt-segmented-on-bg', darkTokens.segmentedOnBg);
      root.style.setProperty('--tt-segmented-on-text', darkTokens.segmentedOnText);
      root.style.setProperty('--tt-segmented-off-text', darkTokens.segmentedOffText);
      root.style.setProperty('--tt-primary-action-bg', darkTokens.primaryActionBg);
      root.style.setProperty('--tt-primary-action-bg-active', darkTokens.primaryActionBgActive);
      root.style.setProperty('--tt-primary-action-shadow', darkTokens.primaryActionShadow);
      root.style.setProperty('--tt-primary-action-shadow-active', darkTokens.primaryActionShadowActive);
      root.style.setProperty('--tt-primary-action-text', darkTokens.primaryActionText);
      root.style.setProperty('--tt-primary-brand', darkTokens.primaryBrand);
      root.style.setProperty('--tt-primary-brand-soft', darkTokens.primaryBrandSoft);
      root.style.setProperty('--tt-primary-brand-strong', darkTokens.primaryBrandStrong);
      root.style.setProperty('--tt-brand-icon', darkTokens.brandIcon);
      root.style.setProperty('--tt-recovery-bg', darkTokens.recoveryBg);
      root.style.setProperty('--tt-error', darkTokens.error);
      root.style.setProperty('--tt-error-soft', darkTokens.errorSoft);
      root.style.setProperty('--tt-positive', darkTokens.positive);
      root.style.setProperty('--tt-positive-soft', darkTokens.positiveSoft);
      root.style.setProperty('--tt-positive-alt', darkTokens.positiveAlt);
      root.style.setProperty('--tt-positive-alt-soft', darkTokens.positiveAltSoft);
      root.style.setProperty('--tt-negative', darkTokens.negative);
      root.style.setProperty('--tt-negative-soft', darkTokens.negativeSoft);
      root.style.setProperty('--tt-negative-warm', darkTokens.negativeWarm);
      root.style.setProperty('--tt-negative-warm-soft', darkTokens.negativeWarmSoft);
      root.style.setProperty('--tt-pulse-highlight', darkTokens.pulseHighlight);
      root.style.setProperty('--tt-highlight-indigo-soft', darkTokens.highlightIndigoSoft);
      root.style.setProperty('--tt-tray-bg', darkTokens.trayBg);
      root.style.setProperty('--tt-tray-shadow', darkTokens.trayShadow);
      root.style.setProperty('--tt-tray-divider', darkTokens.trayDivider);
    }

    if (analyticsColors.daily) {
      root.style.setProperty('--color-daily', analyticsColors.daily);
    }
    if (analyticsColors.sleep) {
      root.style.setProperty('--color-sleep', analyticsColors.sleep);
    }
    if (analyticsColors.eating) {
      root.style.setProperty('--color-eating', analyticsColors.eating);
    }

    // Feed accents
    root.style.setProperty('--tt-feed', sanitizedFeedAccent);
    root.style.setProperty('--tt-feed-soft', feedSet.soft);
    root.style.setProperty('--tt-feed-strong', feedVariants.strong);

    // Nursing accents
    root.style.setProperty('--tt-nursing', sanitizedNursingAccent);
    root.style.setProperty('--tt-nursing-soft', nursingSet.soft);
    root.style.setProperty('--tt-nursing-strong', nursingVariants.strong);

    // Solids accents
    root.style.setProperty('--tt-solids', sanitizedSolidsAccent);
    root.style.setProperty('--tt-solids-soft', solidsSet.soft);
    root.style.setProperty('--tt-solids-strong', solidsVariants.strong);

    // Sleep accents
    root.style.setProperty('--tt-sleep', sanitizedSleepAccent);
    root.style.setProperty('--tt-sleep-softer', sleepVariants.softer);
    root.style.setProperty('--tt-sleep-soft-medium', sleepVariants.softMedium);
    root.style.setProperty('--tt-sleep-soft', sleepSet.soft);
    root.style.setProperty('--tt-sleep-strong', sleepVariants.strong);

    // Diaper accents
    root.style.setProperty('--tt-diaper', sanitizedDiaperAccent);
    root.style.setProperty('--tt-diaper-soft', diaperSet.soft);
    root.style.setProperty('--tt-diaper-strong', diaperVariants.strong);

    // Update meta theme-color after CSS vars are applied.
    if (typeof window.updateMetaThemeColor === 'function') {
      window.updateMetaThemeColor();
    }
  });
};

// Apply cached appearance immediately to avoid light-mode flash on load.
try {
  const cachedAppearance = localStorage.getItem('tt_appearance_cache');
  if (cachedAppearance) {
    const parsed = JSON.parse(cachedAppearance);
    if (parsed && typeof parsed.darkMode === 'boolean') {
      window.TT.applyAppearance({ ...DEFAULT_APPEARANCE, ...parsed });
    }
  }
} catch (e) {}

const signInWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  const result = await auth.signInWithPopup(provider);
  logEvent("login", { method: "google" });
  return result;
};

// Email/password auth helpers
const signUpWithEmail = async (email, password) => {
  const result = await auth.createUserWithEmailAndPassword(email, password);
  logEvent("login", { method: "password_signup" });
  return result;
};

const signInWithEmail = async (email, password) => {
  const result = await auth.signInWithEmailAndPassword(email, password);
  logEvent("login", { method: "password_login" });
  return result;
};

const signOut = async () => {
  await auth.signOut();
  logEvent("logout", {});
};

// Delete current user account:
// - Remove user from all families' members arrays
// - Remove user from all kids' members arrays
// - If user is owner of a kid, transfer ownership to another member if possible
// - Delete their user profile doc
// - Delete their auth account
const deleteCurrentUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }

  const uid = user.uid;

  // 1) Find all families where this user is a member
  const famSnap = await db
    .collection("families")
    .where("members", "array-contains", uid)
    .get();

  const familyPromises = famSnap.docs.map(async (famDoc) => {
    const famRef = famDoc.ref;
    const famData = famDoc.data() || {};
    const members = Array.isArray(famData.members) ? famData.members : [];
    const otherMembers = members.filter((m) => m !== uid);

    // Remove from family.members
    await famRef.update({
      members: firebase.firestore.FieldValue.arrayRemove(uid),
    });

    // For each kid in this family:
    const kidsSnap = await famRef.collection("kids").get();

    const kidPromises = kidsSnap.docs.map(async (kidDoc) => {
      const kidRef = kidDoc.ref;
      const kidData = kidDoc.data() || {};

      // Always remove from kid.members
      const updates = {
        members: firebase.firestore.FieldValue.arrayRemove(uid),
      };

      // If this user was the owner, transfer ownership if possible
      if (kidData.ownerId === uid) {
        if (otherMembers.length > 0) {
          updates.ownerId = otherMembers[0]; // simple: first remaining member
        } else {
          // No other members – keep baby data, but no owner
          updates.ownerId = null;
        }
      }

      await kidRef.update(updates);
    });

    await Promise.all(kidPromises);
  });

  await Promise.all(familyPromises);

  // 2) Delete user profile document (non-fatal if already gone)
  try {
    await db.collection("users").doc(uid).delete();
  } catch (e) {
    console.warn("Failed to delete user profile doc:", e);
  }

  // 3) Log analytics event
  try {
    logEvent("account_deleted", { uid });
  } catch (e) {
    console.warn("Analytics log failed for account_deleted:", e);
  }

  // 4) Delete auth user (may require recent login)
  await user.delete();
};

// ========================================
// INVITES
// ========================================
const createInviteCode = async (familyId, kidId, userId) => {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();

  await db.collection("invites").doc(code).set({
    familyId,
    kidId,
    createdBy: userId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    used: false
  });

  logEvent("invite_created", { familyId, kidId });
  return code;
};

const createInvite = async (familyId, kidId) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  return await createInviteCode(familyId, kidId, user.uid);
};

const acceptInvite = async (code, userId) => {
  const inviteRef = db.collection("invites").doc(code);
  const snap = await inviteRef.get();
  if (!snap.exists) throw new Error("Invalid invite");

  const invite = snap.data();
  if (invite.used) throw new Error("Invite already used");

  const familyRef = db.collection("families").doc(invite.familyId);

  // 1) Add user to family
  await familyRef.update({
    members: firebase.firestore.FieldValue.arrayUnion(userId)
  });

  // 2) Add user to ALL kids in this family (so access = family-wide)
  const kidsSnap = await familyRef.collection("kids").get();
  const kidUpdates = kidsSnap.docs.map((kidDoc) =>
    kidDoc.ref.update({
      members: firebase.firestore.FieldValue.arrayUnion(userId)
    })
  );
  await Promise.all(kidUpdates);

  // 3) Mark invite used
  await inviteRef.update({
    used: true,
    usedBy: userId,
    usedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Return something reasonable
  // Prefer invite.kidId if present, else pick family primary kid if you want later.
  return { familyId: invite.familyId, kidId: invite.kidId || (kidsSnap.docs[0]?.id || null) };
};

// ========================================
// FAMILY MEMBER LOOKUP
// ========================================
const getFamilyMembers = async (familyId) => {
  const famDoc = await db.collection("families").doc(familyId).get();
  if (!famDoc.exists) return [];

  const { members = [] } = famDoc.data();

  const userDocs = await Promise.all(
    members.map((uid) => db.collection("users").doc(uid).get())
  );

  return userDocs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
};

// Update user profile (used on Family tab when renaming yourself)
const updateUserProfile = async (userId, data) => {
  if (!userId) throw new Error("No userId");
  await db.collection("users").doc(userId).set(data, { merge: true });
};

// Remove a member from a family + kid (used on Family tab)
const removeMember = async (familyId, kidId_ignored, memberId) => {
  if (!familyId || !memberId) throw new Error("Missing ids");

  const familyRef = db.collection("families").doc(familyId);

  // 1) Remove from family
  await familyRef.update({
    members: firebase.firestore.FieldValue.arrayRemove(memberId),
  });

  // 2) Remove from ALL kids in the family
  const kidsSnap = await familyRef.collection("kids").get();
  const kidUpdates = kidsSnap.docs.map((kidDoc) =>
    kidDoc.ref.update({
      members: firebase.firestore.FieldValue.arrayRemove(memberId),
    })
  );
  await Promise.all(kidUpdates);
};

// ========================================
// FAMILY-BASED STORAGE LAYER
// ========================================
const __ttDataCache = (() => {
  const shared = typeof window !== 'undefined' ? window.TT?.shared?.dataCache : null;
  if (shared && shared.get && shared.set && shared.remove) return shared;
  return {
    async get(key) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore cache write errors
      }
    },
    async remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore cache delete errors
      }
    }
  };
})();

const firestoreStorage = {
  currentFamilyId: null,
  currentKidId: null,
  _cacheState: {
    feedings: null,
    nursingSessions: null,
    sleepSessions: null,
    diaperChanges: null,
    solidsSessions: null,
    lastSyncMs: 0,
    settings: null,
    sleepSettings: null,
    kidData: null,
    familyMembers: null,
    settingsSyncMs: 0,
    sleepSettingsSyncMs: 0,
    kidDataSyncMs: 0,
    familyMembersSyncMs: 0,
    initPromise: null,
    refreshPromise: null
  },
  _cacheMaxAgeMs: 60000,
  _settingsCacheMaxAgeMs: 300000,
  _setLastFeedVariant(variant) {
    if (variant !== 'bottle' && variant !== 'nursing' && variant !== 'solids') return;
    try {
      localStorage.setItem('tt_last_feed_variant', variant);
    } catch (e) {}
    try {
      const event = new CustomEvent('tt-last-feed-variant', { detail: { variant } });
      window.dispatchEvent(event);
    } catch (e) {}
  },

  initialize: async function (familyId, kidId) {
    this.currentFamilyId = familyId;
    this.currentKidId = kidId;
    this._cacheState = {
      feedings: null,
      nursingSessions: null,
      sleepSessions: null,
      diaperChanges: null,
      solidsSessions: null,
      lastSyncMs: 0,
      settings: null,
      sleepSettings: null,
      kidData: null,
      familyMembers: null,
      settingsSyncMs: 0,
      sleepSettingsSyncMs: 0,
      kidDataSyncMs: 0,
      familyMembersSyncMs: 0,
      initPromise: null,
      refreshPromise: null
    };
    await this._initCache();
    await this._loadSettingsCache();
    await Promise.all([
      this._refreshCache({ force: true }),
      this._refreshSettingsCache({ force: true }),
      this._refreshFamilyMembersCache({ force: true })
    ]);
    logEvent("kid_selected", { familyId, kidId });
    try {
      if (typeof window !== 'undefined' && window.__TT_DEBUG_ACTIVE_SLEEP_SUB) {
        console.log('[storage-ready]', { familyId, kidId });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tt:storage-ready', {
          detail: { familyId, kidId }
        }));
      }
    } catch (e) {}
  },

  _kidRef() {
    if (!this.currentFamilyId || !this.currentKidId)
      throw new Error("Storage not initialized");
    return db
      .collection("families")
      .doc(this.currentFamilyId)
      .collection("kids")
      .doc(this.currentKidId);
  },

  _cacheKey(name) {
    if (!this.currentFamilyId || !this.currentKidId) return null;
    return `tt_cache_v1:${this.currentFamilyId}:${this.currentKidId}:${name}`;
  },

  _familyCacheKey(name) {
    if (!this.currentFamilyId) return null;
    return `tt_cache_v1:${this.currentFamilyId}:${name}`;
  },

  _sortFeedingsAsc(list) {
    return (window.TT && window.TT.utils && window.TT.utils.sortFeedingsAsc) ? window.TT.utils.sortFeedingsAsc(list) : [...(list || [])].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  },

  _sortNursingAsc(list) {
    return (window.TT && window.TT.utils && window.TT.utils.sortNursingAsc) ? window.TT.utils.sortNursingAsc(list) : [...(list || [])].sort((a, b) => (a.timestamp || a.startTime || 0) - (b.timestamp || b.startTime || 0));
  },

  _sortSleepAsc(list) {
    return (window.TT && window.TT.utils && window.TT.utils.sortSleepAsc) ? window.TT.utils.sortSleepAsc(list) : [...(list || [])].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
  },

  _sortDiaperAsc(list) {
    return (window.TT && window.TT.utils && window.TT.utils.sortDiaperAsc) ? window.TT.utils.sortDiaperAsc(list) : [...(list || [])].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  },

  _sortSolidsAsc(list) {
    return (window.TT && window.TT.utils && window.TT.utils.sortSolidsAsc) ? window.TT.utils.sortSolidsAsc(list) : [...(list || [])].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  },

  async _initCache() {
    if (this._cacheState.initPromise) return this._cacheState.initPromise;
    const keyFeed = this._cacheKey('feedings');
    const keyNursing = this._cacheKey('nursingSessions');
    const keySleep = this._cacheKey('sleepSessions');
    const keyDiaper = this._cacheKey('diaperChanges');
    const keySolids = this._cacheKey('solidsSessions');
    const keyMeta = this._cacheKey('meta');
    if (!keyFeed || !keyNursing || !keySleep || !keyDiaper || !keySolids || !keyMeta) return null;
    this._cacheState.initPromise = (async () => {
      const [feedings, nursingSessions, sleeps, diapers, solids, meta] = await Promise.all([
        __ttDataCache.get(keyFeed),
        __ttDataCache.get(keyNursing),
        __ttDataCache.get(keySleep),
        __ttDataCache.get(keyDiaper),
        __ttDataCache.get(keySolids),
        __ttDataCache.get(keyMeta)
      ]);
      if (Array.isArray(feedings)) this._cacheState.feedings = feedings;
      if (Array.isArray(nursingSessions)) this._cacheState.nursingSessions = nursingSessions;
      if (Array.isArray(sleeps)) this._cacheState.sleepSessions = sleeps;
      if (Array.isArray(diapers)) this._cacheState.diaperChanges = diapers;
      if (Array.isArray(solids)) this._cacheState.solidsSessions = solids;
      if (meta && Number.isFinite(meta.lastSyncMs)) this._cacheState.lastSyncMs = meta.lastSyncMs;
      return true;
    })();
    return this._cacheState.initPromise;
  },

  async _saveCache() {
    const keyFeed = this._cacheKey('feedings');
    const keyNursing = this._cacheKey('nursingSessions');
    const keySleep = this._cacheKey('sleepSessions');
    const keyDiaper = this._cacheKey('diaperChanges');
    const keySolids = this._cacheKey('solidsSessions');
    const keyMeta = this._cacheKey('meta');
    if (!keyFeed || !keyNursing || !keySleep || !keyDiaper || !keySolids || !keyMeta) return;
    await Promise.all([
      __ttDataCache.set(keyFeed, this._cacheState.feedings || []),
      __ttDataCache.set(keyNursing, this._cacheState.nursingSessions || []),
      __ttDataCache.set(keySleep, this._cacheState.sleepSessions || []),
      __ttDataCache.set(keyDiaper, this._cacheState.diaperChanges || []),
      __ttDataCache.set(keySolids, this._cacheState.solidsSessions || []),
      __ttDataCache.set(keyMeta, { lastSyncMs: this._cacheState.lastSyncMs || 0 })
    ]);
  },

  async _saveSettingsCache() {
    const keySettings = this._cacheKey('settings');
    const keySleepSettings = this._cacheKey('sleepSettings');
    const keyKidData = this._cacheKey('kidData');
    const keyMeta = this._cacheKey('settingsMeta');
    const keyMembers = this._familyCacheKey('familyMembers');
    const keyMembersMeta = this._familyCacheKey('familyMembersMeta');
    if (!keySettings || !keySleepSettings || !keyKidData || !keyMeta) return;
    await Promise.all([
      __ttDataCache.set(keySettings, this._cacheState.settings || null),
      __ttDataCache.set(keySleepSettings, this._cacheState.sleepSettings || null),
      __ttDataCache.set(keyKidData, this._cacheState.kidData || null),
      __ttDataCache.set(keyMeta, {
        settingsSyncMs: this._cacheState.settingsSyncMs || 0,
        sleepSettingsSyncMs: this._cacheState.sleepSettingsSyncMs || 0,
        kidDataSyncMs: this._cacheState.kidDataSyncMs || 0
      }),
      keyMembers ? __ttDataCache.set(keyMembers, this._cacheState.familyMembers || null) : Promise.resolve(),
      keyMembersMeta ? __ttDataCache.set(keyMembersMeta, { familyMembersSyncMs: this._cacheState.familyMembersSyncMs || 0 }) : Promise.resolve()
    ]);
  },

  async _loadSettingsCache() {
    const keySettings = this._cacheKey('settings');
    const keySleepSettings = this._cacheKey('sleepSettings');
    const keyKidData = this._cacheKey('kidData');
    const keyMeta = this._cacheKey('settingsMeta');
    const keyMembers = this._familyCacheKey('familyMembers');
    const keyMembersMeta = this._familyCacheKey('familyMembersMeta');
    if (!keySettings || !keySleepSettings || !keyKidData || !keyMeta) return;
    const [settings, sleepSettings, kidData, meta, members, membersMeta] = await Promise.all([
      __ttDataCache.get(keySettings),
      __ttDataCache.get(keySleepSettings),
      __ttDataCache.get(keyKidData),
      __ttDataCache.get(keyMeta),
      keyMembers ? __ttDataCache.get(keyMembers) : null,
      keyMembersMeta ? __ttDataCache.get(keyMembersMeta) : null
    ]);
    if (settings) this._cacheState.settings = settings;
    if (sleepSettings) this._cacheState.sleepSettings = sleepSettings;
    if (kidData) this._cacheState.kidData = kidData;
    if (members) this._cacheState.familyMembers = members;
    if (meta) {
      this._cacheState.settingsSyncMs = meta.settingsSyncMs || 0;
      this._cacheState.sleepSettingsSyncMs = meta.sleepSettingsSyncMs || 0;
      this._cacheState.kidDataSyncMs = meta.kidDataSyncMs || 0;
    }
    if (membersMeta) {
      this._cacheState.familyMembersSyncMs = membersMeta.familyMembersSyncMs || 0;
    }
  },

  async _refreshSettingsCache({ force = false } = {}) {
    if (!this.currentFamilyId || !this.currentKidId) return null;
    const now = Date.now();
    if (!force && (now - (this._cacheState.settingsSyncMs || 0)) < this._settingsCacheMaxAgeMs) {
      return null;
    }
    const [settings, sleepSettings, kidData] = await Promise.all([
      this._getSettingsRemote(),
      this._getSleepSettingsRemote(),
      this._getKidDataRemote()
    ]);
    this._cacheState.settings = settings || null;
    this._cacheState.sleepSettings = sleepSettings || null;
    this._cacheState.kidData = kidData || null;
    this._cacheState.settingsSyncMs = now;
    this._cacheState.sleepSettingsSyncMs = now;
    this._cacheState.kidDataSyncMs = now;
    await this._saveSettingsCache();
    return true;
  },

  async _refreshFamilyMembersCache({ force = false } = {}) {
    if (!this.currentFamilyId) return null;
    const now = Date.now();
    if (!force && (now - (this._cacheState.familyMembersSyncMs || 0)) < this._settingsCacheMaxAgeMs) {
      return null;
    }
    const members = await this._getMembersRemote();
    this._cacheState.familyMembers = members || [];
    this._cacheState.familyMembersSyncMs = now;
    await this._saveSettingsCache();
    return true;
  },

  async _refreshCache({ force = false } = {}) {
    if (!this.currentFamilyId || !this.currentKidId) return null;
    const now = Date.now();
    if (!force && (now - (this._cacheState.lastSyncMs || 0)) < this._cacheMaxAgeMs) {
      return null;
    }
    if (this._cacheState.refreshPromise) return this._cacheState.refreshPromise;
    this._cacheState.refreshPromise = (async () => {
      const [feedings, nursingSessions, sleeps, diapers, solids] = await Promise.all([
        this._getAllFeedingsRemote(),
        this._getAllNursingSessionsRemote(),
        this._getAllSleepSessionsRemote(),
        this._getAllDiaperChangesRemote(),
        this._getAllSolidsSessionsRemote()
      ]);
      this._cacheState.feedings = this._sortFeedingsAsc(feedings);
      this._cacheState.nursingSessions = this._sortNursingAsc(nursingSessions);
      this._cacheState.sleepSessions = this._sortSleepAsc(sleeps);
      this._cacheState.diaperChanges = this._sortDiaperAsc(diapers);
      this._cacheState.solidsSessions = this._sortSolidsAsc(solids);
      this._cacheState.lastSyncMs = Date.now();
      await this._saveCache();
      return true;
    })();
    try {
      return await this._cacheState.refreshPromise;
    } finally {
      this._cacheState.refreshPromise = null;
    }
  },

  async _getCachedFeedings() {
    await this._initCache();
    return Array.isArray(this._cacheState.feedings) ? this._cacheState.feedings : null;
  },

  async _getCachedNursingSessions() {
    await this._initCache();
    return Array.isArray(this._cacheState.nursingSessions) ? this._cacheState.nursingSessions : null;
  },

  async _getCachedSleepSessions() {
    await this._initCache();
    return Array.isArray(this._cacheState.sleepSessions) ? this._cacheState.sleepSessions : null;
  },

  async _getCachedDiaperChanges() {
    await this._initCache();
    return Array.isArray(this._cacheState.diaperChanges) ? this._cacheState.diaperChanges : null;
  },

  async _getCachedSolidsSessions() {
    await this._initCache();
    return Array.isArray(this._cacheState.solidsSessions) ? this._cacheState.solidsSessions : null;
  },

  // -----------------------
  // KID PHOTO (base64 data URL)
  // -----------------------
  async uploadKidPhoto(base64DataUrl) {
    if (!base64DataUrl || typeof base64DataUrl !== "string") {
      throw new Error("uploadKidPhoto: missing base64 data URL");
    }
    await this._kidRef().set(
      {
        photoURL: base64DataUrl,
        photoUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    try {
      logEvent("kid_photo_uploaded", {});
    } catch {
      // ignore analytics failures
    }
    return base64DataUrl;
  },

  // -----------------------
  // PHOTO HELPERS (compression and upload)
  // -----------------------
  _compressImage(base64DataUrl, maxWidth = 1200) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions if image is larger than maxWidth
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with quality compression
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressedBase64);
      };
      img.onerror = reject;
      img.src = base64DataUrl;
    });
  },

  _dataUrlToBlob(base64DataUrl) {
    // Avoid fetch(data:) — it’s flaky in some iOS/PWA contexts.
    if (!base64DataUrl || typeof base64DataUrl !== 'string') {
      throw new Error("_dataUrlToBlob: missing data URL");
    }
    const commaIdx = base64DataUrl.indexOf(',');
    if (commaIdx < 0) throw new Error("_dataUrlToBlob: invalid data URL");
    const meta = base64DataUrl.slice(0, commaIdx);
    const b64 = base64DataUrl.slice(commaIdx + 1);
    const mimeMatch = meta.match(/data:([^;]+);base64/i);
    const mime = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : 'application/octet-stream';
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  },

  async uploadFeedingPhoto(base64DataUrl) {
    console.log('[uploadFeedingPhoto] Starting upload...');
    if (!base64DataUrl || typeof base64DataUrl !== "string") {
      console.error('[uploadFeedingPhoto] Error: missing base64 data URL');
      throw new Error("uploadFeedingPhoto: missing base64 data URL");
    }
    if (!this.currentFamilyId || !this.currentKidId) {
      console.error('[uploadFeedingPhoto] Error: Storage not initialized', { currentFamilyId: this.currentFamilyId, currentKidId: this.currentKidId });
      throw new Error("Storage not initialized");
    }
    
    // Ensure user is authenticated
    const user = auth.currentUser;
    if (!user) {
      console.error('[uploadFeedingPhoto] Error: User not authenticated');
      throw new Error("User must be authenticated to upload photos");
    }
    console.log('[uploadFeedingPhoto] User authenticated:', user.uid);
    
    // Check Supabase uploader is available
    if (!window.TT || typeof window.TT.uploadPhotoToSupabase !== "function") {
      throw new Error("Supabase uploader not initialized (check script tags + keys)");
    }
    
    // Compress image before upload (fallback to original on failure)
    let compressedBase64 = base64DataUrl;
    try {
      console.log('[uploadFeedingPhoto] Compressing image...');
      compressedBase64 = await this._compressImage(base64DataUrl, 1200);
      console.log('[uploadFeedingPhoto] Image compressed');
    } catch (e) {
      console.warn('[uploadFeedingPhoto] Compression failed, using original:', e);
      // If compression fails (e.g., codec issues), upload the original.
      compressedBase64 = base64DataUrl;
    }

    // Convert base64 to blob (robust across iOS/PWA)
    console.log('[uploadFeedingPhoto] Converting to blob...');
    const blob = this._dataUrlToBlob(compressedBase64);
    console.log('[uploadFeedingPhoto] Blob created:', { size: blob.size, type: blob.type });
    
    // Generate unique photo ID and storage path
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storagePath = `families/${this.currentFamilyId}/kids/${this.currentKidId}/photos/${photoId}`;
    console.log('[uploadFeedingPhoto] Storage path:', storagePath);
    
    // Upload to Supabase Storage
    try {
      console.log('[uploadFeedingPhoto] Uploading to Supabase Storage...');
      const publicUrl = await window.TT.uploadPhotoToSupabase({
        blob,
        path: storagePath,
        contentType: blob.type || 'image/jpeg'
      });
      console.log('[uploadFeedingPhoto] Upload successful:', publicUrl);
      return publicUrl;
    } catch (uploadError) {
      console.error('[uploadFeedingPhoto] Upload failed:', uploadError);
      console.error('[uploadFeedingPhoto] Upload error details:', {
        message: uploadError.message,
        stack: uploadError.stack,
        name: uploadError.name
      });
      throw uploadError;
    }
  },

  async uploadSleepPhoto(base64DataUrl) {
    console.log('[uploadSleepPhoto] Starting upload...');
    if (!base64DataUrl || typeof base64DataUrl !== "string") {
      console.error('[uploadSleepPhoto] Error: missing base64 data URL');
      throw new Error("uploadSleepPhoto: missing base64 data URL");
    }
    if (!this.currentFamilyId || !this.currentKidId) {
      console.error('[uploadSleepPhoto] Error: Storage not initialized', { currentFamilyId: this.currentFamilyId, currentKidId: this.currentKidId });
      throw new Error("Storage not initialized");
    }
    
    // Ensure user is authenticated
    const user = auth.currentUser;
    if (!user) {
      console.error('[uploadSleepPhoto] Error: User not authenticated');
      throw new Error("User must be authenticated to upload photos");
    }
    console.log('[uploadSleepPhoto] User authenticated:', user.uid);
    
    // Check Supabase uploader is available
    if (!window.TT || typeof window.TT.uploadPhotoToSupabase !== "function") {
      throw new Error("Supabase uploader not initialized (check script tags + keys)");
    }
    
    // Compress image before upload (fallback to original on failure)
    let compressedBase64 = base64DataUrl;
    try {
      console.log('[uploadSleepPhoto] Compressing image...');
      compressedBase64 = await this._compressImage(base64DataUrl, 1200);
      console.log('[uploadSleepPhoto] Image compressed');
    } catch (e) {
      console.warn('[uploadSleepPhoto] Compression failed, using original:', e);
      compressedBase64 = base64DataUrl;
    }

    // Convert base64 to blob (robust across iOS/PWA)
    console.log('[uploadSleepPhoto] Converting to blob...');
    const blob = this._dataUrlToBlob(compressedBase64);
    console.log('[uploadSleepPhoto] Blob created:', { size: blob.size, type: blob.type });
    
    // Generate unique photo ID and storage path
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storagePath = `families/${this.currentFamilyId}/kids/${this.currentKidId}/photos/${photoId}`;
    console.log('[uploadSleepPhoto] Storage path:', storagePath);
    
    // Upload to Supabase Storage
    try {
      console.log('[uploadSleepPhoto] Uploading to Supabase Storage...');
      const publicUrl = await window.TT.uploadPhotoToSupabase({
        blob,
        path: storagePath,
        contentType: blob.type || 'image/jpeg'
      });
      console.log('[uploadSleepPhoto] Upload successful:', publicUrl);
      return publicUrl;
    } catch (uploadError) {
      console.error('[uploadSleepPhoto] Upload failed:', uploadError);
      console.error('[uploadSleepPhoto] Upload error details:', {
        message: uploadError.message,
        stack: uploadError.stack,
        name: uploadError.name
      });
      throw uploadError;
    }
  },

  async uploadDiaperPhoto(base64DataUrl) {
    console.log('[uploadDiaperPhoto] Starting upload...');
    if (!base64DataUrl || typeof base64DataUrl !== "string") {
      console.error('[uploadDiaperPhoto] Error: missing base64 data URL');
      throw new Error("uploadDiaperPhoto: missing base64 data URL");
    }
    if (!this.currentFamilyId || !this.currentKidId) {
      console.error('[uploadDiaperPhoto] Error: Storage not initialized', { currentFamilyId: this.currentFamilyId, currentKidId: this.currentKidId });
      throw new Error("Storage not initialized");
    }

    const user = auth.currentUser;
    if (!user) {
      console.error('[uploadDiaperPhoto] Error: User not authenticated');
      throw new Error("User must be authenticated to upload photos");
    }
    console.log('[uploadDiaperPhoto] User authenticated:', user.uid);

    if (!window.TT || typeof window.TT.uploadPhotoToSupabase !== "function") {
      throw new Error("Supabase uploader not initialized (check script tags + keys)");
    }

    let compressedBase64 = base64DataUrl;
    try {
      console.log('[uploadDiaperPhoto] Compressing image...');
      compressedBase64 = await this._compressImage(base64DataUrl, 1200);
      console.log('[uploadDiaperPhoto] Image compressed');
    } catch (e) {
      console.warn('[uploadDiaperPhoto] Compression failed, using original:', e);
      compressedBase64 = base64DataUrl;
    }

    console.log('[uploadDiaperPhoto] Converting to blob...');
    const blob = this._dataUrlToBlob(compressedBase64);
    console.log('[uploadDiaperPhoto] Blob created:', { size: blob.size, type: blob.type });

    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storagePath = `families/${this.currentFamilyId}/kids/${this.currentKidId}/diaperPhotos/${photoId}`;
    console.log('[uploadDiaperPhoto] Storage path:', storagePath);

    try {
      console.log('[uploadDiaperPhoto] Uploading to Supabase Storage...');
      const publicUrl = await window.TT.uploadPhotoToSupabase({
        blob,
        path: storagePath,
        contentType: blob.type || 'image/jpeg'
      });
      console.log('[uploadDiaperPhoto] Upload successful:', publicUrl);
      return publicUrl;
    } catch (uploadError) {
      console.error('[uploadDiaperPhoto] Upload failed:', uploadError);
      console.error('[uploadDiaperPhoto] Upload error details:', {
        message: uploadError.message,
        stack: uploadError.stack,
        name: uploadError.name
      });
      throw uploadError;
    }
  },

  // -----------------------
  // FEEDINGS
  // -----------------------
  async addFeeding(ounces, timestamp) {
    const ref = await this._kidRef().collection("feedings").add({ ounces, timestamp });
    const item = { id: ref.id, ounces, timestamp };
    const cached = await this._getCachedFeedings();
    if (cached) {
      this._cacheState.feedings = this._sortFeedingsAsc([...cached, item]);
      await this._saveCache();
    }
    logEvent("feeding_added", { ounces });
    this._setLastFeedVariant('bottle');
  },

  async getFeedings() {
    const cached = await this._getCachedFeedings();
    if (cached) {
      this._refreshCache({ force: false });
      return [...cached].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    const snap = await this._kidRef()
      .collection("feedings")
      .orderBy("timestamp", "desc")
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cacheState.feedings = this._sortFeedingsAsc(data);
    this._cacheState.lastSyncMs = Date.now();
    await this._saveCache();
    return data;
  },

  async getFeedingsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    const cached = await this._getCachedFeedings();
    if (cached) {
      this._refreshCache({ force: false });
      return cached.filter((f) => (f.timestamp || 0) > cutoff);
    }
    const snap = await this._kidRef()
      .collection("feedings")
      .where("timestamp", ">", cutoff)
      .orderBy("timestamp", "asc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateFeeding(id, ounces, timestamp) {
    await this._kidRef()
      .collection("feedings")
      .doc(id)
      .update({ ounces, timestamp });
    const cached = await this._getCachedFeedings();
    if (cached) {
      this._cacheState.feedings = this._sortFeedingsAsc(
        cached.map((f) => (f.id === id ? { ...f, ounces, timestamp } : f))
      );
      await this._saveCache();
    }
  },

  async deleteFeeding(id) {
    await this._kidRef().collection("feedings").doc(id).delete();
    const cached = await this._getCachedFeedings();
    if (cached) {
      this._cacheState.feedings = cached.filter((f) => f.id !== id);
      await this._saveCache();
    }
  },

  // ⭐⭐⭐⭐⭐ ADDED PATCH — REQUIRED BY ANALYTICS TAB
  async getAllFeedings() {
    const cached = await this._getCachedFeedings();
    if (cached) {
      this._refreshCache({ force: false });
      return cached;
    }
    return await this._getAllFeedingsRemote();
  },

  async addFeedingWithNotes(ounces, timestamp, notes = null, photoURLs = null) {
    const data = { ounces, timestamp };
    if (notes !== null && notes !== undefined && notes !== '') {
      data.notes = notes;
    }
    if (photoURLs !== null && photoURLs !== undefined && Array.isArray(photoURLs) && photoURLs.length > 0) {
      data.photoURLs = photoURLs;
    }
    const ref = await this._kidRef().collection("feedings").add(data);
    const item = { id: ref.id, ...data };
    const cached = await this._getCachedFeedings();
    if (cached) {
      this._cacheState.feedings = this._sortFeedingsAsc([...cached, item]);
      await this._saveCache();
    }
    logEvent("feeding_added", { ounces });
    this._setLastFeedVariant('bottle');
  },

  async updateFeedingWithNotes(id, ounces, timestamp, notes = null, photoURLs = null) {
    const data = { ounces, timestamp };
    if (notes !== null && notes !== undefined) {
      if (notes === '') {
        data.notes = firebase.firestore.FieldValue.delete();
      } else {
        data.notes = notes;
      }
    }
    if (photoURLs !== null && photoURLs !== undefined) {
      if (Array.isArray(photoURLs) && photoURLs.length === 0) {
        data.photoURLs = firebase.firestore.FieldValue.delete();
      } else if (Array.isArray(photoURLs)) {
        data.photoURLs = photoURLs;
      }
    }
    await this._kidRef()
      .collection("feedings")
      .doc(id)
      .update(data);
    const cached = await this._getCachedFeedings();
    if (cached) {
      this._cacheState.feedings = this._sortFeedingsAsc(
        cached.map((f) => (f.id === id ? { ...f, ...data } : f))
      );
      await this._saveCache();
    }
  },

  // -----------------------
  // NURSING SESSIONS
  // -----------------------
  async addNursingSession(startTime, leftDurationSec, rightDurationSec, lastSide = null) {
    const timestamp = Number.isFinite(startTime) ? startTime : Date.now();
    const data = { startTime: timestamp, timestamp, leftDurationSec: Number(leftDurationSec) || 0, rightDurationSec: Number(rightDurationSec) || 0 };
    if (lastSide) data.lastSide = lastSide;
    const ref = await this._kidRef().collection("nursingSessions").add(data);
    const item = { id: ref.id, ...data };
    const cached = await this._getCachedNursingSessions();
    if (cached) {
      this._cacheState.nursingSessions = this._sortNursingAsc([...cached, item]);
      await this._saveCache();
    }
    logEvent("nursing_added", { leftDurationSec: data.leftDurationSec, rightDurationSec: data.rightDurationSec });
    this._setLastFeedVariant('nursing');
  },

  async addNursingSessionWithNotes(startTime, leftDurationSec, rightDurationSec, lastSide = null, notes = null, photoURLs = null) {
    const timestamp = Number.isFinite(startTime) ? startTime : Date.now();
    const data = { startTime: timestamp, timestamp, leftDurationSec: Number(leftDurationSec) || 0, rightDurationSec: Number(rightDurationSec) || 0 };
    if (lastSide) data.lastSide = lastSide;
    if (notes !== null && notes !== undefined && String(notes).trim() !== '') {
      data.notes = notes;
    }
    if (photoURLs !== null && photoURLs !== undefined && Array.isArray(photoURLs) && photoURLs.length > 0) {
      data.photoURLs = photoURLs;
    }
    const ref = await this._kidRef().collection("nursingSessions").add(data);
    const item = { id: ref.id, ...data };
    const cached = await this._getCachedNursingSessions();
    if (cached) {
      this._cacheState.nursingSessions = this._sortNursingAsc([...cached, item]);
      await this._saveCache();
    }
    logEvent("nursing_added", { leftDurationSec: data.leftDurationSec, rightDurationSec: data.rightDurationSec });
    this._setLastFeedVariant('nursing');
  },

  async getNursingSessions() {
    const cached = await this._getCachedNursingSessions();
    if (cached) {
      this._refreshCache({ force: false });
      return [...cached].sort((a, b) => ((b.timestamp || b.startTime || 0) - (a.timestamp || a.startTime || 0)));
    }
    const snap = await this._kidRef()
      .collection("nursingSessions")
      .orderBy("timestamp", "desc")
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cacheState.nursingSessions = this._sortNursingAsc(data);
    this._cacheState.lastSyncMs = Date.now();
    await this._saveCache();
    return data;
  },

  async getNursingSessionsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    const cached = await this._getCachedNursingSessions();
    if (cached) {
      this._refreshCache({ force: false });
      return cached.filter((s) => ((s.timestamp || s.startTime || 0) > cutoff));
    }
    const snap = await this._kidRef()
      .collection("nursingSessions")
      .where("timestamp", ">", cutoff)
      .orderBy("timestamp", "asc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateNursingSession(id, startTime, leftDurationSec, rightDurationSec, lastSide = null) {
    const timestamp = Number.isFinite(startTime) ? startTime : Date.now();
    const data = { startTime: timestamp, timestamp, leftDurationSec: Number(leftDurationSec) || 0, rightDurationSec: Number(rightDurationSec) || 0 };
    if (lastSide) data.lastSide = lastSide;
    await this._kidRef()
      .collection("nursingSessions")
      .doc(id)
      .update(data);
    const cached = await this._getCachedNursingSessions();
    if (cached) {
      this._cacheState.nursingSessions = this._sortNursingAsc(
        cached.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      await this._saveCache();
    }
  },

  async updateNursingSessionWithNotes(id, startTime, leftDurationSec, rightDurationSec, lastSide = null, notes = null, photoURLs = null) {
    const timestamp = Number.isFinite(startTime) ? startTime : Date.now();
    const data = { startTime: timestamp, timestamp, leftDurationSec: Number(leftDurationSec) || 0, rightDurationSec: Number(rightDurationSec) || 0 };
    if (lastSide) data.lastSide = lastSide;
    if (notes !== null && notes !== undefined) {
      if (notes === '') {
        data.notes = firebase.firestore.FieldValue.delete();
      } else {
        data.notes = notes;
      }
    }
    if (photoURLs !== null && photoURLs !== undefined) {
      if (Array.isArray(photoURLs) && photoURLs.length === 0) {
        data.photoURLs = firebase.firestore.FieldValue.delete();
      } else if (Array.isArray(photoURLs)) {
        data.photoURLs = photoURLs;
      }
    }
    await this._kidRef()
      .collection("nursingSessions")
      .doc(id)
      .update(data);
    const cached = await this._getCachedNursingSessions();
    if (cached) {
      this._cacheState.nursingSessions = this._sortNursingAsc(
        cached.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      await this._saveCache();
    }
  },

  async deleteNursingSession(id) {
    await this._kidRef().collection("nursingSessions").doc(id).delete();
    const cached = await this._getCachedNursingSessions();
    if (cached) {
      this._cacheState.nursingSessions = cached.filter((s) => s.id !== id);
      await this._saveCache();
    }
  },

  async getAllNursingSessions() {
    const cached = await this._getCachedNursingSessions();
    if (cached) {
      this._refreshCache({ force: false });
      return cached;
    }
    return await this._getAllNursingSessionsRemote();
  },

  // -----------------------
  // SOLIDS SESSIONS
  // -----------------------
  async addSolidsSession({ timestamp, foods, notes = null, photoURLs = null }) {
    const data = {
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      foods: Array.isArray(foods) ? foods : []
    };
    if (notes !== null && notes !== undefined && String(notes).trim() !== '') {
      data.notes = notes;
    }
    if (photoURLs !== null && photoURLs !== undefined && Array.isArray(photoURLs) && photoURLs.length > 0) {
      data.photoURLs = photoURLs;
    }
    const ref = await this._kidRef().collection("solidsSessions").add(data);
    const item = { id: ref.id, ...data };
    const cached = await this._getCachedSolidsSessions();
    if (cached) {
      this._cacheState.solidsSessions = this._sortSolidsAsc([...cached, item]);
      await this._saveCache();
    }
    logEvent("solids_added", { foodCount: foods.length });
    this._setLastFeedVariant('solids');
    return item;
  },

  async getSolidsSessions() {
    const cached = await this._getCachedSolidsSessions();
    if (cached) {
      this._refreshCache({ force: false });
      return [...cached].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    const snap = await this._kidRef()
      .collection("solidsSessions")
      .orderBy("timestamp", "desc")
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cacheState.solidsSessions = this._sortSolidsAsc(data);
    this._cacheState.lastSyncMs = Date.now();
    await this._saveCache();
    return data;
  },

  async getSolidsSessionsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    const cached = await this._getCachedSolidsSessions();
    if (cached) {
      this._refreshCache({ force: false });
      return cached.filter((s) => (s.timestamp || 0) > cutoff);
    }
    const snap = await this._kidRef()
      .collection("solidsSessions")
      .where("timestamp", ">", cutoff)
      .orderBy("timestamp", "asc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateSolidsSession(id, { timestamp, foods, notes = null, photoURLs = null }) {
    const data = {
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      foods: Array.isArray(foods) ? foods : []
    };
    if (notes !== null && notes !== undefined) {
      if (notes === '') {
        data.notes = firebase.firestore.FieldValue.delete();
      } else {
        data.notes = notes;
      }
    }
    if (photoURLs !== null && photoURLs !== undefined) {
      if (Array.isArray(photoURLs) && photoURLs.length === 0) {
        data.photoURLs = firebase.firestore.FieldValue.delete();
      } else if (Array.isArray(photoURLs)) {
        data.photoURLs = photoURLs;
      }
    }
    await this._kidRef()
      .collection("solidsSessions")
      .doc(id)
      .update(data);
    const cached = await this._getCachedSolidsSessions();
    if (cached) {
      this._cacheState.solidsSessions = this._sortSolidsAsc(
        cached.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      await this._saveCache();
    }
  },

  async deleteSolidsSession(id) {
    await this._kidRef().collection("solidsSessions").doc(id).delete();
    const cached = await this._getCachedSolidsSessions();
    if (cached) {
      this._cacheState.solidsSessions = cached.filter((s) => s.id !== id);
      await this._saveCache();
    }
  },

  async getAllSolidsSessions() {
    const cached = await this._getCachedSolidsSessions();
    if (cached) {
      this._refreshCache({ force: false });
      return cached;
    }
    return await this._getAllSolidsSessionsRemote();
  },

  // -----------------------
  // DIAPER CHANGES
  // -----------------------
  async addDiaperChange({ timestamp, isWet = false, isDry = false, isPoo = false, notes = null, photoURLs = null }) {
    const data = {
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      isWet: !!isWet,
      isDry: !!isDry,
      isPoo: !!isPoo
    };
    if (notes !== null && notes !== undefined && String(notes).trim() !== '') {
      data.notes = notes;
    }
    if (photoURLs !== null && photoURLs !== undefined && Array.isArray(photoURLs) && photoURLs.length > 0) {
      data.photoURLs = photoURLs;
    }
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    const ref = await this._kidRef().collection("diaperChanges").add(data);
    const item = { id: ref.id, ...data };
    const cached = await this._getCachedDiaperChanges();
    if (cached) {
      this._cacheState.diaperChanges = this._sortDiaperAsc([...cached, item]);
      await this._saveCache();
    }
    logEvent("diaper_added", { isWet: !!isWet, isDry: !!isDry, isPoo: !!isPoo });
    return item;
  },

  async getDiaperChanges() {
    const cached = await this._getCachedDiaperChanges();
    if (cached) {
      this._refreshCache({ force: false });
      return [...cached].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    const snap = await this._kidRef()
      .collection("diaperChanges")
      .orderBy("timestamp", "desc")
      .get();
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    this._cacheState.diaperChanges = this._sortDiaperAsc(data);
    this._cacheState.lastSyncMs = Date.now();
    await this._saveCache();
    return data;
  },

  async getDiaperChangesLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    const cached = await this._getCachedDiaperChanges();
    if (cached) {
      this._refreshCache({ force: false });
      return cached.filter((c) => (c.timestamp || 0) > cutoff);
    }
    const snap = await this._kidRef()
      .collection("diaperChanges")
      .where("timestamp", ">", cutoff)
      .orderBy("timestamp", "asc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateDiaperChange(id, data) {
    if (!id) throw new Error("Missing diaper change id");
    const updateData = { ...data };
    if (updateData.notes !== null && updateData.notes !== undefined) {
      if (updateData.notes === '') {
        updateData.notes = firebase.firestore.FieldValue.delete();
      }
    }
    if (updateData.photoURLs !== null && updateData.photoURLs !== undefined) {
      if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
        updateData.photoURLs = firebase.firestore.FieldValue.delete();
      } else if (Array.isArray(updateData.photoURLs)) {
        updateData.photoURLs = updateData.photoURLs;
      }
    }
    await this._kidRef().collection("diaperChanges").doc(id).update(updateData || {});
    const cached = await this._getCachedDiaperChanges();
    if (cached) {
      this._cacheState.diaperChanges = this._sortDiaperAsc(
        cached.map((c) => (c.id === id ? { ...c, ...updateData } : c))
      );
      await this._saveCache();
    }
  },

  async deleteDiaperChange(id) {
    if (!id) throw new Error("Missing diaper change id");
    await this._kidRef().collection("diaperChanges").doc(id).delete();
    const cached = await this._getCachedDiaperChanges();
    if (cached) {
      this._cacheState.diaperChanges = cached.filter((c) => c.id !== id);
      await this._saveCache();
    }
  },

  async getAllDiaperChanges() {
    const cached = await this._getCachedDiaperChanges();
    if (cached) {
      this._refreshCache({ force: false });
      return cached;
    }
    return await this._getAllDiaperChangesRemote();
  },

  // -----------------------
  // SLEEP SESSIONS
  // -----------------------
  _minutesOfDayLocal(ms) {
    try {
      const d = new Date(ms);
      return d.getHours() * 60 + d.getMinutes();
    } catch {
      return 0;
    }
  },
  _isWithinWindow(mins, startMins, endMins) {
    const s = Number(startMins);
    const e = Number(endMins);
    const m = Number(mins);
    if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(m)) return false;
    if (s === e) return false; // degenerate window
    if (s < e) return m >= s && m <= e;
    // wraps past midnight
    return (m >= s) || (m <= e);
  },
  async _classifySleepTypeForStartMs(startMs) {
    try {
      const ss = await this.getSleepSettings();
      const dayStart = Number(ss?.sleepDayStart ?? ss?.daySleepStartMinutes ?? 390);
      const dayEnd = Number(ss?.sleepDayEnd ?? ss?.daySleepEndMinutes ?? 1170);
      const mins = this._minutesOfDayLocal(startMs);
      return this._isWithinWindow(mins, dayStart, dayEnd) ? "day" : "night";
    } catch {
      return "night";
    }
  },
  async startSleep(startTime = null) {
    const user = auth.currentUser;
    const uid = user ? user.uid : null;

    // Ensure only one active sleep per kid
    const activeSnap = await this._kidRef()
      .collection("sleepSessions")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (!activeSnap.empty) {
      const d = activeSnap.docs[0];
      return { id: d.id, ...d.data() };
    }

    const startMs = typeof startTime === "number" ? startTime : Date.now();
    const sleepType = await this._classifySleepTypeForStartMs(startMs);

    const ref = await this._kidRef().collection("sleepSessions").add({
      startTime: startMs,
      endTime: null,
      isActive: true,
      sleepType,
      startedByUid: uid,
      endedByUid: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    logEvent("sleep_started", { startTime: startMs });
    const doc = await ref.get();
    const item = { id: doc.id, ...doc.data() };
    const cached = await this._getCachedSleepSessions();
    if (cached) {
      this._cacheState.sleepSessions = this._sortSleepAsc([...cached, item]);
      await this._saveCache();
    }
    return { id: doc.id, ...doc.data() };
  },

  async endSleep(sessionId, endTime = null) {
    const user = auth.currentUser;
    const uid = user ? user.uid : null;
    if (!sessionId) throw new Error("Missing sleep session id");
    const endMs = typeof endTime === "number" ? endTime : Date.now();
    // Tag sleep as day vs night based on the saved day window.
    // Rule: if the *start time* is within the day window => day sleep (nap). Otherwise => night sleep.
    let isDaySleep = false;
    try {
      const kidDoc = await this._kidRef().get();
      const kd = kidDoc.exists ? kidDoc.data() : {};
      const dayStart =
        typeof kd.sleepDayStart === "number" && !Number.isNaN(kd.sleepDayStart)
          ? kd.sleepDayStart
          : typeof kd.daySleepStartMinutes === "number" && !Number.isNaN(kd.daySleepStartMinutes)
            ? kd.daySleepStartMinutes
            : 390;
      const dayEnd =
        typeof kd.sleepDayEnd === "number" && !Number.isNaN(kd.sleepDayEnd)
          ? kd.sleepDayEnd
          : typeof kd.daySleepEndMinutes === "number" && !Number.isNaN(kd.daySleepEndMinutes)
            ? kd.daySleepEndMinutes
            : 1170;
      const sessDoc = await this._kidRef().collection("sleepSessions").doc(sessionId).get();
      const sess = sessDoc.exists ? sessDoc.data() : {};
      const startMs = typeof sess.startTime === "number" ? sess.startTime : null;
      if (startMs) {
        const dt = new Date(startMs);
        const mins = dt.getHours() * 60 + dt.getMinutes();
        if (dayStart <= dayEnd) {
          isDaySleep = mins >= dayStart && mins <= dayEnd;
        } else {
          // window wraps midnight
          isDaySleep = mins >= dayStart || mins <= dayEnd;
        }
      }
    } catch (e) {
      console.warn("Failed to classify sleep as day/night:", e);
    }
    await this._kidRef()
      .collection("sleepSessions")
      .doc(sessionId)
      .update({
        endTime: endMs,
        isActive: false,
        endedByUid: uid,
        isDaySleep: !!isDaySleep,
        sleepType: isDaySleep ? "day" : "night"
      });
    const cached = await this._getCachedSleepSessions();
    if (cached) {
      this._cacheState.sleepSessions = this._sortSleepAsc(
        cached.map((s) => (s.id === sessionId ? { ...s, endTime: endMs, isActive: false, endedByUid: uid, isDaySleep: !!isDaySleep, sleepType: isDaySleep ? "day" : "night" } : s))
      );
      await this._saveCache();
    }
    logEvent("sleep_ended", { endTime: endMs });
  },

  // Subscribe to the active sleep session (if any). Callback receives:
  // - null when no active session
  // - { id, ...data } when active
  subscribeActiveSleep(callback) {
    if (typeof callback !== "function") throw new Error("Missing callback");
    
    // Guard: Don't create listener if storage isn't initialized
    if (!this.currentFamilyId || !this.currentKidId) {
      // Return a no-op unsubscribe function
      callback(null);
      return () => {};
    }

    try {
      return this._kidRef()
        .collection("sleepSessions")
        .where("isActive", "==", true)
        .limit(1)
        .onSnapshot(
          (snap) => {
            if (snap.empty) {
              callback(null);
              return;
            }
            const d = snap.docs[0];
            callback({ id: d.id, ...d.data() });
          },
          (err) => {
            console.error("Active sleep subscription error:", err);
            callback(null);
          }
        );
    } catch (err) {
      // If _kidRef() throws or listener creation fails, return no-op unsubscribe
      console.warn("Could not create active sleep listener:", err);
      callback(null);
      return () => {};
    }
  },

  async getSleepSessionsLastNDays(days) {
    const cutoff = Date.now() - days * 86400000;
    const cached = await this._getCachedSleepSessions();
    if (cached) {
      this._refreshCache({ force: false });
      return cached.filter((s) => (s.startTime || 0) > cutoff);
    }
    const snap = await this._kidRef()
      .collection("sleepSessions")
      .where("startTime", ">", cutoff)
      .orderBy("startTime", "asc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getAllSleepSessions() {
    const cached = await this._getCachedSleepSessions();
    if (cached) {
      this._refreshCache({ force: false });
      return cached;
    }
    return await this._getAllSleepSessionsRemote();
  },

  async updateSleepSession(id, data) {
    if (!id) throw new Error("Missing sleep session id");
    // Handle empty photoURLs array - delete the field instead of saving empty array
    const updateData = { ...data };
    if (updateData.photoURLs !== null && updateData.photoURLs !== undefined) {
      if (Array.isArray(updateData.photoURLs) && updateData.photoURLs.length === 0) {
        updateData.photoURLs = firebase.firestore.FieldValue.delete();
      }
    }
    await this._kidRef().collection("sleepSessions").doc(id).update(updateData || {});
    const cached = await this._getCachedSleepSessions();
    if (cached) {
      this._cacheState.sleepSessions = this._sortSleepAsc(
        cached.map((s) => (s.id === id ? { ...s, ...updateData } : s))
      );
      await this._saveCache();
    }
  },

  async deleteSleepSession(id) {
    if (!id) throw new Error("Missing sleep session id");
    await this._kidRef().collection("sleepSessions").doc(id).delete();
    const cached = await this._getCachedSleepSessions();
    if (cached) {
      this._cacheState.sleepSessions = cached.filter((s) => s.id !== id);
      await this._saveCache();
    }
  },

  // -----------------------
  // SETTINGS
  // -----------------------
  async getSettings() {
    if (!this._cacheState.settings && !this._cacheState.settingsSyncMs) {
      await this._loadSettingsCache();
    }
    if (this._cacheState.settings) {
      this._refreshSettingsCache({ force: false });
      return this._cacheState.settings;
    }
    const settings = await this._getSettingsRemote();
    this._cacheState.settings = settings || null;
    this._cacheState.settingsSyncMs = Date.now();
    await this._saveSettingsCache();
    return settings;
  },

  async saveSettings(settings) {
    await this._kidRef()
      .collection("settings")
      .doc("default")
      .set(settings, { merge: true });
    const existing = this._cacheState.settings || null;
    const next = { ...(existing || {}), ...(settings || {}) };
    this._cacheState.settings = next;
    this._cacheState.settingsSyncMs = Date.now();
    await this._saveSettingsCache();
  },

  // -----------------------
  // SLEEP SETTINGS (per kid)
  // -----------------------
  _defaultSleepTargetHoursFromBirthTs(birthTs) {
    // Age-based (best-practice) defaults using midpoints of common pediatric ranges.
    // Newborn (0-3mo): 14–17h => 15.5
    // Infant (4-12mo): 12–16h => 14
    // Toddler (1-2y): 11–14h => 12.5
    // Preschool (3-5y): 10–13h => 11.5
    try {
      if (!birthTs) return 14;
      const ageDays = Math.max(0, (Date.now() - birthTs) / 86400000);
      const ageMonths = ageDays / 30.4375;
      if (ageMonths < 4) return 15.5;
      if (ageMonths < 12) return 14;
      if (ageMonths < 24) return 12.5;
      if (ageMonths < 60) return 11.5;
      return 10.5;
    } catch {
      return 14;
    }
  },

  async getSleepSettings() {
    if (!this._cacheState.sleepSettings && !this._cacheState.sleepSettingsSyncMs) {
      await this._loadSettingsCache();
    }
    if (this._cacheState.sleepSettings) {
      this._refreshSettingsCache({ force: false });
      return this._cacheState.sleepSettings;
    }
    const settings = await this._getSleepSettingsRemote();
    this._cacheState.sleepSettings = settings || null;
    this._cacheState.sleepSettingsSyncMs = Date.now();
    await this._saveSettingsCache();
    return settings;
  },

  async updateSleepSettings({ sleepNightStart, sleepNightEnd, sleepDayStart, sleepDayEnd, sleepTargetHours }) {
    const payload = {
      ...(sleepNightStart != null ? { sleepNightStart } : {}),
      ...(sleepNightEnd != null ? { sleepNightEnd } : {}),
      ...(sleepTargetHours != null ? { sleepTargetHours } : {})
    };

    const dayStartNum = Number(sleepDayStart);
    if (sleepDayStart != null && !Number.isNaN(dayStartNum)) {
      payload.sleepDayStart = dayStartNum;
      payload.daySleepStartMinutes = dayStartNum; // back-compat
    }

    const dayEndNum = Number(sleepDayEnd);
    if (sleepDayEnd != null && !Number.isNaN(dayEndNum)) {
      payload.sleepDayEnd = dayEndNum;
      payload.daySleepEndMinutes = dayEndNum; // back-compat
    }

    await this._kidRef().update(payload);
    logEvent("sleep_settings_updated", { sleepNightStart, sleepNightEnd, sleepDayStart: payload.sleepDayStart, sleepDayEnd: payload.sleepDayEnd, sleepTargetHours });
    const refreshed = await this._getSleepSettingsRemote();
    this._cacheState.sleepSettings = refreshed || null;
    this._cacheState.sleepSettingsSyncMs = Date.now();
    await this._saveSettingsCache();
  },

  // -----------------------
  // KID PROFILE
  // -----------------------
  async getKidData() {
    if (!this._cacheState.kidData && !this._cacheState.kidDataSyncMs) {
      await this._loadSettingsCache();
    }
    if (this._cacheState.kidData) {
      this._refreshSettingsCache({ force: false });
      return this._cacheState.kidData;
    }
    const data = await this._getKidDataRemote();
    this._cacheState.kidData = data || null;
    this._cacheState.kidDataSyncMs = Date.now();
    await this._saveSettingsCache();
    return data;
  },

  async updateKidData(data) {
    await this._kidRef().set(data, { merge: true });
    const existing = this._cacheState.kidData || {};
    const next = { ...existing, ...(data || {}) };
    if (!next.id && existing.id) next.id = existing.id;
    this._cacheState.kidData = next;
    this._cacheState.kidDataSyncMs = Date.now();
    await this._saveSettingsCache();
  },

  // -----------------------
  // AI CHAT
  // -----------------------
  async getConversation() {
    const doc = await this._kidRef()
      .collection("conversations")
      .doc("default")
      .get();
    return doc.exists ? doc.data() : { messages: [] };
  },

  async saveMessage(message) {
    const ref = this._kidRef()
      .collection("conversations")
      .doc("default");

    const doc = await ref.get();
    const messages = doc.exists ? doc.data().messages || [] : [];
    messages.push(message);

    await ref.set({ messages }, { merge: true });
  },

  async clearConversation() {
    await this._kidRef().collection("conversations").doc("default").delete();
  },

  // -----------------------
  // MEMBERS
  // -----------------------
  async getMembers() {
    if (!this._cacheState.familyMembers && !this._cacheState.familyMembersSyncMs) {
      await this._loadSettingsCache();
    }
    if (this._cacheState.familyMembers) {
      this._refreshFamilyMembersCache({ force: false });
      return this._cacheState.familyMembers;
    }
    const members = await this._getMembersRemote();
    this._cacheState.familyMembers = members || [];
    this._cacheState.familyMembersSyncMs = Date.now();
    await this._saveSettingsCache();
    return members;
  },

  // -----------------------
  // CUSTOM FOODS (Family Level)
  // -----------------------
  async addCustomFood({ name, category, icon, emoji }) {
    if (!this.currentFamilyId) throw new Error('No family ID');
    const familyRef = firebase.firestore().collection('families').doc(this.currentFamilyId);
    const data = {
      name,
      category: category || 'Custom',
      icon: icon || null,
      emoji: emoji || null,
      isDeleted: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await familyRef.collection('customFoods').add(data);
    return { id: ref.id, ...data };
  },

  async getCustomFoods() {
    if (!this.currentFamilyId) return [];
    const familyRef = firebase.firestore().collection('families').doc(this.currentFamilyId);
    const snap = await familyRef.collection('customFoods').get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((item) => !item?.isDeleted);
  },

  async updateCustomFood(foodId, patch = {}) {
    if (!this.currentFamilyId) throw new Error('No family ID');
    if (!foodId) throw new Error('No custom food ID');
    const familyRef = firebase.firestore().collection('families').doc(this.currentFamilyId);
    const update = { ...patch };
    if (Object.prototype.hasOwnProperty.call(update, 'name') && typeof update.name === 'string') {
      update.name = update.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(update, 'emoji')) {
      update.emoji = update.emoji || null;
    }
    if (Object.prototype.hasOwnProperty.call(update, 'icon')) {
      update.icon = update.icon || null;
    }
    update.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    await familyRef.collection('customFoods').doc(foodId).set(update, { merge: true });
  },

  async deleteCustomFood(foodId) {
    if (!this.currentFamilyId) throw new Error('No family ID');
    if (!foodId) throw new Error('No custom food ID');
    const familyRef = firebase.firestore().collection('families').doc(this.currentFamilyId);
    await familyRef.collection('customFoods').doc(foodId).set({
      isDeleted: true,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  },

  // -----------------------
  // RECENT FOODS (Kid Level)
  // -----------------------
  async getRecentFoods(options = {}) {
    const forceServer = !!options.forceServer;
    if (forceServer) {
      const remote = await this._getKidDataRemote();
      this._cacheState.kidData = remote || null;
      this._cacheState.kidDataSyncMs = Date.now();
      await this._saveSettingsCache();
      return Array.isArray(remote?.recentSolidFoods) ? remote.recentSolidFoods : [];
    }
    const kidData = await this.getKidData();
    return Array.isArray(kidData?.recentSolidFoods) ? kidData.recentSolidFoods : [];
  },

  async updateRecentFoods(foodName) {
    if (!foodName || typeof foodName !== 'string') return;
    const currentRaw = await this.getRecentFoods();
    const current = Array.isArray(currentRaw)
      ? currentRaw.map((item) => (typeof item === 'string' ? item : item?.name)).filter(Boolean)
      : [];
    // Remove if exists, then add to front
    const filtered = current.filter(f => String(f).toLowerCase() !== String(foodName).toLowerCase());
    const updated = [foodName, ...filtered].slice(0, 20); // Keep max 20
    await this._kidRef().set({ recentSolidFoods: updated }, { merge: true });
    // Update cache
    if (this._cacheState.kidData) {
      this._cacheState.kidData.recentSolidFoods = updated;
      await this._saveSettingsCache();
    }
  }
};

// Expose storage on window for cross-file access and debugging
try { window.firestoreStorage = firestoreStorage; } catch (e) {}

firestoreStorage._getAllFeedingsRemote = async function () {
  const snap = await this._kidRef()
    .collection("feedings")
    .orderBy("timestamp", "asc")
    .get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  this._cacheState.feedings = this._sortFeedingsAsc(data);
  this._cacheState.lastSyncMs = Date.now();
  await this._saveCache();
  return data;
};

firestoreStorage._getAllNursingSessionsRemote = async function () {
  const snap = await this._kidRef()
    .collection("nursingSessions")
    .orderBy("timestamp", "asc")
    .get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  this._cacheState.nursingSessions = this._sortNursingAsc(data);
  this._cacheState.lastSyncMs = Date.now();
  await this._saveCache();
  return data;
};

firestoreStorage._getAllDiaperChangesRemote = async function () {
  const snap = await this._kidRef()
    .collection("diaperChanges")
    .orderBy("timestamp", "asc")
    .get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  this._cacheState.diaperChanges = this._sortDiaperAsc(data);
  this._cacheState.lastSyncMs = Date.now();
  await this._saveCache();
  return data;
};

firestoreStorage._getAllSolidsSessionsRemote = async function () {
  const snap = await this._kidRef()
    .collection("solidsSessions")
    .orderBy("timestamp", "asc")
    .get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  this._cacheState.solidsSessions = this._sortSolidsAsc(data);
  this._cacheState.lastSyncMs = Date.now();
  await this._saveCache();
  return data;
};

firestoreStorage._getAllSleepSessionsRemote = async function () {
  const snap = await this._kidRef()
    .collection("sleepSessions")
    .orderBy("startTime", "asc")
    .get();
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  this._cacheState.sleepSessions = this._sortSleepAsc(data);
  this._cacheState.lastSyncMs = Date.now();
  await this._saveCache();
  return data;
};

firestoreStorage._getSettingsRemote = async function () {
  const doc = await this._kidRef()
    .collection("settings")
    .doc("default")
    .get();
  return doc.exists ? doc.data() : null;
};

firestoreStorage._getKidDataRemote = async function () {
  const doc = await this._kidRef().get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

firestoreStorage._getSleepSettingsRemote = async function () {
  const doc = await this._kidRef().get();
  const d = doc.exists ? doc.data() : {};
  const autoTarget = this._defaultSleepTargetHoursFromBirthTs(d.birthDate);
  const override =
    typeof d.sleepTargetOverrideHrs === "number" && !Number.isNaN(d.sleepTargetOverrideHrs)
      ? d.sleepTargetOverrideHrs
      : typeof d.sleepTargetHours === "number" && !Number.isNaN(d.sleepTargetHours)
      ? d.sleepTargetHours
      : null;
  const hasOverride = typeof override === "number";
  const dayStart =
    typeof d.sleepDayStart === "number" && !Number.isNaN(d.sleepDayStart)
      ? d.sleepDayStart
      : typeof d.daySleepStartMinutes === "number" && !Number.isNaN(d.daySleepStartMinutes)
        ? d.daySleepStartMinutes
        : 390;
  const dayEnd =
    typeof d.sleepDayEnd === "number" && !Number.isNaN(d.sleepDayEnd)
      ? d.sleepDayEnd
      : typeof d.daySleepEndMinutes === "number" && !Number.isNaN(d.daySleepEndMinutes)
        ? d.daySleepEndMinutes
        : 1170;
  return {
    sleepNightStart: d.sleepNightStart ?? 1140,
    sleepNightEnd: d.sleepNightEnd ?? 420,
    sleepDayStart: dayStart,
    sleepDayEnd: dayEnd,
    daySleepStartMinutes: dayStart,
    daySleepEndMinutes: dayEnd,
    sleepTargetHours: hasOverride ? override : autoTarget,
    sleepTargetAutoHours: autoTarget,
    sleepTargetIsOverride: hasOverride
  };
};

firestoreStorage._getMembersRemote = async function () {
  return await getFamilyMembers(this.currentFamilyId);
};

// In Firestore storage layer, add a helper if it doesn't exist yet
// (no-op if already present)
if (typeof firestoreStorage.setSleepTargetOverride !== 'function') {
  firestoreStorage.setSleepTargetOverride = async (kidId, hrsOrNull) => {
    // Use the family-scoped kid document (same as the rest of the storage layer)
    // so overrides persist instead of being written to a top-level /kids collection.
    const ref = firestoreStorage._kidRef();
    if (hrsOrNull === null) {
      await ref.set({
        sleepTargetOverrideHrs: firebase.firestore.FieldValue.delete(),
        sleepTargetHours: firebase.firestore.FieldValue.delete()
      }, { merge: true });
    } else {
      await ref.set({
        sleepTargetOverrideHrs: hrsOrNull,
        sleepTargetHours: hrsOrNull
      }, { merge: true });
    }
  };
}

// ========================================
// TINY TRACKER - PART 2
// App Wrapper, Login Screen, Baby Setup (family-aware)
// ========================================

const { useState, useEffect, useMemo } = React;

const __ttBootCacheKey = (uid) => `tt_boot_v1:${uid}`;
const __ttForceOnboardingKey = 'tt_force_onboarding_v1';
const __ttForceLoginKey = 'tt_force_login_v1';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootReady, setBootReady] = useState(false);

  // These now represent the NEW schema
  const [familyId, setFamilyId] = useState(null);
  const [kidId, setKidId] = useState(null);

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loadIssue, setLoadIssue] = useState(null);
  const [forceOnboarding, setForceOnboarding] = useState(() => {
    try {
      return localStorage.getItem(__ttForceOnboardingKey) === '1';
    } catch {
      return false;
    }
  });
  const [forceLogin, setForceLogin] = useState(() => {
    try {
      return localStorage.getItem(__ttForceLoginKey) === '1';
    } catch {
      return false;
    }
  });

  const [bootKids, setBootKids] = useState(null);
  const [bootActiveKid, setBootActiveKid] = useState(null);
  const [bootThemeKey, setBootThemeKey] = useState(DEFAULT_THEME_KEY);

  // ----------------------------------------------------
  // ONBOARDING PREVIEW TOGGLE (dev)
  // ----------------------------------------------------
  useEffect(() => {
    try {
      window.TT = window.TT || {};
      window.TT.actions = window.TT.actions || {};
      window.TT.actions.setOnboardingPreview = (enabled) => {
        const next = !!enabled;
        setForceOnboarding(next);
        try {
          if (next) {
            localStorage.setItem(__ttForceOnboardingKey, '1');
          } else {
            localStorage.removeItem(__ttForceOnboardingKey);
          }
        } catch {}
      };
      window.TT.actions.toggleOnboardingPreview = () => {
        window.TT.actions.setOnboardingPreview(!forceOnboarding);
      };
      window.TT.actions.setLoginPreview = (enabled) => {
        const next = !!enabled;
        setForceLogin(next);
        try {
          if (next) {
            localStorage.setItem(__ttForceLoginKey, '1');
          } else {
            localStorage.removeItem(__ttForceLoginKey);
          }
        } catch {}
      };
      window.TT.actions.toggleLoginPreview = () => {
        window.TT.actions.setLoginPreview(!forceLogin);
      };
    } catch {}
  }, [forceOnboarding, forceLogin]);

  // ----------------------------------------------------
  // KID SWITCH (multi-kid)
  // ----------------------------------------------------
  const handleKidChange = async (newKidId) => {
    if (!newKidId || newKidId === kidId || !familyId) return;
    setKidId(newKidId);
    try {
      await firestoreStorage.initialize(familyId, newKidId);
    } catch (err) {
      console.error("Failed to switch kid:", err);
    }
  };

  // ----------------------------------------------------
  // AUTH STATE CHANGE
  // ----------------------------------------------------
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setUser(null);
        setKidId(null);
        setFamilyId(null);
        setNeedsSetup(false);
        setLoadIssue(null);
        setBootReady(false);
        setBootKids(null);
        setBootActiveKid(null);
        setBootThemeKey(DEFAULT_THEME_KEY);
        setLoading(false);
        // Reset appearance to defaults on sign out
        await window.TT.appearance.init(null);
        window.TT.applyAppearance(window.TT.appearance.get());
        return;
      }

      setUser(u);
      setLoadIssue(null);
      setLoading(true);
      setBootReady(false);
      setBootKids(null);
      setBootActiveKid(null);
      setBootThemeKey(DEFAULT_THEME_KEY);

      // Fast-boot from cache if available (renders UI immediately, syncs in background)
      try {
        const cachedBoot = await __ttDataCache.get(__ttBootCacheKey(u.uid));
        if (cachedBoot && cachedBoot.familyId && cachedBoot.kidId && Array.isArray(cachedBoot.kids) && cachedBoot.kids.length > 0) {
          setFamilyId(cachedBoot.familyId);
          setKidId(cachedBoot.kidId);
          setBootKids(cachedBoot.kids);
          const current = cachedBoot.kids.find(k => k.id === cachedBoot.kidId) || cachedBoot.kids[0] || null;
          setBootActiveKid(current);
          setBootThemeKey(cachedBoot.themeKey || DEFAULT_THEME_KEY);
          setNeedsSetup(false);
          setLoadIssue(null);
          setBootReady(true);
          setLoading(false);
          // Kick off storage init but don't block UI
          firestoreStorage.initialize(cachedBoot.familyId, cachedBoot.kidId).catch(() => {});
        }
      } catch (e) {}

      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get("invite");

      try {
        //
        // 1️⃣ Ensure user profile exists
        //
        await ensureUserProfile(u, inviteCode);

        //
        // 1.5️⃣ Load user appearance preferences
        //
        await window.TT.appearance.init(u.uid);
        // Apply appearance to DOM
        window.TT.applyAppearance(window.TT.appearance.get());

        //
        // 2️⃣ Look up user's families (new schema)
        //
        const famSnap = await db
          .collection("families")
          .where("members", "array-contains", u.uid)
          .get();

        let resolvedFamilyId = null;
        let resolvedKidId = null;
        let foundAnyKidsAcrossFamilies = false;

        if (!famSnap.empty) {
          // Scan ALL families and select the first one that actually has kids.
          // This avoids Firestore's arbitrary ordering returning an "empty" family first,
          // which used to incorrectly force onboarding.
          for (const famDoc of famSnap.docs) {
            const fid = famDoc.id;
            const familyData = famDoc.data() || {};

            const kidSnap = await db
              .collection("families")
              .doc(fid)
              .collection("kids")
              .get();

            if (kidSnap.empty) continue;

            foundAnyKidsAcrossFamilies = true;

            // Prefer a valid primaryKidId, otherwise pick first kid
            if (familyData.primaryKidId) {
              const primaryKid = kidSnap.docs.find((k) => k.id === familyData.primaryKidId);
              resolvedKidId = primaryKid ? familyData.primaryKidId : kidSnap.docs[0].id;
            } else {
              resolvedKidId = kidSnap.docs[0].id;
            }

            resolvedFamilyId = fid;
            break;
          }
        }

        //
        // 4️⃣ Handle incoming invite
        //
        if (inviteCode) {
          const inviteResult = await acceptInvite(inviteCode, u.uid);

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);

          if (inviteResult && inviteResult.familyId && inviteResult.kidId) {
            resolvedFamilyId = inviteResult.familyId;
            resolvedKidId = inviteResult.kidId;
          }
        }

        //
        // 5️⃣ Onboarding rules:
        // - Show onboarding ONLY when user has ZERO kids across ALL their families.
        // - If we believe kids exist but still can't resolve a kid, show Recovery (not onboarding).
        //
        if (!resolvedFamilyId || !resolvedKidId) {
          // If there are truly no kids anywhere, onboarding is appropriate.
          if (!foundAnyKidsAcrossFamilies) {
            setNeedsSetup(true);
            setFamilyId(null);
            setKidId(null);
            setLoading(false);
            return;
          }

          // Kids exist somewhere but we couldn't resolve. This is a load/race/offline issue.
          // Do NOT show onboarding (it looks like "start over"). Show Recovery instead.
          setNeedsSetup(false);
          setFamilyId(null);
          setKidId(null);
          setLoadIssue({
            title: "Couldn’t load your babies",
            message:
              "You’re signed in, but we couldn’t load your existing babies. Tap Retry. If this keeps happening, Sign out and sign back in.",
          });
          setLoading(false);
          return;
        }

        //
        // 6️⃣ We now have full context → store & init
        //
        setFamilyId(resolvedFamilyId);
        setKidId(resolvedKidId);

        await firestoreStorage.initialize(resolvedFamilyId, resolvedKidId);

        await Promise.all([
          firestoreStorage.getSettings(),
          firestoreStorage.getSleepSettings(),
          firestoreStorage.getKidData(),
          firestoreStorage.getAllFeedings(),
          firestoreStorage.getAllSleepSessions(),
          firestoreStorage.getAllDiaperChanges()
        ]);

        const kidsSnap = await db
          .collection("families")
          .doc(resolvedFamilyId)
          .collection("kids")
          .get();

        if (kidsSnap.empty) {
          throw new Error("No kids found for resolved family");
        }

        const list = kidsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const current = list.find(k => k.id === resolvedKidId) || null;
        if (!current) {
          throw new Error("Resolved kid missing from family list");
        }

        const settingsDoc = await db
          .collection("families")
          .doc(resolvedFamilyId)
          .collection("kids")
          .doc(resolvedKidId)
          .collection("settings")
          .doc("default")
          .get();
        const settingsData = settingsDoc.exists ? settingsDoc.data() : {};

        setBootKids(list);
        setBootActiveKid(current);
        setBootThemeKey(settingsData.themeKey || DEFAULT_THEME_KEY);
        setBootReady(true);
        try {
          await __ttDataCache.set(__ttBootCacheKey(u.uid), {
            familyId: resolvedFamilyId,
            kidId: resolvedKidId,
            kids: list,
            themeKey: settingsData.themeKey || DEFAULT_THEME_KEY,
            savedAt: Date.now()
          });
        } catch (e) {}

      } catch (err) {
        console.error("Setup error:", err);
        // Signed-in bootstrap failed. Never throw user into onboarding here.
        setNeedsSetup(false);
        setFamilyId(null);
        setKidId(null);
        setBootReady(false);
        setBootKids(null);
        setBootActiveKid(null);
        setBootThemeKey(DEFAULT_THEME_KEY);
        setLoadIssue({
          title: "Couldn’t load Tiny Tracker",
          message:
            "We hit an error while loading your account data. Tap Retry. If it keeps happening, Sign out and sign back in.",
        });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ----------------------------------------------------
  // LOADING SCREEN
  // ----------------------------------------------------
  if (loading) {
    return React.createElement(
      "div",
      {
        className: "min-h-screen flex items-center justify-center",
        style: { backgroundColor: 'var(--tt-app-bg)' }
      },
      React.createElement(
        "div",
        { className: "text-center" },
        React.createElement("div", {
          className: "animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4",
          style: { borderColor: 'var(--tt-text-primary)' }
        }),
        React.createElement("div", { style: { color: 'var(--tt-text-secondary)' } }, "Loading...")
      )
    );
  }

  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (forceLogin) {
    return React.createElement(LoginScreen);
  }
  if (!user) {
    return React.createElement(LoginScreen);
  }

  // If signed in but bootstrap failed, show recovery instead of onboarding.
  if (loadIssue && user) {
    return React.createElement(TinyRecoveryScreen, {
      title: loadIssue.title,
      message: loadIssue.message,
      onRetry: () => {
        try { setLoadIssue(null); } catch {}
        // Simple + reliable on mobile Safari
        window.location.reload();
      },
      onSignOut: async () => {
        try { await auth.signOut(); } catch {}
      },
    });
  }

  // ----------------------------------------------------
  // ONBOARDING (now family-aware)
  // ----------------------------------------------------
  if (forceOnboarding && user) {
    return React.createElement(BabySetupScreen, {
      user,
      previewOnly: true,
      onComplete: () => {},
    });
  }
  if (needsSetup) {
    return React.createElement(BabySetupScreen, {
      user,
      onComplete: async (createdFamilyId, createdKidId) => {
        setFamilyId(createdFamilyId);
        setKidId(createdKidId);
        setNeedsSetup(false);

        await firestoreStorage.initialize(createdFamilyId, createdKidId);
      },
    });
  }

  // ----------------------------------------------------
  // MAIN APP
  // ----------------------------------------------------
  return React.createElement(MainApp, {
    user,
    kidId,
    familyId,
    onKidChange: handleKidChange,
    bootKids,
    bootActiveKid,
    bootThemeKey
  });
};

// =====================================================
// LOGIN SCREEN (Google + Email/Password, clearer modes)
// =====================================================

const LoginScreen = () => {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const googleColors = (THEME_TOKENS && THEME_TOKENS.GOOGLE_COLORS)
    ? THEME_TOKENS.GOOGLE_COLORS
    : { blue: "currentColor", green: "currentColor", yellow: "currentColor", red: "currentColor" };

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in error", error);
      setError("Google sign-in failed. Please try again.");
      setSigningIn(false);
    }
  };

  const handleEmailSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter an email and password.");
      return;
    }

    setSigningIn(true);
    setError(null);

    try {
      if (mode === "signup") {
        await signUpWithEmail(trimmedEmail, password);
      } else {
        await signInWithEmail(trimmedEmail, password);
      }
      // on success, onAuthStateChanged in App will take over
    } catch (error) {
      console.error("Email auth error", error);
      let friendly = "Something went wrong. Please try again.";

      if (
        error.code === "auth/invalid-login-credentials" ||
        error.code === "auth/wrong-password"
      ) {
        friendly = "Email or password is incorrect.";
      } else if (error.code === "auth/user-not-found") {
        friendly =
          "No account found for this email. Switch to “Create account” to sign up.";
      } else if (error.code === "auth/too-many-requests") {
        friendly =
          "Too many attempts. Please wait a moment and try again.";
      } else if (error.message) {
        friendly = error.message;
      }

      setError(friendly);
      setSigningIn(false);
    }
  };

  return React.createElement(
    "div",
    {
      className:
        "min-h-screen flex items-center justify-center p-4",
      style: { backgroundColor: 'var(--tt-app-bg)' }
    },
    React.createElement(
      "div",
      {
        className: "rounded-2xl p-5 max-w-md w-full shadow-sm",
        style: {
          backgroundColor: 'var(--tt-card-bg)',
          borderColor: 'var(--tt-card-border)'
        }
      },
      // Header
      React.createElement(
        "div",
        { className: "text-center mb-8" },
        React.createElement(
          "div",
          { className: "flex items-center justify-center mb-4" },
          React.createElement(
            "div",
            {
              className: "rounded-full p-4",
              style: { backgroundColor: '#F5F5F7' }
            },
              React.createElement(
                'svg',
                {
                  xmlns: "http://www.w3.org/2000/svg",
                  width: "48",
                  height: "48",
                  viewBox: "0 0 256 256",
                  style: { color: 'var(--tt-brand-icon)' }
                },
              React.createElement('path', {
                d: "M205.41,159.07a60.9,60.9,0,0,1-31.83,8.86,71.71,71.71,0,0,1-27.36-5.66A55.55,55.55,0,0,0,136,194.51V224a8,8,0,0,1-8.53,8,8.18,8.18,0,0,1-7.47-8.25V211.31L81.38,172.69A52.5,52.5,0,0,1,63.44,176a45.82,45.82,0,0,1-23.92-6.67C17.73,156.09,6,125.62,8.27,87.79a8,8,0,0,1,7.52-7.52c37.83-2.23,68.3,9.46,81.5,31.25A46,46,0,0,1,103.74,140a4,4,0,0,1-6.89,2.43l-19.2-20.1a8,8,0,0,0-11.31,11.31l53.88,55.25c.06-.78.13-1.56.21-2.33a68.56,68.56,0,0,1,18.64-39.46l50.59-53.46a8,8,0,0,0-11.31-11.32l-49,51.82a4,4,0,0,1-6.78-1.74c-4.74-17.48-2.65-34.88,6.4-49.82,17.86-29.48,59.42-45.26,111.18-42.22a8,8,0,0,1,7.52,7.52C250.67,99.65,234.89,141.21,205.41,159.07Z",
                fill: "currentColor"
              })
            )
          )
        ),
        React.createElement(
          "h1",
          {
            className: "text-3xl font-bold text-gray-800 mb-2",
            style: {
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            },
          },
          "Tiny Tracker"
        ),
        React.createElement(
          "p",
          { className: "text-gray-600" },
          "Track your baby's feeding, sleep, and more"
        )
      ),

      // Google button
      React.createElement(
        "button",
        {
          onClick: handleSignIn,
          disabled: signingIn,
          className:
            "w-full bg-white border-2 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-3 disabled:opacity-50",
          style: { borderColor: 'var(--tt-input-bg)' }
        },
        React.createElement(
          "svg",
          { width: "20", height: "20", viewBox: "0 0 24 24" },
          React.createElement("path", {
            fill: googleColors.blue,
            d:
              "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
          }),
          React.createElement("path", {
            fill: googleColors.green,
            d:
              "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
          }),
          React.createElement("path", {
            fill: googleColors.yellow,
            d:
              "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
          }),
          React.createElement("path", {
            fill: googleColors.red,
            d:
              "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
          })
        ),
        signingIn ? "Signing in..." : "Sign in with Google"
      ),

      // Error (for either Google or email)
      error &&
        React.createElement(
          "div",
          {
            className:
              "mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm",
          },
          error
        ),

      // Email/password section
      React.createElement(
        "div",
        { className: "mt-6 border-t border-gray-100 pt-4" },
        React.createElement(
          "p",
          { className: "text-sm text-gray-700 text-center font-medium" },
          "Or continue with email"
        ),

        // Mode pills
        React.createElement(
          "div",
          { className: "flex justify-center gap-2 mt-3" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => setMode("login"),
              className:
                "px-3 py-1 text-xs rounded-full border " +
                (mode === "login"
                  ? "text-white"
                  : "bg-white text-gray-500 border-gray-200"),
              style: mode === "login"
                ? { backgroundColor: 'var(--tt-primary-brand)', borderColor: 'var(--tt-primary-brand)' }
                : undefined
            },
            "Log in"
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => setMode("signup"),
              className:
                "px-3 py-1 text-xs rounded-full border " +
                (mode === "signup"
                  ? "text-white"
                  : "bg-white text-gray-500 border-gray-200"),
              style: mode === "signup"
                ? { backgroundColor: 'var(--tt-primary-brand)', borderColor: 'var(--tt-primary-brand)' }
                : undefined
            },
            "Create account"
          )
        ),

        React.createElement(
          "div",
          { className: "space-y-3 mt-4" },

          // Email input
          React.createElement("input", {
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            placeholder: "Email",
            autoComplete: "email",
            className:
              "w-full px-4 py-2 text-sm border-2 rounded-xl focus:outline-none",
            style: { borderColor: 'var(--tt-input-bg)' }
          }),

          // Password input
          React.createElement("input", {
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            placeholder: "Password",
            autoComplete:
              mode === "signup" ? "new-password" : "current-password",
            className:
              "w-full px-4 py-2 text-sm border-2 rounded-xl focus:outline-none",
            style: { borderColor: 'var(--tt-input-bg)' }
          }),

          // Email submit button
          React.createElement(
            "button",
            {
              onClick: handleEmailSubmit,
              disabled: signingIn,
              className:
                "w-full text-white py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm",
              style: { backgroundColor: 'var(--tt-primary-action-bg)' }
            },
            mode === "signup"
              ? "Create account with email"
              : "Log in with email"
          )
        )
      ),

      null
    )
  );
};

// =====================================================
// BABY SETUP — now creates a FAMILY + KID
// =====================================================

const BabySetupScreen = ({ user, onComplete, previewOnly = false }) => {
  const getTodayLocalDateString = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().split("T")[0];
  };

  const TTInputRow =
    (typeof window !== 'undefined' && (window.TT?.shared?.TTInputRow || window.TTInputRow)) ||
    null;
  const TTPhotoRow =
    (typeof window !== 'undefined' && (window.TT?.shared?.TTPhotoRow || window.TTPhotoRow)) ||
    null;

  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState(getTodayLocalDateString);
  const [photoExpanded, setPhotoExpanded] = useState(true);
  const [newPhotos, setNewPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const canSubmit = !!babyName.trim() && !!birthDate && !!(newPhotos && newPhotos[0]);

  const handleAddPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          let dataUrl = reader.result;
          if (firestoreStorage?._compressImage) {
            try {
              dataUrl = await firestoreStorage._compressImage(dataUrl, 1200);
            } catch {}
          }
          setNewPhotos([dataUrl]);
          setPhotoExpanded(true);
        } catch {
          setError("Couldn't load photo. Please try again.");
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (previewOnly) {
      setError("Preview mode is on. Turn it off to create a family.");
      return;
    }
    if (!babyName.trim()) {
      setError("Please enter your baby's name");
      return;
    }

    if (!birthDate) {
      setError("Please enter birth date");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const birthTimestamp = new Date(birthDate).getTime();

      //
      // Create a NEW family + kid
      //
      const famRef = await db.collection("families").add({
        members: [user.uid],
        name: `${babyName}'s family`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        primaryKidId: null,
      });

      const familyId = famRef.id;

      const kidRef = await db
        .collection("families")
        .doc(familyId)
        .collection("kids")
        .add({
          name: babyName.trim(),
          ownerId: user.uid,
          birthDate: birthTimestamp,
          members: [user.uid],
          photoURL: (newPhotos && newPhotos[0]) ? newPhotos[0] : null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      const kidId = kidRef.id;

      // set primaryKidId
      await famRef.set({ primaryKidId: kidId }, { merge: true });

      // default settings
      await db
        .collection("families")
        .doc(familyId)
        .collection("kids")
        .doc(kidId)
        .collection("settings")
        .doc("default")
        .set({
          preferredVolumeUnit: 'oz',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      //
      // return family + kid to App
      //
      onComplete(familyId, kidId);
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return React.createElement(
    "div",
    {
      className: "min-h-screen flex items-center justify-center p-4",
      style: { backgroundColor: 'var(--tt-app-bg)' }
    },
    React.createElement(
      "div",
      {
        className: "rounded-2xl p-5 max-w-md w-full shadow-sm",
        style: {
          backgroundColor: 'var(--tt-card-bg)',
          borderColor: 'var(--tt-card-border)'
        }
      },
      React.createElement(
        "div",
        { className: "text-center mb-6" },
        React.createElement(
          "div",
          { className: "flex items-center justify-center mb-4" },
          React.createElement(
            "div",
            { className: "rounded-full p-3", style: { backgroundColor: '#F5F5F7' } },
            React.createElement(
              'svg',
              {
                xmlns: "http://www.w3.org/2000/svg",
                width: "40",
                height: "40",
                viewBox: "0 0 256 256",
                style: { color: 'var(--tt-brand-icon)' }
              },
              React.createElement('path', {
                d: "M205.41,159.07a60.9,60.9,0,0,1-31.83,8.86,71.71,71.71,0,0,1-27.36-5.66A55.55,55.55,0,0,0,136,194.51V224a8,8,0,0,1-8.53,8,8.18,8.18,0,0,1-7.47-8.25V211.31L81.38,172.69A52.5,52.5,0,0,1,63.44,176a45.82,45.82,0,0,1-23.92-6.67C17.73,156.09,6,125.62,8.27,87.79a8,8,0,0,1,7.52-7.52c37.83-2.23,68.3,9.46,81.5,31.25A46,46,0,0,1,103.74,140a4,4,0,0,1-6.89,2.43l-19.2-20.1a8,8,0,0,0-11.31,11.31l53.88,55.25c.06-.78.13-1.56.21-2.33a68.56,68.56,0,0,1,18.64-39.46l50.59-53.46a8,8,0,0,0-11.31-11.32l-49,51.82a4,4,0,0,1-6.78-1.74c-4.74-17.48-2.65-34.88,6.4-49.82,17.86-29.48,59.42-45.26,111.18-42.22a8,8,0,0,1,7.52,7.52C250.67,99.65,234.89,141.21,205.41,159.07Z",
                fill: "currentColor"
              })
            )
          )
        ),
        React.createElement(
          "h1",
          { className: "text-2xl font-bold text-gray-800 mb-2" },
          "Welcome to Tiny Tracker!"
        ),
        React.createElement(
          "p",
          { className: "text-gray-600" },
          "Let's set up your baby's profile"
        )
      ),

      React.createElement(
        "div",
        { className: "space-y-4" },

        TTInputRow
          ? React.createElement(TTInputRow, {
              label: "Baby's Name",
              value: babyName,
              onChange: setBabyName,
              placeholder: "Emma",
              showIcon: false,
              showChevron: false,
              enableTapAnimation: true,
              showLabel: true,
              type: 'text',
              valueClassName: 'text-[18px]'
            })
          : null,

        TTPhotoRow
          ? React.createElement(TTPhotoRow, {
              expanded: photoExpanded,
              onExpand: () => setPhotoExpanded(true),
              title: "Add a photo",
              existingPhotos: [],
              newPhotos,
              onAddPhoto: handleAddPhoto,
              onRemovePhoto: (index, isExisting) => {
                if (!isExisting) {
                  setNewPhotos((prev) => prev.filter((_, i) => i !== index));
                }
              },
              onPreviewPhoto: () => {}
            })
          : null,

        TTInputRow
          ? React.createElement(TTInputRow, {
              label: "Birth Date",
              value: birthDate,
              onChange: setBirthDate,
              placeholder: "YYYY-MM-DD",
              showIcon: false,
              showChevron: false,
              enableTapAnimation: true,
              showLabel: true,
              type: 'date',
              valueClassName: 'text-[18px]',
              onFocus: (e) => {
                try { e?.target?.showPicker?.(); } catch {}
              }
            })
          : null,

        error &&
          React.createElement(
            "div",
            {
              className:
                "p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm",
            },
            error
          ),

        React.createElement(
          "button",
          {
            onClick: handleSubmit,
            disabled: saving || !canSubmit,
            className:
              "w-full text-white py-3 rounded-xl font-semibold transition disabled:opacity-50",
            style: {
              backgroundColor: '#1A1A1A'
            }
          },
          previewOnly ? "Preview Mode" : (saving ? "Saving..." : "Get Started")
        )
      )
    )
  );
};

// ========================================
// TINY TRACKER - PART 3
// Main App with Bottom Navigation (family-aware)
// ========================================

// Share app link icon (from shared icons when available)
const LocalLinkIcon = window.TT?.shared?.icons?.LinkIcon || ((props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 256 256",
    fill: "currentColor"
  },
  React.createElement('path', { d: "M237.66,106.35l-80-80A8,8,0,0,0,144,32V72.35c-25.94,2.22-54.59,14.92-78.16,34.91-28.38,24.08-46.05,55.11-49.76,87.37a12,12,0,0,0,20.68,9.58h0c11-11.71,50.14-48.74,107.24-52V192a8,8,0,0,0,13.66,5.65l80-80A8,8,0,0,0,237.66,106.35ZM160,172.69V144a8,8,0,0,0-8-8c-28.08,0-55.43,7.33-81.29,21.8a196.17,196.17,0,0,0-36.57,26.52c5.8-23.84,20.42-46.51,42.05-64.86C99.41,99.77,127.75,88,152,88a8,8,0,0,0,8-8V51.32L220.69,112Z" })
));

// Invite partner icon (from shared icons when available)
const LocalPersonAddIcon = window.TT?.shared?.icons?.PersonAddIcon || ((props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 256 256",
    fill: "currentColor"
  },
  React.createElement('path', { d: "M256,136a8,8,0,0,1-8,8H232v16a8,8,0,0,1-16,0V144H200a8,8,0,0,1,0-16h16V112a8,8,0,0,1,16,0v16h16A8,8,0,0,1,256,136Zm-57.87,58.85a8,8,0,0,1-12.26,10.3C165.75,181.19,138.09,168,108,168s-57.75,13.19-77.87,37.15a8,8,0,0,1-12.25-10.3c14.94-17.78,33.52-30.41,54.17-37.17a68,68,0,1,1,71.9,0C164.6,164.44,183.18,177.07,198.13,194.85ZM108,152a52,52,0,1,0-52-52A52.06,52.06,0,0,0,108,152Z" })
));

// ChevronDown and ChevronUp are provided by components/TrackerCard.js

// =====================================================
// MAIN APP
// =====================================================

const MainApp = ({ user, kidId, familyId, onKidChange, bootKids, bootActiveKid, bootThemeKey }) => {
  const [activeTab, setActiveTab] = useState('tracker');
  const [showShareMenu, setShowShareMenu] = useState(false);

  const [kids, setKids] = useState(() => (Array.isArray(bootKids) ? bootKids : []));
  const [activeKid, setActiveKid] = useState(() => (bootActiveKid || null));
  const [themeKey, setThemeKey] = useState(() => (bootThemeKey || DEFAULT_THEME_KEY));
  const [showKidMenu, setShowKidMenu] = useState(false);
  const [activityVisibility, setActivityVisibility] = useState(() => ({
    bottle: true,
    nursing: true,
    solids: true,
    sleep: true,
    diaper: true
  }));
  const [activityOrder, setActivityOrder] = useState(() => ([
    'bottle',
    'nursing',
    'solids',
    'sleep',
    'diaper'
  ]));
  const [showActivitySheet, setShowActivitySheet] = useState(false);

  const [headerRequestedAddChild, setHeaderRequestedAddChild] = useState(false);
  const [inputSheetOpen, setInputSheetOpen] = useState(false);
  const [inputSheetMode, setInputSheetMode] = useState('feeding');

  const shouldUseNewInputFlow = true;
  const FloatingTrackerMenu = window.TT?.shared?.FloatingTrackerMenu || null;
  const ActivityVisibilitySheet = window.TT?.shared?.ActivityVisibilitySheet || null;

  const normalizeActivityVisibility = (value) => {
    const base = { bottle: true, nursing: true, solids: true, sleep: true, diaper: true };
    if (!value || typeof value !== 'object') return base;
    return {
      bottle: typeof value.bottle === 'boolean' ? value.bottle : base.bottle,
      nursing: typeof value.nursing === 'boolean' ? value.nursing : base.nursing,
      solids: typeof value.solids === 'boolean' ? value.solids : base.solids,
      sleep: typeof value.sleep === 'boolean' ? value.sleep : base.sleep,
      diaper: typeof value.diaper === 'boolean' ? value.diaper : base.diaper
    };
  };
  const normalizeActivityOrder = (value) => {
    const base = ['bottle', 'nursing', 'solids', 'sleep', 'diaper'];
    if (!Array.isArray(value)) return base.slice();
    const next = value.filter((item) => base.includes(item));
    if (!next.includes('solids')) {
      const nursingIdx = next.indexOf('nursing');
      if (nursingIdx >= 0) {
        next.splice(nursingIdx + 1, 0, 'solids');
      }
    }
    base.forEach((item) => {
      if (!next.includes(item)) next.push(item);
    });
    return next;
  };
  const activityVisibilitySafe = normalizeActivityVisibility(activityVisibility);
  const activityOrderSafe = normalizeActivityOrder(activityOrder);
  const isFeedEnabled = activityVisibilitySafe.bottle || activityVisibilitySafe.nursing;
  const canOpenInputSheet = (mode) => {
    if (mode === 'sleep') return activityVisibilitySafe.sleep;
    if (mode === 'diaper') return activityVisibilitySafe.diaper;
    if (mode === 'feeding' || mode === 'nursing') return isFeedEnabled;
    return true;
  };
  const useActiveSleep = window.TT?.shared?.useActiveSleep || (() => ({ activeSleep: null, activeSleepLoaded: true }));
  const { activeSleep } = useActiveSleep(kidId) || { activeSleep: null };
  const openInputSheet = React.useCallback((mode = 'feeding') => {
    if (!canOpenInputSheet(mode)) return;
    setInputSheetMode(mode || 'feeding');
    setInputSheetOpen(true);
  }, [canOpenInputSheet]);
  const closeInputSheet = React.useCallback(() => {
    setInputSheetOpen(false);
  }, []);
  const handleUpdateActivityVisibility = React.useCallback((payload) => {
    const visibilityNext = normalizeActivityVisibility(payload?.visibility || payload);
    const orderNext = normalizeActivityOrder(payload?.order);
    if (Object.values(visibilityNext).filter(Boolean).length < 1) return;
    setActivityVisibility(visibilityNext);
    if (Array.isArray(payload?.order)) {
      setActivityOrder(orderNext);
    }
    if (typeof firestoreStorage !== 'undefined' && firestoreStorage.saveSettings) {
      firestoreStorage.saveSettings({
        activityVisibility: visibilityNext,
        ...(Array.isArray(payload?.order) ? { activityOrder: orderNext } : {})
      }).catch(() => {});
    }
  }, []);
  const handleToggleActivitySheet = React.useCallback(() => {
    setShowActivitySheet((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!inputSheetOpen) return;
    if (inputSheetMode === 'sleep' && !activityVisibilitySafe.sleep) {
      closeInputSheet();
      return;
    }
    if (inputSheetMode === 'diaper' && !activityVisibilitySafe.diaper) {
      closeInputSheet();
      return;
    }
    if (inputSheetMode === 'feeding' && !isFeedEnabled) {
      closeInputSheet();
    }
  }, [inputSheetOpen, inputSheetMode, activityVisibilitySafe, isFeedEnabled, closeInputSheet]);

  useEffect(() => {
    if (activityVisibilitySafe.sleep) return;
    if (activeSleep && activeSleep.id && typeof firestoreStorage !== 'undefined' && firestoreStorage.endSleep) {
      firestoreStorage.endSleep(activeSleep.id).catch(() => {});
    }
  }, [activityVisibilitySafe.sleep, activeSleep]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.TT = window.TT || {};
    window.TT.actions = window.TT.actions || {};
    window.TT.actions.openInputSheet = openInputSheet;
    window.TT.actions.setActiveTab = setActiveTab;
    return () => {
      if (window.TT?.actions?.openInputSheet === openInputSheet) {
        delete window.TT.actions.openInputSheet;
      }
      if (window.TT?.actions?.setActiveTab === setActiveTab) {
        delete window.TT.actions.setActiveTab;
      }
    };
  }, [openInputSheet, setActiveTab]);

  useEffect(() => {
    try {
      requestAnimationFrame(() => window.scrollTo(0, 0));
    } catch (e) {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    document.title = 'Tiny Tracker';
  }, []);

  useEffect(() => {
    // Sync iOS Safari safe-area / browser chrome with appearance system
    try {
      document.body.style.backgroundColor = "var(--tt-app-bg)";
      document.documentElement.style.backgroundColor = "var(--tt-app-bg)";
      if (typeof window.updateMetaThemeColor === 'function') {
        window.updateMetaThemeColor();
      }
    } catch (e) {
      // non-fatal
    }
  }, [themeKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.TT = window.TT || {};
    window.TT.currentThemeKey = themeKey || DEFAULT_THEME_KEY;
    if (window.TT?.appearance?.get && typeof window.TT.applyAppearance === 'function') {
      window.TT.applyAppearance(window.TT.appearance.get());
    }
    try {
      if (user?.uid && familyId && kidId && Array.isArray(kids) && kids.length > 0) {
        __ttDataCache.set(__ttBootCacheKey(user.uid), {
          familyId,
          kidId,
          kids,
          themeKey: themeKey || DEFAULT_THEME_KEY,
          savedAt: Date.now()
        });
      }
    } catch (e) {}
  }, [themeKey, familyId, kidId, kids, user]);

  useEffect(() => {
    loadKidsAndTheme();
  }, [familyId, kidId]);

  async function loadKidsAndTheme() {
    if (!familyId || !kidId) return;

    try {
      const kidsSnap = await db
        .collection("families")
        .doc(familyId)
        .collection("kids")
        .get();

      const list = kidsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setKids(list);

      const current = list.find(k => k.id === kidId) || null;
      setActiveKid(current);

      const settingsDoc = await db
        .collection("families")
        .doc(familyId)
        .collection("kids")
        .doc(kidId)
        .collection("settings")
        .doc("default")
        .get();

      const settingsData = settingsDoc.exists ? settingsDoc.data() : {};
      setThemeKey(settingsData.themeKey || DEFAULT_THEME_KEY);
      setActivityVisibility(normalizeActivityVisibility(settingsData.activityVisibility));
      setActivityOrder(normalizeActivityOrder(settingsData.activityOrder));

    } catch (err) {
      console.error("Error loading kids/theme:", err);
    }
  }

  const handleSelectKid = (newKidId) => {
    if (!newKidId || newKidId === kidId) {
      setShowKidMenu(false);
      return;
    }
    if (typeof onKidChange === 'function') {
      onKidChange(newKidId);
    }
    setShowKidMenu(false);
  };

  // --------------------------------------
  // SHARE ACTIONS
  // --------------------------------------

  const handleGlobalShareApp = async () => {
    const url = window.location.origin + window.location.pathname;
  
    // Best path: native share sheet
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Tiny Tracker",
          text: "Check out Tiny Tracker — track your baby's feedings and get insights!",
          url
        });
        return;
      } catch (err) {
        // User canceled share sheet — do nothing else
        return;
      }
    }
  
    // Fallback: copy link (only if focused), otherwise show prompt
    const text = `Check out Tiny Tracker — track your baby's feedings and get insights! ${url}`;
  
    try {
      if (document.hasFocus() && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert("Link copied!");
      } else {
        window.prompt("Copy this link:", url);
      }
    } catch (e) {
      window.prompt("Copy this link:", url);
    }
  };

  const handleGlobalInvitePartner = async () => {
    const resolvedKidId = kidId || (kids && kids.length ? kids[0].id : null);
  
    if (!familyId || !resolvedKidId) {
      alert("Something went wrong. Try refreshing.");
      return;
    }
  
    let link;
  
    // ---- ONLY invite creation can fail ----
    try {
      const code = await createInvite(familyId, resolvedKidId);
      link = `${window.location.origin}${window.location.pathname}?invite=${code}`;
    } catch (err) {
      console.error("Invite creation failed:", err);
      alert("Failed to create invite.");
      return;
    }
  
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Tiny Tracker",
          text: "Come join me so we can track together.",
          url: link
        });
        return;
      } catch {
        return; // user cancelled → STOP, no clipboard
      }
    }
  
    // Only if share is NOT available
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(link);
        alert("Invite link copied!");
        return;
      } catch {}
    }
  
    window.prompt("Copy this invite link:", link);
  };


  // --------------------------------------
  // UI
  // --------------------------------------

  const isAnalyticsSubtab = [
    'analytics-bottle',
    'analytics-sleep',
    'analytics-nursing',
    'analytics-solids',
    'analytics-diaper'
  ].includes(activeTab);

  return React.createElement(
    'div',
    {
      className: "min-h-screen",
      style: {
        backgroundColor: "var(--tt-app-bg)",
        paddingBottom: '135px'
      }
    },

    // WRAPPER (header + page content)
    React.createElement(
      'div',
      { className: isAnalyticsSubtab ? "mx-auto w-full" : "max-w-2xl mx-auto" },

      // ---------------- HEADER ----------------
      !isAnalyticsSubtab && activeTab !== 'tracker-detail' && React.createElement(
        'div',
        {
          // Must sit above sticky in-tab UI like the TrackerTab date picker.
          className: "tt-main-header sticky top-0 z-[1200]",
          style: { backgroundColor: "var(--tt-header-bg)" }
        },
        React.createElement(
          'div',
          { className: "pt-4 pb-6 px-4 relative" },
          React.createElement(
            'div',
            { className: "grid grid-cols-2 items-center" },

            // LEFT COLUMN: kid name + dropdown
            React.createElement(
              'div',
              { className: "relative flex items-center justify-start" },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowKidMenu((v) => !v);
                    setShowShareMenu(false);
                  },
                  className: "flex items-center gap-[10px] px-0 focus:outline-none"
                },
                React.createElement(
                  'span',
                  {
                    className: "w-[36px] h-[36px] rounded-full overflow-hidden flex-shrink-0",
                    style: { backgroundColor: 'var(--tt-input-bg)' }
                  },
                  activeKid?.photoURL
                    ? React.createElement('img', {
                        src: activeKid.photoURL,
                        alt: activeKid?.name || 'Baby',
                        className: "w-full h-full object-cover"
                      })
                    : React.createElement('span', {
                        className: "w-full h-full block",
                        style: { backgroundColor: 'var(--tt-feed-soft)' }
                      })
                ),
                React.createElement(
                  'span',
                  { 
                    className: "text-2xl font-extrabold leading-none",
                    style: { 
                      color: 'var(--tt-text-primary)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'
                    }
                  },
                  activeKid?.name || 'Baby'
                ),
                React.createElement(window.TT?.shared?.icons?.ChevronDownIcon || ChevronDown, {
                  className: "w-5 h-5",
                  isTapped: showKidMenu,
                  selectedWeight: 'bold',
                  style: { color: 'var(--tt-text-tertiary)' }
                })
              )
            ),

            // Kid switcher dropdown
            showKidMenu && kids.length > 0 &&
              React.createElement(
                'div',
                {
                  className:
                    // Dropdown: tokenized colors + higher z-index than sticky date nav
                    "absolute left-4 top-20 w-60 rounded-2xl shadow-lg border overflow-hidden z-[1000]",
                  onPointerDown: (e) => e.stopPropagation(),
                  onClick: (e) => e.stopPropagation()
                  ,
                  style: {
                    backgroundColor: 'var(--tt-card-bg)',
                    borderColor: 'var(--tt-card-border)',
                    color: 'var(--tt-text-primary)'
                  }
                },
                kids.map((k) => {
                  const isCurrent = k.id === kidId;
                  return React.createElement(
                    'button',
                    {
                      key: k.id,
                      type: 'button',
                      onClick: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectKid(k.id);
                      },
                      className:
                        "w-full h-11 px-3 text-sm flex items-center justify-between transition " +
                        (isCurrent ? "" : "hover:bg-black/5 dark:hover:bg-white/10"),
                      style: isCurrent ? { backgroundColor: 'var(--tt-subtle-surface)' } : undefined
                    },
                    React.createElement(
                      'span',
                      { className: "font-medium truncate", style: { color: 'var(--tt-text-primary)' } },
                      k.name || 'Baby'
                    ),
                    React.createElement(
                      isCurrent
                        ? (window.TT?.shared?.icons?.KidSelectorOnIcon || (() => null))
                        : (window.TT?.shared?.icons?.KidSelectorOffIcon || (() => null)),
                      {
                        className: "w-4 h-4",
                        style: { color: isCurrent ? 'var(--tt-text-primary)' : 'var(--tt-card-border)' }
                      }
                    )
                  );
                }),

                // Add child
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowKidMenu(false);
                      setActiveTab('family');
                      setHeaderRequestedAddChild(true);
                    },
                    className:
                      "w-full h-11 px-3 text-sm font-medium text-left border-t transition hover:bg-black/5 dark:hover:bg-white/10",
                    style: {
                      color: 'var(--tt-text-primary)',
                      borderColor: 'var(--tt-card-border)'
                    }
                  },
                  "+ Add child"
                )
              ),

            // RIGHT COLUMN: Share + Settings buttons
            React.createElement(
              'div',
              { className: "flex items-center justify-end gap-0.5" },
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowShareMenu((v) => !v);
                    setShowKidMenu(false);
                  },
                  className: "w-11 h-11 flex items-center justify-center rounded-xl hover:bg-[var(--tt-seg-track)] transition"
                },
                React.createElement(window.TT?.shared?.icons?.ShareIconPhosphor || (() => null), {
                  className: "w-6 h-6",
                  isTapped: showShareMenu,
                  selectedWeight: 'fill',
                  style: { color: 'var(--tt-text-primary)' }
                })
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowShareMenu(false);
                    setShowKidMenu(false);
                    setActiveTab('family');
                  },
                  className:
                    "w-11 h-11 flex items-center justify-center rounded-xl hover:bg-[var(--tt-seg-track)] transition",
                  'aria-label': 'Family'
                },
                React.createElement(window.TT?.shared?.icons?.HomeIcon || (() => null), {
                  className: "w-6 h-6",
                  isSelected: activeTab === 'family',
                  selectedWeight: 'fill',
                  style: { color: 'var(--tt-text-primary)' }
                })
              )
            ),

            // Share dropdown
            showShareMenu &&
              React.createElement(
                'div',
                {
                  className:
                    "absolute right-4 top-20 w-56 rounded-2xl shadow-lg border overflow-hidden z-[1000]",
                  onPointerDown: (e) => e.stopPropagation(),
                  onClick: (e) => e.stopPropagation(),
                  style: {
                    backgroundColor: 'var(--tt-card-bg)',
                    borderColor: 'var(--tt-card-border)',
                    color: 'var(--tt-text-primary)'
                  }
                },
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await handleGlobalShareApp();
                      setShowShareMenu(false);
                    },
                    className:
                      "w-full h-11 px-3 text-sm flex items-center gap-2 transition hover:bg-black/5 dark:hover:bg-white/10",
                    style: { color: 'var(--tt-text-primary)' }
                  },
                  React.createElement(LocalLinkIcon, { className: "w-4 h-4", style: { color: 'var(--tt-text-primary)' } }),
                  "Share app link"
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      await handleGlobalInvitePartner();
                      setShowShareMenu(false);
                    },
                    className:
                      "w-full h-11 px-3 text-sm flex items-center gap-2 transition hover:bg-black/5 dark:hover:bg-white/10",
                    style: { color: 'var(--tt-text-primary)' }
                  },
                  React.createElement(LocalPersonAddIcon, { className: "w-4 h-4", style: { color: 'var(--tt-text-primary)' } }),
                  "Invite partner"
                )
              )
          ),
          // Brand logo — rendered separately, centered on screen, aligned with header row (like plus btn)
          React.createElement(
            'div',
            { className: "absolute left-1/2 -translate-x-1/2 top-0 bottom-0 flex items-center justify-center pointer-events-none -translate-y-[5px]" },
            React.createElement(
              'svg',
              {
                xmlns: "http://www.w3.org/2000/svg",
                width: "26.4",
                height: "26.4",
                viewBox: "0 0 256 256",
                style: { color: 'var(--tt-brand-icon)' }
              },
              React.createElement('path', {
                d: "M205.41,159.07a60.9,60.9,0,0,1-31.83,8.86,71.71,71.71,0,0,1-27.36-5.66A55.55,55.55,0,0,0,136,194.51V224a8,8,0,0,1-8.53,8,8.18,8.18,0,0,1-7.47-8.25V211.31L81.38,172.69A52.5,52.5,0,0,1,63.44,176a45.82,45.82,0,0,1-23.92-6.67C17.73,156.09,6,125.62,8.27,87.79a8,8,0,0,1,7.52-7.52c37.83-2.23,68.3,9.46,81.5,31.25A46,46,0,0,1,103.74,140a4,4,0,0,1-6.89,2.43l-19.2-20.1a8,8,0,0,0-11.31,11.31l53.88,55.25c.06-.78.13-1.56.21-2.33a68.56,68.56,0,0,1,18.64-39.46l50.59-53.46a8,8,0,0,0-11.31-11.32l-49,51.82a4,4,0,0,1-6.78-1.74c-4.74-17.48-2.65-34.88,6.4-49.82,17.86-29.48,59.42-45.26,111.18-42.22a8,8,0,0,1,7.52,7.52C250.67,99.65,234.89,141.21,205.41,159.07Z",
                fill: "currentColor"
              })
            )
          )
        )
      ),

      // ---------------- PAGE CONTENT ----------------
      React.createElement(
        'div',
        { className: isAnalyticsSubtab ? "pb-5" : "px-4 pb-5" },
        React.createElement('div', {
          style: { display: activeTab === 'tracker' ? 'block' : 'none' }
        }, React.createElement(window.TT.tabs.TrackerTab, { 
          user, 
          kidId, 
          familyId,
          onRequestOpenInputSheet: openInputSheet,
          onRequestToggleActivitySheet: handleToggleActivitySheet,
          isActivitySheetOpen: showActivitySheet,
          activityVisibility: activityVisibilitySafe,
          activityOrder: activityOrderSafe,
          activeTab
        })),
        React.createElement('div', {
          style: { display: activeTab === 'analytics' ? 'block' : 'none' }
        }, React.createElement(window.TT.tabs.AnalyticsTab, { 
          user, 
          kidId, 
          familyId, 
          setActiveTab,
          activityVisibility: activityVisibilitySafe,
          activityOrder: activityOrderSafe
        })),
        React.createElement('div', {
          style: { display: activeTab === 'analytics-bottle' ? 'block' : 'none' }
        }, React.createElement(window.TT.tabs.BottleAnalyticsTab, { user, kidId, familyId, setActiveTab })),
        React.createElement('div', {
          style: { display: activeTab === 'analytics-nursing' ? 'block' : 'none' }
        }, React.createElement(window.TT.tabs.NursingAnalyticsTab, { user, kidId, familyId, setActiveTab })),
        React.createElement('div', {
          style: { display: activeTab === 'analytics-solids' ? 'block' : 'none' }
        }, React.createElement(window.TT.tabs.SolidsAnalyticsTab, { user, kidId, familyId, setActiveTab })),
        React.createElement('div', {
          style: { display: activeTab === 'analytics-sleep' ? 'block' : 'none' }
        }, React.createElement(window.TT.tabs.SleepAnalyticsTab, { user, kidId, familyId, setActiveTab })),
        React.createElement('div', {
          style: { display: activeTab === 'analytics-diaper' ? 'block' : 'none' }
        }, React.createElement(window.TT.tabs.DiaperAnalyticsTab, { user, kidId, familyId, setActiveTab })),
        window.TT?.tabs?.TrackerDetailTab && React.createElement('div', {
          style: activeTab === 'tracker-detail'
            ? {
                display: 'block',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
                zIndex: 45,
                overflow: 'hidden',
                backgroundColor: 'var(--tt-app-bg)'
              }
            : { display: 'none' }
        }, React.createElement(
          'div',
          { className: "max-w-2xl mx-auto h-full px-4 pb-5" },
          React.createElement(window.TT.tabs.TrackerDetailTab, { user, kidId, familyId, setActiveTab, activeTab, activityVisibility: activityVisibilitySafe })
        )),
        activeTab === 'family' && React.createElement(window.TT.tabs.FamilyTab, {
          user,
          kidId,
          familyId,
          onKidChange,
          kids,
          themeKey,
          onThemeChange: setThemeKey,
          requestAddChild: headerRequestedAddChild,
          onRequestAddChildHandled: () => setHeaderRequestedAddChild(false),
          onRequestToggleActivitySheet: handleToggleActivitySheet
        }),
        
      )
    ),

    // Click-away overlay to close menus (UNDER dropdowns)
    (showShareMenu || showKidMenu) &&
      React.createElement('div', {
        // Under dropdowns, over everything else. Use pointer-down so outside tap closes immediately
        // and doesn't fight with onClick handlers.
        className: "fixed inset-0 z-[900]",
        onPointerDown: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowShareMenu(false);
          setShowKidMenu(false);
        }
      }),

    (() => {
      const isDiaperMode = inputSheetMode === 'diaper';
      const isSleepMode = inputSheetMode === 'sleep';
      const InputSheet = isDiaperMode
        ? window.DiaperSheet
        : (isSleepMode ? window.SleepSheet : window.FeedSheet);
      if (!InputSheet) return null;
      if (isDiaperMode) {
        return React.createElement(InputSheet, {
          isOpen: inputSheetOpen,
          onClose: closeInputSheet,
          entry: null,
          onSave: async (entryData) => {
            try {
              const event = new CustomEvent('tt-input-sheet-added', { detail: { mode: 'diaper', entry: entryData || null } });
              window.dispatchEvent(event);
            } catch (e) {}
          }
        });
      }
      return React.createElement(InputSheet, {
        variant: 'input',
        isOpen: inputSheetOpen,
        onClose: closeInputSheet,
        kidId: kidId,
        activityVisibility: activityVisibilitySafe,
        onAdd: async (entryData) => {
          try {
            const event = new CustomEvent('tt-input-sheet-added', { detail: { mode: inputSheetMode, entry: entryData || null } });
            window.dispatchEvent(event);
          } catch (e) {
            // Non-fatal if CustomEvent is unavailable
          }
        }
      });
    })(),

    shouldUseNewInputFlow && FloatingTrackerMenu && (isFeedEnabled || activityVisibilitySafe.sleep || activityVisibilitySafe.diaper) && React.createElement(
      'div',
      { className: "tt-floating-plus" },
      React.createElement(FloatingTrackerMenu, {
        onSelectTracker: (type) => {
          openInputSheet(type);
          setShowShareMenu(false);
          setShowKidMenu(false);
        },
        visibleTypes: {
          feeding: isFeedEnabled,
          sleep: activityVisibilitySafe.sleep,
          diaper: activityVisibilitySafe.diaper
        },
        position: {
          bottom: 'calc(env(safe-area-inset-bottom) + 36px)',
          left: '50%'
        }
      })
    ),

    // Gradient fade above footer for smooth content fade
    React.createElement(
      'div',
      {
        className: "tt-nav-fade fixed left-0 right-0 pointer-events-none",
        style: {
          left: 0,
          right: 0,
          width: '100%',
          bottom: 'calc(env(safe-area-inset-bottom) + 65px)', // Position at footer top edge
          height: '100px',
          background: 'var(--tt-nav-fade-gradient)',
          zIndex: 40
        }
      }
    ),

    ActivityVisibilitySheet && React.createElement(ActivityVisibilitySheet, {
      isOpen: showActivitySheet,
      onClose: () => setShowActivitySheet(false),
      visibility: activityVisibilitySafe,
      order: activityOrderSafe,
      onChange: handleUpdateActivityVisibility
    }),

    // Bottom navigation (v4)
    React.createElement(
      'div',
      {
        className: "tt-bottom-nav fixed bottom-0 left-0 right-0 z-50",
        style: {
          background: "var(--tt-nav-bg)",
          boxShadow: 'none',
          // Make the bar a bit taller without moving its contents (including the +):
          // increasing height pushes the top up, and matching paddingTop pushes contents back down.
          minHeight: '80px',
          paddingTop: '10px',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }
      },
      React.createElement(
        'div',
        { className: "max-w-2xl mx-auto relative flex items-center justify-between px-4 py-3" },
        shouldUseNewInputFlow && FloatingTrackerMenu
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'button',
                {
                  key: 'tracker',
                  type: 'button',
                  onClick: () => {
                    setActiveTab('tracker');
                    setShowShareMenu(false);
                    setShowKidMenu(false);
                  },
                  className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
                  style: {
                    color: 'var(--tt-text-primary)',
                    transform: 'translateY(-15px)'
                  }
                },
                React.createElement(window.TT?.shared?.icons?.TodayIcon || (() => null), {
                  className: "w-6 h-6",
                  isSelected: activeTab === 'tracker',
                  selectedWeight: 'fill',
                  style: {
                    color: 'var(--tt-text-primary)'
                  }
                }),
                React.createElement('span', {
                  className: "text-xs font-light",
                  style: {
                    color: 'var(--tt-text-primary)'
                  }
                }, 'Track')
              ),
              React.createElement('div', {
                key: 'plus-spacer',
                className: "flex-1 py-2 flex items-center justify-center",
                style: {
                  transform: 'translateY(-15px)'
                },
                'aria-hidden': 'true'
              }),
              React.createElement(
                'button',
                {
                  key: 'analytics',
                  type: 'button',
                  onClick: () => {
                    setActiveTab('analytics');
                    setShowShareMenu(false);
                    setShowKidMenu(false);
                  },
                  className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
                  style: {
                    color: 'var(--tt-text-primary)',
                    transform: 'translateY(-15px)'
                  }
                },
                React.createElement(window.TT?.shared?.icons?.TrendsIcon || (() => null), {
                  className: "w-6 h-6",
                  isSelected: activeTab === 'analytics',
                  selectedWeight: 'fill',
                  style: {
                    color: 'var(--tt-text-primary)'
                  }
                }),
                React.createElement('span', {
                  className: "text-xs font-light",
                  style: {
                    color: 'var(--tt-text-primary)'
                  }
                }, 'Trends')
              )
            )
          : React.createElement(
              React.Fragment,
              null,
              React.createElement(
                'button',
                {
                  key: 'tracker',
                  type: 'button',
                  onClick: () => {
                    setActiveTab('tracker');
                    setShowShareMenu(false);
                    setShowKidMenu(false);
                  },
                  className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
                  style: {
                    color: 'var(--tt-text-primary)',
                    transform: 'translateY(-15px)'
                  }
                },
                React.createElement(window.TT?.shared?.icons?.TodayIcon || (() => null), {
                  className: "w-6 h-6",
                  isSelected: activeTab === 'tracker',
                  selectedWeight: 'fill',
                  style: {
                    color: 'var(--tt-text-primary)'
                  }
                }),
                React.createElement('span', {
                  className: "text-xs font-light",
                  style: {
                    color: 'var(--tt-text-primary)'
                  }
                }, 'Track')
              ),
              // Plus button (center)
              shouldUseNewInputFlow && FloatingTrackerMenu
                ? React.createElement('div', {
                    key: 'plus',
                    className: "mx-2 w-14 h-14 -mt-7",
                    style: { transform: 'translateY(24px)' },
                    'aria-hidden': 'true'
                  })
                : React.createElement(
                    'button',
                    {
                      key: 'plus',
                      type: 'button',
                      onClick: () => {
                        openInputSheet('feeding');
                        setShowShareMenu(false);
                        setShowKidMenu(false);
                      },
                      className:
                        "mx-2 w-14 h-14 -mt-7 rounded-full flex items-center justify-center shadow-lg active:scale-[0.98] transition-transform",
                      style: {
                        backgroundColor: 'var(--tt-plus-bg)',
                        color: 'var(--tt-plus-fg)',
                        transform: 'translateY(24px)'
                      },
                      'aria-label': 'Add'
                    },
                    React.createElement(window.TT?.shared?.icons?.PlusIcon || (() => null), {
                      className: "w-6 h-6",
                      weight: 'fill',
                      style: { color: 'var(--tt-plus-fg)' }
                    })
                  ),
              // Trends/Analytics
              React.createElement(
                'button',
                {
                  key: 'analytics',
                  type: 'button',
                  onClick: () => {
                    setActiveTab('analytics');
                    setShowShareMenu(false);
                    setShowKidMenu(false);
                  },
                  className: "flex-1 py-2 flex flex-col items-center gap-1 transition",
                  style: {
                    color: 'var(--tt-text-primary)',
                    transform: 'translateY(-5px)'
                  }
                },
                React.createElement(window.TT?.shared?.icons?.TrendsIcon || (() => null), {
                  className: "w-6 h-6",
                  isSelected: activeTab === 'analytics',
                  selectedWeight: 'fill',
                  style: {
                    color: 'var(--tt-text-primary)'
                  }
                }),
                React.createElement('span', {
                  className: "text-xs font-light",
                  style: {
                    color: 'var(--tt-text-primary)'
                  }
                }, 'Trends')
              )
            )
      )
    )
  );
};

// ========================================
// UI PRIMITIVES
// Shared components for consistent UI
// ========================================


// ========================================
// TrackerCard Component
// ========================================
// NOTE: TrackerCard is provided by components/TrackerCard.js
// It is loaded via script tag in index.html and available as window.TrackerCard




// ========================================
// TINY TRACKER - PART 8
// SVG Icons & Render (with Menu/Hamburger icon for settings)
// ========================================

// Chevron left
const ChevronLeft = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "m15 18-6-6 6-6" })
);

// Chevron right
const ChevronRight = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "m9 18 6-6-6-6" })
);


// Clock icon
const Clock = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('circle', { cx: "12", cy: "12", r: "10" }),
  React.createElement('polyline', { points: "12 6 12 12 16 14" })
);

// Camera icon (for baby photo)
const Camera = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" }),
  React.createElement('circle', { cx: "12", cy: "13", r: "4" })
);

// UserPlus icon (for invite)
const UserPlus = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('path', { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
  React.createElement('circle', { cx: "9", cy: "7", r: "4" }),
  React.createElement('line', { x1: "19", x2: "19", y1: "8", y2: "14" }),
  React.createElement('line', { x1: "22", x2: "16", y1: "11", y2: "11" })
);


// Navigation Icons

// BarChart (Tracker tab)
const BarChart = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('line', { x1: "12", y1: "20", x2: "12", y2: "10" }),
  React.createElement('line', { x1: "18", y1: "20", x2: "18", y2: "4" }),
  React.createElement('line', { x1: "6", y1: "20", x2: "6", y2: "16" })
);

// TrendingUp (Analytics tab)
const TrendingUp = (props) => React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
  React.createElement('polyline', { points: "23 6 13.5 15.5 8.5 10.5 1 18" }),
  React.createElement('polyline', { points: "17 6 23 6 23 12" })
);



// ========================================
// TINY TRACKER - PART 9

// ========================================
// TINY TRACKER - PART 10 (GEMINI VERSION)
// AI Integration via Cloudflare Worker + Gemini
// Conversational, analytical, non-creepy
// ========================================

// Optional: keep replies compact (used at end of getAIResponse)
const trimAIAnswer = (text) => {
  if (!text || typeof text !== "string") return text;
  
  // Only trim if significantly over limit
  const MAX_CHARS = 1000; // increased from 650
  
  if (text.length <= MAX_CHARS) return text;
  
  // Try to keep complete thoughts
  const paragraphs = text.split(/\n\n+/);
  let result = "";
  
  for (const para of paragraphs) {
    if ((result + para).length > MAX_CHARS) break;
    result += (result ? "\n\n" : "") + para;
  }
  
  // If we got at least 70% of target, return it
  if (result.length > MAX_CHARS * 0.7) return result;
  
  // Otherwise do sentence-level trimming
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  result = "";
  
  for (const sentence of sentences) {
    if ((result + sentence).length > MAX_CHARS) break;
    result += sentence;
  }
  
  return result || text.slice(0, MAX_CHARS) + "…";
};

// ----------------------------------------
// 1) Call Cloudflare Worker → Gemini
// ----------------------------------------
const getAIResponse = async (question, kidId) => {
  try {
    const context = await buildAIContext(kidId, question);

    const response = await fetch("https://tiny-tracker-ai.adamlebowski.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: context.fullPrompt })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Worker error:", response.status, text);
      // Preserve 429 status for quota detection
      if (response.status === 429) {
        const error = new Error("AI backend error: quota exceeded");
        error.status = 429;
        error.quotaExceeded = true;
        throw error;
      }
      throw new Error("AI backend error");
    }

    const data = await response.json();

    if (data && data.error) {
      console.error("AI backend error payload:", data);
      const error = new Error("AI backend error: " + data.error);
      // Check if it's a quota error from Gemini
      if (data.status === 429 || data.body?.includes('429') || data.body?.includes('RESOURCE_EXHAUSTED') || data.body?.includes('quota')) {
        error.status = 429;
        error.quotaExceeded = true;
      }
      throw error;
    }

    const candidate = data?.candidates?.[0];
    console.log("Gemini raw candidate:", candidate);

    let answer = "";

    if (candidate?.content?.parts) {
      answer = candidate.content.parts.map((p) => p.text || "").join(" ").trim();
    } else if (candidate?.parts) {
      answer = candidate.parts.map((p) => p.text || "").join(" ").trim();
    } else if (typeof candidate?.output_text === "string") {
      answer = candidate.output_text.trim();
    } else if (typeof candidate?.text === "string") {
      answer = candidate.text.trim();
    }

    if (!answer) {
      answer =
        "Tiny Tracker got an unexpected response from Gemini:\n\n" +
        JSON.stringify(candidate || data, null, 2);
    }

    return trimAIAnswer(answer);
  } catch (error) {
    console.error("🔴 AI Error:", error);
    throw error;
  }
};

// ----------------------------------------
// 2) Analytics helpers (no labels)
// ----------------------------------------

const getHour = (ts) => new Date(ts).getHours();

const getMinutes = (ts) => {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
};

const trendSlope = (arr) => {
  if (!arr || arr.length < 3) return 0;
  const n = arr.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += arr[i];
    sumXY += i * arr[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
};

// High-level advanced stats over ALL feedings (no “grazer/back-loader” labels)
const analyzeAdvancedFeedingPatterns = (feedings) => {
  if (!feedings || feedings.length === 0) {
    return {
      daysTracked: 0,
      totalFeedings: 0,
      avgDailyIntake: 0,
      avgIntervalHours: 0,
      morningPercent: 0,
      afternoonPercent: 0,
      eveningPercent: 0,
      nightPercent: 0,
      midDayDriftDirection: "unknown",
      midDayDriftMinutesPerDay: 0,
      last3DailyAvg: null,
      prev7DailyAvg: null,
      intakeSlope: 0
    };
  }

  const sorted = [...feedings].sort((a, b) => a.timestamp - b.timestamp);
  const timestamps = sorted.map((f) => f.timestamp);

  const first = timestamps[0];
  const last = timestamps[timestamps.length - 1];
  const daysTracked = Math.max(
    1,
    Math.ceil((last - first) / (1000 * 60 * 60 * 24))
  );

  // ---- daily totals ----
  const dailyTotals = {};
  sorted.forEach((f) => {
    const d = new Date(f.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    dailyTotals[key] = (dailyTotals[key] || 0) + f.ounces;
  });
  const dayKeys = Object.keys(dailyTotals).sort();
  const dailyArray = dayKeys.map((k) => dailyTotals[k]);
  const totalIntake = dailyArray.reduce((a, b) => a + b, 0);
  const avgDailyIntake = totalIntake / dailyArray.length;

  // intake trend (slope across days)
  const intakeSlope = trendSlope(dailyArray);

  // last 3 vs previous 7
  let last3DailyAvg = null;
  let prev7DailyAvg = null;
  if (dailyArray.length >= 3) {
    const last3 = dailyArray.slice(-3);
    last3DailyAvg = last3.reduce((a, b) => a + b, 0) / last3.length;
  }
  if (dailyArray.length >= 10) {
    const prev7 = dailyArray.slice(-10, -3);
    prev7DailyAvg = prev7.reduce((a, b) => a + b, 0) / prev7.length;
  }

  // ---- intervals ----
  let intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const diffHours =
      (sorted[i].timestamp - sorted[i - 1].timestamp) / (1000 * 60 * 60);
    intervals.push(diffHours);
  }
  const avgIntervalHours =
    intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;

  // ---- time-of-day percentages ----
  let morning = 0,
    afternoon = 0,
    evening = 0,
    night = 0;
  sorted.forEach((f) => {
    const h = getHour(f.timestamp);
    if (h >= 6 && h < 12) morning += f.ounces;
    else if (h >= 12 && h < 18) afternoon += f.ounces;
    else if (h >= 18 && h < 22) evening += f.ounces;
    else night += f.ounces; // 22–6 bucket
  });
  const totalOz = morning + afternoon + evening + night || 1; // avoid /0
  const morningPercent = (morning / totalOz) * 100;
  const afternoonPercent = (afternoon / totalOz) * 100;
  const eveningPercent = (evening / totalOz) * 100;
  const nightPercent = (night / totalOz) * 100;

  // ---- mid-day drift (approx) ----
  const midDayFeeds = sorted.filter((f) => {
    const h = getHour(f.timestamp);
    return h >= 11 && h <= 15;
  });

  let midDayDriftDirection = "unknown";
  let midDayDriftMinutesPerDay = 0;

  if (midDayFeeds.length > 3) {
    // group mid-day feed time by day, take average minutes that day
    const perDay = {};
    midDayFeeds.forEach((f) => {
      const d = new Date(f.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!perDay[key]) perDay[key] = [];
      perDay[key].push(getMinutes(f.timestamp));
    });
    const perDayKeys = Object.keys(perDay).sort();
    const avgMinutesSeries = perDayKeys.map((k) => {
      const arr = perDay[k];
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    });

    const slope = trendSlope(avgMinutesSeries); // minutes per "step" (day)
    midDayDriftMinutesPerDay = slope;
    if (slope > 2) midDayDriftDirection = "later";
    else if (slope < -2) midDayDriftDirection = "earlier";
    else midDayDriftDirection = "stable";
  }

  return {
    daysTracked,
    totalFeedings: sorted.length,
    avgDailyIntake,
    avgIntervalHours,
    morningPercent,
    afternoonPercent,
    eveningPercent,
    nightPercent,
    midDayDriftDirection,
    midDayDriftMinutesPerDay,
    last3DailyAvg,
    prev7DailyAvg,
    intakeSlope
  };
};

// Format last 7 days of feedings as a compact log Gemini can read
const formatRecentFeedingLog = (feedings) => {
  if (!feedings || feedings.length === 0) return "No recent feedings logged.";

  const sorted = [...feedings].sort((a, b) => a.timestamp - b.timestamp);

  const lines = sorted.map((f) => {
    const d = new Date(f.timestamp);
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
    return `${dateStr} ${timeStr} — ${f.ounces.toFixed(1)} oz`;
  });

  return lines.join("\n");
};

// ----------------------------------------
// 2b) Sleep helpers (compact, prompt-safe)
// ----------------------------------------

const _safeNumber = (v) =>
  typeof v === "number" && !Number.isNaN(v) ? v : null;

const _formatDurationHMS = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
};

const _sleepDayKeyLocal = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const _minutesOfDayLocalFromTs = (ts) => {
  try {
    const d = new Date(ts);
    return d.getHours() * 60 + d.getMinutes();
  } catch {
    return 0;
  }
};

const _isWithinWindowLocal = (mins, startMins, endMins) => {
  const s = Number(startMins);
  const e = Number(endMins);
  const m = Number(mins);
  if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(m)) return false;
  if (s === e) return false;
  if (s < e) return m >= s && m <= e;
  // wraps midnight
  return m >= s || m <= e;
};

const _normalizeSleepWindowMins = (startMins, endMins) => {
  const start = Number(startMins);
  const end = Number(endMins);
  if (Number.isFinite(start) && Number.isFinite(end)) {
    return { start, end };
  }
  return { start: 390, end: 1170 };
};

const _classifyNapOvernight = (startTs, dayStartMins, dayEndMins) => {
  const mins = _minutesOfDayLocalFromTs(startTs);
  const { start, end } = _normalizeSleepWindowMins(dayStartMins, dayEndMins);
  const isNap = _isWithinWindowLocal(mins, start, end);
  return isNap ? "NAP" : "OVERNIGHT";
};

const analyzeSleepSessions = (sessions, dayStartMins = 390, dayEndMins = 1170) => {
  if (!sessions || sessions.length === 0) {
    return {
      daysTracked: 0,
      totalSessions: 0,
      avgTotalSleepHours: 0,
      avgOvernightSleepHours: 0,
      avgNapSleepHours: 0
    };
  }

  const { start: windowStart, end: windowEnd } = _normalizeSleepWindowMins(
    dayStartMins,
    dayEndMins
  );

  const cleaned = sessions
    .map((s) => {
      const start = _safeNumber(s.startTime);
      const end = _safeNumber(s.endTime);
      const isActive = !!s.isActive;
      // IMPORTANT: Do not trust stored sleepType/isDaySleep here.
      // Reclassify using current day sleep window at read time.
      const label = start ? _classifyNapOvernight(start, windowStart, windowEnd) : "OVERNIGHT";
      return { ...s, startTime: start, endTime: end, isActive, _aiSleepLabel: label };
    })
    .filter(
      (s) =>
        s.startTime &&
        s.endTime &&
        s.endTime > s.startTime &&
        !s.isActive
    );

  if (cleaned.length === 0) {
    return {
      daysTracked: 0,
      totalSessions: 0,
      avgTotalSleepHours: 0,
      avgOvernightSleepHours: 0,
      avgNapSleepHours: 0
    };
  }

  const daily = {};
  cleaned.forEach((s) => {
    const key = _sleepDayKeyLocal(s.startTime);
    const durMs = s.endTime - s.startTime;
    if (!daily[key]) daily[key] = { totalMs: 0, napMs: 0, overnightMs: 0 };
    daily[key].totalMs += durMs;
    if (s._aiSleepLabel === "NAP") daily[key].napMs += durMs;
    else daily[key].overnightMs += durMs;
  });

  const keys = Object.keys(daily).sort();
  const daysTracked = keys.length;

  const avg = (arr) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    daysTracked,
    totalSessions: cleaned.length,
    avgTotalSleepHours: avg(keys.map((k) => daily[k].totalMs)) / 3600000,
    avgOvernightSleepHours: avg(keys.map((k) => daily[k].overnightMs)) / 3600000,
    avgNapSleepHours: avg(keys.map((k) => daily[k].napMs)) / 3600000
  };
};

const formatRecentSleepLog = (sessions, dayStartMins = 390, dayEndMins = 1170) => {
  if (!sessions || sessions.length === 0)
    return "No recent sleep sessions logged.";

  const sorted = [...sessions].sort(
    (a, b) => (_safeNumber(a.startTime) || 0) - (_safeNumber(b.startTime) || 0)
  );

  const lines = sorted
    .map((s) => {
      const start = _safeNumber(s.startTime);
      if (!start) return null;

      const end = _safeNumber(s.endTime);
      const isActive = !!s.isActive;
      // IMPORTANT: Do not trust stored sleepType/isDaySleep here.
      // Reclassify using current day sleep window at read time.
      const { start: windowStart, end: windowEnd } = _normalizeSleepWindowMins(
        dayStartMins,
        dayEndMins
      );
      const label = _classifyNapOvernight(start, windowStart, windowEnd);

      const d = new Date(start);
      const dateStr = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });
      const startStr = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      });

      if (isActive || !end) {
        return `${dateStr} ${startStr} → in progress (${label})`;
      }

      const endStr = new Date(end).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      });
      const durStr = _formatDurationHMS(end - start);

      return `${dateStr} ${startStr} → ${endStr} — ${durStr} (${label})`;
    })
    .filter(Boolean);

  return lines.join("\n");
};

// ----------------------------------------
// 3) Build AI context (prompt)
// ----------------------------------------
const buildAIContext = async (kidId, question) => {
  const babyData = await firestoreStorage.getKidData();
  const settings = await firestoreStorage.getSettings();
  const allFeedings = await firestoreStorage.getAllFeedings();
  const recentFeedings = await firestoreStorage.getFeedingsLastNDays(7);
  let allSleepSessions = [];
  let recentSleepSessions = [];
  let sleepDayStartMins = 390;
  let sleepDayEndMins = 1170;
  try {
    allSleepSessions = await firestoreStorage.getAllSleepSessions();
    recentSleepSessions = await firestoreStorage.getSleepSessionsLastNDays(7);
    // Use current sleep day window for AI labeling/aggregation (read-time truth)
    const ss = await firestoreStorage.getSleepSettings();
    const { start, end } = (window.TT && window.TT.utils && window.TT.utils.normalizeSleepWindowMins) ? window.TT.utils.normalizeSleepWindowMins(ss?.sleepDayStart ?? ss?.daySleepStartMinutes, ss?.sleepDayEnd ?? ss?.daySleepEndMinutes) : _normalizeSleepWindowMins(ss?.sleepDayStart ?? ss?.daySleepStartMinutes, ss?.daySleepEnd ?? ss?.daySleepEndMinutes);
    sleepDayStartMins = start;
    sleepDayEndMins = end;
  } catch (e) {
    console.warn("Sleep data fetch failed", e);
  }
  const conversation = await firestoreStorage.getConversation();

  const ageInMonths = (window.TT && window.TT.utils && window.TT.utils.calculateAgeInMonths) ? window.TT.utils.calculateAgeInMonths(babyData.birthDate) : calculateAgeInMonths(babyData.birthDate);
  const ageInDays = Math.floor(
    (Date.now() - babyData.birthDate) / (1000 * 60 * 60 * 24)
  );

  const u = (window.TT && window.TT.utils) || {};
  const advancedStats = u.analyzeAdvancedFeedingPatterns ? u.analyzeAdvancedFeedingPatterns(allFeedings) : analyzeAdvancedFeedingPatterns(allFeedings);
  const recentLog = u.formatRecentFeedingLog ? u.formatRecentFeedingLog(recentFeedings) : formatRecentFeedingLog(recentFeedings);
  const sleepStats = u.analyzeSleepSessions ? u.analyzeSleepSessions(allSleepSessions, sleepDayStartMins, sleepDayEndMins) : analyzeSleepSessions(allSleepSessions, sleepDayStartMins, sleepDayEndMins);
  const recentSleepLog = u.formatRecentSleepLog ? u.formatRecentSleepLog(recentSleepSessions, sleepDayStartMins, sleepDayEndMins) : formatRecentSleepLog(recentSleepSessions, sleepDayStartMins, sleepDayEndMins);

  const todayAnchor = new Date().toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  // recent conversation (for follow-ups)
  let conversationHistory = "";
  if (conversation && conversation.messages) {
    const recentMessages = conversation.messages.slice(-10);
    conversationHistory = "\n\nPREVIOUS CONVERSATION:\n";
    recentMessages.forEach((msg) => {
      conversationHistory += `${
        msg.role === "user" ? "Parent" : "AI"
      }: ${msg.content}\n\n`;
    });
  }

  const fullPrompt = `
You are Tiny Tracker, helping a parent understand their baby's feeding patterns and troubleshoot sleep issues.

IMPORTANT: Today is ${todayAnchor} (local time).
IMPORTANT: Sleep sessions below are labeled as NAP vs OVERNIGHT using the app’s configured day-sleep window. Do NOT reclassify based on clock time.

## Core principle: LISTEN AND ADAPT
The parent is reporting what's ACTUALLY HAPPENING with their baby. Your job is to:
1. Acknowledge what they just told you
2. Adjust your recommendations based on real results
3. Problem-solve NEW issues as they arise

DO NOT just repeat your previous recommendation when:
- They report it didn't work
- A new problem has emerged
- They're asking for help with a different situation

## Tone & Style
- Warm, direct friend who's paying attention
- Start directly with your response (no "Hi!" or "Sure!")
- 2-3 short paragraphs maximum
- Use their baby's name naturally

## Response patterns

**When they report what happened:**
✅ "That 2am wake-up with only 1.5oz and distress is definitely different from his usual pattern..."
❌ "The data shows he took 1.5oz at 2:58am" (they just told you this!)

**When something didn't work:**
✅ "Since the consolidated feed approach led to that distressed wake-up, let's try a different strategy..."
❌ "The idea behind consolidating calories is..." (repeating the same failed advice)

**When they ask "what do you recommend?":**
✅ "I'd try X first because Y. If that doesn't work, fall back to Z."
❌ "You could try X. The earlier suggestion was Y." (listing options without picking one)

**When they ask "why?":**
✅ "The reason is [specific mechanism]: when A happens, it causes B, so doing C should help."
❌ "The reason is to achieve the goal" (circular non-answer)

**When there's a NEW problem:**
✅ Acknowledge it's different, troubleshoot the new issue
❌ Keep pushing the original plan that just failed

## Making recommendations

**Be decisive and specific:**
- "Skip the 8pm feed tonight and aim for 4.5oz at 10:30pm" 
- NOT "you could try skipping the 8pm feed"

**Compare options when asked:**
- "Option A is better here because X. Option B could work as backup if Y."
- Pick one as your lead recommendation

**Explain WHY with mechanism:**
- "When you do two feeds close together, his stomach processes them faster, so he wakes sooner"
- NOT "it might not provide the same fullness" (vague)

**Adjust when reality contradicts theory:**
- "Hmm, that distressed wake-up suggests something else is going on - maybe he's overtired or has gas. Let's try..."
- NOT "continue focusing on the 4.5oz feed" (ignoring new info)

## Conversation flow rules
- Read the previous conversation before responding
- If you just explained something, don't explain it again
- If they ask the same question twice, your first answer wasn't clear enough
- When they report results, START with acknowledging those results
- Build on the discussion, don't reset every message

## When parent is frustrated
Signs: "Are you having issues?", "You're not very friendly", "You're just repeating yourself"
Response: Be MORE direct, pick ONE clear path forward, acknowledge their frustration is valid

## Baby snapshot
- Name: ${babyData.name || "Baby"}
- Age: ${ageInMonths} month${ageInMonths !== 1 ? "s" : ""} (${ageInDays} days old)
- Weight: ${settings?.babyWeight || "not set"} lbs
- Target daily: ${
    settings?.babyWeight && settings?.multiplier
      ? (settings.babyWeight * settings.multiplier).toFixed(1)
      : "not set"
  } oz/day

## Patterns summary (${advancedStats.daysTracked} days)
- Daily average: ${advancedStats.avgDailyIntake.toFixed(1)} oz
- Typical interval: ${advancedStats.avgIntervalHours.toFixed(1)} hours
- Time distribution: Morning ${advancedStats.morningPercent.toFixed(0)}% | Afternoon ${advancedStats.afternoonPercent.toFixed(0)}% | Evening ${advancedStats.eveningPercent.toFixed(0)}% | Night ${advancedStats.nightPercent.toFixed(0)}%
${
    advancedStats.last3DailyAvg && advancedStats.prev7DailyAvg
      ? `- Trend: Last 3 days ${advancedStats.last3DailyAvg.toFixed(1)} oz vs previous week ${advancedStats.prev7DailyAvg.toFixed(1)} oz`
      : ""
  }

## Recent detailed log (last 7 days)
${recentLog}

## Sleep summary (${sleepStats.daysTracked} days)
- Avg total sleep: ${sleepStats.avgTotalSleepHours.toFixed(1)} hours/day
- Avg overnight sleep: ${sleepStats.avgOvernightSleepHours.toFixed(1)} hours/day
- Avg nap sleep: ${sleepStats.avgNapSleepHours.toFixed(1)} hours/day

## Recent sleep log (last 7 days)
${recentSleepLog}

## Previous conversation
${conversationHistory}

## Parent's current question/situation
${question}

Before responding, ask yourself:
- Did they just report what happened? Start by acknowledging it
- Did my previous advice work or not work? Adjust accordingly
- Are they asking WHY? Explain the mechanism, not just the goal
- Have I already said this? Don't repeat yourself
- Is there a NEW problem that needs different troubleshooting?

Remember: You're helping a sleep-deprived parent in real-time. Be the attentive, adaptive friend they need.
`;

  return {
    fullPrompt,
    messages: [] // Not used for Gemini (we put everything into fullPrompt)
  };
};

// ----------------------------------------
// 4) Age helper
// ----------------------------------------
const calculateAgeInMonths = (birthDate) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
};

// ========================================
// TINY TRACKER V4.4 – PART 11
// App Initialization, Theme Color, and Render Ordering Fix
// ========================================
//
// IMPORTANT:
// ReactDOM.render() must run AFTER all components (including App) are defined.
// iOS Safari and some mobile WebViews will crash with a blank screen if App
// is referenced before it is initialized.
//
// This part moves the theme-color logic and the ReactDOM.render() call to the
// very bottom of script.js to guarantee correct load order across devices.
//
// Also: GitHub Pages aggressively caches script.js — use ?v=### to force refresh.
//
// ========================================


// ========================================
// SET THEME COLOR FOR MOBILE BROWSER
// ========================================

const ensureMetaThemeTag = () => {
  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }

  return meta;
};

const updateMetaThemeColor = () => {
  const meta = ensureMetaThemeTag();
  const appBg = getComputedStyle(document.documentElement).getPropertyValue('--tt-app-bg').trim();
  const fallbackBg = (THEME_TOKENS.BACKGROUND_THEMES && THEME_TOKENS.BACKGROUND_THEMES.light)
    ? THEME_TOKENS.BACKGROUND_THEMES.light.appBg
    : "#FFFFFF";
  const color = appBg || fallbackBg;
  meta.setAttribute('content', color);
};

updateMetaThemeColor();
window.updateMetaThemeColor = updateMetaThemeColor;

// ========================================
// ORIENTATION LOCK (portrait-only)
// ========================================

const setupOrientationLock = () => {
  const tryLockPortrait = () => {
    try {
      if (screen?.orientation?.lock) {
        screen.orientation.lock('portrait').catch(() => {});
      }
    } catch (e) {}
  };

  // Attempt to lock portrait where supported (often requires user gesture)
  tryLockPortrait();
  window.addEventListener('click', tryLockPortrait, { once: true, capture: true });
  window.addEventListener('touchstart', tryLockPortrait, { once: true, capture: true });
};

setupOrientationLock();

// ========================================
// RENDER APP (must stay last)
// ========================================

ReactDOM.render(
  React.createElement(App),
  document.getElementById('root')
);
