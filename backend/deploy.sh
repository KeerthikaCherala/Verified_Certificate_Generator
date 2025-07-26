#!/bin/bash

# Deploy script for Certificate Backend to Google Cloud Run
set -e

echo "🚀 Starting deployment process..."

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    exit 1
fi

echo "📋 Checking Google Cloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: No active Google Cloud authentication found"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project)
echo "📦 Current project: $PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# Configure Docker for Google Cloud
echo "🔧 Configuring Docker for Google Cloud..."
gcloud auth configure-docker

# Set image name
IMAGE_NAME="gcr.io/$PROJECT_ID/certificate-backend"
echo "🏷️  Image name: $IMAGE_NAME"

# Build Docker image for linux/amd64 platform
echo "🐳 Building Docker image for linux/amd64..."
docker build --platform linux/amd64 -t $IMAGE_NAME .

# Push Docker image to Google Container Registry
echo "📤 Pushing Docker image to Google Container Registry..."
docker push $IMAGE_NAME

# Deploy to Cloud Run using the pushed image
echo "🚀 Deploying to Google Cloud Run..."
gcloud run deploy certificate-backend \
    --image $IMAGE_NAME \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8000 \
    --set-env-vars MONGO_URL="mongodb+srv://siddharth:0UniLLDTRTFRUlib@cluster0.bbdmlln.mongodb.net/certificate_db?retryWrites=true&w=majority&appName=Cluster0" \
    --set-env-vars DB_NAME="certificate_db" \
    --set-env-vars FRONTEND_URL="https://dnot.tech/" \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 10

# Get the service URL
SERVICE_URL=$(gcloud run services describe certificate-backend --region=us-central1 --format="value(status.url)")

echo "✅ Deployment completed successfully!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📝 Test your deployment with:"
echo "curl $SERVICE_URL/api/"
echo ""
echo "🔗 API endpoints available at:"
echo "  - $SERVICE_URL/api/"
echo "  - $SERVICE_URL/api/certificates"
echo "  - $SERVICE_URL/api/verify/{verification_id}"