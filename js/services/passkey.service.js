/**
 * BD Career Hub - WebAuthn Passkey Service (js/services/passkey.service.js)
 * Coordinates W3C WebAuthn Level 2/3 platform authenticator ceremonies.
 */

class PasskeyService {
  constructor() {
    this.PASSKEYS_KEY = 'bd_pwa_passkeys';
  }

  isSupported() {
    return !!(
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
      window.crypto &&
      window.crypto.subtle
    );
  }

  async isPlatformAuthenticatorAvailable() {
    if (!this.isSupported()) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }

  async getPasskeys() {
    const list = await window.storageService.get(this.PASSKEYS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  async savePasskeys(list) {
    await window.storageService.set(this.PASSKEYS_KEY, list);
  }

  async registerPasskey(nickname = 'iPhone 11 (Face ID)') {
    if (!this.isSupported()) {
      throw new Error('WebAuthn Passkeys are not supported in this browser environment.');
    }

    const userId = crypto.getRandomValues(new Uint8Array(16));
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    let rpId = window.location.hostname;
    if (rpId === 'localhost' || rpId === '127.0.0.1') {
      rpId = undefined;
    }

    const publicKeyOptions = {
      challenge,
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
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false
      },
      timeout: 60000,
      attestation: 'none'
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions
    });

    if (!credential) {
      throw new Error('Biometric passkey registration was cancelled.');
    }

    const rawIdBase64 = window.cryptoService.bufferToBase64(credential.rawId);
    const passkeyRecord = {
      id: rawIdBase64,
      name: nickname,
      createdAt: new Date().toISOString(),
      type: credential.type,
      transports: credential.response.getTransports ? credential.response.getTransports() : ['internal']
    };

    const passkeys = await this.getPasskeys();
    passkeys.push(passkeyRecord);
    await this.savePasskeys(passkeys);

    window.eventBus.emit('passkey:registered', passkeyRecord);
    return passkeyRecord;
  }

  async authenticate(reason = 'Verify your identity with Face ID') {
    if (!this.isSupported()) {
      throw new Error('WebAuthn Passkeys are not supported on this device.');
    }

    const passkeys = await this.getPasskeys();
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    let rpId = window.location.hostname;
    if (rpId === 'localhost' || rpId === '127.0.0.1') {
      rpId = undefined;
    }

    const allowCredentials = passkeys.map(pk => ({
      id: window.cryptoService.base64ToBuffer(pk.id),
      type: 'public-key',
      transports: pk.transports || ['internal']
    }));

    const publicKeyOptions = {
      challenge,
      ...(rpId ? { id: rpId } : {}),
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
      userVerification: 'required',
      timeout: 60000
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyOptions
    });

    if (!assertion) {
      throw new Error('Biometric verification failed or was cancelled.');
    }

    const result = {
      success: true,
      credentialId: window.cryptoService.bufferToBase64(assertion.rawId),
      timestamp: Date.now()
    };

    window.eventBus.emit('passkey:authenticated', result);
    return result;
  }

  async deletePasskey(id) {
    let passkeys = await this.getPasskeys();
    passkeys = passkeys.filter(pk => pk.id !== id);
    await this.savePasskeys(passkeys);
    window.eventBus.emit('passkey:deleted', id);
  }
}

window.passkeyService = new PasskeyService();
