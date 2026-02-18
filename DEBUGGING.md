# AiSeekTruth Debugging Guide

## Crypto Status: ✅ WORKING
All encryption tests pass:
- Identity creation ✅
- Key derivation ✅
- Shared secret derivation ✅
- Message encryption/decryption ✅
- Signature verification ✅

## Known Issues

### Issue 1: Messages Not Going Through
**Status:** Investigating

**Symptoms:**
- User sends message but recipient doesn't receive it
- Contact requests don't arrive

**Possible Causes:**
1. Gun.js not properly initialized in Electron
2. P2P network not connecting
3. Messages being sent to wrong path
4. Subscription not working

**Tests to Run:**
1. Check if Gun.js connects to relay
2. Check console logs for errors
3. Test with two instances on same machine

### Issue 2: Adding Contacts by Public Key
**Status:** Investigating

**Flow:**
1. User pastes recipient's public key
2. App sends contact request via Gun.js
3. Recipient should see request in their app
4. Recipient accepts
5. Both users can now message

**Where it might fail:**
- Contact request not being sent to Gun.js
- Recipient not subscribed to contact requests
- Network issue preventing delivery

## Debugging Steps

### 1. Enable Console Logging
Open DevTools in the Electron app (Cmd+Option+I) and look for:
- "P2P network initialized"
- "Connected to peer:"
- "Gun.js initialized"

### 2. Test Gun.js Connection
Run this in Node:
```javascript
const Gun = require('gun');
require('gun/axe');

const gun = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun']
});

gun.on('hi', (peer) => {
  console.log('Connected to:', peer.url);
});

// Test writing
gun.get('test').put({ hello: 'world', timestamp: Date.now() });

// Test reading
gun.get('test').on((data) => {
  console.log('Received:', data);
});
```

### 3. Check Network Paths
Messages are sent to: `messages/[recipient_pubkey]/[sender_pubkey]`
Contact requests sent to: `contact_requests/[recipient_pubkey]/[sender_pubkey]`

### 4. Test with Two Users
1. Create two users (User A and User B)
2. User A copies their public key
3. User B pastes it and sends contact request
4. Check User A's console for "Contact request received"
5. User A accepts
6. Both users should see each other in contacts
7. Send message from User B to User A
8. Check User A's console for "Message received"

## Common Fixes

### Fix 1: Gun.js Not Loading
**Symptom:** No "Gun.js initialized" in console

**Fix:**
```javascript
// In p2p.js, add error handling
try {
  Gun = require('gun');
  require('gun/axe');
} catch (error) {
  console.error('Failed to load Gun.js:', error);
}
```

### Fix 2: Relay Connection Failed
**Symptom:** No "Connected to peer" messages

**Fix:**
- Check if Railway relay is running: `curl https://aiseektruth-relay-production.up.railway.app/gun`
- Try alternative relays: gun-manhattan.herokuapp.com, gunjs.herokuapp.com

### Fix 3: Messages Not Delivered
**Symptom:** Message sent but not received

**Possible Issues:**
1. Recipient not subscribed to sender's channel
2. Contact doesn't have encryptionPublicKey
3. Shared secret derivation failing

**Debug:**
Add logging in messaging.js:
```javascript
async sendMessage(recipientPublicKey, text) {
  console.log('[DEBUG] Sending message to:', recipientPublicKey);
  const sharedSecret = await this.getSharedSecret(recipientPublicKey);
  console.log('[DEBUG] Shared secret derived');

  const { ciphertext, nonce } = await crypto.encryptMessage(text, sharedSecret);
  console.log('[DEBUG] Message encrypted');

  this.p2p.sendMessageEnvelope(recipientPublicKey, envelope);
  console.log('[DEBUG] Message sent to Gun.js');
}
```

### Fix 4: Contact Requests Not Working
**Check:**
1. Is `subscribeToContactRequests()` called on startup?
2. Are requests being published to Gun.js?
3. Is recipient listening?

**Add debug logging:**
```javascript
// In p2p.js sendContactRequest()
console.log('[DEBUG] Sending contact request to:', recipientKey);
this.gun.get('contact_requests').get(recipientKey).get(this.identity.publicKey).set(requestEnvelope);
console.log('[DEBUG] Request published to Gun.js');

// In p2p.js subscribeToContactRequests()
console.log('[DEBUG] Subscribing to contact requests at:', this.identity.publicKey);
this.gun.get('contact_requests').get(this.identity.publicKey).map().on((data, key) => {
  console.log('[DEBUG] Contact request received:', data);
});
```

## Next Steps

1. ✅ Test crypto (DONE - all passing)
2. ⏳ Test Gun.js connection
3. ⏳ Add debug logging to messaging flow
4. ⏳ Test with two instances
5. ⏳ Fix any issues found
