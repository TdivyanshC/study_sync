# 🚀 **QUICK ACTION: Generate Your SHA-1 Now**

## 📋 **Required Steps (Do These Now)**

Since you're on Windows and Java isn't installed, here's the **fastest path to get your SHA-1**:

### **Step 1: Install Java JDK (2 minutes)**

**Download Link**: https://adoptium.net/temurin/releases/

**Settings**:
- Version: **11 (LTS)**
- JVM: **HotSpot** 
- OS: **Windows**
- Architecture: **x64**
- Package Type: **JDK**

Click **Download** and install the `.msi` file.

### **Step 2: Generate SHA-1 (1 minute)**

Open **new Command Prompt** and run these commands:

```cmd
# Create the android directory
mkdir %USERPROFILE%\.android

# Generate debug keystore
keytool -genkey -v -keystore %USERPROFILE%\.android\debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"

# Get SHA-1 fingerprint
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### **Step 3: Copy Your SHA-1**

Look for this line in the output:

```
Certificate fingerprints:
         SHA1: AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66
```

**Copy the SHA1 line** - this is what you need for Google Console.

### **Step 4: Create Android OAuth Client**

1. **Go to**: https://console.cloud.google.com/apis/credentials
2. **Delete your current "Web Application" OAuth client**
3. **Click "Create Credentials" → "OAuth client ID"**
4. **Select "Android"**
5. **Fill in**:
   - **Name**: `StudySync Mobile`
   - **Package name**: `com.studystreak.app`
   - **SHA-1 certificate**: `Your SHA-1 from Step 3`
6. **Click "Create"**

### **Step 5: Update Supabase**

1. **Go to**: https://app.supabase.com/project/rekngekjsdsdvgmsznva/auth/settings
2. **Authentication → Providers → Google**
3. **Update**:
   - **Client ID**: `[Your NEW Android Client ID]`
   - **Client Secret**: `[Leave Empty]`
4. **Save changes**

### **Step 6: Test**

```cmd
# Restart your Expo app
npx expo start --clear

# Try Google login
```

---

## 🎯 **What You'll See After Fix**

**Before (Web App - Broken)**:
```
LOG 🔄 PKCE Code Challenge: Missing          ❌
LOG 🔍 Periodic session check 1...           ❌
LOG ⏰ OAuth timeout after 60s               ❌
```

**After (Android - Working)**:
```
LOG 🔄 PKCE Code Challenge: Present          ✅
LOG ✅ Session found: user@gmail.com         ✅
LOG ✅ User data loaded successfully        ✅
```

---

## 🚨 **Alternative: Quick SHA-1 from EAS**

If you have EAS installed:

```cmd
# Generate SHA-1 automatically
eas credentials

# Look for "SHA-1 Fingerprint" in output
```

---

## ⚡ **Quick Summary**

1. **Install Java JDK 11** from adoptium.net
2. **Run 2 commands** in Command Prompt
3. **Copy SHA-1 line** from output
4. **Create Android OAuth client** in Google Console
5. **Update Supabase** with new Client ID
6. **Test OAuth** - should work in 5-10 seconds!

**Total time**: ~10 minutes to fix OAuth permanently!

---

**After you get your SHA-1, paste it here and I'll help you create the Android OAuth client!**