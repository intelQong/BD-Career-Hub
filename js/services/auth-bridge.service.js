/**
 * BD Career Hub - Auth Bridge Service (js/services/auth-bridge.service.js)
 * Manages the client-side credential vault and auto-fill dispatcher.
 */

class AuthBridgeService {
  constructor() {
    this.VAULT_KEY = 'bd_pwa_encrypted_vault';
  }

  async hasSavedCredentials() {
    const raw = await window.storageService.get(this.VAULT_KEY);
    return !!raw;
  }

  async saveCredentials(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    const encrypted = await window.cryptoService.encryptPayload({ username, password });
    const vaultRecord = {
      iv: encrypted.iv,
      data: encrypted.data,
      userHint: username.length > 3 ? username.substring(0, 3) + '***' : 'User'
    };

    await window.storageService.set(this.VAULT_KEY, vaultRecord);
    window.eventBus.emit('vault:saved', vaultRecord);
    return vaultRecord;
  }

  async getDecryptedCredentials() {
    const vaultRecord = await window.storageService.get(this.VAULT_KEY);
    if (!vaultRecord) return null;

    const payload = await window.cryptoService.decryptPayload(vaultRecord);
    return payload;
  }

  async clearCredentials() {
    await window.storageService.remove(this.VAULT_KEY);
    window.eventBus.emit('vault:cleared');
  }
}

window.authBridgeService = new AuthBridgeService();
