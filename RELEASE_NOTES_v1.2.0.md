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

Your identity is cryptographically unique (Ed25519 public key) with 2^256 possible keys - collision is mathematically impossible.

## 🆘 Troubleshooting

If you have login issues, open Developer Tools (Cmd+Option+I / Ctrl+Shift+I) to see debug logs.

---

**Built with**: Electron, React, Gun.js, libsodium

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
