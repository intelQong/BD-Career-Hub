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
    window.addEventListener('passkey:login-requested', () => this.handle1TapPasskeyLogin());

    // Subscribe to store updates to sync UI
    window.appStore?.subscribe((state, prev) => {
      if (state.isAuthenticated !== prev.isAuthenticated || state.currentUser !== prev.currentUser) {
        this.renderAuthStatusUI(state);
      }
    });

    // Initial render
    setTimeout(() => {
      if (window.appStore) {
        this.renderAuthStatusUI(window.appStore.getState());
      }
    }, 50);
  }

  /**
   * 1-Tap Biometric Login Flow
   */
  async handle1TapPasskeyLogin() {
    try {
      if (!window.passkeyManager.hasSavedCredentials()) {
        this.openCredentialSetupModal();
        return;
      }

      this.triggerHaptic(20);
      this.showToast('Authenticating with Face ID...', 'info');
      const authResult = await window.passkeyManager.authenticatePasskey('Unlock BDJobs Sign In');

      if (!authResult.success) {
        throw new Error('Biometric verification cancelled.');
      }

      const creds = await window.passkeyManager.getDecryptedCredentials();
      if (!creds || !creds.username || !creds.password) {
        throw new Error('Could not retrieve credentials from vault.');
      }

      // Record authenticated state in reactive store & session
      window.appStore.setState({
        isAuthenticated: true,
        currentUser: creds.username
      });

      sessionStorage.setItem('bd_pwa_auth_session', JSON.stringify({
        authenticated: true,
        user: creds.username,
        timestamp: Date.now()
      }));

      this.triggerHaptic([30, 50, 30]);
      this.showToast(`Signed in as ${creds.username}! Opening BDJobs...`, 'success');
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
    const iframe = document.getElementById('bdjobs-frame');
    const container = document.getElementById('portal-view');
    const hub = document.getElementById('launchpad-view');

    if (hub && container) {
      hub.classList.add('hidden');
      container.classList.remove('hidden');
    }

    if (iframe) {
      if (window.appController) {
        window.appController.startProgressBar();
      }
      iframe.src = this.SIGNIN_URL;
    }

    this.showFloatingCredentialBar(creds.username, creds.password);
  }

  /**
   * Render reactive Auth buttons and Launchpad hero card
   */
  renderAuthStatusUI(state) {
    const headerBtn = document.getElementById('header-auth-btn');
    const headerText = document.getElementById('header-auth-text');
    const headerIcon = document.getElementById('header-auth-icon');

    const heroCard = document.getElementById('launchpad-auth-card');
    const heroTitle = document.getElementById('launchpad-auth-title');
    const heroSub = document.getElementById('launchpad-auth-sub');
    const heroBtn = document.getElementById('launchpad-auth-btn');

    if (state.isAuthenticated) {
      // 1. Update Header Button to Active Profile
      if (headerBtn) {
        headerBtn.classList.add('authenticated-active');
        headerBtn.onclick = () => window.appController.navigateTo(this.MYBDJOBS_HOME);
      }
      if (headerText) {
        headerText.textContent = 'My Profile';
      }
      if (headerIcon) {
        headerIcon.innerHTML = '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/>';
      }

      // 2. Update Launchpad Hero Banner
      if (heroTitle) {
        heroTitle.innerHTML = `✅ Signed In (${this.escapeHTML(state.currentUser || 'Active')})`;
      }
      if (heroSub) {
        heroSub.textContent = 'Face ID Active • 1-Tap access to applied jobs and profile';
      }
      if (heroBtn) {
        heroBtn.innerHTML = `<span>Open Profile</span>`;
        heroBtn.onclick = () => window.appController.navigateTo(this.MYBDJOBS_HOME);
      }
    } else {
      // Reset to Sign In
      if (headerBtn) {
        headerBtn.classList.remove('authenticated-active');
        headerBtn.onclick = () => this.handle1TapPasskeyLogin();
      }
      if (headerText) {
        headerText.textContent = 'Face ID Sign In';
      }
      if (headerIcon) {
        headerIcon.innerHTML = '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>';
      }

      if (heroTitle) {
        heroTitle.textContent = '1-Tap Face ID Sign In';
      }
      if (heroSub) {
        heroSub.textContent = 'Biometrically sealed with Apple Secure Enclave & WebAuthn.';
      }
      if (heroBtn) {
        heroBtn.innerHTML = `<span>Sign In</span>`;
        heroBtn.onclick = () => this.handle1TapPasskeyLogin();
      }
    }

    this.refreshUIState();
  }

  /**
   * Sign out / Lock Session
   */
  signOut() {
    sessionStorage.removeItem('bd_pwa_auth_session');
    window.appStore?.setState({
      isAuthenticated: false,
      currentUser: ''
    });
    this.triggerHaptic(20);
    this.showToast('Session locked. Tap Face ID to sign in again.', 'info');
  }

  /**
   * Show floating iOS Credential Autofill Bar 2.0 (Minimizable)
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
      <div class="minimized-bubble-icon" onclick="window.bdjobsAuthBridge.toggleQuickfillMinimize()">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
        </svg>
      </div>
      <div class="quickfill-content">
        <div class="quickfill-header">
          <div class="quickfill-badge">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
            </svg>
            <span>Face ID Unlocked (${this.escapeHTML(username)})</span>
          </div>
          <div class="quickfill-controls-right">
            <button class="quickfill-btn-icon" onclick="window.bdjobsAuthBridge.toggleQuickfillMinimize()" title="Minimize">─</button>
            <button class="quickfill-btn-icon" onclick="document.getElementById('ios-passkey-quickfill-bar').remove()" title="Close">✕</button>
          </div>
        </div>
        <div class="quickfill-actions">
          <button class="btn btn-sm btn-quickfill" id="btn-copy-user">
            <span>Copy User: <strong>${this.escapeHTML(username)}</strong></span>
          </button>
          <button class="btn btn-sm btn-quickfill" id="btn-copy-pass">
            <span>Copy Password</span>
          </button>
          <button class="btn btn-sm btn-primary" id="btn-done-login">
            <span>Dashboard</span>
          </button>
        </div>
      </div>
    `;

    bar.classList.remove('minimized');
    bar.classList.add('visible');

    document.getElementById('btn-copy-user').onclick = () => {
      this.triggerHaptic(15);
      this.copyToClipboard(username, 'Username copied to clipboard! Tap user field and paste.');
    };
    document.getElementById('btn-copy-pass').onclick = () => {
      this.triggerHaptic(15);
      this.copyToClipboard(password, 'Password copied to clipboard! Tap password field and paste.');
    };
    document.getElementById('btn-done-login').onclick = () => {
      this.triggerHaptic(25);
      const iframe = document.getElementById('bdjobs-frame');
      if (iframe) iframe.src = this.MYBDJOBS_HOME;
      bar.remove();
    };

    setTimeout(() => {
      if (bar && bar.parentNode) {
        bar.remove();
      }
    }, 120000);
  }

  toggleQuickfillMinimize() {
    const bar = document.getElementById('ios-passkey-quickfill-bar');
    if (bar) {
      this.triggerHaptic(15);
      bar.classList.toggle('minimized');
    }
  }

  async copyToClipboard(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(msg, 'success');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      this.showToast(msg, 'success');
    }
  }

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

  async handleSaveAndEnroll(username, password) {
    if (!username || !password) {
      this.showToast('Please enter your BDJobs username and password', 'error');
      return false;
    }

    try {
      this.showToast('Registering Face ID Passkey...', 'info');

      if (window.passkeyManager.getPasskeys().length === 0) {
        await window.passkeyManager.registerPasskey('iPhone 11 (Face ID)');
      }

      await window.passkeyManager.saveEncryptedCredentials(username, password);

      window.appStore?.setState({
        isAuthenticated: true,
        currentUser: username
      });

      sessionStorage.setItem('bd_pwa_auth_session', JSON.stringify({
        authenticated: true,
        user: username,
        timestamp: Date.now()
      }));

      this.triggerHaptic([30, 40, 50]);
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

  triggerHaptic(pattern = 15) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  showToast(message, type = 'info') {
    window.notificationEngine?.show(message, type);
  }

  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

window.bdjobsAuthBridge = new BDJobsAuthBridge();
