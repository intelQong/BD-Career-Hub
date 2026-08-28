/**
 * BD Career Hub - PWA Lifecycle & iOS Installation Helper (js/pwa.js)
 */

class PWALifecycle {
  constructor() {
    this.isIOS = this.checkIsIOS();
    this.isStandalone = this.checkIsStandalone();
    this.init();
  }

  init() {
    this.registerServiceWorker();
    this.handleInstallPrompts();
  }

  checkIsIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  checkIsStandalone() {
    return (
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches
    );
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker registration failed:', error);
          });
      });
    }
  }

  handleInstallPrompts() {
    const installBanner = document.getElementById('ios-install-banner');
    
    // If already installed in standalone mode, hide installation banner completely
    if (this.isStandalone) {
      if (installBanner) installBanner.classList.add('hidden');
      return;
    }

    // If on iOS Safari, show the installation banner
    if (this.isIOS && installBanner) {
      installBanner.classList.remove('hidden');
    }

    // Android / Desktop beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.deferredInstallPrompt = e;
      if (installBanner) installBanner.classList.remove('hidden');
    });
  }

  showInstallGuideModal() {
    const modal = document.getElementById('install-guide-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeInstallGuideModal() {
    const modal = document.getElementById('install-guide-modal');
    if (modal) modal.classList.add('hidden');
  }
}

// Export singleton
window.pwaLifecycle = new PWALifecycle();
