// PostHog configuration.
// Replace POSTHOG_API_KEY with your project API key from posthog.com > Project Settings > Project API Key.
export const POSTHOG_API_KEY = 'YOUR_POSTHOG_API_KEY';

export const POSTHOG_OPTIONS = {
  host: 'https://us.i.posthog.com',
};

// Feature flag keys — define all flag names here to avoid string literals scattered across the app.
export const FLAGS = {
  NEW_ONBOARDING: 'new_onboarding',
};
