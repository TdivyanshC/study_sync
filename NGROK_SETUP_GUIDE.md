# ngrok Setup Guide

## Issue
The ngrok tunnel is offline because it requires authentication.

## Quick Fix Steps

### 1. Sign up for ngrok (Free)
- Go to: https://dashboard.ngrok.com/signup
- Create a free account
- Get your authtoken from the dashboard

### 2. Install ngrok auth token
```bash
# If you have ngrok CLI installed:
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE

# Or set environment variable:
export NGROK_AUTHTOKEN=YOUR_AUTHTOKEN_HERE
```

### 3. Restart the tunnel
```bash
python setup_ngrok_tunnel.py
```

## Alternative: Use local development without ngrok

Since your OAuth redirect issue is now fixed, you can test it locally without ngrok:

### Option A: Test on same device
If your frontend and backend are on the same machine, you can configure the frontend to use localhost:

1. Update `frontend/.env`:
```bash
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

2. Restart frontend:
```bash
cd frontend
npx expo start -c
```

### Option B: Use your network IP
If testing on mobile device, find your computer's IP:

```bash
# Windows
ipconfig

# Look for IPv4 Address under your active network adapter
# Example: 192.168.1.100
```

Then update frontend `.env`:
```bash
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:8000
```

## Testing Your OAuth Fix

Once you have backend connectivity, test the OAuth flow:

1. **Start backend** (✅ Already running on port 8000)
2. **Start frontend** with working backend URL
3. **Test OAuth**:
   - Click "Sign in with Google"
   - Complete Google authentication
   - **Expected result**: Should redirect to home page (`/(tabs)`) instead of login page

## Debug Logs to Look For

### ✅ Successful OAuth flow:
```
LOG  🔗 Deep link handler processing URL: exp://192.168.1.x:8081?code=...
LOG  📋 Extracted OAuth parameters: {code: "..."}
LOG  🔄 OAuth callback detected, navigating to auth callback
LOG  🔔 OAuth callback received
LOG  URL params: {code: "..."}
LOG  ✅ Authorization code received
LOG  📱 Session established, navigating to home
LOG  ✅ User signed in: {email: "..."}
```

### ❌ If still broken:
Look for the parameter passing logs to confirm the fix is working.