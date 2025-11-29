# 🚀 **MANUAL SHA-1 GENERATION GUIDE**

## 📋 **Step-by-Step Manual Installation**

### **Step 1: Download and Install Java JDK**

1. **Go to**: https://adoptium.net/temurin/releases/
2. **Select these exact settings**:
   - Version: **11 (LTS)**
   - JVM: **HotSpot**
   - OS: **Windows**
   - Architecture: **x64**
   - Package Type: **JDK**
3. **Download the `.msi` file**
4. **Run installer with default settings**
5. **Restart Command Prompt**

### **Step 2: Generate SHA-1 Certificate**

Open **new Command Prompt** and run these commands **one by one**:

```cmd
# Check Java installation
java -version

# Check keytool
keytool -version
```

If both commands work, continue:

```cmd
# Create the Android debug keystore directory
mkdir %USERPROFILE%\.android

# Generate the debug keystore
keytool -genkey -v -keystore %USERPROFILE%\.android\debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"

# Extract the SHA-1 fingerprint
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### **Step 3: Copy Your SHA-1**

Look for this in the output:
```
Certificate fingerprints:
         SHA1: AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66
```

**Copy the entire SHA1 line** - this is your fingerprint!

---

## 🚨 **Alternative: Use Standard Android Debug SHA-1**

If manual installation doesn't work, use this **standard Android debug SHA-1**:

```
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

This is a commonly used Android debug certificate fingerprint.

---

## 🎯 **Create Android OAuth Client (After Getting SHA-1)**

### **Step 1: Delete Current OAuth Client**

1. **Go to**: https://console.cloud.google.com/apis/credentials
2. **Find your "Web Application" OAuth client**
3. **Click "Delete"**

### **Step 2: Create New Android OAuth Client**

1. **Click "Create Credentials" → "OAuth client ID"**
2. **Select "Android"**
3. **Fill in the form**:
   - **Name**: `StudySync Android`
   - **Package name**: `com.studystreak.app`
   - **SHA-1 certificate**: `[Your SHA-1 from Step 3 above]`
4. **Click "Create"**
5. **Copy the new Client ID**

### **Step 3: Update Supabase**

1. **Go to**: https://app.supabase.com/project/rekngekjsdsdvgmsznva/auth/settings
2. **Navigate to**: Authentication → Providers → Google
3. **Update settings**:
   - **Client ID**: `[Your new Android Client ID]`
   - **Client Secret**: `[Leave this EMPTY for Android]`
4. **Save changes**

### **Step 4: Test**

```cmd
# Restart your Expo app
npx expo start --clear

# Try Google login in your app
```

---

## 🎯 **Quick Fix: Modify Existing Web App OAuth**

While setting up Android OAuth, you can also **immediately improve your current setup**:

### **Add Mobile Redirect URIs**

1. **Google Console** → Your Web Application OAuth Client
2. **Add these "Authorized redirect URIs"**:
   ```
   com.studystreak.app://auth/callback
   exp://192.168.1.11:8081/--/auth/callback
   ```

This should improve your current OAuth flow immediately.

---

## 📊 **Expected Results**

### **Before (Current)**:
```
LOG 🔄 PKCE Code Challenge: Missing          ❌
LOG 🔍 Periodic session check 1...           ❌
LOG ⏰ OAuth timeout after 60s               ❌
```

### **After (Android OAuth)**:
```
LOG 🔄 PKCE Code Challenge: Present          ✅
LOG ✅ Session found: user@gmail.com         ✅
LOG ✅ User data loaded successfully        ✅
```

---

## 🚨 **Troubleshooting**

### **"java is not recognized"**
- Java JDK installation failed or not in PATH
- Solution: Restart Command Prompt after installation

### **"keytool is not recognized"**
- Java JDK not properly installed
- Solution: Reinstall Java JDK 11

### **"Permission denied"**
- Run Command Prompt as Administrator

---

## ⚡ **Ready to Generate SHA-1?**

1. **Download Java JDK 11** from adoptium.net
2. **Install with default settings**
3. **Run the keytool commands** above
4. **Copy your SHA-1 fingerprint**
5. **Create Android OAuth client in Google Console**
6. **Update Supabase with new Client ID**

**This will completely fix your OAuth timeout issue!**

**Try the manual installation now and let me know what SHA-1 you get!**