# 🔍 GOOGLE OAUTH TROUBLESHOOTING GUIDE - SUPABASE CONFIGURATION

## 🚨 CRITICAL: "requested path is invalid" - Root Cause Analysis

The persistent "requested path is invalid" error indicates a fundamental configuration mismatch between what your app is sending and what Supabase expects.

---

## 📋 SUPABASE CONFIGURATION CHECKLIST

### **1. Google OAuth Provider Settings in Supabase**

**Required Configuration in Supabase Dashboard → Authentication → Providers → Google:**

```
✅ Site URL: https://rekngekjsdsdvgmsznva.supabase.co
✅ Redirect URLs (add ALL of these):
   - exp://127.0.0.1:8081
   - exp://192.168.1.11:8081 (your actual IP)
   - exp://192.168.x.x:8081 (replace x.x with your subnet)
   - https://auth.expo.io/@tdivyanshc/study-sync
   - com.studystreak.app://auth/callback
✅ Client ID: [Your Google Web Client ID]
✅ Client Secret: [Your Google Client Secret]
✅ Enabled: YES
```

### **2. Google Cloud Console Configuration**

**Required in Google Cloud Console → APIs & Services → Credentials:**

```
✅ Authorized JavaScript origins:
   - https://rekngekjsdsdvgmsznva.supabase.co
   - https://auth.expo.io
   - exp://127.0.0.1:8081
   - exp://192.168.1.11:8081

✅ Authorized redirect URIs:
   - https://rekngekjsdsdvgmsznva.supabase.co/auth/v1/callback
   - https://auth.expo.io/@tdivyanshc/study-sync
   - exp://192.168.1.11:8081/--/auth/callback
   - com.studystreak.app://auth/callback
```

---

## 🔍 DEBUGGING THE EXACT REDIRECT URI

### **Step 1: Check What's Being Generated**

Modify your AuthProvider to log the exact redirect URI:

```typescript
const loginWithGoogle = async (): Promise<void> => {
  setLoading(true);
  try {
    const redirectUri = makeRedirectUri();
    
    console.log('🔍 DEBUGGING REDIRECT URI:');
    console.log('Generated redirect URI:', redirectUri);
    console.log('URI Type:', typeof redirectUri);
    console.log('URI Length:', redirectUri?.length);
    
    // Also check if it's a valid URL
    try {
      new URL(redirectUri);
      console.log('✅ Valid URL format');
    } catch (e) {
      console.log('❌ Invalid URL format:', e.message);
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUri }
    });

    if (error) throw error;

    console.log('🔍 DEBUGGING FULL OAUTH URL:');
    console.log('OAuth URL:', data.url);
    
    // Parse the OAuth URL to see the redirect_uri parameter
    try {
      const url = new URL(data.url);
      const redirectParam = url.searchParams.get('redirect_uri');
      console.log('🔍 Redirect URI in OAuth request:', redirectParam);
      
      if (redirectParam !== redirectUri) {
        console.log('❌ MISMATCH DETECTED:');
        console.log('  Expected:', redirectUri);
        console.log('  Actual:', redirectParam);
      } else {
        console.log('✅ Redirect URI matches');
      }
    } catch (e) {
      console.log('❌ Could not parse OAuth URL:', e.message);
    }

    const { openAuthSessionAsync } = await import('expo-web-browser');
    const result = await openAuthSessionAsync(data.url, redirectUri);
    console.log('🔍 Browser result:', result);
    
  } catch (error: any) {
    console.error('❌ Google login error:', error.message);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

### **Step 2: Check Console Output**

After running this, check your console for:

```
🔍 DEBUGGING REDIRECT URI:
Generated redirect URI: exp://192.168.1.11:8081
URI Type: string
URI Length: 25
✅ Valid URL format
🔍 DEBUGGING FULL OAUTH URL:
OAuth URL: https://rekngekjsdsdvgmsznva.supabase.co/auth/v1/authorize?...
🔍 Redirect URI in OAuth request: exp://192.168.1.11:8081
✅ Redirect URI matches
```

**If you see a mismatch or the redirect URI looks wrong, that's the issue!**

---

## 🛠️ COMMON ISSUES & SOLUTIONS

### **Issue 1: Wrong Redirect URI Format**

**Problem:** `makeRedirectUri()` generating incorrect format
**Solution:** Force specific format:

```typescript
// Try different approaches:
const redirectUri = makeRedirectUri(); // Default
// OR
const redirectUri = makeRedirectUri({ useProxy: true }); // Proxy mode
// OR  
const redirectUri = 'https://auth.expo.io/@tdivyanshc/study-sync'; // Hardcoded
// OR
const redirectUri = 'com.studystreak.app://auth/callback'; // Custom scheme
```

### **Issue 2: IP Address Mismatch**

**Problem:** App generating IP that isn't in Supabase settings
**Solution:** Check your actual development IP:

```bash
# Check your IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Update Supabase Redirect URLs with your actual IP:
# exp://192.168.x.x:8081 (replace x.x with your actual subnet)
```

### **Issue 3: Supabase Project Not Found**

**Problem:** Project URL mismatch
**Solution:** Verify your Supabase project:

```bash
# Check if this URL works in browser:
https://rekngekjsdsdvgmsznva.supabase.co/auth/v1/callback

