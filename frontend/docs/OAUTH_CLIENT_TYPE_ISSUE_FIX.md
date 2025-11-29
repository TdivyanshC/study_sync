# 🔧 **CRITICAL FIX: OAuth Client Type Issue**

## 🚨 **Root Cause Identified**

**You selected "Web Application" instead of "Android"** when creating the OAuth client. This is causing your session detection failure!

### **Why This Causes OAuth Timeout:**

**Web Application OAuth Flow:**
- Designed for server-side web apps
- Uses `client_secret` for token exchange
- Expects server-side redirects and token handling
- Not optimized for mobile PKCE flow

**Android OAuth Flow (What You Need):**
- Designed for mobile apps
- Uses PKCE (Proof Key for Code Exchange) flow
- No client secret required in mobile app
- Optimized for custom URL schemes

## ✅ **IMMEDIATE FIX REQUIRED**

### **Step 1: Delete and Recreate OAuth Client**

1. **Go to**: https://console.cloud.google.com/apis/credentials
2. **Find your existing OAuth client** (the "Web Application" one)
3. **Delete it** ❌
4. **Create new OAuth client** with these settings:

### **Step 2: Configure Android OAuth Client**

**Application Type**: `Android`

**Required Fields**:
- **Name**: `StudySync Mobile App`
- **Package name**: `com.studystreak.app` (or your actual package name)
- **SHA-1 certificate fingerprint**: `Your development SHA-1`

### **Step 3: Get Your SHA-1 Certificate**

```bash
# Run this in your frontend directory
cd frontend
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Extract the SHA-1** from the output and paste it in the Google Console.

### **Step 4: Update Supabase Configuration**

In Supabase Auth Settings, update the **Google provider**:

```javascript
// In Supabase Dashboard > Authentication > Providers > Google
Client ID: [Your NEW Android OAuth Client ID]
Client Secret: [Leave EMPTY for Android!]
```

**Note**: For Android OAuth, you typically don't need a client secret.

### **Step 5: Update Your App Configuration**

In `frontend/app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.studystreak.app"
    }
  }
}
```

## 🔧 **Why This Fixes Your Issue**

### **Before (Web Application - BROKEN)**:
```
Google OAuth → Expects server-side token exchange
    ↓
Supabase → Receives OAuth response
    ↓
Mobile App → Can't properly process the response
    ↓
❌ Session detection fails after 60s timeout
```

### **After (Android - WORKING)**:
```
Google OAuth → Uses PKCE flow optimized for mobile
    ↓
Supabase → Properly handles mobile OAuth response
    ↓
Mobile App → Session created immediately
    ↓
✅ Session detected in 1-3 seconds!
```

## 🚀 **Expected Results After Fix**

After recreating the OAuth client as Android:

1. **Faster OAuth completion**: 5-10 seconds instead of 60s timeout
2. **Proper session detection**: Session found immediately
3. **No more PKCE warnings**: Android OAuth handles this correctly
4. **Stable redirects**: Custom scheme redirects work properly

## 📱 **Testing the Fix**

1. **Delete old OAuth client**
2. **Create new Android OAuth client**
3. **Update Supabase configuration**
4. **Restart your Expo app**
5. **Try Google login again**

You should see:
```
LOG  🔄 OAuth callback triggered, checking session...
LOG  ✅ Session found: user@gmail.com  // Within 5-10 seconds!
LOG  🔄 Auth state changed: INITIAL_SESSION
LOG  ✅ User data loaded successfully
```

## 🎯 **Alternative: If You Can't Get SHA-1**

If you don't have the SHA-1 certificate yet, you can:

1. **Use a temporary solution**: Update your existing web app OAuth client to include mobile redirect URIs
2. **Or create both**: Keep the web app for development, add Android for production

But the **best long-term solution** is definitely recreating it as an Android OAuth client.

---

**This client type mismatch is almost certainly why your OAuth times out after 60 seconds!**