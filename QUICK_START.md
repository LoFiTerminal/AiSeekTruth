# Quick Start Guide

## For Developers

### First Time Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/LoFiTerminal/AiSeekTruth.git
   cd AiSeekTruth
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

   If permission errors:
   ```bash
   npm install --cache /tmp/npm-cache-temp
   ```

3. **Run in development mode**:
   ```bash
   npm run dev
   ```

   This will:
   - Start Vite dev server on http://localhost:5173
   - Wait for Vite to be ready
   - Launch Electron app with hot reload

4. **Open DevTools**: Press `Cmd+Opt+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)

---

## Project Structure (Quick Overview)

```
src/
├── main/
│   ├── main.js         → Electron entry point, IPC handlers
│   ├── p2p.js          → Gun.js networking (FIXED in v1.3.6)
│   ├── messaging.js    → Encryption, contact requests
│   ├── crypto.js       → libsodium wrapper
│   └── storage.js      → SQLite database
├── preload.js          → IPC API exposure to renderer
├── App.jsx             → React root component
└── components/         → React UI components
```

---

## Key Concepts

### 1. Architecture: Electron + React + Gun.js

```
┌─────────────────────────────────────────┐
│         React UI (Renderer Process)     │
│   ┌─────────────────────────────────┐   │
│   │  App.jsx, Components, Zustand   │   │
│   └──────────────┬──────────────────┘   │
│                  │ window.api.* (IPC)   │
└──────────────────┼──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│      Electron Main Process              │
│   ┌─────────────────────────────────┐   │
│   │  main.js (IPC handlers)         │   │
│   │  ├── messaging.js               │   │
│   │  │   └── crypto.js              │   │
│   │  ├── p2p.js (Gun.js)            │   │
│   │  └── storage.js (SQLite)        │   │
│   └─────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
  ┌─────────┐           ┌──────────┐
  │ Gun.js  │◄─────────►│ SQLite   │
  │ Network │   Sync    │ Database │
  └─────────┘           └──────────┘
```

### 2. Message Flow

**Sending a DM**:
```javascript
// 1. UI calls IPC
window.api.sendMessage(recipientKey, "Hello!")

// 2. Main process (messaging.js)
→ Derive shared secret: ECDH(myPrivateKey, theirPublicKey)
→ Encrypt: XSalsa20-Poly1305(plaintext, sharedSecret)
→ Sign: Ed25519(envelope, myPrivateKey)
→ Save to SQLite

// 3. P2P layer (p2p.js)
→ gun.get(`dm_${recipientKey}_${myKey}`).get(msgId).put(envelope)
→ Wait for Gun.js callback
→ Gun.js syncs to relay and recipient

// 4. Recipient receives
→ Gun.js fires .on() callback
→ Verify signature
→ Decrypt with shared secret
→ Save to SQLite
→ Emit event to UI
```

### 3. Contact Request Flow

```javascript
// User A sends request
window.api.sendContactRequest(userB_publicKey, "Hi!")

// Stored in Gun.js at:
creq_${userB_publicKey}/${requestId}

// User B receives (subscribed to creq_${myPublicKey})
→ Gun.js callback fires
→ Save to database
→ Notify UI

// User B accepts
window.api.acceptContactRequest(requestId)

// Response stored at:
cres_${userA_publicKey}/${responseId}

// CRITICAL (v1.3.6 fix):
// Response includes acceptorEncryptionPublicKey
// So User A can encrypt DMs to User B

