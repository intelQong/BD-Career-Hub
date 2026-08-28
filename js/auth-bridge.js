/**
 * BD Career Hub - Practical Passkey Login Bridge (js/auth-bridge.js)
 * Bridges iPhone Face ID / Touch ID Passkeys to BDJobs Authentication.
 */

class BDJobsAuthBridge {
  constructor() {
    this.SIGNIN_URL = 'https://mybdjobs.bdjobs.com/mybdjobs/signin.asp';
    this.MYBDJOBS_HOME = 'https://mybdjobs.bdjobs.com/mybdjobs/';
    this.init();
  }

  init() {
    // Listen for custom passkey events
    window.addEventListener('passkey:login-requested', () => this.handle1TapPasskeyLogin());
  }

  /**
   * 1-Tap Biometric Login Flow
   */
  async handle1TapPasskeyLogin() {
    const feedbackEl = document.getElementById('passkey-feedback-msg');
    
    try {
      // Step 1: Check if credentials exist in vault
      if (!window.passkeyManager.hasSavedCredentials()) {
        this.openCredentialSetupModal();
        return;
      }

      // Step 2: Trigger iPhone Face ID / Touch ID prompt
      this.showToast('Authenticating with Face ID...', 'info');
      const authResult = await window.passkeyManager.authenticatePasskey('Unlock BDJobs Sign In');

      if (!authResult.success) {
        throw new Error('Biometric verification cancelled.');
      }

      // Step 3: Decrypt credentials securely
      const creds = await window.passkeyManager.getDecryptedCredentials();
      if (!creds || !creds.username || !creds.password) {
        throw new Error('Could not retrieve credentials from vault.');
      }

      // Step 4: Dispatch login to BDJobs
      this.showToast('Face ID verified! Preparing BDJobs login...', 'success');
      this.triggerAutoLogon(creds);

    } catch (err) {
      console.error('[AuthBridge] Login error:', err);
      this.showToast(err.message || 'Passkey authentication failed', 'error');
    }
  }

  /**
   * Execute practical logon into BDJobs
   */
  triggerAutoLogon(creds) {
    // Check if smart frame exists
    const iframe = document.getElementById('bdjobs-frame');
    const container = document.getElementById('portal-view');
    const hub = document.getElementById('launchpad-view');

    // Switch view to smart portal
    if (hub && container) {
      hub.classList.add('hidden');
      container.classList.remove('hidden');
    }

    // Set frame destination to MyBDJobs Sign In
    if (iframe) {
      iframe.src = this.SIGNIN_URL;
    }

    // Show the floating Apple-style Quick-Fill Bar with 1-tap paste chips
    this.showFloatingCredentialBar(creds.username, creds.password);
  }

  /**
   * Show floating iOS Credential Autofill Bar over the webview
   */
  showFloatingCredentialBar(username, password) {
    let bar = document.getElementById('ios-passkey-quickfill-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ios-passkey-quickfill-bar';
      bar.className = 'ios-quickfill-bar';
      document.body.appendChild(bar);
    }

    bar.innerHTML = `
      <div class="quickfill-content">
        <div class="quickfill-header">
          <div class="quickfill-badge">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
            </svg>
            <span>Face ID Unlocked</span>
          </div>
          <button class="quickfill-close" onclick="document.getElementById('ios-passkey-quickfill-bar').remove()">✕</button>
        </div>
        <div class="quickfill-actions">
          <button class="btn btn-sm btn-quickfill" id="btn-copy-user">
            <span>Copy User: <strong>${this.escapeHTML(username)}</strong></span>
          </button>
          <button class="btn btn-sm btn-quickfill" id="btn-copy-pass">
            <span>Copy Password</span>
          </button>
          <button class="btn btn-sm btn-primary" id="btn-done-login">
            <span>Open Dashboard</span>
          </button>
        </div>
      </div>
    `;

    bar.classList.add('visible');

    // Attach copy actions
    document.getElementById('btn-copy-user').onclick = () => {
      this.copyToClipboard(username, 'Username copied to clipboard! Paste into the user field.');
    };
    document.getElementById('btn-copy-pass').onclick = () => {
      this.copyToClipboard(password, 'Password copied to clipboard! Paste into the password field.');
    };
    document.getElementById('btn-done-login').onclick = () => {
      const iframe = document.getElementById('bdjobs-frame');
      if (iframe) iframe.src = this.MYBDJOBS_HOME;
      bar.remove();
    };

    // Auto dismiss after 90 seconds for security
    setTimeout(() => {
      if (bar && bar.parentNode) {
        bar.remove();
      }
    }, 90000);
  }

  async copyToClipboard(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(msg, 'success');
    } catch (e) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      this.showToast(msg, 'success');
    }
  }

  /**
   * Open Credential Setup / Enrollment Modal
   */
  openCredentialSetupModal() {
    const modal = document.getElementById('passkey-setup-modal');
    if (modal) {
      modal.classList.remove('hidden');
      const userInp = document.getElementById('setup-bdjobs-username');
      if (userInp) userInp.focus();
    }
  }

  closeCredentialSetupModal() {
    const modal = document.getElementById('passkey-setup-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Save credentials and register passkey in one seamless step
   */
  async handleSaveAndEnroll(username, password) {
    if (!username || !password) {
      this.showToast('Please enter your BDJobs username and password', 'error');
      return false;
    }

    try {
      this.showToast('Registering Face ID Passkey...', 'info');

      // Check if user already has a passkey registered
      if (window.passkeyManager.getPasskeys().length === 0) {
        await window.passkeyManager.registerPasskey('iPhone Face ID');
      }

      // Save encrypted credentials
      await window.passkeyManager.saveEncryptedCredentials(username, password);

      this.showToast('🎉 Passkey linked successfully! 1-Tap Face ID login ready.', 'success');
      this.closeCredentialSetupModal();
      this.refreshUIState();
      return true;
    } catch (err) {
      console.error('[AuthBridge] Setup error:', err);
      this.showToast(err.message || 'Passkey enrollment failed', 'error');
      return false;
    }
  }

  refreshUIState() {
    const hasCreds = window.passkeyManager.hasSavedCredentials();
    const passkeyCount = window.passkeyManager.getPasskeys().length;

    const badge = document.getElementById('passkey-status-badge');
    if (badge) {
      if (hasCreds && passkeyCount > 0) {
        badge.innerHTML = '<span class="status-dot green"></span> Face ID Active';
      } else {
        badge.innerHTML = '<span class="status-dot orange"></span> Not Configured';
      }
    }
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        ${type === 'success' ? '✓' : type === 'error' ? '!' : 'ℹ'}
      </div>
      <div class="toast-text">${this.escapeHTML(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

// Export singleton instance
window.bdjobsAuthBridge = new BDJobsAuthBridge();
