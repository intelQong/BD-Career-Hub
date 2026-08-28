/**
 * BD Career Hub - Main Application Logic (js/app.js)
 * Standalone iOS navigation controller, category router, search engine & bookmark manager.
 */

class AppController {
  constructor() {
    this.currentView = 'launchpad'; // 'launchpad' | 'portal' | 'bookmarks' | 'settings'
    this.currentFrameUrl = 'https://bdjobs.com/h/jobs/';
    this.historyStack = [];

    // Category mapping for direct BDJobs filters
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
  }

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.executeSearch(searchInput.value.trim());
        }
      });
    }

    // Category Cards
    document.querySelectorAll('[data-category]').forEach((card) => {
      card.addEventListener('click', (e) => {
        const catKey = card.getAttribute('data-category');
        this.openCategory(catKey);
      });
    });

    // Frame Loading States
    const iframe = document.getElementById('bdjobs-frame');
    const spinner = document.getElementById('frame-spinner');
    if (iframe && spinner) {
      iframe.addEventListener('load', () => {
        spinner.classList.add('hidden');
      });
    }

    // Filter Pills
    document.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filterType = pill.getAttribute('data-filter');
        if (filterType && filterType !== 'all') {
          this.executeFilter(filterType);
        }
      });
    });
  }

  /**
   * Check if Passkey App Lock is required on startup
   */
  checkAppLock() {
    if (window.passkeyManager && window.passkeyManager.isAppLocked()) {
      const lockScreen = document.getElementById('passkey-lock-screen');
      if (lockScreen) {
        lockScreen.classList.remove('hidden');
      }
    }
  }

  /**
   * Unlock App with Face ID
   */
  async unlockAppWithPasskey() {
    try {
      const result = await window.passkeyManager.authenticatePasskey('Unlock BD Career Hub');
      if (result.success) {
        const lockScreen = document.getElementById('passkey-lock-screen');
        if (lockScreen) {
          lockScreen.classList.add('hidden');
        }
        if (window.bdjobsAuthBridge) {
          window.bdjobsAuthBridge.showToast('Unlocked with Face ID', 'success');
        }
      }
    } catch (e) {
      console.warn('[App] App lock biometric failed:', e);
      if (window.bdjobsAuthBridge) {
        window.bdjobsAuthBridge.showToast('Face ID verification required', 'error');
      }
    }
  }

  /**
   * iOS App Switcher Privacy & Auto-Lock on Resume
   */
  setupVisibilityHandlers() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App went to background
        const settings = window.passkeyManager.getSettings();
        if (settings.privacyBlurEnabled) {
          document.body.classList.add('ios-privacy-blurred');
        }
      } else {
        // App resumed
        document.body.classList.remove('ios-privacy-blurred');
        this.checkAppLock();
      }
    });
  }

  /**
   * Switch between Views
   */
  switchView(viewName) {
    this.currentView = viewName;
    const launchpad = document.getElementById('launchpad-view');
    const portal = document.getElementById('portal-view');
    const bookmarks = document.getElementById('bookmarks-view');
    const dockBtns = document.querySelectorAll('.bottom-dock .dock-btn');

    dockBtns.forEach(btn => btn.classList.remove('active'));

    if (viewName === 'launchpad') {
      if (launchpad) launchpad.classList.remove('hidden');
      if (portal) portal.classList.add('hidden');
      if (bookmarks) bookmarks.classList.add('hidden');
      document.getElementById('dock-btn-home')?.classList.add('active');
    } else if (viewName === 'portal') {
      if (launchpad) launchpad.classList.add('hidden');
      if (portal) portal.classList.remove('hidden');
      if (bookmarks) bookmarks.classList.add('hidden');
      document.getElementById('dock-btn-portal')?.classList.add('active');
    } else if (viewName === 'bookmarks') {
      if (launchpad) launchpad.classList.add('hidden');
      if (portal) portal.classList.add('hidden');
      if (bookmarks) bookmarks.classList.remove('hidden');
      document.getElementById('dock-btn-bookmarks')?.classList.add('active');
      this.renderBookmarksList();
    }
  }

  /**
   * Navigate smart webview to URL
   */
  navigateTo(url) {
    const iframe = document.getElementById('bdjobs-frame');
    const spinner = document.getElementById('frame-spinner');
    if (iframe) {
      if (spinner) spinner.classList.remove('hidden');
      this.currentFrameUrl = url;
      this.historyStack.push(url);
      iframe.src = url;
      this.switchView('portal');
    }
  }

  openCategory(catKey) {
    const url = this.categoryUrls[catKey] || 'https://bdjobs.com/h/jobs/';
    this.navigateTo(url);
  }

  executeSearch(query) {
    if (!query) return;
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://jobs.bdjobs.com/jobsearch.asp?txtsearch=${encoded}`;
    this.navigateTo(searchUrl);
  }

  executeFilter(type) {
    if (type === 'today') {
      this.navigateTo('https://jobs.bdjobs.com/jobsearch.asp?fcatId=0&qType=today');
    } else if (type === 'deadline') {
      this.navigateTo('https://jobs.bdjobs.com/jobsearch.asp?fcatId=0&qType=deadline');
    } else if (type === 'fresher') {
      this.navigateTo('https://jobs.bdjobs.com/jobsearch.asp?txtsearch=Fresher');
    }
  }

  /* On-Screen Navigation Controls */
  goBack() {
    if (this.currentView === 'portal') {
      const iframe = document.getElementById('bdjobs-frame');
      try {
        iframe.contentWindow.history.back();
      } catch (e) {
        this.switchView('launchpad');
      }
    } else {
      this.switchView('launchpad');
    }
  }

  goForward() {
    if (this.currentView === 'portal') {
      const iframe = document.getElementById('bdjobs-frame');
      try {
        iframe.contentWindow.history.forward();
      } catch (e) {}
    }
  }

  reloadCurrent() {
    if (this.currentView === 'portal') {
      const iframe = document.getElementById('bdjobs-frame');
      const spinner = document.getElementById('frame-spinner');
      if (iframe) {
        if (spinner) spinner.classList.remove('hidden');
        iframe.src = iframe.src;
      }
    } else {
      window.location.reload();
    }
  }

  async shareCurrent() {
    const url = this.currentFrameUrl || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BD Career Hub Job',
          text: 'Check out this career opportunity on BD Career Hub:',
          url: url
        });
      } catch (e) {
        console.log('Share dismissed');
      }
    } else {
      navigator.clipboard.writeText(url);
      window.bdjobsAuthBridge?.showToast('Job link copied to clipboard!', 'success');
    }
  }

  /* Bookmarks / Saved Jobs System */
  saveCurrentJobBookmark(title = 'BD Career Position', company = 'Company', url = null) {
    const targetUrl = url || this.currentFrameUrl;
    let bookmarks = this.getSavedBookmarks();

    // Prevent duplicate
    if (bookmarks.some(b => b.url === targetUrl)) {
      window.bdjobsAuthBridge?.showToast('Job already saved in bookmarks', 'info');
      return;
    }

    const newBookmark = {
      id: 'job_' + Date.now(),
      title: title || 'Saved Career Position',
      company: company || 'BDJobs Listing',
      url: targetUrl,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    };

    bookmarks.unshift(newBookmark);
    localStorage.setItem('bd_saved_jobs', JSON.stringify(bookmarks));
    this.loadSavedBookmarksCount();
    window.bdjobsAuthBridge?.showToast('⭐ Job saved to Bookmarks!', 'success');
  }

  getSavedBookmarks() {
    try {
      const raw = localStorage.getItem('bd_saved_jobs');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  deleteBookmark(id) {
    let bookmarks = this.getSavedBookmarks();
    bookmarks = bookmarks.filter(b => b.id !== id);
    localStorage.setItem('bd_saved_jobs', JSON.stringify(bookmarks));
    this.loadSavedBookmarksCount();
    this.renderBookmarksList();
    window.bdjobsAuthBridge?.showToast('Bookmark removed', 'info');
  }

  loadSavedBookmarksCount() {
    const count = this.getSavedBookmarks().length;
    const badge = document.getElementById('saved-badge-count');
    if (badge) badge.textContent = count;
  }

  renderBookmarksList() {
    const container = document.getElementById('bookmarks-list-container');
    if (!container) return;

    const list = this.getSavedBookmarks();
    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No saved job bookmarks yet.</p>
          <p class="form-hint" style="margin-top: 8px;">Tap the bookmark icon ⭐ in the bottom dock while browsing to save jobs here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(job => `
      <div class="bookmark-item">
        <div class="bookmark-info" style="cursor: pointer;" onclick="window.appController.navigateTo('${this.escapeHTML(job.url)}')">
          <h4 class="job-title">${this.escapeHTML(job.title)}</h4>
          <p class="company-name">${this.escapeHTML(job.company)}</p>
          <p class="job-meta">Saved on ${this.escapeHTML(job.date)}</p>
        </div>
        <div class="bookmark-actions" style="display: flex; gap: 6px;">
          <button class="btn btn-sm btn-primary" onclick="window.appController.navigateTo('${this.escapeHTML(job.url)}')">Open</button>
          <button class="btn btn-sm btn-outline" style="color: #F87171;" onclick="window.appController.deleteBookmark('${job.id}')">✕</button>
        </div>
      </div>
    `).join('');
  }

  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

// Export singleton instance
window.appController = new AppController();
