import { Easing } from 'react-native-reanimated';

// How long the forward (open/push) animation takes, in milliseconds.
// Increase for a slower, more dramatic slide. Decrease for a snappier push.
export const SUBPAGE_OPEN_DURATION_MS = 360;

// How long the back (close/pop) animation takes, in milliseconds.
// Increase for a softer retreat. Decrease for a faster "go back" feel.
export const SUBPAGE_CLOSE_DURATION_MS = 360;

// How long the "snap back" animation takes when a swipe-back is canceled.
// Lower values feel more elastic/snappy. Higher values feel heavier.
export const SUBPAGE_CANCEL_DURATION_MS = 220;

// Fraction of screen width the user must drag before swipe-back closes.
// Example: 0.33 means drag ~33% of the screen. Lower makes close easier.
export const SUBPAGE_SWIPE_CLOSE_THRESHOLD = 0.33;

// Swipe velocity (px/sec) that will force close even with short drag distance.
// Lower means quick flicks close more easily. Higher requires stronger flicks.
export const SUBPAGE_SWIPE_VELOCITY_THRESHOLD = 950;

// Easing curve used for open/close/cancel timing.
// Change this only if you want a different motion character app-wide.
export const SUBPAGE_EASING = Easing.bezier(0.22, 1, 0.36, 1);

// How far the background/base page shifts left during push/pop.
// 0 = no shift. Larger values create stronger parallax depth.
export const SUBPAGE_BASE_SHIFT_FACTOR = 0.22;

// How much the base page scales down while a detail page is on top.
// 1 = no scale. Values slightly below 1 add depth (e.g. 0.985).
export const SUBPAGE_BASE_SCALE = 0.985;

// Where the incoming detail page starts on the X axis, as screen-width multiple.
// 1 = starts fully off-screen right. >1 starts farther away. <1 starts closer.
export const SUBPAGE_DETAIL_START_X_FACTOR = 1;

// Maximum dark overlay opacity behind the top page.
// 0 = no dim. Higher values make the background feel more recessed.
export const SUBPAGE_SCRIM_OPACITY = 0.08;

// Maximum shadow opacity on the incoming top page.
// 0 = flat/no shadow. Higher values increase separation from background.
export const SUBPAGE_DETAIL_SHADOW_OPACITY = 0.16;
