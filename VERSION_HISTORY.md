# Version History

## v1.3.6 (February 20, 2026) - CURRENT
**Critical Bug Fix: Contact Request Encryption Key Exchange**

### Changes
- Fixed `sendContactRequestResponse()` in `src/main/p2p.js` to include:
  - `acceptorEncryptionPublicKey` - Required for DM encryption
  - `acceptorUsername` - Display name for contact

### Bug Description
When User B accepted User A's contact request, the p2p layer was stripping out the acceptor's encryption public key from the response envelope. This meant User A never received User B's encryption key, making it impossible to encrypt and send DMs.

### Impact
- ✅ DMs now work after contact request acceptance
- ✅ Both users can encrypt messages to each other
- ✅ Proper end-to-end encryption established

### Files Changed
- `src/main/p2p.js` (line 552-558)
- `package.json` (version bump)

---

## v1.3.5 (February 2026)
**Gun.js Storage Configuration Fix**

### Changes
- Changed Gun.js to use writable userData directory
- Config: `radisk: true, file: app.getPath('userData')/gundb/radata`
- Added directory creation with `fs.mkdirSync(gunDataPath, { recursive: true })`

### Bug Description
Gun.js was trying to create storage files in read-only locations (DMG mount point), causing ENOENT and EROFS errors.

### Impact
- ✅ No more EROFS "read-only file system" errors
- ✅ No more ENOENT "file not found" errors
- ✅ App works when run from DMG

### Files Changed
- `src/main/p2p.js` (initialize method)
- `package.json` (version bump)

---

## v1.3.4 (February 2026)
**Attempted Fix: Gun.js Storage Disabled**

### Changes
- Set `file: false` explicitly in Gun.js config
- Attempted to run Gun.js in pure relay-only mode

### Result
❌ Failed - Gun.js still threw ENOENT errors and timeouts
- Discovered Gun.js fundamentally requires local file storage
- Cannot operate in pure relay-only mode

### Lesson Learned
Gun.js MUST have local storage enabled (`radisk: true` + valid file path)

---

## v1.3.3 (February 2026)
**Attempted Fix: Remove File Option**

### Changes
- Removed `file` option from Gun.js config
- Left only `radisk: false` and `localStorage: false`

### Result
❌ Failed - Got EROFS "read-only file system, mkdir 'radata'" error
- Gun.js still tried to create 'radata' directory in current working directory
- Working directory was read-only (DMG mount point)

---

## v1.3.2 (February 2026)
**Gun.js Callback Acknowledgment**

### Changes
- Changed `sendContactRequest()` to wait for Gun.js `.put()` callback
- Added 5-second timeout fallback
- Wrapped in Promise that resolves when Gun.js confirms sync

### Bug Description
Previous code used fire-and-forget pattern, returning immediately without waiting for Gun.js to sync data to network.

### Result
⚠️ Partial fix - Callback handling improved but ENOENT errors persisted
- Log "Gun.js sync CONFIRMED" now appeared
- But Gun.js config was contradictory (radisk: false + file: path)

### Files Changed
- `src/main/p2p.js` (sendContactRequest method)
- `package.json` (version bump)

---

## v1.3.1 (February 2026)
**Encryption Key Exchange Fix**

### Changes
1. `acceptContactRequest()` - Send acceptor's encryption public key in response
2. `handleContactRequestResponse()` - Use acceptor's key (not requester's own key)

### Bug Description
Two critical bugs in encryption key exchange:
1. Acceptor wasn't sending their encryption public key in response
2. Requester was using wrong key (fromEncryptionPublicKey from request, which was their own key)

### Impact
- ✅ Contact requests delivered properly
- ⚠️ DMs still not working (p2p layer bug remained - fixed in v1.3.6)

### Files Changed
- `src/main/messaging.js` (acceptContactRequest, handleContactRequestResponse)
- `package.json` (version bump)

---

## v1.3.0 (February 2026)
**Initial State**

### Issues Reported
- ❌ DMs not working
- ❌ Contact requests not delivered
- ✅ Global chat working fine

### Investigation Started
User reported: "DMs requests do not go through" and "contact didnt get ny request"

---

## Key Fixes Timeline

1. **v1.3.1** - Fixed messaging layer encryption key exchange logic
2. **v1.3.2** - Added Gun.js callback handling with timeout
3. **v1.3.3** - Attempted to remove file option (EROFS error)
4. **v1.3.4** - Attempted file: false (ENOENT errors)
5. **v1.3.5** - Fixed Gun.js storage to use writable userData directory
6. **v1.3.6** - Fixed p2p layer to include encryption key in response envelope ✅

---

## Testing Checklist

### Before Releasing New Version
- [ ] Create test identity on two separate devices/instances
- [ ] Test contact request send → receive flow
- [ ] Test contact request acceptance → response flow
- [ ] Test DM encryption → decryption
- [ ] Test group messages
- [ ] Test global chat
- [ ] Check DevTools for errors
- [ ] Verify no ENOENT/EROFS errors in logs
- [ ] Test on fresh install (no existing database)
- [ ] Test on macOS DMG
- [ ] Test on Windows installer
- [ ] Test on Windows portable exe

### Critical Log Messages to Verify
- `✅ Contact request Gun.js sync CONFIRMED` (sender)
- `📥 Found pending contact request` or `📬 New contact request received` (recipient)
- `✅ Contact request acceptance delivered` (acceptor)
- `✅ Contact added after acceptance` (requester)
- `✅ DM confirmed` (sender)
- `📬 New DM received` (recipient)

---

*Last updated: February 20, 2026*
