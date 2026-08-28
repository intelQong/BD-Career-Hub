/**
 * BD Career Hub - Career Pipeline & Notes Component (js/ui/pipeline.js)
 */

class PipelineUI {
  constructor() {
    this.STORAGE_KEY = 'bd_saved_jobs';
    this.init();
  }

  init() {
    window.appStore.subscribe((state, prev) => {
      if (state.pipelineFilter !== prev.pipelineFilter || state.savedJobs !== prev.savedJobs) {
        this.render();
      }
    });

    this.loadFromStorage();
  }

  async loadFromStorage() {
    const list = await window.storageService.get(this.STORAGE_KEY, []);
    window.appStore.setState({ savedJobs: Array.isArray(list) ? list : [] });
    this.updateCountBadge();
  }

  async saveToStorage(list) {
    await window.storageService.set(this.STORAGE_KEY, list);
    window.appStore.setState({ savedJobs: list });
    this.updateCountBadge();
  }

  updateCountBadge() {
    const count = (window.appStore.getState().savedJobs || []).length;
    const badge = document.getElementById('saved-badge-count');
    if (badge) badge.textContent = count;
  }

  async addJob(title, company, url) {
    window.notificationEngine.haptic([20, 30]);
    const list = [...(window.appStore.getState().savedJobs || [])];
    
    if (list.some(j => j.url === url)) {
      window.notificationEngine.show('Job already saved in pipeline', 'info');
      return;
    }

    const newJob = {
      id: 'job_' + Date.now(),
      title: title || 'Saved Career Position',
      company: company || 'BDJobs Listing',
      url: url,
      status: 'Saved',
      notes: '',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    };

    list.unshift(newJob);
    await this.saveToStorage(list);
    window.notificationEngine.show('⭐ Saved to Career Pipeline!', 'success');
  }

  async updateStatus(id, newStatus) {
    window.notificationEngine.haptic(15);
    const list = [...(window.appStore.getState().savedJobs || [])];
    const job = list.find(j => j.id === id);
    if (job) {
      job.status = newStatus;
      await this.saveToStorage(list);
      window.notificationEngine.show(`Status updated to ${newStatus}`, 'info');
    }
  }

  async updateNotes(id, notes) {
    const list = [...(window.appStore.getState().savedJobs || [])];
    const job = list.find(j => j.id === id);
    if (job) {
      job.notes = notes;
      await this.saveToStorage(list);
    }
  }

  async deleteJob(id) {
    window.notificationEngine.haptic(25);
    let list = [...(window.appStore.getState().savedJobs || [])];
    list = list.filter(j => j.id !== id);
    await this.saveToStorage(list);
    window.notificationEngine.show('Removed from pipeline', 'info');
  }

  setFilter(filterName) {
    window.notificationEngine.haptic(15);
    document.querySelectorAll('.pipeline-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${filterName}`)?.classList.add('active');
    window.appStore.setState({ pipelineFilter: filterName });
  }

  render() {
    const container = document.getElementById('bookmarks-list-container');
    if (!container) return;

    const { savedJobs, pipelineFilter } = window.appStore.getState();
    let displayList = savedJobs || [];

    if (pipelineFilter && pipelineFilter !== 'all') {
      displayList = displayList.filter(j => (j.status || 'Saved').toLowerCase() === pipelineFilter.toLowerCase());
    }

    if (displayList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No job circulars in this section.</p>
          <p class="form-hint" style="margin-top: 8px;">Tap the bookmark icon ⭐ in the bottom dock while browsing to save jobs to your pipeline.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = displayList.map(job => `
      <div class="bookmark-item">
        <div class="bookmark-header-row">
          <div class="bookmark-info" style="cursor: pointer;" onclick="window.appController.navigateTo('${this.escapeHTML(job.url)}')">
            <h4 class="job-title">${this.escapeHTML(job.title)}</h4>
            <p class="company-name">${this.escapeHTML(job.company)}</p>
            <p class="job-meta">Saved on ${this.escapeHTML(job.date)}</p>
          </div>
          <select class="status-tag-select" onchange="window.pipelineUI.updateStatus('${job.id}', this.value)">
            <option value="Saved" ${job.status === 'Saved' ? 'selected' : ''}>📁 Saved</option>
            <option value="Applied" ${job.status === 'Applied' ? 'selected' : ''}>📝 Applied</option>
            <option value="Interview" ${job.status === 'Interview' ? 'selected' : ''}>💬 Interview</option>
            <option value="Offer" ${job.status === 'Offer' ? 'selected' : ''}>🎉 Offer</option>
            <option value="Archived" ${job.status === 'Archived' ? 'selected' : ''}>📦 Archived</option>
          </select>
        </div>

        <textarea class="job-note-box" placeholder="Add private note (e.g. interview date, contact, expected salary)..." onblur="window.pipelineUI.updateNotes('${job.id}', this.value)">${this.escapeHTML(job.notes || '')}</textarea>

        <div class="bookmark-actions-row">
          <button class="btn btn-sm btn-primary" onclick="window.appController.navigateTo('${this.escapeHTML(job.url)}')">Open Circular</button>
          <button class="btn btn-sm btn-outline" style="color: #F87171;" onclick="window.pipelineUI.deleteJob('${job.id}')">Delete</button>
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

window.pipelineUI = new PipelineUI();
