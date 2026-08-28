# BD Career Hub — Standalone iOS PWA for BDJobs with Passkey Biometrics 🚀

A modern, high-performance Progressive Web App (PWA) client tailored for iPhone / iOS to browse, search, and manage **BDJobs** without opening Safari manually every single time.

Designed according to **Apple Human Interface Guidelines (HIG)** with full-screen standalone mode, notch / dynamic island safe-area padding, on-screen iOS navigation controls, an **offline Application Pipeline with private notes**, and a **practical WebAuthn Passkey (Apple Face ID / Touch ID) 1-Tap Login Bridge**.

> [!NOTE]
> **100% Original & Copyright-Free**: This project uses 100% custom-designed vector branding, original geometric emblems, and zero copyrighted logos or proprietary assets from BDJobs.

---

## ✨ Features

- 📱 **Native iOS Standalone Experience**: Runs full-screen with zero browser chrome when added to your iPhone Home Screen.
- 🏝️ **iPhone 11 & Notch / Dynamic Island Calibrated**: Optimized with `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- 🔑 **Practical Passkey & Face ID Login Bridge**:
  - Encrypts your BDJobs login locally with military-grade `AES-256-GCM` via the Web Crypto API.
  - One-tap sign-in into BDJobs using native Apple Face ID / Touch ID via W3C WebAuthn (`navigator.credentials`).
  - **Minimizable Floating Face ID HUD**: The quick-fill widget collapses into a discrete biometric floating bubble over the webview.
  - **Security PIN Backup**: Optional 4-6 digit local PIN fallback if Face ID is unavailable.
  - **Custom Auto-Lock**: Choose between *Immediate*, *1 min*, *5 min*, *15 min*, or *Never*.
- 💼 **Career Pipeline & Private Notes (Offline)**:
  - Track jobs across 5 stages: **Saved** ➔ **Applied** ➔ **Interview** ➔ **Offer** ➔ **Archived**.
  - Add private encrypted notes (interview dates, contacts, expected salary) to any listing.
- 🔍 **Instant Multi-Filter Search & History**:
  - **Recent Searches**: Remembers your recent searches for instant 1-tap re-queries.
  - **Location & Experience Pills**: One-tap filters for *Dhaka*, *Chattogram*, *Freshers*, *Senior (5+ yrs)*, *New Today*, and *Deadline Tomorrow*.
- 🧭 **Dedicated On-Screen iOS Navigation & Haptics**:
  - Integrated on-screen Back, Forward, Refresh, Share, and Save controls with native iOS vibration haptics.
  - Animated top loading progress bar when loading job circulars.

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
│   ├── passkey.css          # Apple Face ID biometric sheet, PIN pad & HUD 2.0
│   └── icons.css            # Icon helper classes
├── js/
│   ├── app.js               # Standalone navigation, search history & application pipeline
│   ├── passkey.js           # WebAuthn Passkey engine, PIN fallback & AES-256 Vault
│   ├── auth-bridge.js       # Practical 1-Tap Passkey Login Bridge (Minimizable HUD)
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
├── LICENSE                  # MIT License
└── README.md                # Documentation & User Guide
```

---

## ⚖️ Open Source & Disclaimer

- **Open Source**: Licensed under the [MIT License](LICENSE) — free for personal and community use.
- **Independent Project**: This is an independent open-source project and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with BDJobs.com Ltd.
- **Intellectual Property**: All trademarks and registered trademarks remain the property of their respective owners. This project contains 100% original code, artwork, and design assets.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page or submit a pull request.
