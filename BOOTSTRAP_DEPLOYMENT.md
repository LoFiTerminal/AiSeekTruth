# Bootstrap Relay Deployment Guide

## What Are Bootstrap Relays?

Bootstrap relays help users discover each other on the P2P network. They:
- ✅ Enable automatic peer discovery
- ✅ Don't see message content (E2E encrypted)
- ✅ Only used for initial connection
- ✅ After discovery → direct P2P
- ✅ Anyone can run them (fully decentralized)

## Quick Deploy (2 minutes each)

### Option 1: Railway.app (Recommended)

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select the `bootstrap-relay/` folder
4. Deploy!
5. Copy the URL: `https://your-app.railway.app/gun`

### Option 2: Render.com

1. Go to https://render.com
2. New → Web Service
3. Connect to this repo
4. Root directory: `bootstrap-relay`
5. Build command: `npm install`
6. Start command: `npm start`
7. Deploy!
8. Copy the URL: `https://your-app.onrender.com/gun`

### Option 3: Fly.io

```bash
cd bootstrap-relay
fly launch
fly deploy
```

Copy the URL: `https://your-app.fly.dev/gun`

## After Deployment

1. Copy your relay URLs
2. Edit `src/main/p2p.js`:

```javascript
const bootstrapRelays = [
  'https://your-relay1.railway.app/gun',
  'https://your-relay2.onrender.com/gun',
  'https://your-relay3.fly.dev/gun',  // Optional: 3rd relay for redundancy
  ...this.config.customRelays
];
```

3. Rebuild the app:
```bash
npm run build
```

4. **Done!** Users can now discover each other automatically!

## Recommended Setup

Deploy **2-3 relays** for:
- ✅ Redundancy (if one goes down)
- ✅ Load distribution
- ✅ Geographic diversity

## Free Tier Limits

- **Railway:** 500 hours/month (21 days uptime)
- **Render:** Always free, sleeps after inactivity
- **Fly.io:** 3 VMs free

**Pro tip:** Deploy on all 3 services for maximum uptime!

## Monitoring

Check if your relay is working:
```bash
curl https://your-relay.railway.app/gun
# Should return: "AiSeekTruth Bootstrap Relay v1.0"
```

## Security Note

Bootstrap relays:
- ❌ **Cannot read messages** (E2E encrypted)
- ❌ **Cannot see who messages whom** (DHT routing)
- ✅ **Only see**: "User X is online"
- ✅ **After discovery**: Users connect directly (relay not involved)

This is the same model as BitTorrent, IPFS, and all P2P networks.

## Community Relays

Anyone can run a bootstrap relay! Users can:
1. Deploy their own relay
2. Add it in app settings
3. Share the URL with friends
4. Help strengthen the network!

This is truly decentralized - no single point of control.
