# Mobile-Ready Checklist (Muon Noi Web Core)

## 1) PWA Baseline

- [x] `manifest.json` includes `id`, `display`, `start_url`, `scope`
- [x] Service worker registration in shared UI bootstrap
- [x] Minimal offline cache for app shell files
- [ ] Add dedicated offline fallback page (`/offline.html`)
- [ ] Add app icon set for iOS/Android launchers and splash

## 2) Shared UI Contract

- [x] Single web core remains source of truth (`apps/web`)
- [x] Global native bridge surface (`window.MNNative`)
- [ ] Feature pages progressively replace direct browser APIs with `MNNative` wrappers

## 3) Native Capabilities

- [x] Push bridge stub in web core
- [x] Camera bridge stub in web core
- [x] Biometric bridge placeholder
- [x] Call bridge placeholder
- [ ] Wire plugin-level behavior per platform in Capacitor native projects

## 4) Build & Release

- [x] Capacitor shell scaffold (`mobile-shell`)
- [ ] Add iOS/Android projects (`npx cap add ios|android`)
- [ ] Configure signing (Apple Team, Android keystore)
- [ ] Set up build lanes (manual first, CI later)

## 5) Security & Trust

- [ ] Store only session-safe tokens in secure storage for native shell
- [ ] Pin API domains to `*.muonnoi.org`
- [ ] Define push payload policy (no sensitive payload body)
- [ ] Add biometric fallback UX for unsupported devices

## 6) Route QA for Mobile

- [ ] Smoke route matrix on native WebView: `/`, `/feed/`, `/join/`, `/verify/`, `/complaints/`
- [ ] Validate family/chat release routing against `_redirects`
- [ ] Confirm language/theme persistence across app relaunch
