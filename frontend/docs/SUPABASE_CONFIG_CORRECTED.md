# 🔧 CORRECTED Supabase OAuth Configuration

## ❌ Wrong Configuration (That Causes "Site Can't Be Reached")

**DO NOT USE THIS:**
- Site URL: `http://localhost:8081`
- This redirects to your computer's localhost, not the Expo app on your phone

## ✅ Correct Configuration for Expo Go

### 1. Site URL (Supabase Dashboard)
**Set to your production domain or leave empty for development**

For **Expo Go mobile development**, you can:
- **Option A**: Leave Site URL empty
- **Option B**: Set to your actual production domain if you have one

### 2. Additional Redirect URLs (This is What Matters!)

**Navigate to**: https://app.supabase.com/project/rekngekjsdsdvgmsznva/auth/settings

**In "Additional Redirect URLs" field, add:**

```
exp://192.168.1.100:8081/--/auth/callback
exp://127.0.0.1:8081/--/auth/callback
com.studystreak.app://auth/callback
```

**Replace `192.168.1.100` with your actual IP address**

### 3. How to Find Your IP Address

**On your development computer:**

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network connection

**Mac/Linux:**
```bash
ifconfig
```
Look for your local IP (usually starts with 192.168.x.x or 10.0.x.x)

**Example:** If your IP is `192.168.1.105`, add:
```
exp://192.168.1.105:8081/--/auth/callback
```

### 4. What Each URL Means

- `exp://192.168.x.x:8081/--/auth/callback` → Expo Go on your phone
- `exp://127.0.0.1:8081/--/auth/callback` → Expo Go on same device
- `com.studystreak.app://auth/callback` → Standalone app build

## 🧪 Testing Flow

1. **Make sure your phone and computer are on same WiFi**
2. **Get your computer's IP address**
3. **Update Supabase Additional Redirect URLs with your IP**
4. **Try Google login from Expo Go on your phone**

## 🔍 The Correct Redirect Flow

```
User taps "Continue with Google" 
    ↓
Opens Google OAuth in browser
    ↓
User selects Google account
    ↓
Supabase redirects to: exp://192.168.1.100:8081/--/auth/callback
    ↓
Expo Go app catches the redirect
    ↓
OAuth callback processes successfully
```

**NOT**: `http://localhost:8081/auth/callback` (which goes to your computer, not your phone)

## 🚨 Quick Fix Steps

1. **Clear the Site URL** in Supabase (leave it empty or set to production domain)
2. **Update Additional Redirect URLs** with your actual IP:
   ```
   exp://[YOUR_IP]:8081/--/auth/callback
   ```
3. **Save changes** in Supabase
4. **Test OAuth flow** from Expo Go on your phone

This should resolve the "site can't be reached" error immediately!