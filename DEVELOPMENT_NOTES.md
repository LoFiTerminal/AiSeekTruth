# AiSeekTruth - Development Notes

## Project Overview
**AiSeekTruth** is a decentralized P2P encrypted chat application built with:
- **Frontend**: React + Vite + Zustand (state management)
- **Backend**: Electron (main process)
- **Networking**: Gun.js (P2P sync library)
- **Encryption**: libsodium (Ed25519 signatures, X25519 ECDH key exchange, XSalsa20-Poly1305 encryption)
- **Database**: better-sqlite3 (local storage)

**Goal**: Privacy-focused messaging app with no central server - all data syncs P2P through Gun.js relay nodes.

---

## Current Version: 1.3.6 (February 20, 2026)

### Latest Changes
**v1.3.6** - Fixed critical encryption key exchange bug
- **Bug**: When User B accepted User A's contact request, the p2p layer stripped out `acceptorEncryptionPublicKey` before sending response
- **Impact**: User A never received User B's encryption key → couldn't encrypt DMs
- **Fix**: Updated `sendContactRequestResponse()` in `src/main/p2p.js` to include:
  - `acceptorEncryptionPublicKey` - Required for DM encryption
  - `acceptorUsername` - Display name

---

## Architecture

### File Structure
```
AiSeekTruth/
├── src/
│   ├── main/
│   │   ├── main.js           # Electron main process, IPC handlers
│   │   ├── p2p.js            # Gun.js P2P networking layer
│   │   ├── messaging.js      # Message encryption/decryption, contact requests
│   │   ├── crypto.js         # libsodium wrapper (key generation, encryption)
│   │   └── storage.js        # SQLite database operations
│   ├── preload.js            # Electron context bridge (IPC API exposure)
│   ├── App.jsx               # React main component
│   └── components/           # React UI components
├── dist/                     # Vite build output (frontend)
├── dist-electron/            # Compiled Electron files (minified)
├── release/                  # Electron-builder output (installers)
├── build/                    # Build resources (icons, entitlements)
└── package.json
```

### Data Flow

#### Sending a DM (Direct Message)
1. **User A** types message in UI → calls `window.api.sendMessage(recipientKey, text)`
2. **IPC** → main process → `messaging.sendMessage()`
3. **Messaging layer**:
   - Derives shared secret: ECDH(User A's private key, User B's public key)
   - Encrypts message: XSalsa20-Poly1305
   - Creates envelope: `{ id, from, to, ciphertext, nonce, timestamp }`
   - Signs envelope: Ed25519 signature
   - Saves to local SQLite DB
4. **P2P layer** (`p2p.sendMessageEnvelope()`):
   - Stores in Gun.js path: `dm_RECIPIENT_SENDER/messageId`
   - Waits for Gun.js acknowledgment callback
   - Gun.js syncs to relay servers and recipient
5. **User B's client**:
   - Gun.js fires `.on()` callback with new message
   - P2P layer emits event → messaging layer
   - Verifies signature, decrypts, saves to DB
   - Emits event to UI → message appears

#### Contact Request Flow
1. **User A** sends request → `messaging.sendContactRequest(recipientKey)`
2. **P2P** stores in Gun.js: `creq_RECIPIENT/requestId`
3. **User B** subscribes to `creq_${myPublicKey}` on startup
4. Gun.js fires callback → messaging handles → saves to DB → UI shows notification
5. **User B** accepts → `messaging.acceptContactRequest(requestId)`
6. Creates response with `acceptorEncryptionPublicKey` + `acceptorUsername`
7. **P2P** sends response to `cres_REQUESTER/responseId`
8. **User A** receives response → adds contact with encryption key → can now send DMs

---

## Key Technical Details

### Gun.js Storage (CRITICAL)
- **Gun.js REQUIRES local file storage** - cannot work in pure relay-only mode
- **v1.3.5 fix**: Use Electron's `app.getPath('userData')/gundb/radata` directory
  - Always writable, even when app runs from DMG
  - Config: `radisk: true, file: gunFilePath`
- Previous attempts to disable storage (`file: false`, `radisk: false`) all failed with ENOENT errors

### Gun.js Path Structure
All paths use **2-level structure** (relay servers can sync this):
- DMs: `dm_RECIPIENT_SENDER/messageId`
- Contact requests: `creq_RECIPIENT/requestId`
- Responses: `cres_REQUESTER/responseId`
- Global chat: `aiseektruth_global_chat/messageId`
- Presence: `presence/publicKey`

