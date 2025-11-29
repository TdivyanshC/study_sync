# 🚨 SUPABASE CONFIGURATION REQUIRED

## 📋 **Critical: Update Your Supabase OAuth Settings**

The redirect URI format is now correct, but **Supabase doesn't recognize this redirect URL**. You need to update your Supabase configuration.

## 🔧 **Steps to Fix**

### **1. Go to Your Supabase Dashboard**
1. Visit: https://supabase.com/dashboard
2. Select your project: `rekngekjsdsdvgmsznva`
3. Go to **Authentication** → **URL Configuration**

### **2. Update Additional Redirect URLs**

Add these **exact URLs** (one per line):

```
exp://127.0.0.1:8081/--/auth/callback
exp://192.168.1.11:8081/--/auth/callback
com.studystreak.app://auth/callback
https://auth.expo.io/@tdivyanshc/study-sync
```

### **3. Update Site URL (if needed)**
```
https://rekngekjsdsdvgmsznva.supabase.co
```

## 🎯 **Alternative: Use Expo Proxy URL (Recommended)**

Instead of using your local IP, use the Expo proxy URL which is more reliable:

### **Option A: Use Expo Proxy URL**

1. **Update your code** to use the proxy URL:

```typescript
// Use Expo proxy URL instead of local IP
const redirectUri = 'https://auth.expo.io/@tdivyanshc/study-sync';
```

2. **Add to Supabase Additional Redirect URLs**:
```
https://auth.expo.io/@tdivyanshc/study-sync
```

### **Option B: Keep Local IP but Update Supabase**

If you prefer to use your local IP, make sure to add `exp://192.168.1.11:8081/--/auth/callback` to your Supabase Additional Redirect URLs.

## 📱 **Current Log Analysis**

Your logs show:
```
✅ OAuth URL generated: https://rekngekjsdsdvgmsznva.supabase.co/auth/v1/authorize?provider=google&redirect_to=exp%3A%2F%2F192.168.1.11%3A8081%2F--%2Fauth%2Fcallback
```

This means:
- ✅ **Redirect URI format is correct**: `exp://192.168.1.11:8081/--/auth/callback`
- ✅ **OAuth URL is generated properly**
- ❌ **Supabase doesn't recognize this redirect URL**

## 🚀 **Expected Result After Configuration**

After updating Supabase configuration, you should see:
```
✅ OAuth flow initiated successfully
🌐 AuthSession will automatically handle the browser redirect
[User authenticates with Google]
✅ User signed in: user@gmail.com
✅ Redirecting to home screen...
```

## ⚡ **Quick Test**

1. **Add the redirect URLs to Supabase** (5 minutes)
2. **Test the Google login** again
3. **Should work without "requested path is invalid" error**

The issue is purely a configuration problem - your code is working correctly, but Supabase needs to know about these redirect URLs!