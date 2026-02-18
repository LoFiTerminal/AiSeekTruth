#!/bin/bash

# AiSeekTruth GitHub Release Automation Script
# This script will clean up old releases and upload v1.2.0

set -e

REPO="LoFiTerminal/AiSeekTruth"
VERSION="1.2.0"
TAG="v${VERSION}"
RELEASE_DIR="./release"

echo "🚀 AiSeekTruth Release Automation"
echo "=================================="
echo ""
echo "This script will:"
echo "  1. Delete old releases (v1.0.0, v1.0.1)"
echo "  2. Create new release (v1.2.0)"
echo "  3. Upload all build files"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo ""
    echo "Please install it first:"
    echo "  brew install gh"
    echo ""
    echo "Then authenticate:"
    echo "  gh auth login"
    echo ""
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo ""
    echo "Please authenticate first:"
    echo "  gh auth login"
    echo ""
    exit 1
fi

echo "✓ GitHub CLI is installed and authenticated"
echo ""

# Delete old releases
echo "🧹 Cleaning up old releases..."
for old_version in "v1.0.0" "v1.0.1"; do
    if gh release view "$old_version" -R "$REPO" &> /dev/null; then
        echo "  Deleting release $old_version..."
        gh release delete "$old_version" -R "$REPO" --yes --cleanup-tag
        echo "  ✓ Deleted $old_version"
    else
        echo "  ℹ Release $old_version not found (already deleted)"
    fi
done

echo ""
echo "📦 Creating release $TAG..."

# Create release with description
gh release create "$TAG" \
    -R "$REPO" \
    --title "AiSeekTruth v${VERSION}" \
    --notes "$(cat <<'EOF'
# AiSeekTruth v1.2.0

Decentralized encrypted P2P chat application with Signal Protocol encryption.

## 🎉 New Features

- **[AST] Branding**: Added logo to Global Chat header
- **Sound Notifications**: Message sent/received and contact request sounds
- **Profile Image Controls**: Zoom and position adjustment for avatar images
- **Debug Logging**: Enhanced login/authentication debugging

## 🐛 Bug Fixes

- Fixed send button layout (stays next to input field)
- Fixed group profile images display in left panel
- Fixed member profile images in group members panel
- Fixed Leave/Delete Group button visibility
- Fixed group image upload button sizing
- Fixed message input CSS with proper flex constraints

## 🎨 UI Improvements

- Compacted left panel spacing when no DMs exist
- Improved Discord-style layout for group chats
- Better visual feedback for connection status
- Enhanced responsive design

## 📥 Downloads

Choose the appropriate version for your platform:

- **macOS**: `AiSeekTruth-1.2.0-arm64.dmg` or `.zip`
- **Windows**: `AiSeekTruth Setup 1.2.0.exe` (installer) or `AiSeekTruth 1.2.0.exe` (portable)
- **Linux**: `AiSeekTruth-1.2.0-arm64.AppImage` or `aiseektruth_1.2.0_arm64.deb`

## 🔐 Security

All communications are end-to-end encrypted using:
- Ed25519 for signing
- X25519 for encryption
- Argon2id for key derivation
- XSalsa20-Poly1305 for message encryption

## 🌐 P2P Network

Pure peer-to-peer messaging with Gun.js - no central server required!

---

**Built with**: Electron, React, Gun.js, libsodium

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

echo "✓ Release created"
echo ""

# Upload build files
echo "📤 Uploading build files..."

# macOS
if [ -f "${RELEASE_DIR}/AiSeekTruth-${VERSION}-arm64.dmg" ]; then
    echo "  Uploading macOS DMG..."
    gh release upload "$TAG" "${RELEASE_DIR}/AiSeekTruth-${VERSION}-arm64.dmg" -R "$REPO"
fi

if [ -f "${RELEASE_DIR}/AiSeekTruth-${VERSION}-arm64-mac.zip" ]; then
    echo "  Uploading macOS ZIP..."
    gh release upload "$TAG" "${RELEASE_DIR}/AiSeekTruth-${VERSION}-arm64-mac.zip" -R "$REPO"
fi

# Windows
if [ -f "${RELEASE_DIR}/AiSeekTruth Setup ${VERSION}.exe" ]; then
    echo "  Uploading Windows Installer..."
    gh release upload "$TAG" "${RELEASE_DIR}/AiSeekTruth Setup ${VERSION}.exe" -R "$REPO"
fi

if [ -f "${RELEASE_DIR}/AiSeekTruth ${VERSION}.exe" ]; then
    echo "  Uploading Windows Portable..."
    gh release upload "$TAG" "${RELEASE_DIR}/AiSeekTruth ${VERSION}.exe" -R "$REPO"
fi

# Linux
if [ -f "${RELEASE_DIR}/AiSeekTruth-${VERSION}-arm64.AppImage" ]; then
    echo "  Uploading Linux AppImage..."
    gh release upload "$TAG" "${RELEASE_DIR}/AiSeekTruth-${VERSION}-arm64.AppImage" -R "$REPO"
fi

if [ -f "${RELEASE_DIR}/aiseektruth_${VERSION}_arm64.deb" ]; then
    echo "  Uploading Linux DEB..."
    gh release upload "$TAG" "${RELEASE_DIR}/aiseektruth_${VERSION}_arm64.deb" -R "$REPO"
fi

echo ""
echo "✅ All done!"
echo ""
echo "🔗 Release URL:"
echo "   https://github.com/${REPO}/releases/tag/${TAG}"
echo ""
echo "📥 Windows Download Link:"
echo "   https://github.com/${REPO}/releases/download/${TAG}/AiSeekTruth%20Setup%20${VERSION}.exe"
echo ""
