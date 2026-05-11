# Muôn Nơi Release — Unblocking Guide

**Status**: 2026-05-11 10:45 ICT  
**Current State**: iOS & Android core builds pass, but external blockers prevent release

---

## 🔴 Critical Blockers

### 1. iOS TestFlight Release (Blocker: Apple Developer Team ID + Signing)

**Current State**:
- ✅ Debug build succeeds
- ✅ All 8 routes validate (HTTP 200)
- ✅ API contracts verified
- ❌ Release archive requires code signing
- ❌ No signing certificates installed (0 valid identities)

**Required Steps**:

```bash
# Step 1: Provide Apple Developer Team ID
# You must have:
# - Apple Developer account (developer.apple.com)
# - Team ID (format: XXXXXXXXXX, 10 characters)

# Step 2: Set Team ID in Xcode project
# Option A: Command line
cd /Users/tranhatam/Documents/Devnewproject/muonnoi.org/app.muonnoi.org/mobile-shell/ios/App
xcodebuild -scheme App -showBuildSettings | grep DEVELOPMENT_TEAM

# Option B: Xcode GUI
# - Open App.xcodeproj in Xcode
# - Select "App" target
# - Go to "Signing & Capabilities"
# - Under "Team", click dropdown and select your Apple Developer Team

# Step 3: Install signing certificates (if not auto-managed)
# - Download signing certificates from Apple Developer portal
# - Double-click to install in Keychain
# - Verify installation:
security find-identity -p codesigning -v

# Step 4: Build archive
cd /Users/tranhatam/Documents/Devnewproject/muonnoi.org/app.muonnoi.org/mobile-shell/ios/App
xcodebuild -scheme App -configuration Release -archivePath build/App.xcarchive archive

# Step 5: Validate & export
xcodebuild -exportArchive -archivePath build/App.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/Release

# Step 6: Upload to TestFlight via Xcode Organizer or App Store Connect API
```

**Timeline**: 1-2 hours (after Team ID + certs provided)

---

### 2. Android Beta Release (Blocker: Android SDK Not Found)

**Current State**:
- ✅ Java 21 installed and verified
- ✅ Gradle wrapper functional
- ❌ Android SDK missing → `ANDROID_HOME` not set
- ❌ `local.properties` not configured

**Required Steps**:

```bash
# Step 1: Install Android SDK (one of the following)

# Option A: Via Android Studio (recommended for Mac)
# - Download Android Studio from https://developer.android.com/studio
# - Run installer
# - Complete setup wizard (SDK is installed automatically)
# - Note the SDK location (usually ~/Library/Android/sdk)

# Option B: Via Command Line Tools
# - Download from https://developer.android.com/studio
# - Extract to desired location
# - Run: `sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"`

# Step 2: Set ANDROID_HOME environment variable
# Add to ~/.zshrc (or ~/.bash_profile):
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH

# Then reload shell:
source ~/.zshrc

# Verify installation:
echo $ANDROID_HOME
ls $ANDROID_HOME

# Step 3: Create local.properties file
cat > /Users/tranhatam/Documents/Devnewproject/muonnoi.org/app.muonnoi.org/mobile-shell/android/local.properties << 'EOF'
sdk.dir=/Users/$(whoami)/Library/Android/sdk
EOF

# Step 4: Try build again
cd /Users/tranhatam/Documents/Devnewproject/muonnoi.org/app.muonnoi.org/mobile-shell
npm run build:android:debug

# Expected output: APK generated at android/app/build/outputs/apk/debug/app-debug.apk

# Step 5: Install on physical Android device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Step 6: Test on device
adb shell am start -n org.muonnoi.app/.MainActivity
```

**Timeline**: 2-4 hours (including Android Studio download + setup + build + device testing)

---

### 3. iOS Physical Device Testing (Blocker: Hardware + Xcode configuration)

**Current State**:
- ✅ Simulator debug build works
- ❌ iOS simulator app installation hangs (infrastructure issue)
- ❌ Physical device not connected

**Required Steps**:

```bash
# Step 1: Connect physical iPhone via USB
# - Plug in iPhone
# - Trust device on iPhone screen
# - Verify connection in Xcode

# Step 2: Select device in Xcode
# - Open App.xcodeproj
# - Click top-left scheme selector
# - Choose your physical device

# Step 3: Build and run on device
cd /Users/tranhatam/Documents/Devnewproject/muonnoi.org/app.muonnoi.org/mobile-shell/ios/App
xcodebuild -scheme App -configuration Debug -destination 'platform=iOS,id=<DEVICE_ID>' install

