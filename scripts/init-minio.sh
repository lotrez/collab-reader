#!/bin/bash

# Script to initialize MinIO bucket for Collab Reader
# This script waits for MinIO to be ready and creates the bucket

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values
MINIO_ENDPOINT=${MINIO_ENDPOINT:-localhost}
MINIO_PORT=${MINIO_API_PORT:-9000}
MINIO_ACCESS_KEY=${MINIO_ROOT_USER:-minioadmin}
MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD:-minioadmin}
BUCKET_NAME=${MINIO_BUCKET_NAME:-collab-reader}

echo "🔧 Initializing MinIO for Collab Reader..."
echo ""

# Wait for MinIO to be ready
echo "⏳ Waiting for MinIO to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://${MINIO_ENDPOINT}:${MINIO_PORT}/minio/health/live > /dev/null 2>&1; then
        echo "✅ MinIO is ready!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - MinIO not ready yet..."
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ MinIO failed to start after $MAX_RETRIES attempts"
    exit 1
fi

echo ""
echo "📦 Creating bucket: $BUCKET_NAME"

# Create bucket using MinIO client
# Check if we can use mc (MinIO client)
if command -v mc &> /dev/null; then
    echo "   Using MinIO client (mc)..."
    
    # Configure alias
    mc alias set local http://${MINIO_ENDPOINT}:${MINIO_PORT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY} --api S3v4
    
    # Create bucket if it doesn't exist
    if mc ls local/${BUCKET_NAME} &> /dev/null; then
        echo "   ℹ️  Bucket '${BUCKET_NAME}' already exists"
    else
        mc mb local/${BUCKET_NAME}
        echo "   ✅ Bucket '${BUCKET_NAME}' created successfully"
    fi
    
    # Set bucket to private
    mc anonymous set none local/${BUCKET_NAME}
    echo "   🔒 Bucket policy set to private"
else
    echo "   ⚠️  MinIO client (mc) not found"
    echo "   Please create the bucket manually:"
    echo "   1. Open http://${MINIO_ENDPOINT}:9001"
    echo "   2. Login with username: ${MINIO_ACCESS_KEY}"
    echo "   3. Create bucket: ${BUCKET_NAME}"
fi

echo ""
echo "✨ MinIO initialization complete!"
echo ""
echo "📝 Access Information:"
echo "   MinIO Console: http://${MINIO_ENDPOINT}:9001"
echo "   Username: ${MINIO_ACCESS_KEY}"
echo "   Password: ${MINIO_SECRET_KEY}"
echo "   Bucket: ${BUCKET_NAME}"
echo ""
