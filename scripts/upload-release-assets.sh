#!/bin/bash

# Upload build artifacts to GitHub release
# Usage: ./upload-release-assets.sh <github-token>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <github-token>"
  exit 1
fi

TOKEN="$1"
RELEASE_ID="287009526"
REPO="LoFiTerminal/AiSeekTruth"
UPLOAD_URL="https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets"

echo "🚀 Uploading build artifacts to GitHub release..."
echo ""

cd release

# Function to upload a file
upload_file() {
  local file="$1"
  local name="$2"

  if [ ! -f "$file" ]; then
    echo "⚠️  File not found: $file"
    return 1
  fi

  echo "📦 Uploading $name..."

  curl -X POST \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/octet-stream" \
    --data-binary @"$file" \
    "$UPLOAD_URL?name=$name" \
    -o /dev/null -w "   Status: %{http_code}\n" -s

  if [ $? -eq 0 ]; then
    echo "   ✅ Success"
  else
    echo "   ❌ Failed"
  fi
  echo ""
}

# Upload macOS builds
echo "🍎 macOS Builds:"
upload_file "AiSeekTruth-1.0.0-arm64.dmg" "AiSeekTruth-1.0.0-arm64.dmg"
upload_file "AiSeekTruth-1.0.0-arm64-mac.zip" "AiSeekTruth-1.0.0-arm64-mac.zip"

# Upload Windows builds
echo "🪟 Windows Builds:"
upload_file "AiSeekTruth Setup 1.0.0.exe" "AiSeekTruth-Setup-1.0.0.exe"
upload_file "AiSeekTruth 1.0.0.exe" "AiSeekTruth-Portable-1.0.0.exe"

# Upload Linux builds
echo "🐧 Linux Builds:"
upload_file "AiSeekTruth-1.0.0-arm64.AppImage" "AiSeekTruth-1.0.0-arm64.AppImage"
upload_file "aiseektruth_1.0.0_arm64.deb" "aiseektruth_1.0.0_arm64.deb"

echo "✅ Upload complete!"
echo ""
echo "Release URL: https://github.com/$REPO/releases/tag/v1.0.0"
