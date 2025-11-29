# ✅ CORRECT Supabase Configuration for Expo Go Development

## 🚨 **Site URL Requirement**
Since Supabase **requires** a Site URL, here's what to use for Expo Go development:

### **Site URL** (Required Field):
```
http://localhost:8081
```
**OR** (if you prefer):
```
http://127.0.0.1:8081
```

**Why this works for Expo Go:**
- Site URL is mainly for email templates and general references
- OAuth redirects go to the **Additional Redirect URLs** field
- The `exp://` URLs in Additional Redirect URLs override the Site URL for OAuth

### **Additional Redirect URLs** (Critical Field):
```
exp://127.0.0.1:8081/--/auth/callback
exp://192.168.1.100:8081/--/auth/callback  ← Replace with your IP
com.studystreak.app://auth/callback
```

## 🔧 **Complete Correct Configuration**

### In Supabase Dashboard:

**Site URL**: 
```
http://localhost:8081
```

**Additional Redirect URLs**:
```
exp://127.0.0.1:8081/--/auth/callback
exp://[YOUR_IP]:8081/--/auth/callback
com.studystreak.app://auth/callback
```

## 🎯 **How This Solves Your Issue**

1. **Site URL**: Required by Supabase, used for general references
2. **Additional Redirect URLs**: Where Google actually redirects after OAuth
3. **OAuth Flow**: Google → Supabase → Additional Redirect URL (exp://) → Your Expo Go app

The key insight is that the **Additional Redirect URLs** override the Site URL for OAuth specifically.

## 🚀 **Testing Steps**

1. **Site URL**: Set to `http://localhost:8081`
2. **Additional Redirect URLs**: Add your `exp://` URLs with your IP
3. **Save** in Supabase
4. **Test** OAuth flow from Expo Go

This should resolve the "site can't be reached" error while keeping Supabase happy with the required Site URL!