#!/bin/bash

# Script to apply CORS configuration to Firebase Storage
# This requires Google Cloud SDK (gcloud or gsutil) to be installed

BUCKET="gs://baby-feeding-tracker-978e6.firebasestorage.app"
CORS_FILE="cors.json"

echo "Applying CORS configuration to Firebase Storage..."
echo ""

# Check if gcloud is available (preferred method)
if command -v gcloud &> /dev/null; then
    echo "Using gcloud (preferred method)..."
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo "⚠️  Not authenticated with Google Cloud"
        echo "Running: gcloud auth login"
        gcloud auth login
    fi
    
    # Apply CORS configuration using gcloud
    echo "Applying CORS configuration..."
    gcloud storage buckets update $BUCKET --cors-file=$CORS_FILE
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ CORS configuration applied successfully!"
        echo ""
        echo "Verifying configuration..."
        gcloud storage buckets describe $BUCKET --format=json | grep -A 10 cors_config || echo "CORS config found in bucket description"
    else
        echo ""
        echo "❌ Failed to apply CORS configuration"
        echo "Please check the error message above"
        exit 1
    fi

# Fallback to gsutil if gcloud is not available
elif command -v gsutil &> /dev/null; then
    echo "Using gsutil (fallback method)..."
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo "⚠️  Not authenticated with Google Cloud"
        echo "Running: gcloud auth login"
        gcloud auth login
    fi
    
    # Apply CORS configuration using gsutil
    echo "Applying CORS configuration..."
    gsutil cors set $CORS_FILE $BUCKET
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ CORS configuration applied successfully!"
        echo ""
        echo "Verifying configuration..."
        gsutil cors get $BUCKET
    else
        echo ""
        echo "❌ Failed to apply CORS configuration"
        echo "Please check the error message above"
        exit 1
    fi

# Neither tool is available
else
    echo "❌ Neither gcloud nor gsutil found!"
    echo ""
    echo "Please install Google Cloud SDK:"
    echo "  macOS: brew install google-cloud-sdk"
    echo "  Or download from: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "After installation, run:"
    echo "  gcloud auth login"
    echo "  gcloud storage buckets update $BUCKET --cors-file=$CORS_FILE"
    echo ""
    echo "Or using gsutil:"
    echo "  gsutil cors set $CORS_FILE $BUCKET"
    exit 1
fi
