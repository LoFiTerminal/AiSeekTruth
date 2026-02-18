# How AiSeekTruth Works

## 🔐 Identity & Storage

### Creating Your Identity

When you create an account:

1. **Key Generation**
   - Ed25519 signing keypair is generated (for message authentication)
   - X25519 encryption keypair is derived from Ed25519 (for E2E encryption)
   - All generated locally on your device using `libsodium`

2. **Password Encryption**
   - Your password is NEVER stored
   - Password derives a key using **Argon2id** (memory-hard, resistant to GPU attacks)
   - Private keys are encrypted with **XSalsa20-Poly1305**
   - Only encrypted data is saved to disk

3. **Local Storage Location**
   ```
   macOS:     ~/Library/Application Support/AiSeekTruth/aiseektruth.db
   Windows:   %APPDATA%/AiSeekTruth/aiseektruth.db
   Linux:     ~/.config/AiSeekTruth/aiseektruth.db
   ```

4. **Database Schema**
   - SQLite database with encrypted identity
   - Public keys stored in plain (safe to share)
   - Private keys encrypted with your password
   - Message history stored locally

### Login Detection

On app startup:

```javascript
// Check if identity exists
const exists = await window.api.identityExists();
// Returns: true if encrypted identity found in database
//          false if no identity (first-time user)
```

**How it works:**
1. App checks SQLite database for identity record
2. If found → Shows login screen (needs password to decrypt)
3. If not found → Shows registration screen

