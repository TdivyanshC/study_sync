# 🔧 Supabase OAuth Configuration Guide

## Google OAuth Setup Instructions

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**

### Step 2: Configure Site URLs and Redirect URLs

#### Site URL Settings:
- **Site URL**: `http://localhost:8081` (for development)
- **Site URL**: `https://your-production-domain.com` (for production)

#### Redirect URLs (Additional URLs):
Add these redirect URLs in the "Additional Redirect URLs" field:

**For Development:**
```
http://localhost:8081/auth/callback
http://localhost:8081/auth/callback#access_token=ACCESS_TOKEN&refresh_token=REFRESH_TOKEN
exp://127.0.0.1:8081/--/auth/callback
```

**For Production:**
```
https://your-production-domain.com/auth/callback
https://your-production-domain.com/auth/callback#access_token=ACCESS_TOKEN&refresh_token=REFRESH_TOKEN
```

### Step 3: Enable Google Provider
1. Go to **Authentication** → **Providers**
2. Find **Google** and toggle it to **Enable**

### Step 4: Configure Google OAuth Credentials

#### Option A: Google Cloud Console Setup (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen if not done
6. Set Authorized JavaScript origins:
   - `http://localhost:8081` (development)
   - `https://your-production-domain.com` (production)
7. Set Authorized redirect URIs:
   - `https://rekngekjsdsdvgmsznva.supabase.co/auth/v1/callback`
8. Copy the **Client ID** and **Client Secret**

#### Option B: Supabase-Generated Credentials
1. In Supabase Google provider settings, click "Generate URL"
2. This will generate a Google OAuth URL with pre-configured settings
3. Follow the URL to set up Google OAuth automatically

### Step 5: Add Credentials to Supabase
In the Google provider settings:
1. **Client ID**: Paste your Google OAuth Client ID
2. **Client Secret**: Paste your Google OAuth Client Secret
3. Click **Save**

### Step 6: Test the Configuration

#### Test URL (replace with your values):
```
https://accounts.google.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://rekngekjsdsdvgmsznva.supabase.co/auth/v1/callback&response_type=code&scope=openid%20profile%20email&state=SUPABASE_STATE
```

### Step 7: Verify Configuration
1. Save all settings in Supabase
2. Test with your application
3. Check browser console for any OAuth errors

## 🔧 Additional Configuration

### For Expo/React Native Development
Add these settings to your `app.json`:

```json
{
  "expo": {
    "scheme": "studystreak",
    "userInterfaceStyle": "automatic",
    "web": {
      "bundler": "metro",
      "favicon": "./assets/favicon.png"
    }
  }
}
```

### Environment-Specific URLs

#### Development:
- Site URL: `http://localhost:8081`
- Redirect URLs: `http://localhost:8081/auth/callback`

#### Production:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/auth/callback`

## 🚨 Common Issues and Solutions

### Issue 1: "redirect_uri_mismatch"
**Solution**: Ensure redirect URLs in Google Console exactly match Supabase settings

### Issue 2: "unauthorized_client"
**Solution**: Verify Client ID and Client Secret are correct

### Issue 3: Google OAuth not redirecting back
**Solution**: Check that callback URL `/auth/callback` exists in your app

### Issue 4: WebCrypto warnings
**Solution**: Already fixed - using implicit flow instead of PKCE

## 📱 Mobile Development Notes

For testing on mobile devices, you may need:
1. Expo development build with proper deep linking
2. Custom URL scheme configured in `app.json`
3. Physical device testing rather than emulator

## ✅ Final Checklist

- [ ] Site URL configured correctly
- [ ] Additional redirect URLs added
- [ ] Google provider enabled
- [ ] Google OAuth credentials obtained
- [ ] Credentials entered in Supabase
- [ ] Settings saved in Supabase
- [ ] Callback route `/auth/callback` implemented
- [ ] App configuration updated (scheme, etc.)

Once configured, Google OAuth should work properly with your StudySync application!