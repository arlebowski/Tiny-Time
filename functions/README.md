# Tiny Time – Push Notification Functions

Firebase Cloud Functions that send push notifications to family members when logs are created.

## Triggers

- **New feeding** – bottle logged
- **New nursing** – nursing session logged
- **New solids** – solids logged
- **New diaper** – diaper change logged
- **Sleep started** – when a sleep session is started (active sleep)

## Setup

1. **Link Firebase project** (if not already):
   ```bash
   firebase use baby-feeding-tracker-978e6
   ```

2. **Install dependencies**:
   ```bash
   cd functions && npm install
   ```

3. **Deploy**:
   ```bash
   firebase deploy --only functions
   ```

## iOS Setup (for push to work)

1. In Xcode: Target → Signing & Capabilities → add **Push Notifications**
2. In [Firebase Console](https://console.firebase.google.com) → Project Settings → Cloud Messaging:
   - Upload your APNs Authentication Key (.p8) or APNs Certificate

## App Store Reviewer Account

To create a test account for App Store review:

1. Download your Firebase service account key from [Firebase Console](https://console.firebase.google.com) → Project Settings → Service Accounts → Generate new private key
2. Save it as `service-account-key.json` in the `native/` folder (or project root)
3. Run:
   ```bash
   cd functions && npm run create-reviewer
   ```
4. Add the printed credentials in App Store Connect → App Review Information

Default: `reviewer@tinytracker.app` / `Review2026!` — user goes through onboarding (Create Family / Join with Code).

To skip onboarding (pre-create family + baby): `SKIP_ONBOARDING=true npm run create-reviewer`

## Data Model

- `users/{uid}.fcmTokens` – array of FCM tokens for the user
- Log documents include `createdByUid` or `startedByUid` so the actor is excluded from notifications