3+ level structures don't sync reliably through relays.

### Encryption Key Exchange
**Problem solved in v1.3.1 + v1.3.6**:
- When User A sends contact request, includes `fromEncryptionPublicKey` (A's key)
- When User B accepts, **must include** `acceptorEncryptionPublicKey` (B's key) in response
- **Bug in v1.3.5**: p2p layer stripped this field out → fixed in v1.3.6
- Both users need each other's encryption public keys to derive shared secret via ECDH

### Identity Structure
```javascript
{
  username: "alice",
  publicKey: "base64(Ed25519 public key)",    // For signatures
  privateKey: "base64(Ed25519 private key)",  // For signing (encrypted at rest)
  encryptionPublicKey: "base64(X25519 pk)",   // For ECDH key exchange
  encryptionPrivateKey: "base64(X25519 sk)",  // For ECDH (encrypted at rest)
  createdAt: timestamp
}
```

Ed25519 keys are converted to X25519 for encryption using libsodium's `crypto_sign_ed25519_pk_to_curve25519()`.

### Storage Encryption
- User's private keys stored encrypted in SQLite
- Password → Argon2id → 32-byte key
- XSalsa20-Poly1305 authenticated encryption
- Salt + nonce stored with ciphertext

---

## Version History

### v1.3.6 (Current) - Feb 20, 2026
- **Fix**: Contact request response now includes `acceptorEncryptionPublicKey` and `acceptorUsername`
- **Impact**: DMs now work after contact request acceptance

### v1.3.5 - Feb 2026
- **Fix**: Gun.js storage uses writable userData directory
- Prevents EROFS/ENOENT errors when running from DMG
- Config: `radisk: true, file: app.getPath('userData')/gundb/radata`

### v1.3.4 - Feb 2026
- Attempted `file: false` - still got ENOENT errors (Gun.js requires storage)

### v1.3.3 - Feb 2026
- Removed file option - got EROFS "read-only file system" error

### v1.3.2 - Feb 2026
- Changed `sendContactRequest()` to wait for Gun.js callback
- Added 5-second timeout
- Still had ENOENT errors (contradictory Gun config)

### v1.3.1 - Feb 2026
- **Fix**: Encryption key exchange - acceptor sends their encryption public key
- **Fix**: Requester uses acceptor's key (not their own) when adding contact

### v1.3.0 - Feb 2026
- Previous state before debugging began
- DMs/contact requests not working
- Global chat was working

---

## Known Working Features (v1.3.6)

✅ **Global Chat**
- Public channel everyone can read/write
- Real-time sync via Gun.js
- Messages stored locally in SQLite

✅ **Identity Management**
- Create new identity with password
- Load existing identity (decrypt from storage)
- Password-protected private keys

✅ **Contact Requests**
- Send request with optional message
- Receive requests (checks pending on startup)
- Accept/decline with responses

✅ **Direct Messages (DMs)**
- End-to-end encrypted (only sender/recipient can read)
- Signature verification
- Delivery confirmation
- Message history stored locally

✅ **Group Chat**
- Create groups, add/remove members
- Messages encrypted individually for each member
- Stored locally with group context

✅ **Presence/Status**
- Online/away/busy/offline status
- Heartbeat every 30 seconds
- Contact last seen timestamps

---

## Testing Notes

### How to Test Contact Requests + DMs
1. Run two instances of the app (different identities)
2. User A: Get User B's public key (from global chat or direct share)
3. User A: Send contact request to User B's public key
4. Check DevTools logs:
   - Should see: `✅ Contact request Gun.js sync CONFIRMED`
5. User B: Refresh or check notifications → should see incoming request
6. User B: Accept request
   - Should see: `✅ Contact request acceptance delivered`
7. User A: Should see acceptance notification
   - Should see: `✅ Contact added after acceptance`
   - Contact should have `encryptionPublicKey` field
8. Both users: Try sending DMs to each other
   - Should encrypt/decrypt successfully
   - Messages should appear in chat

### Common Issues Fixed
- **ENOENT errors**: Gun.js needs writable storage directory
- **EROFS errors**: Can't write to app directory when running from DMG
- **Timeout on contact requests**: Gun.js callback never fired → fixed by waiting for ack
- **Can't send DMs after acceptance**: Missing encryption public key → fixed in v1.3.6

---

## Build Commands

```bash
# Development mode (hot reload)
npm run dev

# Build for all platforms
npm run build        # Current platform
npm run build:mac    # macOS (DMG + ZIP)
npm run build:win    # Windows (NSIS installer + portable exe)
npm run build:linux  # Linux (AppImage + deb)

# Generate icons from SVG
npm run icons
```

### Build Outputs
- **macOS**: `release/AiSeekTruth-{version}-arm64.dmg` and `.zip`
- **Windows**: `release/AiSeekTruth Setup {version}.exe` (installer) + `AiSeekTruth {version}.exe` (portable)
- **Linux**: `release/AiSeekTruth-{version}.AppImage` and `.deb`

---

## Relay Server

**Railway Deployment**: https://aiseektruth-relay-production.up.railway.app/gun
- Runs Gun.js relay server (Node.js + Express + Gun)
- Helps bootstrap peer discovery
- Stores and forwards messages when peers offline
- App pings every 5 seconds to check connectivity

**Local Fallback**: http://localhost:8765/gun (development)

---

## Database Schema (SQLite)

### Main Tables
- `identities` - Encrypted user identities
- `contacts` - Contact list with encryption public keys
- `messages` - DM history (encrypted content decrypted for storage)
- `group_messages` - Group chat history
- `groups` - Group metadata
- `group_members` - Group membership
- `contact_requests` - Pending/accepted/declined requests
- `karma_scores` - Reputation system
- `global_messages` - Global chat history

---

## Next Steps / TODO

### Known Issues to Fix
- [ ] Better error handling for offline scenarios
- [ ] Retry logic for failed message sends
- [ ] Message read receipts
- [ ] Typing indicators
- [ ] File/image sharing
- [ ] Voice/video calls (WebRTC)

### Improvements
- [ ] Better UI/UX for contact request notifications
- [ ] Search/filter in message history
- [ ] Export chat history
- [ ] Backup/restore identity
- [ ] Multi-device sync (same identity on multiple devices)
- [ ] Desktop notifications for new messages

### Security Enhancements
- [ ] Forward secrecy (rotate encryption keys)
- [ ] Message deletion/expiry
- [ ] Screenshot protection
- [ ] Audit log for sensitive operations

---

## Debugging Tips

### Enable DevTools Logs
1. Open app
2. Press `Cmd+Opt+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
3. Look for logs with `[MAIN]` prefix (from main process)

### Key Log Messages
- `✅ Contact request Gun.js sync CONFIRMED` - Request sent successfully
- `📥 Found pending contact request` - Received request on startup
- `📬 New contact request received` - Real-time request received
- `✅ Contact added after acceptance` - Contact added with encryption key
- `✅ DM confirmed` - Message sent successfully
- `📬 New DM received` - Received encrypted message

### Gun.js Debugging
- Check `this.connectedPeers.size` - should be > 0
- Check Gun.js callback logs for `ack.err` errors
- Verify 2-level path structure (3+ levels don't sync well)

---

## Important Code Locations

### Contact Request Bug Fixed in v1.3.6
**File**: `src/main/p2p.js`
**Method**: `sendContactRequestResponse()` (line ~552)
**Fix**: Include `acceptorEncryptionPublicKey` and `acceptorUsername` in response envelope

### Gun.js Storage Fix (v1.3.5)
**File**: `src/main/p2p.js`
**Method**: `initialize()` (line ~39)
**Fix**: Use `app.getPath('userData')/gundb/radata` for storage

### Encryption Key Derivation
**File**: `src/main/messaging.js`
**Method**: `getSharedSecret()` (line ~41)
**Logic**: ECDH(my private key, their public key) → shared secret for AES

### Message Encryption
**File**: `src/main/crypto.js`
**Method**: `encryptMessage()` / `decryptMessage()`
**Algorithm**: XSalsa20-Poly1305 with random nonce

---

## Git Repository
- **URL**: https://github.com/LoFiTerminal/AiSeekTruth
- **Access**: Use your GitHub personal access token for pushing changes

### Pushing Updates
```bash
git add .
git commit -m "v1.3.6: Fix contact request encryption key exchange"
git tag v1.3.6
git push origin main --tags
```

---

## Contact
- **Author**: LofiTerminal
- **Email**: contact@lofiterminal.com
- **License**: GPL-3.0

---

*Last updated: February 20, 2026*
*Current stable version: 1.3.6*
