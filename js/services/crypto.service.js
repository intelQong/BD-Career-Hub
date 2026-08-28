/**
 * BD Career Hub - Zero-Trust Cryptography Engine (js/services/crypto.service.js)
 * Implements AES-GCM-256 encryption, PBKDF2 key derivation, SHA-256 PIN hashing,
 * and secure in-memory sanitization.
 */

class CryptoService {
  constructor() {
    this.SALT_KEY = 'bd_pwa_vault_salt';
    this.PIN_KEY = 'bd_pwa_security_pin_hash';
  }

  async getSalt() {
    let salt = await window.storageService.get(this.SALT_KEY);
    if (!salt) {
      salt = this.bufferToBase64(crypto.getRandomValues(new Uint8Array(16)));
      await window.storageService.set(this.SALT_KEY, salt);
    }
    return salt;
  }

  async deriveMasterKey() {
    const salt = await this.getSalt();
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode('bd-career-hub-seed-' + salt),
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

  async encryptPayload(dataObject) {
    const key = await this.deriveMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const plaintext = JSON.stringify({ ...dataObject, ts: Date.now() });

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );

    return {
      iv: this.bufferToBase64(iv),
      data: this.bufferToBase64(ciphertext)
    };
  }

  async decryptPayload(encryptedContainer) {
    if (!encryptedContainer || !encryptedContainer.iv || !encryptedContainer.data) {
      throw new Error('Invalid encrypted payload structure');
    }

    const key = await this.deriveMasterKey();
    const iv = this.base64ToBuffer(encryptedContainer.iv);
    const ciphertext = this.base64ToBuffer(encryptedContainer.data);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    const result = JSON.parse(dec.decode(decryptedBuffer));
    return result;
  }

  /* PIN Hash and Verification */
  async hashPIN(pin) {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode('bd-pin-salt-' + pin));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyPIN(pin) {
    const storedHash = await window.storageService.get(this.PIN_KEY);
    if (!storedHash) return false;
    const computed = await this.hashPIN(pin);
    return computed === storedHash;
  }

  async savePIN(pin) {
    if (!pin || pin.length < 4) throw new Error('PIN must be at least 4 digits');
    const hash = await this.hashPIN(pin);
    await window.storageService.set(this.PIN_KEY, hash);
    return true;
  }

  hasPIN() {
    return !!window.storageService.getLocal(this.PIN_KEY);
  }

  /* Secure Memory Wiper */
  zeroMemory(obj) {
    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = '\0'.repeat(obj[key].length);
        }
      }
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

window.cryptoService = new CryptoService();
