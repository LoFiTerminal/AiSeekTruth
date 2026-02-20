# Troubleshooting Guide

## Common Issues & Solutions

### 1. Contact Requests Not Received

#### Symptoms
- User A sends contact request
- User B doesn't see any notification
- No pending requests appear in UI

#### Debugging Steps
1. **Check sender logs** (User A):
   ```
   Should see: ✅ Contact request Gun.js sync CONFIRMED
   If seeing: ⚠️ Contact request Gun.js callback timeout
   → Gun.js not syncing properly
   ```

2. **Check recipient logs** (User B):
   ```
   Should see: 📥 Found pending contact request
   Or: 📬 New contact request received
   If nothing → Gun.js subscription not working
   ```

3. **Check Gun.js connection**:
   ```
   Look for: 🤝 Connected to peer: https://aiseektruth-relay-production.up.railway.app/gun
   And: 📊 Total connected peers: 1 (or more)
   If 0 peers → Network connectivity issue
   ```

4. **Check relay server**:
   ```
   Look for: 🟢 Railway relay ping: XXms
   If 🔴 → Relay server offline or network blocked
   ```

#### Solutions
- **Restart both apps** - Forces Gun.js to re-subscribe
- **Check internet connection** - Gun.js needs network to sync
- **Check firewall** - Make sure app can connect to relay server
- **Try localhost relay** - If Railway is down, run local relay server

---

### 2. DMs Not Working After Contact Added

#### Symptoms
- Contact request accepted successfully
- Both users have each other in contacts list
- Messages fail to send or decrypt

#### Debugging Steps
1. **Check encryption key exchange**:
   ```javascript
   // In DevTools console:
   const contacts = await window.api.getContacts();
   console.log(contacts);

   // Each contact MUST have encryptionPublicKey field:
   {
     publicKey: "...",
     username: "...",
     encryptionPublicKey: "...",  // ← MUST BE PRESENT
     status: "...",
     lastSeen: ...
   }
   ```

2. **If encryptionPublicKey is missing**:
   - Bug in contact request response (fixed in v1.3.6)
   - Delete contact and re-send request using v1.3.6+

3. **Check message send logs**:
   ```
   Should see: ✅ DM confirmed: [recipientKey]
   If seeing: ❌ DM send FAILED → Check Gun.js error
   ```

4. **Check message receive logs**:
   ```
   Should see: 📬 New DM received from: [senderKey]
   If not receiving → Subscription issue or offline
   ```

#### Solutions
- **Update to v1.3.6+** - Critical encryption key fix
- **Delete and re-add contact** - Use new contact request flow
- **Check both users are online** - Messages won't sync if offline
- **Restart app** - Resets Gun.js subscriptions

---

### 3. ENOENT Errors on Startup

#### Symptoms
```
{code: 'ENOENT', errno: -2}
Error: ENOENT: no such file or directory
```

#### Cause
Gun.js trying to create storage files in non-existent or read-only directory.

#### Solution
**Update to v1.3.5+** - Uses writable userData directory:
```javascript
const userDataPath = app.getPath('userData');
const gunFilePath = path.join(userDataPath, 'gundb', 'radata');
```

If still seeing errors:
1. Check permissions on userData directory
2. Make sure app has write access
3. Delete old Gun.js data and restart

---

### 4. EROFS "Read-only file system" Error

#### Symptoms
```
EROFS: read-only file system, mkdir 'radata'
```

#### Cause
Gun.js trying to create 'radata' directory in app bundle (DMG mount point is read-only).

#### Solution
**Update to v1.3.5+** - Fixed by using userData directory which is always writable.

If still seeing errors:
- Delete app completely
- Re-download and install fresh v1.3.5+ build
- Don't copy old Gun.js config files

---

### 5. Messages Stuck "Sending..." / Not Delivered

#### Symptoms
- Message shows as sent locally
- Never gets delivered to recipient
- No "✅ DM confirmed" log

#### Debugging Steps
1. **Check Gun.js peers**:
   ```
   Should see: 📊 Total connected peers: 1+
   If 0 → Not connected to relay
   ```

2. **Check Gun.js callback**:
   ```
   Should see: ✅ DM confirmed: [recipient]
   If timeout → Gun.js sync failed
   ```

3. **Check recipient subscription**:
   - Recipient must have called `subscribeToContact(senderKey)`
   - Recipient must be online and connected to same relay

#### Solutions
- **Restart both apps** - Reestablishes connections
- **Check relay server status** - Ping should be < 1000ms
- **Try sending again** - May have been temporary network issue
- **Check recipient is online** - Offline users won't receive until they come back

---

### 6. Duplicate Messages Appearing

#### Symptoms
- Same message appears multiple times
- Message ID is the same

#### Cause
Gun.js firing multiple `.on()` callbacks for same data (known Gun.js behavior).

#### Solution
Already handled in code with `processedMessages` Set:
```javascript
const processedMessages = new Set();
if (!processedMessages.has(messageId)) {
  processedMessages.add(messageId);
  // Process message
}
```

If still seeing duplicates:
- Check database for duplicate entries
- May need to deduplicate in UI layer

---

### 7. Can't Login / Password Incorrect

#### Symptoms
- Correct password rejected
- "Failed to decrypt identity" error

