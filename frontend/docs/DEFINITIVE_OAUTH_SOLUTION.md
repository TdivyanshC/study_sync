# 🎯 DEFINITIVE SOLUTION: OAuth "Site Can't Be Reached" Error

## 🚨 **Root Cause Analysis**

The error occurs because:
1. **Supabase fallback mechanism**: When redirect URL doesn't match configured URLs exactly
2. **IP address mismatch**: Your app generates `exp://192.168.1.100:8081/--/auth/callback` but Supabase may be configured for a different IP
3. **Site URL fallback**: Supabase falls back to `http://localhost:8081` (Site URL)
4. **Mobile device can't reach localhost**: Your phone can't access your computer's localhost

## ✅ **SOLUTION 1: Dynamic IP Configuration (Recommended)**

### Step 1: Update the AuthProvider to use environment variable for IP

**Replace the redirect URL generation in `frontend/providers/AuthProvider.tsx`:**

```typescript
// Helper function to generate redirect URL using Expo Linking
const getRedirectUrl = () => {
  // Get IP from environment variable or use Expo's built-in methods
  const developmentHost = process.env.EXPO_PUBLIC_DEV_HOST || '192.168.1.100';
  const redirectUrl = `exp://${developmentHost}:8081/--/auth/callback`;
  
  console.log("🔧 Using development host:", developmentHost);
  console.log("🔧 Generated Redirect URL:", redirectUrl);
  
  return redirectUrl;
};
```

### Step 2: Add environment variable for your IP

**Create `frontend/.env` file:**
```
EXPO_PUBLIC_DEV_HOST=192.168.1.100  # Replace with your actual IP
```

### Step 3: Update Supabase Additional Redirect URLs

**Set EXACTLY these URLs in Supabase:**
```
exp://192.168.1.100:8081/--/auth/callback
exp://127.0.0.1:8081/--/auth/callback
com.studystreak.app://auth/callback
```

**Replace `192.168.1.100` with your actual IP address**

## ✅ **SOLUTION 2: Use ngrok Tunneling (More Reliable)**

### Step 1: Install ngrok
```bash
npm install -g ngrok
```

### Step 2: Start your Expo development server
```bash
npx expo start --port 8081
```

### Step 3: In a separate terminal, start ngrok tunnel
```bash
ngrok http 8081
```

### Step 4: Get your ngrok URL
- ngrok will show: `Forwarding: https://abc123.ngrok.io -> http://localhost:8081`

### Step 5: Configure Supabase with ngrok URL

**Site URL**: `https://abc123.ngrok.io`

**Additional Redirect URLs**:
```
https://abc123.ngrok.io/auth/callback
https://abc123.ngrok.io/auth/callback?token=abc123  # if needed
```

## ✅ **SOLUTION 3: Expo Development Build (Production-like)**

### Step 1: Create development build
```bash
eas build --platform android --profile development
# or
eas build --platform ios --profile development
```

### Step 2: Configure production URLs in Supabase

**Site URL**: `https://yourapp.com` (or any production domain)

**Additional Redirect URLs**:
```
com.studystreak.app://auth/callback
```

## 🔍 **Debug the Current Issue**

To understand exactly what's happening, add this logging to your `loginWithGoogle` function:

```typescript
const loginWithGoogle = async (): Promise<void> => {
  // ... existing code ...

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { 
      redirectTo: redirectUrl,
      ...(useProxy && { useProxy: true }),
    }
  });

  // Add this debugging:
  console.log("🔍 OAuth Response Debug:");
  console.log("  - Data URL:", data?.url);
  console.log("  - Redirect URL passed:", redirectUrl);
  console.log("  - Error:", error);

  if (data?.url) {
    console.log("🔍 Full OAuth URL:", data.url);
    // Look for 'redirect_uri=' parameter in this URL
    const urlMatch = data.url.match(/redirect_uri=([^&]*)/);
    if (urlMatch) {
      console.log("🔍 Actual redirect URI:", decodeURIComponent(urlMatch[1]));
    }
  }
};
```

This will show you exactly what redirect URI is being sent to Google, which should match your Supabase configuration.

## 🚀 **Recommended Action Plan**

1. **Quick Fix**: Use **Solution 1** (Dynamic IP) - update your `.env` file and restart
2. **More Reliable**: Use **Solution 2** (ngrok) - works across different networks
3. **Production Testing**: Use **Solution 3** (Development Build) - simulates production environment

Start with Solution 1 as it's the quickest to implement!