# BD Career Hub — Standalone iOS PWA for BDJobs with Passkey Biometrics 🚀

A modern, high-performance Progressive Web App (PWA) client tailored for iPhone / iOS to browse, search, and manage **BDJobs** without opening Safari manually every single time.

Designed according to **Apple Human Interface Guidelines (HIG)** with full-screen standalone mode, notch / dynamic island safe-area padding, on-screen iOS navigation controls, offline bookmarks caching, and a **practical WebAuthn Passkey (Apple Face ID / Touch ID) 1-Tap Login Bridge**.

> [!NOTE]
> **100% Original & Copyright-Free**: This project uses 100% custom-designed vector branding, original geometric emblems, and zero copyrighted logos or proprietary assets from BDJobs.

---

## ✨ Features

- 📱 **Native iOS Standalone Experience**: Runs full-screen with no Safari URL bar or browser chrome when added to your iPhone Home Screen.
- 🏝️ **Notch & Dynamic Island Support**: Calibrated with `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- 🔑 **Practical Passkey & Face ID Login Bridge**:
  - Encrypts your BDJobs login locally with military-grade `AES-256-GCM` via the Web Crypto API.
  - One-tap sign-in into BDJobs using native Apple Face ID / Touch ID via W3C WebAuthn (`navigator.credentials`).
  - Zero external servers: all credentials and keys stay 100% inside your iPhone's Apple Secure Enclave & local sandbox.
- 🧭 **Dedicated On-Screen iOS Navigation**:
  - Integrated on-screen Back, Forward, Refresh, Share, and Bookmark controls (crucial for standalone iOS webviews!).
- 🔍 **Instant Search & Category Launchpad**:
  - Direct filter hubs for *IT & Telecom*, *Banking & Finance*, *Government Circulars*, *NGO / Development*, *Garments / Textile*, *Engineering*, *Remote Jobs*, and *Hot Jobs*.
- 💾 **Offline Caching & Saved Bookmarks**:
  - Save job circulars to local storage with one tap and review them anytime — even when offline or traveling with no network connectivity.

---

## 📲 How to Install on iPhone (Step-by-Step)

1. Open this deployed URL in **Mobile Safari** on your iPhone.
2. Tap the **Share** icon (the square with an upward arrow 􀈂 at the bottom of Safari).
3. Scroll down in the share sheet and select **"Add to Home Screen"** 􀎶.
4. Tap **"Add"** in the top-right corner.
5. The **BD Careers** app icon will appear directly on your iPhone Home Screen! Tap it to launch full-screen.

---

## 🔐 How to Use Passkey / Face ID Login

1. Open the app on your iPhone.
2. Tap **"Face ID Sign In"** in the top header or bottom dock.
3. If not yet linked, enter your BDJobs username and password once.
4. Your iPhone will prompt you to register a Passkey using **Face ID / Touch ID**.
5. Once saved, anytime you need to log in or view applied jobs, simply tap **"Face ID Sign In"** and authenticate with your face!

---

## 🚀 Deployment Options

### 1. GitHub Pages (Free & 1-Click)
1. Push this repository to your GitHub account (`intelQong/Bdjobs-web-pwa`).
2. Go to **Settings** > **Pages**.
3. Under **Source**, select `Deploy from a branch` -> `main` -> `/ (root)`.
4. Click **Save**. GitHub Pages will give you an `https://<user>.github.io/Bdjobs-web-pwa/` link that you can open on your iPhone!

### 2. Vercel / Cloudflare Pages / Netlify
- Import the repo into Vercel or Cloudflare Pages as a static site (Zero build configuration required).

### 3. Local Testing
Run a local static web server:
```bash
python3 -m http.server 8080
# or
npx serve .
```

---

## 📁 Project Structure

```
.
├── index.html               # Main iOS Standalone App Shell & Smart BDJobs Portal
├── manifest.webmanifest     # PWA Manifest with custom icons & shortcuts
├── sw.js                    # Service Worker with offline shell & asset cache
├── offline.html             # Offline fallback page with saved jobs viewer
├── css/
│   ├── app.css              # iOS Native HIG styling, glassmorphism & safe areas
│   ├── passkey.css          # Apple Face ID biometric sheet & quickfill bar
│   └── icons.css            # Icon helper classes
├── js/
│   ├── app.js               # Standalone navigation controller, search & bookmarks
│   ├── passkey.js           # WebAuthn Passkey engine & AES-256 Crypto Vault
│   ├── auth-bridge.js       # Practical 1-Tap Passkey Login Bridge
│   └── pwa.js               # Service Worker & iOS installation lifecycle
├── icons/
│   ├── favicon.svg          # Original vector icon
│   ├── passkey-icon.svg     # Original Face ID biometric icon
│   ├── icon-180.png         # Apple Touch Icon (180x180)
│   ├── icon-192.png         # PWA Manifest Icon (192x192)
│   ├── icon-512.png         # High-res PWA Icon (512x512)
│   ├── icon-maskable.png    # Maskable PWA Icon (512x512)
│   └── apple-touch-icon.png # iOS Home Screen touch icon
├── scripts/
│   └── generate-icons.py    # Icon generator script
└── README.md                # Documentation & User Guide
```

---

## 📄 License

MIT License — Free and Open Source.
