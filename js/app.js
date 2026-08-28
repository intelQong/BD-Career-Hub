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

  /* App Lock & Privacy Blur */
  checkAppLock() {
    if (window.passkeyManager && window.passkeyManager.isAppLocked()) {
      const lockScreen = document.getElementById('passkey-lock-screen');
      if (lockScreen) {
        lockScreen.classList.remove('hidden');
      }
    }
  }

  async unlockAppWithPasskey() {
    this.triggerHaptic(20);
    try {
      const result = await window.passkeyManager.authenticatePasskey('Unlock BD Career Hub');
      if (result.success) {
        this.triggerHaptic([30, 40]);
        const lockScreen = document.getElementById('passkey-lock-screen');
        if (lockScreen) {
          lockScreen.classList.add('hidden');
        }
        window.bdjobsAuthBridge?.showToast('Unlocked with Face ID', 'success');
      }
    } catch (e) {
      console.warn('[App] Biometric unlock failed:', e);
      // If PIN is configured, show PIN fallback option
      if (window.passkeyManager.hasPIN()) {
        this.showPINFallback();
      } else {
        window.bdjobsAuthBridge?.showToast('Face ID verification required', 'error');
      }
    }
  }

  showPINFallback() {
    const pinSection = document.getElementById('lock-pin-section');
    if (pinSection) {
      pinSection.classList.remove('hidden');
    }
  }

  async submitPINFallback(pinInput) {
    const ok = await window.passkeyManager.verifySecurityPIN(pinInput);
    if (ok) {
      this.triggerHaptic([30, 40]);
      document.getElementById('passkey-lock-screen')?.classList.add('hidden');
      window.bdjobsAuthBridge?.showToast('Unlocked with Security PIN', 'success');
    } else {
      this.triggerHaptic([100, 50, 100]);
      window.bdjobsAuthBridge?.showToast('Incorrect PIN', 'error');
    }
  }

  setupVisibilityHandlers() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        const settings = window.passkeyManager.getSettings();
        if (settings.privacyBlurEnabled) {
          document.body.classList.add('ios-privacy-blurred');
        }
      } else {
        document.body.classList.remove('ios-privacy-blurred');
        this.checkAppLock();
      }
    });
  }

  /* View Navigation */
  switchView(viewName) {
    this.triggerHaptic(15);
    this.currentView = viewName;
    const launchpad = document.getElementById('launchpad-view');
    const portal = document.getElementById('portal-view');
    const bookmarks = document.getElementById('bookmarks-view');
    const dockBtns = document.querySelectorAll('.bottom-dock .dock-btn');

    dockBtns.forEach(btn => btn.classList.remove('active'));

    if (viewName === 'launchpad') {
      launchpad?.classList.remove('hidden');
      portal?.classList.add('hidden');
      bookmarks?.classList.add('hidden');
      document.getElementById('dock-btn-home')?.classList.add('active');
    } else if (viewName === 'portal') {
      launchpad?.classList.add('hidden');
      portal?.classList.remove('hidden');
      bookmarks?.classList.add('hidden');
      document.getElementById('dock-btn-portal')?.classList.add('active');
    } else if (viewName === 'bookmarks') {
      launchpad?.classList.add('hidden');
      portal?.classList.add('hidden');
      bookmarks?.classList.remove('hidden');
      document.getElementById('dock-btn-bookmarks')?.classList.add('active');
      this.renderBookmarksList();
    }
  }

  navigateTo(url) {
    const iframe = document.getElementById('bdjobs-frame');
    const spinner = document.getElementById('frame-spinner');
    if (iframe) {
      this.startProgressBar();
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

  /* Search & Recent Searches */
  executeSearch(query) {
    if (!query) return;
    this.saveRecentSearch(query);
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://jobs.bdjobs.com/jobsearch.asp?txtsearch=${encoded}`;
    this.navigateTo(searchUrl);
  }

  saveRecentSearch(query) {
    try {
      let recents = JSON.parse(localStorage.getItem('bd_recent_searches') || '[]');
      recents = recents.filter(item => item.toLowerCase() !== query.toLowerCase());
      recents.unshift(query);
      if (recents.length > 6) recents = recents.slice(0, 6);
      localStorage.setItem('bd_recent_searches', JSON.stringify(recents));
      this.renderRecentSearches();
    } catch (e) {}
  }

  renderRecentSearches() {
    const container = document.getElementById('recent-searches-list');
    if (!container) return;

    try {
      const recents = JSON.parse(localStorage.getItem('bd_recent_searches') || '[]');
      if (recents.length === 0) {
        container.innerHTML = '<span class="recent-label">Recent:</span> <span style="font-size:0.75rem; color:#64748B;">None yet</span>';
        return;
      }

      container.innerHTML = `
        <span class="recent-label">Recent:</span>
        ${recents.map(item => `
          <span class="recent-chip" onclick="window.appController.executeSearch('${this.escapeHTML(item)}')">${this.escapeHTML(item)}</span>
        `).join('')}
      `;
    } catch (e) {}
  }

  executeFilter(type) {
    if (type === 'today') {
      this.navigateTo('https://jobs.bdjobs.com/jobsearch.asp?fcatId=0&qType=today');
    } else if (type === 'deadline') {
      this.navigateTo('https://jobs.bdjobs.com/jobsearch.asp?fcatId=0&qType=deadline');
    } else if (type === 'fresher') {
      this.navigateTo('https://jobs.bdjobs.com/jobsearch.asp?txtsearch=Fresher');
    } else if (type === 'dhaka') {
      this.navigateTo('https://jobs.bdjobs.com/jobsearch.asp?txtsearch=Dhaka');
    } else if (type === 'chattogram') {
      this.navigateTo('https://jobs.bdjobs.com/jobsearch.asp?txtsearch=Chattogram');
    } else if (type === 'senior') {
      this.navigateTo('https://jobs.bdjobs.com/jobsearch.asp?txtsearch=Senior');
    }
  }

  /* On-Screen Navigation Controls */
  goBack() {
    this.triggerHaptic(15);
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
    this.triggerHaptic(15);
    if (this.currentView === 'portal') {
      const iframe = document.getElementById('bdjobs-frame');
      try {
        iframe.contentWindow.history.forward();
      } catch (e) {}
    }
  }

  reloadCurrent() {
    this.triggerHaptic(20);
    if (this.currentView === 'portal') {
      const iframe = document.getElementById('bdjobs-frame');
      const spinner = document.getElementById('frame-spinner');
      if (iframe) {
        this.startProgressBar();
        if (spinner) spinner.classList.remove('hidden');
        iframe.src = iframe.src;
      }
    } else {
      window.location.reload();
    }
  }

  async shareCurrent() {
    this.triggerHaptic(20);
    const url = this.currentFrameUrl || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BD Career Hub Job',
          text: 'Check out this career opportunity on BD Career Hub:',
          url: url
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(url);
      window.bdjobsAuthBridge?.showToast('Job link copied to clipboard!', 'success');
    }
  }

  /* Bookmarks / Saved Jobs & Application Pipeline */
  saveCurrentJobBookmark(title = 'BD Career Position', company = 'BDJobs Listing', url = null) {
    this.triggerHaptic([20, 30]);
    const targetUrl = url || this.currentFrameUrl;
    let bookmarks = this.getSavedBookmarks();

    if (bookmarks.some(b => b.url === targetUrl)) {
      window.bdjobsAuthBridge?.showToast('Job already saved in bookmarks', 'info');
      return;
    }

    const newBookmark = {
      id: 'job_' + Date.now(),
      title: title || 'Saved Career Position',
      company: company || 'BDJobs Listing',
      url: targetUrl,
      status: 'Saved', // 'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Archived'
      notes: '',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    };

    bookmarks.unshift(newBookmark);
    localStorage.setItem('bd_saved_jobs', JSON.stringify(bookmarks));
    this.loadSavedBookmarksCount();
    window.bdjobsAuthBridge?.showToast('⭐ Saved to Career Pipeline!', 'success');
  }

  getSavedBookmarks() {
    try {
      const raw = localStorage.getItem('bd_saved_jobs');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  updateJobStatus(id, newStatus) {
    this.triggerHaptic(15);
    let bookmarks = this.getSavedBookmarks();
    const item = bookmarks.find(b => b.id === id);
    if (item) {
      item.status = newStatus;
      localStorage.setItem('bd_saved_jobs', JSON.stringify(bookmarks));
      window.bdjobsAuthBridge?.showToast(`Status updated to ${newStatus}`, 'info');
    }
  }

  updateJobNotes(id, notesText) {
    let bookmarks = this.getSavedBookmarks();
    const item = bookmarks.find(b => b.id === id);
    if (item) {
      item.notes = notesText;
      localStorage.setItem('bd_saved_jobs', JSON.stringify(bookmarks));
    }
  }

  deleteBookmark(id) {
    this.triggerHaptic(25);
    let bookmarks = this.getSavedBookmarks();
    bookmarks = bookmarks.filter(b => b.id !== id);
    localStorage.setItem('bd_saved_jobs', JSON.stringify(bookmarks));
    this.loadSavedBookmarksCount();
    this.renderBookmarksList();
    window.bdjobsAuthBridge?.showToast('Bookmark removed', 'info');
  }

  filterPipelineTab(tabName) {
    this.currentFilterTab = tabName;
    document.querySelectorAll('.pipeline-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tabName}`)?.classList.add('active');
    this.renderBookmarksList();
  }

  loadSavedBookmarksCount() {
    const count = this.getSavedBookmarks().length;
    const badge = document.getElementById('saved-badge-count');
    if (badge) badge.textContent = count;
  }

  renderBookmarksList() {
    const container = document.getElementById('bookmarks-list-container');
    if (!container) return;

    let list = this.getSavedBookmarks();
    if (this.currentFilterTab && this.currentFilterTab !== 'all') {
      list = list.filter(item => (item.status || 'Saved').toLowerCase() === this.currentFilterTab.toLowerCase());
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No job circulars found in this category.</p>
          <p class="form-hint" style="margin-top: 8px;">Tap the bookmark icon ⭐ in the bottom dock while browsing to save jobs to your pipeline.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(job => `
      <div class="bookmark-item">
        <div class="bookmark-header-row">
          <div class="bookmark-info" style="cursor: pointer;" onclick="window.appController.navigateTo('${this.escapeHTML(job.url)}')">
            <h4 class="job-title">${this.escapeHTML(job.title)}</h4>
            <p class="company-name">${this.escapeHTML(job.company)}</p>
            <p class="job-meta">Saved on ${this.escapeHTML(job.date)}</p>
          </div>
          <select class="status-tag-select" onchange="window.appController.updateJobStatus('${job.id}', this.value)">
            <option value="Saved" ${job.status === 'Saved' ? 'selected' : ''}>📁 Saved</option>
            <option value="Applied" ${job.status === 'Applied' ? 'selected' : ''}>📝 Applied</option>
            <option value="Interview" ${job.status === 'Interview' ? 'selected' : ''}>💬 Interview</option>
            <option value="Offer" ${job.status === 'Offer' ? 'selected' : ''}>🎉 Offer</option>
            <option value="Archived" ${job.status === 'Archived' ? 'selected' : ''}>📦 Archived</option>
          </select>
        </div>

        <textarea class="job-note-box" placeholder="Add private note (e.g. interview date, contact, expected salary)..." onblur="window.appController.updateJobNotes('${job.id}', this.value)">${this.escapeHTML(job.notes || '')}</textarea>

        <div class="bookmark-actions-row">
          <button class="btn btn-sm btn-primary" onclick="window.appController.navigateTo('${this.escapeHTML(job.url)}')">Open Circular</button>
          <button class="btn btn-sm btn-outline" style="color: #F87171;" onclick="window.appController.deleteBookmark('${job.id}')">Delete</button>
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
