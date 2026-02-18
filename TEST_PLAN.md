# AiSeekTruth Comprehensive Test Plan

## 🔧 Pre-Test Setup

1. **Clean Install**
   ```bash
   # Remove old app data
   rm -rf ~/Library/Application\ Support/aiseektruth

   # Install fresh DMG
   open /Users/asychov/AiSeekTruth/release/AiSeekTruth-1.0.0-arm64.dmg
   ```

2. **Check Railway Relay Status**
   - Visit: https://aiseektruth-relay-production.up.railway.app/gun
   - Should see: "Gun relay server is running"

---

## ✅ Test Suite

### 1. Registration & Login (2 min)

**Test 1.1: Create New Identity**
- [ ] Open app
- [ ] Enter username (test123)
- [ ] Enter password (Test1234!)
- [ ] Confirm password
- [ ] Click "Create Identity"
- [ ] ✅ Should load main screen with Global Chat

**Test 1.2: Connection Status**
- [ ] Check bottom-left corner
- [ ] ✅ Should show "Online" status
- [ ] ✅ Should show relay ping (e.g., "50ms")
- [ ] Wait 5 seconds
- [ ] ✅ Ping should update every 5 seconds

**Test 1.3: Global Chat Connection**
- [ ] Check top-right of Global Chat
- [ ] ✅ Should show green dot + "Connected"
- [ ] If shows "Connecting...", wait 2-3 seconds
- [ ] ✅ Should change to "Connected"

---

### 2. Global Chat Testing (5 min)

**Test 2.1: Send Message**
- [ ] Type: "Test message 1"
- [ ] ✅ Input field is active (can type)
- [ ] ✅ Send button is blue and enabled
- [ ] Press Enter or click Send
- [ ] ✅ Button shows "Sending..." briefly
- [ ] ✅ Message appears in chat
- [ ] ✅ Shows your username
- [ ] ✅ Shows timestamp
- [ ] ✅ Blue bubble (your message)
- [ ] ✅ Input clears and is ready for next message
- [ ] ✅ Send button returns to "Send"

**Test 2.2: Send Multiple Messages**
- [ ] Type: "Test message 2"
- [ ] Send
- [ ] ✅ Works correctly
- [ ] Type: "Test message 3"
- [ ] Send
- [ ] ✅ Works correctly
- [ ] Type: "Test message 4"
- [ ] Send
- [ ] ✅ Works correctly
- [ ] ✅ All messages visible in chat
- [ ] ✅ No stuck "Sending..." state

**Test 2.3: Message Persistence**
- [ ] Close app (Cmd+Q)
- [ ] Reopen app
- [ ] Login with same credentials
- [ ] ✅ Previous messages still visible
- [ ] ✅ Message history preserved

**Test 2.4: Network Error Handling**
- [ ] Disconnect from internet
- [ ] Try to send message
- [ ] ✅ Should timeout after 10 seconds
- [ ] ✅ Should show error alert
- [ ] ✅ Message restored to input field
- [ ] Reconnect to internet
- [ ] ✅ Connection status updates
- [ ] Try sending again
- [ ] ✅ Should work

---

### 3. Contact Request Testing (3 min)

**Test 3.1: Send Contact Request**
- [ ] Click "Add Contact" button (left sidebar)
- [ ] Enter public key: `_kpVLwSod9etpejZCLK-6lI2vZshErJGvo-0WZKzdBU`
- [ ] Enter optional message: "Hi, adding you as contact"
- [ ] Click "Send Request"
- [ ] ✅ Button should work (not stuck)
- [ ] ✅ Modal closes
- [ ] ✅ Request appears in "Outgoing Requests" section

**Test 3.2: Duplicate Request Handling**
- [ ] Click "Add Contact" again
- [ ] Enter same public key
- [ ] Click "Send Request"
- [ ] ✅ Should show error: "Contact request already sent. Please wait for them to accept or decline."
- [ ] ✅ Error is clear and actionable

