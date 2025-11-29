# 🚨 CRITICAL: Site URL vs Redirect URLs - Clear Explanation

## ❌ **DO NOT USE THIS AS SITE URL**
**Site URL**: `exp://127.0.0.1:8081/` ← **WRONG!**

## ✅ **CORRECT Configuration**

### **Site URL Field** (This should be EMPTY for Expo Go)

**What Site URL is for:**
- The main website URL where your app is hosted
- Used for things like email templates and general redirects
- For **Expo Go development**: Leave this **EMPTY** or set to production domain
- For **production**: Set to your actual domain like `https://yourapp.com`

**For your current setup:**
```
Site URL: [LEAVE EMPTY] ← This is correct!
```

### **Additional Redirect URLs Field** (This is where you put the exp:// URLs)

**What Additional Redirect URLs are for:**
- Where OAuth flows should redirect AFTER authentication
- These are the URLs that Google will call after user logs in
- These SHOULD be the `exp://` URLs

**For your current setup:**
```
Additional Redirect URLs:
exp://127.0.0.1:8081/--/auth/callback
exp://[YOUR_IP]:8081/--/auth/callback
com.studystreak.app://auth/callback
```

## 🔍 **The Difference in Plain English**

**Site URL**: "Where is my app hosted?"
- Expo Go: Not hosted anywhere (it's a development app on your phone)
- Production: `https://yourcompany.com`

**Additional Redirect URLs**: "Where should OAuth redirect the user after login?"
- Always the `exp://` URLs for mobile apps
- Or `https://yourcompany.com/auth/callback` for web

## 📱 **For Your Expo Go Setup**

### **Site URL** (leave empty):
```
[Empty] ← Correct for Expo Go development
```

### **Additional Redirect URLs**:
```
exp://127.0.0.1:8081/--/auth/callback
exp://192.168.1.100:8081/--/auth/callback  ← Replace with your IP
com.studystreak.app://auth/callback
```

## 🎯 **Summary**

- **Site URL**: Empty (Expo Go) or production domain (production)
- **Additional Redirect URLs**: The `exp://` URLs for mobile OAuth

This separation ensures OAuth works correctly for mobile development!