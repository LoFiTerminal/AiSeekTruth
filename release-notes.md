# AiSeekTruth v1.0.0 - Truly Decentralized Encrypted Messaging

First stable release of AiSeekTruth - a self-sustaining peer-to-peer encrypted messaging platform.

## 🌟 Key Features

### 🌐 Truly Decentralized Architecture
- **Hybrid Relay Mode**: Every app acts as both client and relay
- **Self-Sustaining Mesh Network**: More users = stronger network
- **Censorship Resistant**: Can't shut down all user relays
- **No Central Servers Required**: External relays are optional bootstrap
- **Survives Relay Failures**: Network continues even if all external servers die

### 🔐 Military-Grade Encryption
- **Signal Protocol Implementation**: Industry-standard cryptography
- **Ed25519 Signing**: 256-bit signature verification
- **X25519 ECDH**: Elliptic curve key exchange
- **XSalsa20-Poly1305**: Authenticated encryption
- **Argon2id**: Password hashing with memory-hard function
- **End-to-End Encryption**: Messages encrypted on your device

### 👥 Group Messaging
- **Pairwise Encryption**: Each member receives individually encrypted copy
- **Role-Based Permissions**: Admin and member roles
- **Member Management**: Add/remove members with proper authorization
- **No Shared Secrets**: Maximum security architecture
- **Discord-Style UI**: Familiar and intuitive interface

### 💾 Privacy & Security
- **Local Storage Only**: SQLite encrypted database
- **No Cloud Sync**: Your data never leaves your device
- **No Metadata Collection**: Zero telemetry or analytics
- **Self-Sovereign Identity**: Cryptographic keypair-based (no email/phone)
- **Password-Protected Keys**: Encrypted at rest

### 🔍 Advanced P2P Features
- **Multicast Discovery**: Finds nearby users on same WiFi/LAN
- **WebRTC Direct Connections**: Peer-to-peer without intermediaries
- **100MB Relay Storage Limit**: Resource-conscious design
- **Relay Statistics Monitoring**: Transparency into network health
- **Local Network Mode**: Chat without internet connection

## 📊 Network Architecture

**Before (Centralized):**
- 100 users → 3 servers → 100 users ❌

**After (Decentralized):**
- 103 relay points (3 external + 100 user apps) ✅
- 97% decentralization with 100 users
- Self-sustaining and censorship-resistant

## 🎨 User Interface

- **Retro ICQ Design**: Classic Windows XP aesthetic
- **Discord-Style Groups**: Modern organization with sections
- **Live Animations**: Real-time message delivery indicators
- **Responsive Design**: Works on all screen sizes
- **Intuitive UX**: Familiar patterns and workflows

## 📦 Platform Support

### macOS (ARM64)
- Universal binary for Apple Silicon (M1/M2/M3)
- macOS 10.15 Catalina or later
- DMG installer and ZIP archive

### Windows (ARM64)
- Full NSIS installer with shortcuts
- Portable executable (no installation)
- Windows 10 or later

### Linux (ARM64)
- Universal AppImage (all distributions)
- Debian/Ubuntu .deb package
- No dependencies required (AppImage)

## 🚀 What's New in v1.0.0

- ✅ Implemented hybrid relay mode for true decentralization
- ✅ Added group chat support with role-based permissions
- ✅ Created professional website with live demo
- ✅ Generated complete icon set for all platforms
- ✅ Built production packages for macOS, Windows, and Linux
- ✅ Comprehensive documentation (5 guides totaling ~2,000 lines)
- ✅ Relay statistics monitoring and peer discovery
- ✅ Multicast local network discovery
- ✅ WebRTC direct peer connections

## 📚 Documentation

- [DECENTRALIZATION.md](DECENTRALIZATION.md) - How hybrid relay mode works
- [VERIFY_DECENTRALIZATION.md](VERIFY_DECENTRALIZATION.md) - Testing guide
- [CURRENT_STATUS.md](CURRENT_STATUS.md) - Complete project status
- [SESSION_SUMMARY.md](SESSION_SUMMARY.md) - Development summary

## 🔧 Technical Stack

- **Framework**: Electron 28 + React 18
- **Networking**: Gun.js mesh network
- **Encryption**: libsodium (NaCl)
- **Database**: SQLite with encryption
- **State Management**: Zustand
- **Build System**: Vite + electron-builder
- **License**: GPL-3.0

## ⚠️ Important Notes

### Development Builds
These are **unsigned development builds**:
- macOS: Will show "unidentified developer" warning (Control+Click to open)
- Windows: SmartScreen may show warning (click "More info" → "Run anyway")
- Linux: AppImage needs execute permission (`chmod +x *.AppImage`)

For production use with automatic updates, code signing is recommended.

### First Run
On first launch, the app will:
1. Generate your cryptographic identity
2. Create encrypted local database
3. Connect to the P2P network
4. Start acting as a relay (helping the network)

Your app will use ~100-200MB RAM and relay up to 100MB of encrypted messages for other users.

## 🛠️ Installation

### macOS
1. Download `AiSeekTruth-1.0.0-arm64.dmg`
2. Open DMG and drag app to Applications
3. Control+Click → Open (first time only)

### Windows
1. Download `AiSeekTruth Setup 1.0.0.exe`
2. Run installer (accept SmartScreen warning)
3. Launch from Start Menu

### Linux (AppImage)
1. Download `AiSeekTruth-1.0.0-arm64.AppImage`
2. Make executable: `chmod +x AiSeekTruth-1.0.0-arm64.AppImage`
3. Run: `./AiSeekTruth-1.0.0-arm64.AppImage`

### Linux (Debian/Ubuntu)
1. Download `aiseektruth_1.0.0_arm64.deb`
2. Install: `sudo dpkg -i aiseektruth_1.0.0_arm64.deb`
3. Launch from applications menu

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

GPL-3.0 - See [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [Coming Soon]
- **Repository**: https://github.com/LoFiTerminal/AiSeekTruth
- **Issues**: https://github.com/LoFiTerminal/AiSeekTruth/issues
- **Discussions**: https://github.com/LoFiTerminal/AiSeekTruth/discussions

## 🙏 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [Gun.js](https://gun.eco/) - Decentralized graph database
- [libsodium](https://libsodium.gitbook.io/) - Modern cryptographic library
- [React](https://react.dev/) - UI framework

Special thanks to the open source community for making this possible.

## 🎯 What Makes This Special

Unlike other "encrypted messengers" that rely on central servers, AiSeekTruth is:

1. **Actually Decentralized**: Every user helps relay messages
2. **Truly Private**: End-to-end encryption with no metadata collection
3. **Censorship Resistant**: Can't be shut down by any single entity
4. **Self-Sovereign**: No phone number, no email, no KYC
5. **Transparent**: Open source with comprehensive documentation

**This is what decentralized communication should look like.**

---

**Full Changelog**: https://github.com/LoFiTerminal/AiSeekTruth/commits/v1.0.0

🎉 **Thank you for supporting truly decentralized communication!**
