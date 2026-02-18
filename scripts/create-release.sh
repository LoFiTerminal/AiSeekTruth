#!/bin/bash

# Create GitHub Release for AiSeekTruth v1.0.0
# This script requires GitHub CLI (gh) to be installed and authenticated

VERSION="1.0.0"
REPO="LoFiTerminal/AiSeekTruth"
RELEASE_DIR="release"

echo "🚀 Creating GitHub Release v${VERSION}..."

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Install it first:"
    echo "   brew install gh"
    echo "   Then authenticate: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated. Run: gh auth login"
    exit 1
fi

# Create release
echo "Creating release..."
gh release create "v${VERSION}" \
    --repo "${REPO}" \
    --title "AiSeekTruth v${VERSION}" \
    --notes "## AiSeekTruth v1.0.0

🎉 Initial release of AiSeekTruth - Open Source P2P Encrypted Messaging

### ✨ Features
- 🔒 Signal Protocol end-to-end encryption
- 🌐 Fully decentralized P2P mesh network (Gun.js)
- 🎨 Retro terminal UI with modern UX polish
- 💬 Group chats with ICQ-style features
- 🔊 Sound notifications and desktop alerts
- 📖 100% open source (GPL-3.0)

### 📦 Downloads
- **macOS**: Apple Silicon (M1/M2/M3/M4)
- **Windows**: Intel/AMD x64 + ARM64
- **Linux**: ARM64 (AppImage + DEB)

### 🔧 Tech Stack
- Electron 28, React 18, Gun.js P2P Mesh
- Signal Protocol, Ed25519, X25519, XSalsa20-Poly1305
- SQLite local storage

### 📖 Documentation
- [How It Works](https://github.com/LoFiTerminal/AiSeekTruth/blob/main/HOW_IT_WORKS.md)
- [UX/UI Guide](https://github.com/LoFiTerminal/AiSeekTruth/blob/main/UX_UI_IMPROVEMENTS.md)

---
Every app = Client + Relay • No central servers • No surveillance"

echo "📦 Uploading release files..."

# Upload macOS files
echo "  → macOS builds..."
gh release upload "v${VERSION}" \
    "${RELEASE_DIR}/AiSeekTruth-1.0.0-arm64.dmg" \
    "${RELEASE_DIR}/AiSeekTruth-1.0.0-arm64-mac.zip" \
    --repo "${REPO}"

# Upload Windows x64 files
echo "  → Windows x64 builds..."
gh release upload "v${VERSION}" \
    "${RELEASE_DIR}/AiSeekTruth-Setup-1.0.0-x64.exe" \
    "${RELEASE_DIR}/AiSeekTruth-1.0.0-x64-portable.exe" \
    --repo "${REPO}"

# Upload Windows ARM64 files
echo "  → Windows ARM64 builds..."
gh release upload "v${VERSION}" \
    "${RELEASE_DIR}/AiSeekTruth-Setup-1.0.0-arm64.exe" \
    "${RELEASE_DIR}/AiSeekTruth-1.0.0-arm64-portable.exe" \
    --repo "${REPO}"

# Upload Linux files
echo "  → Linux builds..."
gh release upload "v${VERSION}" \
    "${RELEASE_DIR}/AiSeekTruth-1.0.0-arm64.AppImage" \
    "${RELEASE_DIR}/aiseektruth_1.0.0_arm64.deb" \
    --repo "${REPO}"

echo "✅ Release created successfully!"
echo "🔗 View at: https://github.com/${REPO}/releases/tag/v${VERSION}"