**Password Verification:**
- When you enter password, app attempts to decrypt stored identity
- If decryption succeeds → Login successful
- If decryption fails → Wrong password (can't access keys)

---

## 🌐 Network & Relay System

### Fully Functional P2P Network

**YES, the DMG app is fully functional with network relay!**

### How the Relay Network Works

#### Hybrid Mode (Default)
Every AiSeekTruth instance acts as **BOTH**:
- **Client** - Send/receive your messages
- **Relay** - Store & forward messages for others

```javascript
// Your app configuration
{
  actAsRelay: true,           // Help strengthen network
  enableMulticast: true,      // Discover local peers
  maxRelayStorage: 100MB,     // Limit relay data
  localStorage: true,         // Store messages for offline users
  radisk: true                // Persist relay data to disk
}
```

### Network Architecture

```
┌─────────────┐
│   You       │ ◄──┐
│ (Client +   │    │
│  Relay)     │    │
└─────────────┘    │
        │          │
        ├──────────┼─────── Public Gun.js Relays
        │          │        (gun-manhattan.herokuapp.com)
        ▼          │        (gunjs.herokuapp.com)
┌─────────────┐    │        (e2eec.herokuapp.com)
│  Friend     │    │
│ (Client +   │ ───┘
│  Relay)     │
└─────────────┘
```

### Connection Process

1. **Startup**
   ```
   [Your App] → Connects to 3 public Gun relays
              → Enables multicast for local peer discovery
              → Starts acting as relay for others
   ```

2. **Sending a Message**
   ```
   Encrypt message with shared secret
   → Sign with Ed25519 private key
   → Publish to Gun.js network at recipient's public key
   → Message stored on multiple relays (including yours)
   → Recipient receives when online (or later if offline)
   ```

3. **Receiving a Message**
   ```
   Subscribe to your public key path in Gun.js
   → Gun relays notify you of new data
   → Verify signature with sender's public key
   → Decrypt with shared secret
   → Display message
   ```

### Offline Message Queue

**Built-in Offline Support:**
- Messages are stored on Gun relays when recipient is offline
- When recipient comes online, they sync all pending messages
- No message loss even if sender goes offline after sending

### Local Peer Discovery

**Multicast on LAN:**
```javascript
multicast: {
  address: '233.255.255.255',  // Multicast group
  port: 8765                    // Discovery port
}
```

**Benefits:**
- Discover AiSeekTruth users on same WiFi/LAN
- Direct P2P connection (no internet needed)
- Faster message delivery
- Works offline on local network

---

## 🔒 Encryption Details

### Message Flow

```
┌─────────────────────────────────────────────────┐
│ SENDER                                          │
├─────────────────────────────────────────────────┤
│ 1. Generate shared secret (ECDH)               │
│    Your privKey + Their pubKey → Secret        │
│                                                  │
│ 2. Encrypt message (XSalsa20-Poly1305)         │
│    Message + Secret → Ciphertext + Nonce       │
│                                                  │
│ 3. Sign envelope (Ed25519)                     │
│    Envelope + Your privKey → Signature         │
│                                                  │
│ 4. Publish to Gun.js                           │
│    Path: messages/[recipient]/[sender]/[msgID] │
└─────────────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Gun.js Relay Network │
         │   (Encrypted Data)     │
         └───────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ RECIPIENT                                       │
├─────────────────────────────────────────────────┤
│ 1. Receive from Gun.js                         │
│    Listen: messages/[your pubKey]/[sender]     │
│                                                  │
│ 2. Verify signature (Ed25519)                  │
│    Envelope + Signature + Sender's pubKey      │
│                                                  │
│ 3. Generate shared secret (ECDH)               │
│    Your privKey + Their pubKey → Secret        │
│                                                  │
│ 4. Decrypt message (XSalsa20-Poly1305)         │
│    Ciphertext + Nonce + Secret → Message       │
└─────────────────────────────────────────────────┘
```

### Security Properties

- **End-to-End Encrypted** - Only sender & recipient can read
- **Forward Secrecy** - Each message has unique nonce
- **Authenticated** - Ed25519 signatures prevent impersonation
- **Tamper-Proof** - Poly1305 MAC detects modifications
- **Zero-Knowledge Relays** - Relays never see plaintext

---

## 📂 Data Storage Locations

### User Data Directory
```
macOS:     ~/Library/Application Support/AiSeekTruth/
Windows:   %APPDATA%/AiSeekTruth/
Linux:     ~/.config/AiSeekTruth/
```

### Files Created

1. **aiseektruth.db** (SQLite Database)
   - Encrypted identity (private keys)
   - Contacts list
   - Message history
   - Group information
   - Karma records

2. **gundb/radata/** (Gun.js Relay Storage)
   - Relay data (encrypted messages for others)
   - Max 100MB by default
   - Helps network even when your app is closed

### What Gets Stored Where

| Data Type | Location | Encrypted? |
|-----------|----------|------------|
| Private Keys | SQLite | ✅ Yes (password) |
| Public Keys | SQLite | ❌ No (meant to be public) |
| Message History | SQLite | ❌ No (already decrypted for display) |
| Contacts | SQLite | ❌ No |
| Away Messages | localStorage | ❌ No |
| Avatar Color | localStorage | ❌ No |
| Sound Settings | localStorage | ❌ No |
| Relay Data | gundb/radata | ✅ Yes (E2E encrypted for recipients) |

---

## 🚀 Network Status

### Check Connection Status

Open app → You'll see in console:
```
=== P2P Network Configuration ===
Mode: Hybrid (Client + Relay)
Act as relay: true
Multicast enabled: true
Connected to 3 relay servers
Max relay storage: 100 MB
Gun.js storage path: /Users/.../gundb/radata
✅ P2P network initialized (HYBRID MODE)
🌐 Your app is now helping strengthen the network!
```

### Connection Indicators

**In App:**
- Green dot on your avatar = Connected & online
- Contact status dots = Real-time presence from Gun.js

**In Console:**
```
Connected to peer: https://gun-manhattan.herokuapp.com/gun
Connected to peer: https://gunjs.herokuapp.com/gun
Services initialized
```

---

## 🔧 Troubleshooting

### "Cannot create identity" Error
- **Fixed in latest build** - Gun.js now uses proper userData directory
- Old issue: Tried to write to read-only app directory
- New: Writes to `~/Library/Application Support/AiSeekTruth/gundb/`

### "No relay connection"
- Check internet connection
- Gun.js relays might be down (try again later)
- Local peer discovery works without internet if you have AiSeekTruth users on LAN

### "Messages not sending"
- Verify recipient's public key is correct
- Check connection status (console logs)
- Messages queue automatically if recipient offline

---

## 📊 Privacy Summary

**What We Know:**
- ❌ Nothing. Zero. Nada.
- ❌ No servers to store data
- ❌ No accounts to track
- ❌ No telemetry or analytics

**What Relays Know:**
- ✅ Encrypted data blobs
- ✅ Public keys (timestamps on Gun paths)
- ❌ Message contents (encrypted)
- ❌ Who's talking to who (no metadata)
- ❌ Your password or private keys

**What's On Your Device:**
- ✅ Encrypted identity (safe even if device stolen)
- ✅ Message history (for your convenience)
- ✅ Contact list (local only)

---

## 🎯 Key Takeaways

1. **Encrypted Storage**: Identity stored encrypted with your password on your device
2. **Fully Functional**: DMG includes complete P2P relay network
3. **Hybrid Mode**: Your app helps others while helping yourself
4. **Offline Support**: Messages queue on relays until recipient online
5. **Zero Trust**: Even relays can't read your messages
6. **Local-First**: Everything works even if internet goes down (LAN mode)

---

**Questions?**
- Check console logs in dev mode (Cmd+Option+I)
- Database location: `~/Library/Application Support/AiSeekTruth/`
- Network logs show all relay connections in real-time
