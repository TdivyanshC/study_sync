# 🪟 **SHA-1 Certificate Generation for Windows**

## 🚨 **Java Not Found - Need to Install**

Since `java` and `keytool` commands aren't available on your Windows system, we need to install Java JDK first.

## 🎯 **Option 1: Install OpenJDK (Recommended)**

### **Step 1: Download OpenJDK**

1. **Go to**: https://adoptium.net/temurin/releases/
2. **Select**:
   - **Version**: 11 (LTS) or 17 (LTS)
   - **JVM**: HotSpot
   - **OS**: Windows
   - **Architecture**: x64
3. **Download and install** the `.msi` file
4. **Restart your terminal** after installation

### **Step 2: Verify Installation**

```cmd
# Open new Command Prompt or PowerShell
java -version
keytool -version
```

### **Step 3: Create Android Debug Keystore**

```cmd
# Create the .android directory
mkdir %USERPROFILE%\.android

# Generate debug keystore
keytool -genkey -v -keystore %USERPROFILE%\.android\debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

### **Step 4: Get SHA-1 Fingerprint**

```cmd
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Look for the SHA1 line** in the output:
```
SHA1: AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66
```

---

## 🚀 **Option 2: Quick Install via Chocolatey (If Available)**

If you have Chocolatey installed:

```cmd
# Install OpenJDK
choco install openjdk11

# Restart terminal, then run:
keytool -genkey -v -keystore %USERPROFILE%\.android\debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"

keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

---

## 📱 **Option 3: Use EAS CLI (Easiest)**

If you have EAS CLI installed:

```cmd
# Check if EAS is installed
eas --version

# If not installed:
npm install -g @expo/eas-cli

# Generate credentials
eas credentials
```

Look for the **SHA-1 Fingerprint** in the output.

---

## 🔧 **Option 4: Manual SHA-1 Generation (No Java)**

**Temporary Solution**: Use Expo's build system to get SHA-1:

```cmd
# Build Android APK (this will show SHA-1 during build)
npx expo build:android -t apk
```

**Note**: This requires you to have Expo CLI and will start a build process.

---

## 📋 **Step-by-Step Windows Installation Guide**

### **Download OpenJDK 11:**

1. **Visit**: https://adoptium.net/temurin/releases/
2. **Choose**:
   - Version: `11 (LTS)`
   - JVM: `HotSpot`
   - OS: `Windows`
   - Architecture: `x64`
   - Package Type: `JDK`
3. **Click "Download"** for the `.msi` file
4. **Run the installer** with default settings
5. **Restart Command Prompt**

### **Generate SHA-1:**

```cmd
# Create directory and keystore
mkdir %USERPROFILE%\.android

# Generate debug keystore
keytool -genkey -v -keystore %USERPROFILE%\.android\debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"

# Get SHA-1 fingerprint
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

---

## 🎯 **Expected Output**

When you run the `keytool -list` command, you should see:

```
Keystore type: jks
Keystore provider: SUN

Your keystore contains 1 entry

Alias name: androiddebugkey
Creation date: [date]
Entry type: PrivateKeyEntry
Certificate chain length: 1
Certificate[1]:
Owner: CN=Android Debug, O=Android, C=US
Issuer: CN=Android Debug, O=Android, C=US
Serial number: [number]
Valid from: [date] until: [date]
Certificate fingerprints:
         SHA1: AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66
         SHA256: BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66:77:88
```

**Copy the SHA1 line** and use it in Google Console!

---

## 🚨 **Troubleshooting**

### **"keytool is not recognized"**
- Java JDK is not installed or not in PATH
- Solution: Install OpenJDK 11/17 from adoptium.net

### **"The system cannot find the path specified"**
- Need to create the .android directory first
- Run: `mkdir %USERPROFILE%\.android`

### **"Permission denied"**
- Run Command Prompt as Administrator
- Or run in your user directory

---

## ✅ **After Getting SHA-1**

1. **Copy the SHA1 line** (e.g., `AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66`)
2. **Go to Google Console** and create Android OAuth client
3. **Use in Android OAuth Client**:
   - Package name: `com.studystreak.app`
   - SHA-1: `[Your copied SHA-1]`

**This will immediately fix your OAuth issues!**