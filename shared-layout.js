/* ==========================================================================
   Mitests.com - Shared Layout JavaScript
   Handles: Sidebar toggle, Language/RTL switching, Modal interactions
   No external dependencies - vanilla JS only
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     LANGUAGE / DIRECTION SWITCHER
     ======================================================================== */

  var LANGUAGES = {
    ar: { dir: 'rtl', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', font: 'Cairo' },
    he: { dir: 'rtl', label: '\u05E2\u05D1\u05E8\u05D9\u05EA', font: 'Cairo' },
    en: { dir: 'ltr', label: 'English', font: 'Inter' }
  };

  /**
   * Switch the page direction and font based on language code.
   * Updates body classes, HTML attributes, active button state, and localStorage.
   */
  function setLanguage(langCode) {
    var config = LANGUAGES[langCode];
    if (!config) return;

    var body = document.body;
    var html = document.documentElement;

    // Swap direction classes on body
    body.classList.remove('rtl', 'ltr');
    body.classList.add(config.dir);

    // Set HTML dir and lang attributes for browser bidi behavior
    html.setAttribute('dir', config.dir);
    html.setAttribute('lang', langCode);
    body.setAttribute('data-lang', langCode);

    // Update active state on language switcher buttons
    var langButtons = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < langButtons.length; i++) {
      var btn = langButtons[i];
      if (btn.dataset.lang === langCode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }

    // Persist preference
    try {
      localStorage.setItem('mitests-lang', langCode);
    } catch (e) {
      // localStorage unavailable - silently ignore
    }

    // Notify pages to update localized UI strings
    try {
      document.dispatchEvent(new CustomEvent('mitests:languagechange', {
        detail: { lang: langCode }
      }));
    } catch (e2) {
      // CustomEvent may be unavailable in very old browsers
    }
  }

  /**
   * Initialize language switcher by binding click events
   * and restoring saved language preference.
   */
  function initLanguageSwitcher() {
    var langButtons = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < langButtons.length; i++) {
      langButtons[i].addEventListener('click', function () {
        setLanguage(this.dataset.lang);
      });
    }

    // Restore saved preference or default to Arabic
    var saved = 'ar';
    try {
      saved = localStorage.getItem('mitests-lang') || 'ar';
    } catch (e) {
      // localStorage unavailable
    }
    setLanguage(saved);
  }


  /* ========================================================================
     SIDEBAR TOGGLE
     ======================================================================== */

  /**
   * Toggle sidebar between expanded and collapsed states.
   * Also adjusts the main content margin accordingly.
   */
  function initSidebarToggle() {
    var toggleBtn = document.getElementById('sidebar-toggle');
    var sidebar = document.getElementById('sidebar');
    var mainContent = document.getElementById('main-content');

    if (!toggleBtn || !sidebar) return;

    toggleBtn.addEventListener('click', function () {
      sidebar.classList.toggle('sidebar--collapsed');

      if (mainContent) {
        mainContent.classList.toggle('main-content--expanded');
      }
    });

    // --- Mobile Toggle Integration ---
    var navbar = document.querySelector('.navbar');
    if (navbar && !document.querySelector('.mobile-nav-toggle')) {
      var mobileBtn = document.createElement('button');
      mobileBtn.className = 'mobile-nav-toggle';
      mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
      mobileBtn.setAttribute('aria-label', 'Toggle navigation');

      // Add to navbar (start)
      navbar.insertBefore(mobileBtn, navbar.firstChild);

      // Create backdrop
      var backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);

      function toggleMobileMenu() {
        sidebar.classList.toggle('sidebar--mobile-open');
        backdrop.classList.toggle('active');
        // Prevent body scroll when menu is open
        document.body.style.overflow = sidebar.classList.contains('sidebar--mobile-open') ? 'hidden' : '';
      }

      mobileBtn.addEventListener('click', toggleMobileMenu);
      backdrop.addEventListener('click', toggleMobileMenu);
    // Fix jerky transition on load
    sidebar.classList.add('no-transition');
    setTimeout(function () {
      sidebar.classList.remove('no-transition');
    }, 100);
    }
  }


  /* ========================================================================
     AVATAR DROPDOWN
     ======================================================================== */

  function closeAllAvatarMenus() {
    var menus = document.querySelectorAll('[data-avatar-menu]');
    for (var i = 0; i < menus.length; i++) {
      menus[i].classList.remove('avatar-menu--open');
    }
  }

  function initAvatarDropdowns() {
    var toggles = document.querySelectorAll('[data-avatar-toggle]');
    if (!toggles.length) return;

    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('click', function (e) {
        e.stopPropagation();
        var targetId = this.getAttribute('data-avatar-toggle');
        if (!targetId) return;
        var menu = document.getElementById(targetId);
        if (!menu) return;

        var isOpen = menu.classList.contains('avatar-menu--open');
        closeAllAvatarMenus();
        if (!isOpen) menu.classList.add('avatar-menu--open');
      });
    }

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.avatar-dropdown')) {
        closeAllAvatarMenus();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllAvatarMenus();
    });
  }


  /* ========================================================================
     MODAL INTERACTIONS
     ======================================================================== */

  /**
   * Open a modal by adding the active class.
   */
  function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('modal-overlay--active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus the close button for accessibility
    var closeBtn = modal.querySelector('[data-modal-close]');
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  /**
   * Close a modal by removing the active class.
   */
  function closeModal(overlay) {
    if (!overlay) return;

    overlay.classList.remove('modal-overlay--active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /**
   * Initialize all modal open/close behaviors.
   * Uses data attributes: data-modal-open="modalId" and data-modal-close
   */
  function initModals() {
    // Open modal triggers
    var openBtns = document.querySelectorAll('[data-modal-open]');
    for (var i = 0; i < openBtns.length; i++) {
      openBtns[i].addEventListener('click', function () {
        openModal(this.dataset.modalOpen);
      });
    }

    // Close modal triggers (X button)
    var closeBtns = document.querySelectorAll('[data-modal-close]');
    for (var j = 0; j < closeBtns.length; j++) {
      closeBtns[j].addEventListener('click', function () {
        var overlay = this.closest('.modal-overlay');
        closeModal(overlay);
      });
    }

    // Close on overlay background click
    var overlays = document.querySelectorAll('.modal-overlay');
    for (var k = 0; k < overlays.length; k++) {
      overlays[k].addEventListener('click', function (e) {
        if (e.target === this) {
          closeModal(this);
        }
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var activeModal = document.querySelector('.modal-overlay--active');
        if (activeModal) {
          closeModal(activeModal);
        }
      }
    });
  }


  /* ========================================================================
     SMOOTH SCROLL FOR ANCHOR LINKS
     ======================================================================== */

  function initSmoothScroll() {
    var links = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) {
        var targetId = this.getAttribute('href').substring(1);
        var target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }


  /* ========================================================================
     INITIALIZATION
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    initLanguageSwitcher();
    initSidebarToggle();
    initAvatarDropdowns();
    initModals();
    initSmoothScroll();
  });

})();