# Or use Xcode GUI:
# - Press Cmd+R to build and run
# - Watch for build completion
# - App should launch on physical device

# Step 4: Smoke test all routes
# Once app launches on device, test:
# - [x] / (Feed)
# - [x] /feed/
# - [x] /join/
# - [x] /verify/
# - [x] /complaints/
# - [x] /create/
# - [x] /commit/
# - [x] /admin/

# Step 5: Test native features
# - Push notification registration
# - Camera access
# - Biometric prompt
# - Call launcher

# Expected: All routes load, native features work
```

**Timeline**: 30 minutes - 1 hour (physical device + testing)

---

### 4. Android Physical Device Testing (Blocker: Hardware + adb)

**Current State**:
- ❌ APK not yet built (SDK blocker, see #2)
- ❌ Android device not connected

**Required Steps**:

```bash
# Step 1: Connect physical Android device via USB
# - Enable USB Debugging in Developer Options
# - Plug in phone
# - Verify connection:
adb devices

# Step 2: Install app from APK
adb install /Users/tranhatam/Documents/Devnewproject/muonnoi.org/app.muonnoi.org/mobile-shell/android/app/build/outputs/apk/debug/app-debug.apk

# Step 3: Launch app
adb shell am start -n org.muonnoi.app/.MainActivity

# Step 4: Smoke test (same as iOS)
# [x] / /feed/ /join/ /verify/ /complaints/ /create/ /commit/ /admin/

# Expected: All routes load, no crashes

# Step 5: For production release (Google Play)
# - Sign APK with release keystore
# - Create Play Store listing
# - Upload to internal testing track
# - Invite testers
```

**Timeline**: 45 minutes - 2 hours (including APK signing for production)

---

### 5. AI Pages DNS CNAME Propagation (Blocker: DNS TTL)

**Current State**:
- ❌ CNAME record updated but not yet live
- ❌ `dig ai.muonnoi.org` shows A record to Cloudflare edge IP
- ❌ Live CSP still points to old endpoint `https://api.nhachung.org`

**Wait Period**: 24-48 hours (standard DNS TTL)

**Verification**:
```bash
# Check CNAME propagation
dig +short CNAME ai.muonnoi.org
# Should return: nhachung-landing.pages.dev

# Check live CSP
curl -I https://ai.muonnoi.org/ | grep content-security-policy
# Should contain: connect-src 'self' https://api.muonnoi.org
```

**Timeline**: Passive, no action required (DNS propagation in progress)

---

## 📋 Release Checklist

### iOS TestFlight Submission (when blockers resolved)

- [ ] Apple Developer Team ID provided
- [ ] Signing certificates installed (`security find-identity` shows valid identities)
- [ ] Release archive builds successfully
- [ ] TestFlight submission with required screenshots & description
- [ ] Approval from app review (1-24 hours)
- [ ] TestFlight beta available to testers

### Android Internal Testing (when blockers resolved)

- [ ] Android SDK installed & ANDROID_HOME set
- [ ] `npm run build:android:debug` succeeds with APK output
- [ ] APK installed on physical device
- [ ] All routes tested on physical Android device
- [ ] Release APK signed (requires keystore configuration)
- [ ] Google Play internal testing track created
- [ ] APK uploaded to Play Store

---

## 🎯 Recommended Order of Operations

**Immediate** (no external blockers):
1. ✅ Web app routes validated
2. ✅ API contracts verified
3. ✅ iOS debug build succeeds
4. ✅ Java 21 configured
5. ✅ Capacitor sync clean

**Quick Win** (1-2 hours):
1. Provide Apple Developer Team ID
2. Configure iOS signing in Xcode
3. Build release archive

**Medium** (2-4 hours):
1. Install Android SDK
2. Configure ANDROID_HOME
3. Build Android APK

**Long Tail** (time-dependent):
1. iOS physical device testing (when SDK/signing done)
2. Android physical device testing (when SDK/APK done)
3. DNS propagation monitoring (passive)

---

## 📞 Support

If you encounter errors during setup:

1. **iOS errors**: Check Xcode console (Cmd+Shift+Y) for detailed logs
2. **Android errors**: Run `./gradlew build --scan` for full diagnostics
3. **DNS errors**: Use `dig`, `nslookup`, or online DNS tools
4. **Device connection**: Run `xcode-select --install` or `adb devices`

---

Generated: 2026-05-11 10:45 ICT
