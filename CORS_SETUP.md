# Firebase Storage CORS Configuration

To fix the CORS error preventing photo uploads, you need to apply the CORS configuration to your Firebase Storage bucket.

## Option 1: Using gsutil (Recommended)

1. **Install Google Cloud SDK** (if not already installed):
   ```bash
   # macOS
   brew install google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```

3. **Apply CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://baby-feeding-tracker-978e6.firebasestorage.app
   ```

4. **Verify the configuration**:
   ```bash
   gsutil cors get gs://baby-feeding-tracker-978e6.firebasestorage.app
   ```

## Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `baby-feeding-tracker-978e6`
3. Navigate to **Storage** → **Rules**
4. Ensure your storage rules allow authenticated uploads:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /families/{familyId}/kids/{kidId}/photos/{photoId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

Note: CORS configuration must still be done via gsutil (Option 1) as it cannot be configured through the Firebase Console UI.

## After Configuration

Once CORS is configured, photo uploads should work from:
- Local development (localhost, 127.0.0.1)
- Production domains
- PWA installations

The updated upload methods now include:
- Authentication checks (ensures user is logged in)
- Proper metadata (includes user ID and upload timestamp)
- Better error handling