// User A receives response
→ Adds contact with encryption key
→ Can now send encrypted DMs
```

---

## Common Development Tasks

### Add a New IPC Handler

1. **Define in preload.js**:
   ```javascript
   contextBridge.exposeInMainWorld('api', {
     myNewFunction: (arg1, arg2) => ipcRenderer.invoke('my:new:function', arg1, arg2),
   });
   ```

2. **Handle in main.js**:
   ```javascript
   ipcMain.handle('my:new:function', async (event, arg1, arg2) => {
     // Your logic here
     return result;
   });
   ```

3. **Call from UI**:
   ```javascript
   const result = await window.api.myNewFunction(arg1, arg2);
   ```

### Add a New Gun.js Path

1. **Sender** (in p2p.js):
   ```javascript
   sendMyData(data) {
     const dataId = `mydata_${Date.now()}`;
     this.gun
       .get('myapp_mydata')  // Level 1
       .get(dataId)          // Level 2
       .put(data, (ack) => {
         if (ack.err) console.error('Failed:', ack.err);
         else console.log('Synced!');
       });
   }
   ```

2. **Receiver** (in p2p.js):
   ```javascript
   subscribeToMyData(callback) {
     this.gun
       .get('myapp_mydata')
       .map()
       .on((data, dataId) => {
         if (data) callback(data);
       });
   }
   ```

**IMPORTANT**: Use 2-level structure for relay sync. 3+ levels don't sync reliably.

### Add Database Table

1. **Update schema** (in storage.js `initializeDatabase()`):
   ```javascript
   db.exec(`
     CREATE TABLE IF NOT EXISTS my_table (
       id TEXT PRIMARY KEY,
       data TEXT NOT NULL,
       timestamp INTEGER NOT NULL
     )
   `);
   ```

2. **Add CRUD functions** (in storage.js):
   ```javascript
   function saveMyData(data) {
     const stmt = db.prepare(`
       INSERT INTO my_table (id, data, timestamp)
       VALUES (?, ?, ?)
     `);
     stmt.run(data.id, data.data, data.timestamp);
   }

   function getMyData(limit = 100) {
     const stmt = db.prepare(`
       SELECT * FROM my_table
       ORDER BY timestamp DESC
       LIMIT ?
     `);
     return stmt.all(limit);
   }

   module.exports = {
     // ... existing exports
     saveMyData,
     getMyData,
   };
   ```

3. **Expose via IPC** (in main.js):
   ```javascript
   ipcMain.handle('mydata:get', async (event, limit) => {
     return storage.getMyData(limit);
   });
   ```

---

## Testing During Development

### Test with Two Instances

**Option 1: Use separate user data directories**:
```bash
# Terminal 1 (User A)
ELECTRON_USER_DATA=/tmp/user-a npm run dev

# Terminal 2 (User B)
ELECTRON_USER_DATA=/tmp/user-b npm run dev
```

**Option 2: Use production builds**:
```bash
npm run build:mac
# Run app twice from /Applications
```

### Manual Test Checklist

1. ✅ Create identity with password
2. ✅ Login with password
3. ✅ Send global chat message
4. ✅ See own message appear
5. ✅ Send contact request (copy public key from global chat)
6. ✅ Other instance receives request
7. ✅ Accept contact request
8. ✅ Both see contact added
9. ✅ Send DM to contact
10. ✅ Other instance receives DM
11. ✅ Reply to DM
12. ✅ Both can exchange messages

### Debug Logs to Watch

**Successful contact request**:
```
User A:
  📤 Contact request queued for sending to: abc123...
  ✅ Contact request Gun.js sync CONFIRMED: abc123...

User B:
  📥 Found pending contact request: req_... from: UserA
  Contact request saved from: UserA

User B accepts:
  ✅ Contact request acceptance delivered: UserA

User A:
  Contact request response received, status: accepted
  ✅ Contact added after acceptance: UserB
```

**Successful DM**:
```
Sender:
  📤 Sending DM to: abc123... via dm_abc123..._def456...
  ✅ DM confirmed: abc123... (250 bytes)

Receiver:
  📬 New DM received from: def456... msgId: msg_... (250 bytes)
  Message received from: def456...
