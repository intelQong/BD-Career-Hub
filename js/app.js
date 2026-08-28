/**
 * BD Career Hub - Main Application Logic (js/app.js)
 * Standalone iOS navigation controller, search history, multi-filters & application tracker with notes.
 */

class AppController {
  constructor() {
    this.currentView = 'launchpad'; // 'launchpad' | 'portal' | 'bookmarks'
    this.currentFrameUrl = 'https://bdjobs.com/h/jobs/';
    this.historyStack = [];
    this.currentFilterTab = 'all';

    this.categoryUrls = {
      'it': 'https://jobs.bdjobs.com/jobsearch.asp?fcatId=8',
      'bank': 'https://jobs.bdjobs.com/jobsearch.asp?fcatId=2',
      'govt': 'https://jobs.bdjobs.com/jobsearch.asp?fcatId=18',
      'ngo': 'https://jobs.bdjobs.com/jobsearch.asp?fcatId=12',
      'garments': 'https://jobs.bdjobs.com/jobsearch.asp?fcatId=7',
      'eng': 'https://jobs.bdjobs.com/jobsearch.asp?fcatId=5',
      'remote': 'https://jobs.bdjobs.com/jobsearch.asp?txtsearch=Remote',
      'hot': 'https://jobs.bdjobs.com/jobsearch.asp?fcatId=1'
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAppLock();
    this.setupVisibilityHandlers();
    this.loadSavedBookmarksCount();
    this.renderRecentSearches();
  }

  bindEvents() {
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.executeSearch(searchInput.value.trim());
        }
      });
    }

    document.querySelectorAll('[data-category]').forEach((card) => {
      card.addEventListener('click', () => {
        this.triggerHaptic(15);
        const catKey = card.getAttribute('data-category');
        this.openCategory(catKey);
      });
    });

    const iframe = document.getElementById('bdjobs-frame');
    const spinner = document.getElementById('frame-spinner');
    if (iframe) {
      iframe.addEventListener('load', () => {
        if (spinner) spinner.classList.add('hidden');
        this.finishProgressBar();
      });
    }

    // Filter pills
    document.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        this.triggerHaptic(15);
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filterType = pill.getAttribute('data-filter');
        if (filterType && filterType !== 'all') {
          this.executeFilter(filterType);
        }
      });
    });
  }

  startProgressBar() {
    const bar = document.getElementById('top-progress-bar');
    if (bar) {
      bar.classList.remove('done');
      bar.classList.add('active');
    }
  }

  finishProgressBar() {
    const bar = document.getElementById('top-progress-bar');
    if (bar) {
      bar.classList.remove('active');
      bar.classList.add('done');
      setTimeout(() => bar.classList.remove('done'), 400);
    }
  }

  triggerHaptic(pattern = 15) {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  /* Navigation Controller */
  navigateTo(url) {
    this.triggerHaptic(15);
    const settings = window.passkeyManager.getSettings();

    // If user prefers direct mode (allows full 1st-party cookies & logins)
    if (settings.directNavigationMode !== false) {
      this.startProgressBar();
      window.location.href = url;
      return;
    }

    // Otherwise embedded mode:
    const launchpad = document.getElementById('launchpad-view');
    const portal = document.getElementById('portal-view');
    const bookmarks = document.getElementById('bookmarks-view');
    const iframe = document.getElementById('bdjobs-frame');
    const spinner = document.getElementById('frame-spinner');

    if (launchpad) launchpad.classList.add('hidden');
    if (bookmarks) bookmarks.classList.add('hidden');
    if (portal) portal.classList.remove('hidden');

    this.currentView = 'portal';
    this.updateDockState('portal');

    if (iframe) {
      if (spinner) spinner.classList.remove('hidden');
      this.startProgressBar();
      this.historyStack.push(this.currentFrameUrl);
      this.currentFrameUrl = url;
      iframe.src = url;
    }
  }

  openCategory(catKey) {
    const url = this.categoryUrls[catKey] || 'https://bdjobs.com/h/jobs/';
    this.navigateTo(url);
  }

  executeSearch(query) {
    if (!query) return;
    this.saveRecentSearch(query);
    const encoded = encodeURIComponent(query);
    const url = `https://jobs.bdjobs.com/jobsearch.asp?txtsearch=${encoded}`;
    this.navigateTo(url);
  }

  executeFilter(type) {
    let url = 'https://bdjobs.com/h/jobs/';
    if (type === 'today') {
      url = 'https://jobs.bdjobs.com/jobsearch.asp?qtype=today';
    } else if (type === 'deadline') {
      url = 'https://jobs.bdjobs.com/jobsearch.asp?qtype=deadline';
    } else if (type === 'fresher') {
      url = 'https://jobs.bdjobs.com/jobsearch.asp?exp=0';
    } else if (type === 'dhaka') {
      url = 'https://jobs.bdjobs.com/jobsearch.asp?loc=dhaka';
    } else if (type === 'chattogram') {
      url = 'https://jobs.bdjobs.com/jobsearch.asp?loc=chattogram';
    } else if (type === 'senior') {
      url = 'https://jobs.bdjobs.com/jobsearch.asp?exp=5';
    }
    this.navigateTo(url);
  }

  /* Recent Searches */
  getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem('bd_recent_searches') || '[]');
    } catch (e) {
      return [];
    }
  }

  saveRecentSearch(query) {
    let list = this.getRecentSearches();
    list = list.filter(q => q.toLowerCase() !== query.toLowerCase());
    list.unshift(query);
    if (list.length > 5) list.pop();
    localStorage.setItem('bd_recent_searches', JSON.stringify(list));
    this.renderRecentSearches();
  }

  renderRecentSearches() {
    const container = document.getElementById('recent-searches-list');
    if (!container) return;
    const list = this.getRecentSearches();
    if (list.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <span class="recent-label">Recent:</span>
      ${list.map(q => `<button class="recent-chip" onclick="window.appController.executeSearch('${this.escapeHTML(q)}')">${this.escapeHTML(q)}</button>`).join('')}
    `;
  }

  /* On-screen Controls */
  goBack() {
    this.triggerHaptic(15);
    if (this.currentView === 'portal') {
      const iframe = document.getElementById('bdjobs-frame');
      try {
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.history.back();
          return;
        }
      } catch (e) {}

      if (this.historyStack.length > 0) {
        const prev = this.historyStack.pop();
        if (iframe) iframe.src = prev;
        return;
      }
      this.switchView('launchpad');
    } else {
      this.switchView('launchpad');
    }
  }

  reloadCurrent() {
    this.triggerHaptic(15);
    const iframe = document.getElementById('bdjobs-frame');
    const spinner = document.getElementById('frame-spinner');
    if (iframe && this.currentView === 'portal') {
      if (spinner) spinner.classList.remove('hidden');
      this.startProgressBar();
      iframe.src = iframe.src;
    } else {
      window.location.reload();
    }
  }

  async shareCurrent() {
    this.triggerHaptic(15);
    let shareUrl = this.currentFrameUrl;
    const iframe = document.getElementById('bdjobs-frame');
    try {
      if (iframe && iframe.contentWindow && iframe.contentWindow.location.href) {
        shareUrl = iframe.contentWindow.location.href;
      }
    } catch (e) {}

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BD Career Opportunity',
          text: 'Check out this position on BDJobs via BD Career Hub:',
          url: shareUrl
        });
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        window.notificationEngine?.show('Link copied to clipboard!', 'success');
      } catch (e) {
        window.notificationEngine?.show(shareUrl, 'info');
      }
    }
  }

  /* Pipeline Bookmarking */
  saveCurrentJobBookmark() {
    this.triggerHaptic([20, 40]);
    let currentUrl = this.currentFrameUrl;
    const iframe = document.getElementById('bdjobs-frame');
    try {
      if (iframe && iframe.contentWindow && iframe.contentWindow.location.href) {
        currentUrl = iframe.contentWindow.location.href;
      }
    } catch (e) {}

    window.pipelineUI?.addJob('Saved Circular', 'BDJobs Position', currentUrl);
  }

  loadSavedBookmarksCount() {
    window.pipelineUI?.updateCountBadge();
  }

  /* View Switcher */
  switchView(viewName) {
    this.triggerHaptic(15);
    const launchpad = document.getElementById('launchpad-view');
    const portal = document.getElementById('portal-view');
    const bookmarks = document.getElementById('bookmarks-view');

    if (launchpad) launchpad.classList.add('hidden');
    if (portal) portal.classList.add('hidden');
    if (bookmarks) bookmarks.classList.add('hidden');

    if (viewName === 'launchpad' && launchpad) launchpad.classList.remove('hidden');
    if (viewName === 'portal' && portal) portal.classList.remove('hidden');
    if (viewName === 'bookmarks' && bookmarks) {
      bookmarks.classList.remove('hidden');
      window.pipelineUI?.render();
    }

    this.currentView = viewName;
    this.updateDockState(viewName);
  }

  updateDockState(viewName) {
    document.querySelectorAll('.dock-btn').forEach(btn => btn.classList.remove('active'));
    if (viewName === 'launchpad') document.getElementById('dock-btn-home')?.classList.add('active');
    if (viewName === 'portal') document.getElementById('dock-btn-portal')?.classList.add('active');
    if (viewName === 'bookmarks') document.getElementById('dock-btn-bookmarks')?.classList.add('active');
  }

  /* App Lock & Security Handlers */
  checkAppLock() {
    const settings = window.passkeyManager.getSettings();
    if (settings.appLockEnabled) {
      this.lockApp();
    }
  }

  lockApp() {
    const lockScreen = document.getElementById('passkey-lock-screen');
    if (lockScreen) {
      lockScreen.classList.remove('hidden');
    }
  }

  async unlockAppWithPasskey() {
    this.triggerHaptic(20);
    try {
      const auth = await window.passkeyManager.authenticatePasskey('Unlock BD Career Hub');
      if (auth.success) {
        const lockScreen = document.getElementById('passkey-lock-screen');
        if (lockScreen) lockScreen.classList.add('hidden');
        window.notificationEngine?.show('Unlocked with Face ID', 'success');
      }
    } catch (e) {
      window.notificationEngine?.show('Biometric unlock failed', 'error');
    }
  }

  async submitPINFallback(pin) {
    const valid = await window.passkeyManager.verifyPIN(pin);
    if (valid) {
      const lockScreen = document.getElementById('passkey-lock-screen');
      if (lockScreen) lockScreen.classList.add('hidden');
      window.notificationEngine?.show('Unlocked with PIN', 'success');
    } else {
      window.notificationEngine?.show('Incorrect Security PIN', 'error');
    }
  }

  setupVisibilityHandlers() {
    let backgroundTimestamp = null;
    document.addEventListener('visibilitychange', () => {
      const settings = window.passkeyManager.getSettings();
      if (!settings.appLockEnabled) return;

      if (document.hidden) {
        backgroundTimestamp = Date.now();
      } else {
        if (backgroundTimestamp && settings.autoLockMinutes >= 0) {
          const elapsedMinutes = (Date.now() - backgroundTimestamp) / (1000 * 60);
          if (elapsedMinutes >= settings.autoLockMinutes) {
            this.lockApp();
          }
        }
        backgroundTimestamp = null;
      }
    });
  }

  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

window.appController = new AppController();
