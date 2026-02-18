#!/bin/bash

# Railway Quick Deploy Script
# Run this from bootstrap-relay/ directory

echo "🚀 Deploying AiSeekTruth Bootstrap Relay to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login with token
export RAILWAY_TOKEN="f446816c-57ae-419d-8b31-32a71b3b5d83"

# Initialize project
echo "📝 Initializing Railway project..."
railway init

# Deploy
echo "🚀 Deploying..."
railway up

# Get the URL
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📡 Your relay URL will be shown above"
echo "🔗 Format: https://yourproject.railway.app/gun"
echo ""
echo "Copy the URL and add it to src/main/p2p.js"
