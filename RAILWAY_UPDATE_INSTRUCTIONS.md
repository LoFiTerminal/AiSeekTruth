# Update Railway Relay - Direct Method

Since git push is blocked, update the file directly on Railway:

## Step 1: Go to Railway Dashboard
https://railway.app/dashboard

## Step 2: Find Your Project
Click on: `aiseektruth-relay-production`

## Step 3: Open the Service
Click on the service running the relay

## Step 4: Edit index.js
1. Look for "Files" or "Code" tab
2. Find `index.js`
3. Click to edit

## Step 5: Make This Change

**Find line 24-28:**
```javascript
const gun = Gun({
  web: server,
  localStorage: false, // ❌ OLD - Don't store data
  radisk: false,
  axe: true,
```

**Change to:**
```javascript
const gun = Gun({
  web: server,
  localStorage: true,  // ✅ NEW - Store messages!
  radisk: true,        // ✅ NEW - Persist to disk!
  axe: true,
```

## Step 6: Save & Deploy
1. Save the file
2. Railway will automatically redeploy
3. Wait ~2 minutes for deployment

## Step 7: Test
Run this command:
```bash
cd /Users/asychov/AiSeekTruth
node test-railway-relay.js
```

Should see: `🎉 SUCCESS! Message received!`
