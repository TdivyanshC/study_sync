# 🔑 **SHA-1 Certificate Fingerprint Guide**

## 🎯 **Option 1: Using Android Debug Keystore (Easiest)**

### **Step 1: Check if debug keystore exists**

```bash
# Navigate to your frontend directory
cd frontend

# Check if debug keystore exists (usually in your home directory)
ls ~/.android/debug.keystore
```

**If it exists**, you'll see the keystore file. If not, continue to Step 2.

### **Step 2: Generate SHA-1 from existing keystore**

```bash
# Run this command to get your SHA-1
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Look for the "SHA1:" line** in the output - that's your fingerprint!

### **Step 3: Create debug keystore if it doesn't exist**

If the keystore doesn't exist, create it:

```bash
# Create the android directory if it doesn't exist
mkdir -p ~/.android

# Generate debug keystore
keytool -genkey -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

Then run the command from Step 2.

---

## 🔧 **Option 2: Using EAS Build (Recommended for Production)**

If you're using EAS Build, the SHA-1 is generated automatically:

```bash
# Install EAS CLI if not already installed
npm install -g @expo/eas-cli

# Login to your Expo account
eas login

# Generate SHA-1 for Android development build
eas credentials
```

**Look for "SHA-1 Fingerprint"** in the output.

---

## 📱 **Option 3: Using Expo Go (Quick Testing)**

For quick testing without building a standalone app:

```bash
# Run this command in your frontend directory
cd frontend

# Check Expo's auto-generated debug certificate
npx expo build:android -t apk
```

**Note**: Expo automatically handles SHA-1 certificates for Expo Go development.

---

## 🎯 **Option 4: Alternative - Get from Expo's Build System**

If you're using EAS:

```bash
# List your build credentials
eas credentials --platform android

# Look for "Android" section and find "SHA-1 Fingerprint"
```

---

## 🔍 **Finding Your SHA-1: What to Look For**

When you run the `keytool` command, look for this pattern:

```
Certificate fingerprints:
         SHA1: AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66
         SHA256: BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66:77:88
```

**Copy the SHA1 line** - that's what you need for Google Console.

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: "keytool: command not found"**

**Solution**: Install Java JDK or add it to PATH

```bash
# Install Java JDK (Ubuntu/Debian)
sudo apt install openjdk-11-jdk

# Or install via Homebrew (macOS)
brew install openjdk@11
```

### **Issue 2: "No such file or directory"**

**Solution**: Create the directory first

```bash
# Create Android directory
mkdir -p ~/.android

# Then generate the keystore
keytool -genkey -v -keystore ~/.android/debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

### **Issue 3: Wrong package name**

**Make sure your package name matches** what's in `frontend/app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.studystreak.app"  // ← Use this exact name in Google Console
    }
  }
}
```

---

## 🎯 **Quick Test: Does Your SHA-1 Work?**

After entering your SHA-1 in Google Console, test it:

1. **Save the OAuth client**
2. **Copy the new Client ID**
3. **Update Supabase with the new Client ID**
4. **Test OAuth in your app**

If it works immediately (5-10 seconds), you have the right SHA-1!

---

## 🔄 **Backup Solution: Web App OAuth with Mobile Support**

If you can't get the SHA-1 working immediately, you can also modify your existing Web Application OAuth client:

### **In Google Console → Your Web Application OAuth Client**:

1. **Add Authorized redirect URIs**:
   ```
   com.studystreak.app://auth/callback
   exp://192.168.1.11:8081/--/auth/callback
   ```

2. **Keep using your existing Client ID and Secret in Supabase**

This will work as a temporary solution while you set up the proper Android OAuth client!