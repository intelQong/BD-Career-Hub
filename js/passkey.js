/**
 * BD Career Hub - WebAuthn Passkey & Biometric Security Engine (js/passkey.js)
 * Implements W3C WebAuthn Level 2/3 Passkeys (Apple Face ID / Touch ID / Platform Authenticator)
 * and AES-256-GCM Web Crypto Credential Vault.
 */

class PasskeyManager {
  constructor() {
    this.STORAGE_KEY_PASSKEYS = 'bd_pwa_passkeys';
    this.STORAGE_KEY_SETTINGS = 'bd_pwa_security_settings';
    this.STORAGE_KEY_VAULT = 'bd_pwa_encrypted_vault';
    this.STORAGE_KEY_SESSION = 'bd_pwa_auth_session';
    
    this.isSupported = this.checkSupport();
  }

  checkSupport() {
    return !!(
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
      window.crypto &&
      window.crypto.subtle
    );
  }

  async isPlatformAuthenticatorAvailable() {
    if (!this.isSupported) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      console.warn('[Passkey] Platform check error:', e);
      return false;
    }
  }

  // Get current security settings
  getSettings() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('[Passkey] Error reading settings:', e);
    }
    return {
      appLockEnabled: false,
      autoLockMinutes: 5,
      passkeyLoginEnabled: false,
      privacyBlurEnabled: true,
      lastActiveTimestamp: Date.now()
    };
  }

  saveSettings(settings) {
    localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  // List all registered passkeys
  getPasskeys() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_PASSKEYS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  savePasskeys(list) {
    localStorage.setItem(this.STORAGE_KEY_PASSKEYS, JSON.stringify(list));
  }

  /**
   * Register a new Passkey with Apple Face ID / Touch ID / Platform Authenticator
   */
  async registerPasskey(nickname = 'My iPhone (Face ID)') {
    if (!this.isSupported) {
      throw new Error('WebAuthn Passkeys are not supported in this browser.');
    }

    const userId = crypto.getRandomValues(new Uint8Array(16));
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // Get current RP ID (domain) or undefined for localhost/IP
    let rpId = window.location.hostname;
    if (rpId === 'localhost' || rpId === '127.0.0.1') {
      rpId = undefined; // allow localhost
    }

    const publicKeyOptions = {
      challenge: challenge,
      rp: {
        name: 'BD Career Hub',
        ...(rpId ? { id: rpId } : {})
      },
      user: {
        id: userId,
        name: 'user@bdcareer.hub',
        displayName: 'BD Career User'
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256 (Apple default)
        { type: 'public-key', alg: -257 }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Enforce Apple Face ID / Touch ID
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: 'none'
    };

    console.log('[Passkey] Triggering biometric registration...');
    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions
    });

    if (!credential) {
      throw new Error('Passkey registration was cancelled or timed out.');
    }

    const rawIdBase64 = this.bufferToBase64(credential.rawId);
    const passkeyRecord = {
      id: rawIdBase64,
      name: nickname,
      createdAt: new Date().toISOString(),
      type: credential.type,
      transports: credential.response.getTransports ? credential.response.getTransports() : ['internal']
    };

    const passkeys = this.getPasskeys();
    passkeys.push(passkeyRecord);
    this.savePasskeys(passkeys);

    // Also update settings
    const settings = this.getSettings();
    settings.passkeyLoginEnabled = true;
    this.saveSettings(settings);

    return passkeyRecord;
  }

  /**
   * Authenticate / Assert with Passkey (Face ID / Touch ID)
   */
  async authenticatePasskey(reason = 'Verify your identity with Face ID / Passkey') {
    if (!this.isSupported) {
      throw new Error('WebAuthn Passkeys are not supported on this device.');
    }

    const passkeys = this.getPasskeys();
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    let rpId = window.location.hostname;
    if (rpId === 'localhost' || rpId === '127.0.0.1') {
      rpId = undefined;
    }

    const allowCredentials = passkeys.map(pk => ({
      id: this.base64ToBuffer(pk.id),
      type: 'public-key',
      transports: pk.transports || ['internal']
    }));

    const publicKeyOptions = {
      challenge: challenge,
      ...(rpId ? { id: rpId } : {}),
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
      userVerification: 'required',
      timeout: 60000
    };

    console.log('[Passkey] Requesting biometric assertion:', reason);
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyOptions
    });

    if (!assertion) {
      throw new Error('Biometric verification failed or was cancelled.');
    }

    // Record session unlock
    sessionStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify({
      authenticated: true,
      timestamp: Date.now()
    }));

    return {
      success: true,
      credentialId: this.bufferToBase64(assertion.rawId),
      timestamp: Date.now()
    };
  }

  /**
   * Delete a registered passkey
   */
  deletePasskey(id) {
    let passkeys = this.getPasskeys();
    passkeys = passkeys.filter(pk => pk.id !== id);
    this.savePasskeys(passkeys);
    
    if (passkeys.length === 0) {
      const settings = this.getSettings();
      settings.appLockEnabled = false;
      settings.passkeyLoginEnabled = false;
      this.saveSettings(settings);
    }
  }

  /* ==========================================================
     AES-256-GCM Web Crypto Vault for BDJobs Login Helper
     ========================================================== */

  async getMasterCryptoKey() {
    const salt = 'bd-career-hub-salt-v1';
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(salt + (localStorage.getItem('bd_pwa_vault_salt') || 'default-seed')),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Save BDJobs credentials encrypted with AES-256
   */
  async saveEncryptedCredentials(username, password) {
    if (!localStorage.getItem('bd_pwa_vault_salt')) {
      const newSalt = this.bufferToBase64(crypto.getRandomValues(new Uint8Array(16)));
      localStorage.setItem('bd_pwa_vault_salt', newSalt);
    }

    const key = await this.getMasterCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const payload = JSON.stringify({ username, password, updatedAt: Date.now() });

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(payload)
    );

    const vaultData = {
      iv: this.bufferToBase64(iv),
      data: this.bufferToBase64(ciphertext),
      usernameHint: username.length > 3 ? username.substring(0, 3) + '***' : 'User'
    };

    localStorage.setItem(this.STORAGE_KEY_VAULT, JSON.stringify(vaultData));
    return vaultData;
  }

  /**
   * Decrypt BDJobs credentials after Passkey biometric validation
   */
  async getDecryptedCredentials() {
    const rawVault = localStorage.getItem(this.STORAGE_KEY_VAULT);
    if (!rawVault) return null;

    const vaultData = JSON.parse(rawVault);
    const key = await this.getMasterCryptoKey();
    const iv = this.base64ToBuffer(vaultData.iv);
    const ciphertext = this.base64ToBuffer(vaultData.data);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  }

  hasSavedCredentials() {
    return !!localStorage.getItem(this.STORAGE_KEY_VAULT);
  }

  clearCredentials() {
    localStorage.removeItem(this.STORAGE_KEY_VAULT);
  }

  // Check if App Lock is currently triggering
  isAppLocked() {
    const settings = this.getSettings();
    if (!settings.appLockEnabled || this.getPasskeys().length === 0) {
      return false;
    }

    try {
      const sessionRaw = sessionStorage.getItem(this.STORAGE_KEY_SESSION);
      if (!sessionRaw) return true;
      const session = JSON.parse(sessionRaw);
      if (!session.authenticated) return true;

      // Check auto-lock timer
      const now = Date.now();
      const maxAgeMs = (settings.autoLockMinutes || 5) * 60 * 1000;
      if (now - session.timestamp > maxAgeMs) {
        return true;
      }
      return false;
    } catch (e) {
      return true;
    }
  }

  /* Utility Helpers */
  bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export singleton instance
window.passkeyManager = new PasskeyManager();