**Test 3.3: Invalid Public Key**
- [ ] Click "Add Contact"
- [ ] Enter invalid key: "invalid123"
- [ ] Click "Send Request"
- [ ] ✅ Should handle gracefully
- [ ] ✅ Show error message

---

### 4. Two-Device Sync Test (5 min)

**Setup: Need 2 devices or 2 user accounts**

**Device 1:**
- [ ] Send global message: "Hello from Device 1"
- [ ] Note your public key (in settings)

**Device 2:**
- [ ] Open app, create different identity
- [ ] ✅ Should see "Hello from Device 1" in global chat
- [ ] Send message: "Hello from Device 2"

**Device 1:**
- [ ] ✅ Should see "Hello from Device 2" appear
- [ ] ✅ Shows Device 2's username
- [ ] ✅ Gray bubble (not your message)
- [ ] ✅ Messages sync in real-time (< 5 seconds)

---

### 5. Stress Testing (3 min)

**Test 5.1: Rapid Message Sending**
- [ ] Send 10 messages rapidly
- [ ] ✅ All should send
- [ ] ✅ No stuck states
- [ ] ✅ Input stays functional

**Test 5.2: Long Message**
- [ ] Type 500 character message
- [ ] ✅ Textarea auto-expands
- [ ] Send
- [ ] ✅ Full message visible
- [ ] ✅ Word wrap works

**Test 5.3: Special Characters**
- [ ] Send: "Test 🎉 emoji 👍 support"
- [ ] Send: "Test <script>alert('xss')</script>"
- [ ] ✅ All render safely
- [ ] ✅ No XSS vulnerabilities

---

### 6. P2P Network Testing (2 min)

**Test 6.1: Relay Connection**
- [ ] Check console logs (Cmd+Option+I)
- [ ] ✅ Should see: "✅ Subscribed to global chat"
- [ ] ✅ Should see: "Server ping started"
- [ ] ✅ Should see: "🟢 Railway relay ping: XXms"
- [ ] ✅ No red errors

**Test 6.2: Gun.js Sync**
- [ ] Send message
- [ ] Check console
- [ ] ✅ Should see: "📤 Sending global message to Gun.js..."
- [ ] ✅ Should see: "✅ Global message sent: gmsg_..."
- [ ] ✅ Should see: "✅ Saved to local storage"

---

### 7. UI/UX Testing (2 min)

**Test 7.1: Layout**
- [ ] ✅ Global Chat occupies main window
- [ ] ✅ Contact list on left
- [ ] ✅ Connection status bottom-left
- [ ] ✅ No UI glitches

**Test 7.2: Responsiveness**
- [ ] Resize window
- [ ] ✅ Layout adapts
- [ ] ✅ Text wraps properly
- [ ] ✅ Scroll works

**Test 7.3: Keyboard Shortcuts**
- [ ] Press Enter to send
- [ ] ✅ Works
- [ ] Press Shift+Enter
- [ ] ✅ Creates new line
- [ ] Press Cmd+N
- [ ] ✅ Opens Add Contact

---

## 🐛 Known Issues to Watch For

1. **Stuck "Sending..."** - Should timeout after 10 seconds
2. **No connection** - Check Railway relay is up
3. **Messages not syncing** - Check internet connection
4. **Can't type** - Should never happen with new code

---

## 📊 Success Criteria

- [ ] All 7 test sections pass
- [ ] No stuck states
- [ ] Global chat fully functional
- [ ] Contact requests work
- [ ] Messages sync across devices
- [ ] No console errors
- [ ] UI is responsive

---

## 🚨 If Tests Fail

1. **Check Railway Relay:**
   ```bash
   curl https://aiseektruth-relay-production.up.railway.app/gun
   ```

2. **Check Console Logs:**
   - Open DevTools (Cmd+Option+I)
   - Look for red errors
   - Share logs if needed

3. **Clean Reinstall:**
   ```bash
   rm -rf ~/Library/Application\ Support/aiseektruth
   # Reinstall app
   ```

4. **Check Network:**
   - Firewall settings
   - Internet connection
   - VPN interference

---

**Estimated Total Test Time:** 20-25 minutes
