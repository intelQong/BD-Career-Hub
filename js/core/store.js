/**
 * BD Career Hub - Reactive State Store (js/core/store.js)
 * Centralizes application state with unidirectional data flow, subscribers, and persistence.
 */

class AppStore {
  constructor() {
    let initialAuth = false;
    let initialUser = '';
    try {
      const sessionRaw = sessionStorage.getItem('bd_pwa_auth_session');
      if (sessionRaw) {
        const s = JSON.parse(sessionRaw);
        if (s.authenticated) {
          initialAuth = true;
          initialUser = s.user || '';
        }
      }
    } catch (e) {}

    this.state = {
      view: 'launchpad',             // 'launchpad' | 'portal' | 'bookmarks'
      portalUrl: 'https://bdjobs.com/h/jobs/',
      pipelineFilter: 'all',         // 'all' | 'saved' | 'applied' | 'interview' | 'offer' | 'archived'
      isAuthenticated: initialAuth,
      currentUser: initialUser,
      isAppLocked: false,
      recentSearches: [],
      savedJobs: [],
      securitySettings: {
        appLockEnabled: false,
        autoLockMinutes: 5,
        passkeyLoginEnabled: false,
        privacyBlurEnabled: true,
        pinFallbackEnabled: false
      },
      isLoading: false
    };

    this.subscribers = new Set();
  }

  getState() {
    return { ...this.state };
  }

  setState(partialState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...partialState };
    this.notify(this.state, prevState);
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  notify(nextState, prevState) {
    this.subscribers.forEach(listener => {
      try {
        listener(nextState, prevState);
      } catch (err) {
        console.error('[Store] Error in subscriber:', err);
      }
    });
  }
}

window.appStore = new AppStore();