# Should return JSON like:
{"error":"invalid_request","error_description":"Missing parameter: code"}
```

### **Issue 4: Google OAuth Client Configuration**

**Problem:** Google client not configured for your domain
**Solution:** Update Google Cloud Console:

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add your Supabase domain to authorized origins
4. Add Supabase callback URL to authorized redirect URIs

---

## 🎯 TESTING DIFFERENT APPROACHES

### **Approach 1: Use Expo Proxy (Recommended for Development)**

```typescript
const redirectUri = 'https://auth.expo.io/@tdivyanshc/study-sync';
```

**Requirements:**
- Add `https://auth.expo.io/@tdivyanshc/study-sync` to Supabase Redirect URLs
- Add `https://auth.expo.io` to Google authorized origins

### **Approach 2: Use Custom Scheme (Recommended for Production)**

```typescript
const redirectUri = 'com.studystreak.app://auth/callback';
```

**Requirements:**
- Add `com.studystreak.app://auth/callback` to Supabase Redirect URLs
- Add `com.studystreak.app://auth/callback` to Google authorized redirect URIs
- Ensure app.json has `"scheme": "com.studystreak.app"`

### **Approach 3: Use Local Development URL**

```typescript
// For Expo Go
const redirectUri = 'exp://127.0.0.1:8081'

// For local network
const redirectUri = 'exp://192.168.1.11:8081' // Your actual IP
```

**Requirements:**
- Add the exact IP-based URL to Supabase Redirect URLs
- Add to Google authorized origins and redirect URIs

---

## 🔧 QUICK FIXES TO TRY

### **Fix 1: Reset and Use Hardcoded URL**

```typescript
// Temporarily hardcode to test
const redirectUri = 'https://auth.expo.io/@tdivyanshc/study-sync';
```

### **Fix 2: Check Network Connectivity**

```typescript
// Add to your login function
console.log('🌐 Testing Supabase connectivity...');
try {
  const response = await fetch('https://rekngekjsdsdvgmsznva.supabase.co/rest/v1/');
  console.log('✅ Supabase reachable:', response.status);
} catch (e) {
  console.log('❌ Supabase unreachable:', e.message);
}
```

### **Fix 3: Verify Environment Variables**

```typescript
console.log('🔍 Environment Check:');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('Supabase URL used:', supabaseUrl);
```

---

## 📞 WHEN TO SEEK FURTHER HELP

If after trying all approaches you still get "requested path is invalid":

1. **Check Supabase Dashboard** → Authentication → Providers → Google
2. **Verify Google Cloud Console** → OAuth client configuration  
3. **Compare exact URLs** being sent vs. configured
4. **Check for typos** in URLs (case-sensitive)
5. **Try a fresh Supabase project** to eliminate configuration issues

---

## 🚀 NEXT STEPS

1. **Run the debugging code** above to see the exact redirect URI
2. **Add that exact URI** to your Supabase Google provider settings
3. **Test with hardcoded URL** first to isolate the issue
4. **Verify Google OAuth client** configuration
5. **Check network connectivity** to Supabase

The key is to ensure the redirect URI in your OAuth request EXACTLY matches what's configured in Supabase!