#### Cause
- Actually wrong password
- Corrupted identity database
- Changed password but forgot

#### Solutions
1. **Try password again** - Case sensitive, check caps lock
2. **Check SQLite database**:
   ```bash
   sqlite3 ~/.config/AiSeekTruth/app.db
   SELECT * FROM identities;
   ```
3. **If corrupted** - Delete database and create new identity (LOSES ALL DATA)
4. **No password recovery** - Private keys encrypted, unrecoverable without password

---

### 8. Global Chat Not Showing Messages

#### Symptoms
- Send global message
- Message doesn't appear in chat
- Other users' messages don't appear

#### Debugging Steps
1. **Check Gun.js connection**:
   ```
   Look for: 🤝 Connected to peer
   ```

2. **Check subscription**:
   ```
   Should see: ✅ Subscribed to global chat successfully
   Path: aiseektruth_global_chat
   ```

3. **Check send confirmation**:
   ```
   Should see: ✅ Global message saved locally
   And: ✅ Gun.js sync CONFIRMED
   ```

#### Solutions
- **Refresh app** - Re-subscribes to global chat
- **Check relay server** - Global chat requires relay
- **Clear Gun.js cache** - Delete `userData/gundb` folder and restart

---

## Performance Issues

### App Slow to Start

#### Causes
- Large Gun.js database (many messages)
- Slow SQLite queries (missing indexes)
- Many contact subscriptions

#### Solutions
1. **Clear old messages**:
   ```sql
   DELETE FROM messages WHERE timestamp < [30 days ago];
   ```

2. **Optimize database**:
   ```sql
   VACUUM;
   ANALYZE;
   ```

3. **Limit message history** - Fetch only recent messages on startup

### High CPU Usage

#### Causes
- Gun.js continuous sync
- Many active subscriptions
- Large message volume

#### Solutions
- **Reduce heartbeat frequency** - Currently 30 seconds
- **Unsubscribe from offline contacts** - Don't need real-time updates
- **Implement pagination** - Don't load all messages at once

### High Memory Usage

#### Causes
- Gun.js storing all data in memory
- Large sharedSecretCache
- Not cleaning up old subscriptions

#### Solutions
- **Clear cache periodically**:
   ```javascript
   messagingService.clearCache();
   ```
- **Limit cache size** - Implement LRU cache
- **Unsubscribe when contact removed** - Clean up listeners

---

## Network Issues

### Can't Connect to Relay Server

#### Symptoms
```
🔴 Railway relay ping failed
📊 Total connected peers: 0
```

#### Debugging Steps
1. **Test relay directly**:
   ```bash
   curl -I https://aiseektruth-relay-production.up.railway.app/gun
   ```

2. **Check firewall** - Make sure ports not blocked

3. **Check proxy** - Corporate networks may block WebSocket

#### Solutions
- **Add custom relay** - If Railway blocked, use alternative
- **Run local relay** - `node relay-server.js`
- **Use VPN** - Bypass network restrictions

### WebRTC Connection Failed

#### Symptoms
- No direct peer-to-peer connection
- All traffic goes through relay

#### Cause
- NAT traversal failed
- STUN server unreachable
- Firewall blocking UDP

#### Solutions
- **Add more STUN servers** - Currently using Google's
- **Add TURN server** - For strict NATs
- **Relay fallback** - Already implemented, works but slower

---

## Database Issues

### Database Locked Error

#### Symptoms
```
Error: SQLITE_BUSY: database is locked
```

#### Cause
Multiple processes trying to write simultaneously.

#### Solutions
- **Enable WAL mode** - Already enabled in code
- **Increase timeout** - `db.pragma('busy_timeout = 5000')`
- **Close other instances** - Only run one app instance per database

### Database Corrupted

#### Symptoms
```
Error: SQLITE_CORRUPT: database disk image is malformed
```

#### Recovery
1. **Export data** (if possible):
   ```bash
   sqlite3 app.db ".backup backup.db"
   ```

2. **Try recovery**:
   ```bash
   sqlite3 app.db ".recover" > recovery.sql
   ```

3. **Last resort** - Delete database, lose all data

---

## Build Issues

### npm install Fails (Permission Errors)

#### Solution
```bash
npm install --cache /tmp/npm-cache-temp
```

### better-sqlite3 Binary Not Found

#### Solution
```bash
npm run postinstall
# Or manually:
electron-builder install-app-deps
```

### electron-builder Fails

#### Common Causes
- Missing build tools (Xcode on macOS, Visual Studio on Windows)
- Corrupted node_modules
- Outdated electron-builder

#### Solutions
```bash
rm -rf node_modules package-lock.json
npm install
npm run build:mac
```

---

## Getting Help

### Enable Verbose Logging
1. Open DevTools: `Cmd+Opt+I` (macOS) or `Ctrl+Shift+I` (Windows)
2. Look for `[MAIN]` prefixed logs from main process
3. Check for error messages and warnings

### Collect Logs
```javascript
// In DevTools console:
console.save = function(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'text/json'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};

// Save logs:
console.save(console.logs, 'debug-logs.json');
```

### Report Issues
1. Collect error logs from DevTools
2. Note exact steps to reproduce
3. Include version number (in package.json)
4. Create issue on GitHub

---

*Last updated: February 20, 2026*
*For v1.3.6+*
