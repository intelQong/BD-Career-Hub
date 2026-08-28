/**
 * BD Career Hub - View Router & Navigation State Machine (js/ui/router.js)
 */

class ViewRouter {
  constructor() {
    this.views = {
      launchpad: document.getElementById('launchpad-view'),
      portal: document.getElementById('portal-view'),
      bookmarks: document.getElementById('bookmarks-view')
    };

    this.dockButtons = {
      launchpad: document.getElementById('dock-btn-home'),
      portal: document.getElementById('dock-btn-portal'),
      bookmarks: document.getElementById('dock-btn-bookmarks')
    };

    this.init();
  }

  init() {
    window.appStore.subscribe((state, prev) => {
      if (state.view !== prev.view) {
        this.renderView(state.view);
      }
    });
  }

  navigate(viewName) {
    window.notificationEngine.haptic(15);
    window.appStore.setState({ view: viewName });
  }

  renderView(activeView) {
    // Hide all
    Object.entries(this.views).forEach(([name, el]) => {
      if (el) {
        if (name === activeView) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    // Update Dock
    Object.entries(this.dockButtons).forEach(([name, btn]) => {
      if (btn) {
        if (name === activeView) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });

    window.eventBus.emit('router:changed', activeView);
  }
}

window.viewRouter = new ViewRouter();