```

---

## Building for Production

### macOS
```bash
npm run build:mac
# Output: release/AiSeekTruth-{version}-arm64.dmg
```

### Windows (from macOS via cross-compilation)
```bash
npm run build:win
# Output: release/AiSeekTruth Setup {version}.exe
#         release/AiSeekTruth {version}.exe (portable)
```

### Linux
```bash
npm run build:linux
# Output: release/AiSeekTruth-{version}.AppImage
#         release/AiSeekTruth_{version}_amd64.deb
```

### Build Options

- **Code signing**: Requires certificates (currently skipped)
- **Notarization**: macOS only, requires Apple Developer account
- **Auto-update**: Not implemented yet

---

## Important Files to Know

### Must Read Before Making Changes

1. **DEVELOPMENT_NOTES.md** - Full project documentation
2. **VERSION_HISTORY.md** - All bug fixes and changes
3. **TROUBLESHOOTING.md** - Common issues and solutions

### Configuration Files

- **package.json** - Dependencies, scripts, electron-builder config
- **vite.config.js** - Vite bundler configuration
- **build/entitlements.mac.plist** - macOS permissions

### Build Resources

- **build/icons/** - App icons (generated from icons/icon.svg)
- **scripts/generate-icons.js** - Icon generator script

---

## Git Workflow

### Making Changes

1. **Create branch** (optional):
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes**, test thoroughly

3. **Commit**:
   ```bash
   git add .
   git commit -m "feat: Add my awesome feature"
   ```

4. **Update version** (in package.json):
   ```json
   "version": "1.3.7"
   ```

5. **Tag release**:
   ```bash
   git tag v1.3.7
   ```

6. **Push**:
   ```bash
   git push origin main --tags
   ```

### Commit Message Convention

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

---

## Environment Variables

### Development
- `VITE_DEV_SERVER_URL` - Vite dev server URL (set by npm run dev)
- `ELECTRON_USER_DATA` - Override user data directory for testing

### Production
- None required

---

## Dependencies Explained

### Core Dependencies
- **electron** - Desktop app framework
- **react** + **react-dom** - UI framework
- **gun** - P2P database and sync
- **libsodium-wrappers-sumo** - Encryption library
- **better-sqlite3** - Local SQL database
- **zustand** - React state management (lightweight)

### Why These Choices?
- **Gun.js**: Automatic P2P sync, no server required
- **libsodium**: Battle-tested crypto, used by Signal
- **SQLite**: Fast local storage, no external DB needed
- **Zustand**: Simpler than Redux, perfect for this scale

---

## Performance Tips

### Optimize Gun.js
- Keep paths 2 levels max
- Use `.once()` for one-time reads
- Use `.on()` for subscriptions
- Unsubscribe with `.off()` when done

### Optimize SQLite
- Use prepared statements (already implemented)
- Add indexes on frequently queried columns
- Use LIMIT in queries
- Run VACUUM periodically

### Optimize React
- Use React.memo for expensive components
- Virtualize long lists (react-window)
- Debounce search inputs
- Lazy load images

---

## Security Best Practices

### Never Log Sensitive Data
```javascript
// ❌ BAD
console.log('Private key:', identity.privateKey);

// ✅ GOOD
console.log('Public key:', identity.publicKey.substring(0, 10) + '...');
```

### Always Verify Signatures
```javascript
// Always check signature before trusting data
const isValid = await crypto.verifySignature(message, signature, senderPublicKey);
if (!isValid) {
  console.error('Invalid signature!');
  return;
}
```

### Encrypt at Rest
- Private keys stored encrypted in database
- Password never stored, only used to derive encryption key
- Use Argon2id for password hashing (already implemented)

---

## Next Steps

1. **Read DEVELOPMENT_NOTES.md** - Understand architecture
2. **Run `npm run dev`** - See it in action
3. **Test contact requests + DMs** - Most complex feature
4. **Read Gun.js docs** - https://gun.eco/docs/
5. **Read libsodium docs** - https://libsodium.gitbook.io/

---

## Getting Help

- **Documentation**: See DEVELOPMENT_NOTES.md
- **Issues**: Check TROUBLESHOOTING.md
- **Bugs**: Create GitHub issue
- **Questions**: Check code comments

---

*Last updated: February 20, 2026*
*Current version: 1.3.6*
