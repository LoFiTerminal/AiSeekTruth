# AiSeekTruth Bootstrap Relay

This is a lightweight bootstrap relay for the AiSeekTruth P2P messaging network.

## Deploy to Railway (Free)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Click the button above
2. Connect your GitHub
3. Deploy
4. Copy your app URL: `https://yourapp.railway.app/gun`
5. Add it to AiSeekTruth app settings

## Deploy to Render (Free)

1. Go to render.com
2. New Web Service
3. Connect this repo
4. Deploy
5. Use the URL provided

## How It Works

- Users' apps connect to this relay as a bootstrap
- Through DHT, they discover each other
- Then establish direct WebRTC P2P connections
- Relay is only used for initial discovery
