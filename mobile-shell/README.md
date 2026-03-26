# Muon Noi Mobile Shell (Capacitor)

This folder hosts the iOS/Android shell that wraps the shared web UI from `apps/web`.

## Goal

- Keep one core UI and behavior layer (`apps/web`)
- Add native capabilities via Capacitor plugins
- Ship iOS and Android without forking product logic
- Mobile app brand name: `muonnoi`
- Brand logo source: `apps/web/assets/muonnoi-mn-logo.svg`

## Local prerequisites

- Xcode (full app) for `xcodebuild` / iOS simulator builds
- Java runtime + Android SDK for Gradle Android builds

## Quick Start

1. Install dependencies:

```bash
cd mobile-shell
npm install
```

2. Add native projects (first time only):

```bash
npm run cap:add:ios
npm run cap:add:android
```

3. Sync web assets and plugins:

```bash
npm run cap:sync
```

4. Open native IDE projects:

```bash
npm run cap:open:ios
npm run cap:open:android
```

## Bridge Contract (Web -> Native)

The shared web layer exposes `window.MNNative` from `apps/web/assets/ui.js`.

- `MNNative.isNative()`
- `MNNative.platform()`
- `MNNative.pushEnable()`
- `MNNative.cameraPickPhoto()`
- `MNNative.biometricVerify()` (placeholder)
- `MNNative.callStart(kind)` (placeholder)

Use this contract so feature code stays portable between web and native shells.
