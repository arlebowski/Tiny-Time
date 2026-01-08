# Firebase Storage CORS Configuration

To fix the CORS error preventing photo uploads, you need to apply the CORS configuration to your Firebase Storage bucket.

## Option 1: Using the Script (Easiest)

Simply run the provided script:
```bash
chmod +x apply_cors.sh
./apply_cors.sh
```

The script will automatically use `gcloud` (preferred) or `gsutil` (fallback) if available.

## Option 2: Using gcloud (Recommended - Modern Method)

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
   gcloud storage buckets update gs://baby-feeding-tracker-978e6.firebasestorage.app --cors-file=cors.json
   ```

4. **Verify the configuration**:
   ```bash
   gcloud storage buckets describe gs://baby-feeding-tracker-978e6.firebasestorage.app --format=json | grep -A 10 cors_config
   ```

## Option 3: Using gsutil (Traditional Method)

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

## Option 4: Using Firebase Console (Storage Rules Only)

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
- Production domain (https://arlebowski.github.io)
- PWA installations

The `cors.json` file explicitly includes:
- `http://localhost:*` (for local development)
- `http://127.0.0.1:*` (for local development)
- `https://arlebowski.github.io` (for production)

The updated upload methods now include:
- Authentication checks (ensures user is logged in)
- Proper metadata (includes user ID and upload timestamp)
- Better error handling
