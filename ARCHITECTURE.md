# BD Career Hub — System Architecture Blueprint 🏛️

This document describes the high-level system design, modular component hierarchy, data-flow pipelines, and security threat models of the **BD Career Hub Progressive Web App**.

---

## 🏗️ 1. High-Level Architectural Diagram

```mermaid
graph TD
    subgraph Client Layer [iOS Standalone PWA Shell]
        UI[App Shell Viewport]
        Router[View Router State Machine]
        PipelineUI[Career Pipeline & Notes UI]
        QuickFill[Floating Passkey QuickFill HUD]
    end

    subgraph Core Layer [Core Engine]
        Store[Reactive State Store]
        EventBus[Global Event Bus]
    end

    subgraph Service Layer [Services & Hardware Security]
        PasskeyService[WebAuthn Passkey Service]
        CryptoService[Zero-Trust AES-256 Crypto Engine]
        AuthBridgeService[1-Tap Login Bridge Service]
        StorageService[Unified Storage: IndexedDB + LocalStorage]
        NotificationEngine[Toast & Haptics Engine]
    end

    subgraph iOS Native Enclave [Apple iOS Subsystem]
        FaceID[TrueDepth Camera / Apple Secure Enclave]
        iCloudKey[iCloud Keychain / Platform Credential]
        PWAEngine[WebKit Standalone WebClip]
    end

    subgraph Target Host [BDJobs Web Portal]
        BDJobsWeb[jobs.bdjobs.com / mybdjobs.bdjobs.com]
    end

    UI --> Router
    Router --> Store
    Store <--> EventBus
    PipelineUI <--> StorageService
    QuickFill <--> AuthBridgeService
    AuthBridgeService <--> CryptoService
    AuthBridgeService <--> PasskeyService
    PasskeyService <--> FaceID
    PasskeyService <--> iCloudKey
    UI --> PWAEngine
    UI -.->|Secure Sandboxed Webview| BDJobsWeb
```

---

## 🧱 2. Component Directory Hierarchy

```
js/
├── core/
│   ├── store.js             # Reactive central state store (Unidirectional data-flow)
│   └── event-bus.js         # Decoupled global event emitter (PubSub)
├── services/
│   ├── storage.service.js   # Asynchronous IndexedDB + LocalStorage fallback
│   ├── crypto.service.js    # AES-256-GCM, PBKDF2 derivation & memory zeroing
│   ├── passkey.service.js   # W3C WebAuthn Level 2/3 biometric ceremonies
│   └── auth-bridge.service.js # 1-Tap Face ID credential vault & auto-login dispatcher
├── ui/
│   ├── router.js            # View state machine (Launchpad, Portal, Pipeline, Modals)
│   ├── pipeline.js          # 5-stage career pipeline & notes manager
│   └── notifications.js     # Unified iOS Toast & Haptic feedback system
├── app.js                   # Application coordinator & entrypoint
├── passkey.js               # Backward-compatible facade
├── auth-bridge.js           # Backward-compatible facade
└── pwa.js                   # Service Worker & PWA lifecycle coordinator
```

---

## 🔒 3. Biometric Passkey & Encryption Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as User (iPhone 11)
    participant UI as QuickFill HUD
    participant AuthBridge as AuthBridge Service
    participant Passkey as Passkey Service
    participant Enclave as Apple Secure Enclave
    participant Crypto as Web Crypto Engine
    participant Storage as IndexedDB Storage

    User->>UI: Tap "Face ID Sign In"
    UI->>AuthBridge: Request biometric login
    AuthBridge->>Passkey: Authenticate with platform credential
    Passkey->>Enclave: navigator.credentials.get()
    Enclave-->>User: Present Native Face ID Sheet
    User-->>Enclave: Biometric Verification
    Enclave-->>Passkey: Return assertion signature
    Passkey-->>AuthBridge: Assertion verified
    AuthBridge->>Storage: Fetch AES-256 encrypted vault payload
    Storage-->>AuthBridge: Return { iv, data }
    AuthBridge->>Crypto: Decrypt payload using derived master key
    Crypto-->>AuthBridge: Return { username, password }
    AuthBridge->>UI: Populate 1-tap copy/auto-fill chips
    Note over AuthBridge,Crypto: Plaintext credentials zeroed from memory on completion
```

---

## ⚡ 4. Storage Architecture (Hybrid IndexedDB + LocalStorage)

- **IndexedDB**: Asynchronous non-blocking storage for large payloads, career pipeline listings, and custom notes.
- **LocalStorage**: Instant synchronous read on startup for fast bootstrap before DOM ready.
- **Quota Resilience**: Automatic fallback gracefully handles private browsing quota limits without throwing runtime exceptions.

---

## 🛡️ 5. Zero-Trust Security Guarantees

1. **Client-Side Isolation**: No third-party servers, no analytics beacons, zero telemetry.
2. **Hardware-Tied Keys**: WebAuthn private keys are held exclusively inside Apple's Secure Enclave.
3. **Memory Sanitization**: Plaintext credentials decrypted in RAM are zeroed upon session completion or auto-dismiss timeout.
