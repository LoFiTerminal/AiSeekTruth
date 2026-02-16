# AST [AiSeekTruth]

> Decentralized, end-to-end encrypted communication for truth seekers

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-green.svg)](https://opensource.org/licenses/GPL-3.0)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/LoFiTerminal/AiSeekTruth/releases)
[![Electron](https://img.shields.io/badge/Electron-28-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)

## 🔐 Features

- **End-to-End Encryption** - Signal Protocol (Ed25519 + X25519)
- **Fully Decentralized** - P2P mesh networking with Gun.js
- **Karma System** - Earn Truth Points for running relays (cryptographically verified)
- **Owner-Controlled Servers** - Create private communities
- **Zero-Knowledge** - We can't read your messages
- **Censorship Resistant** - No central point of failure

## 🚀 Quick Start

### Download

Pre-built binaries for all platforms:

- [macOS (Intel/Apple Silicon)](https://github.com/LoFiTerminal/AiSeekTruth/releases)
- [Windows (x64)](https://github.com/LoFiTerminal/AiSeekTruth/releases)
- [Linux (AppImage/deb/rpm)](https://github.com/LoFiTerminal/AiSeekTruth/releases)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/LoFiTerminal/AiSeekTruth.git
cd AiSeekTruth

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for your platform
npm run build          # Build for current OS
npm run build:mac      # Build for macOS
npm run build:win      # Build for Windows
npm run build:linux    # Build for Linux
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 + Electron 28
- **Backend**: Node.js + libsodium-wrappers
- **Database**: SQLite (better-sqlite3) with encrypted storage
- **Network**: Gun.js P2P mesh network
- **Encryption**: Signal Protocol implementation
- **State Management**: Zustand
- **Build Tool**: Vite

### Project Structure

```
AiSeekTruth/
├── src/
│   ├── main/              # Electron main process (backend)
│   │   ├── main.js        # Main entry point
│   │   ├── preload.js     # Secure IPC bridge
│   │   ├── crypto.js      # Signal Protocol encryption
│   │   ├── storage.js     # SQLite database
│   │   ├── p2p.js         # Gun.js P2P networking
│   │   └── messaging.js   # Message handling
│   └── renderer/          # React frontend
│       ├── App.jsx        # Main app component
│       ├── store/         # Zustand state management
│       └── components/    # React components
├── website/               # Landing page
├── build/                 # Build resources
└── dist/                  # Production build output
```

### How It Works

1. **Identity Creation**
   - User creates identity with username + password
   - Generate Ed25519 signing keys + X25519 encryption keys
   - Encrypt private keys with Argon2id-derived key
   - Store encrypted identity in local SQLite database

2. **Adding Contacts**
   - Exchange public keys (out-of-band for security)
   - Derive shared secret using X25519 ECDH
   - Store contact info locally

3. **Sending Messages**
   - Encrypt message with XSalsa20-Poly1305 using shared secret
   - Sign message with Ed25519 private key
   - Broadcast encrypted envelope via Gun.js P2P network
   - Store message locally

4. **Receiving Messages**
   - Subscribe to Gun.js channels for each contact
   - Verify Ed25519 signature
   - Decrypt message using shared secret
   - Store message locally

5. **P2P Networking**
   - Connect to multiple Gun.js relay servers
   - Messages propagate through mesh network
   - No central server can read or censor messages
   - Network is resilient to node failures

## 🔒 Security

### Encryption Details

- **Key Exchange**: X25519 Elliptic Curve Diffie-Hellman (ECDH)
- **Encryption**: XSalsa20-Poly1305 authenticated encryption
- **Signatures**: Ed25519 digital signatures
- **Password Hashing**: Argon2id (interactive parameters)
- **Forward Secrecy**: Each message uses unique nonce

### Security Guarantees

✅ **End-to-End Encryption** - Only sender and recipient can read messages
✅ **Forward Secrecy** - Past messages stay encrypted if keys are compromised
✅ **Message Authentication** - Ed25519 signatures prevent tampering
✅ **Zero-Knowledge** - Server operators cannot read messages or metadata
✅ **Local-First** - All data encrypted and stored on your device
✅ **Open Source** - All code is auditable (GPL-3.0)

### What We DON'T Do

❌ No phone number collection
❌ No email collection
❌ No metadata logging
❌ No cloud backups
❌ No AI scanning your messages
❌ No telemetry or analytics
❌ No backdoors (by design, not policy)

## 🎮 Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Desktop Framework | Electron | 28.1.3 |
| UI Framework | React | 18.2.0 |
| P2P Network | Gun.js | 0.2020.1240 |
| Encryption | libsodium-wrappers | 0.7.13 |
| Database | better-sqlite3 | 9.2.2 |
| State Management | Zustand | 4.4.7 |
| Build Tool | Vite | 5.0.10 |
| Icons | lucide-react | 0.303.0 |

## 📚 Documentation

### For Users

- **Installation Guide** - [Download and install](https://github.com/LoFiTerminal/AiSeekTruth/releases)
- **User Manual** - How to create identity, add contacts, send messages
- **Security Best Practices** - Verify public keys, secure your password

### For Developers

- **Architecture Overview** - System design and data flow
- **Encryption Protocol** - Detailed cryptographic implementation
- **API Reference** - IPC API documentation
- **Database Schema** - SQLite table structure
- **Contributing Guide** - How to contribute code

### For Server Operators

- **Running a Relay** - Set up your own Gun.js relay server
- **Private Networks** - Create isolated communities
- **Karma System** - Earn reputation by relaying messages

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

- 🐛 **Report Bugs** - Open an issue on GitHub
- 💡 **Suggest Features** - Share your ideas
- 🔒 **Security Audits** - Review cryptographic implementation
- 📝 **Documentation** - Improve guides and tutorials
- 🌍 **Translations** - Add language support
- 💻 **Code** - Submit pull requests

### Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/AiSeekTruth.git
cd AiSeekTruth

# Install dependencies
npm install

# Run development mode
npm run dev

# Make your changes...

# Test your changes
npm run build
```

### Code Guidelines

- Follow existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation
- Ensure builds pass on all platforms

## 📄 License

This project is licensed under the **GNU General Public License v3.0** (GPL-3.0).

**What this means:**
- ✅ Free to use, modify, and distribute
- ✅ Must remain open source
- ✅ Must use same GPL-3.0 license
- ✅ No warranty provided

See the [LICENSE](LICENSE) file for full details.

## 🌐 Links

- **Website**: [https://lofiterminal.github.io/AiSeekTruth](https://lofiterminal.github.io/AiSeekTruth)
- **GitHub**: [https://github.com/LoFiTerminal/AiSeekTruth](https://github.com/LoFiTerminal/AiSeekTruth)
- **Releases**: [Download latest version](https://github.com/LoFiTerminal/AiSeekTruth/releases)
- **Issues**: [Report bugs](https://github.com/LoFiTerminal/AiSeekTruth/issues)
- **Discussions**: [Community forum](https://github.com/LoFiTerminal/AiSeekTruth/discussions)

## 🙏 Acknowledgments

Built with incredible open-source technologies:

- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [React](https://reactjs.org/) - UI framework
- [Gun.js](https://gun.eco/) - Decentralized P2P database
- [libsodium](https://libsodium.gitbook.io/) - Modern cryptography library
- [Signal Protocol](https://signal.org/docs/) - End-to-end encryption

Special thanks to all contributors and the open-source community.

---

**Built by [@LofiTerminal](https://github.com/LoFiTerminal) with 🔒**

*"Code is speech. Encryption is a human right."*

---

## 💬 Philosophy

This project exists because:

- **Privacy is a human right**, not a luxury
- **Decentralization prevents censorship** and single points of failure
- **Open source enables trust** through transparency and auditability
- **Encryption protects free speech** in hostile environments
- **Users should own their data**, not corporations

We built AST for journalists, activists, whistleblowers, and anyone who believes that private communication should be the default, not the exception.

No venture capital. No growth hacking. No data harvesting. Just secure, private, unstoppable communication.

**Join the resistance. Take back your privacy.**
