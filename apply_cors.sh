#!/bin/bash

# Script to apply CORS configuration to Firebase Storage
# This requires Google Cloud SDK (gsutil) to be installed

echo "Applying CORS configuration to Firebase Storage..."
echo ""

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil not found!"
    echo ""
    echo "Please install Google Cloud SDK:"
    echo "  macOS: brew install google-cloud-sdk"
    echo "  Or download from: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "After installation, run:"
    echo "  gcloud auth login"
    echo "  gsutil cors set cors.json gs://baby-feeding-tracker-978e6.firebasestorage.app"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "⚠️  Not authenticated with Google Cloud"
    echo "Running: gcloud auth login"
    gcloud auth login
fi

# Apply CORS configuration
echo "Applying CORS configuration..."
gsutil cors set cors.json gs://baby-feeding-tracker-978e6.firebasestorage.app

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "Verifying configuration..."
    gsutil cors get gs://baby-feeding-tracker-978e6.firebasestorage.app
else
    echo ""
    echo "❌ Failed to apply CORS configuration"
    echo "Please check the error message above"
    exit 1
fi
