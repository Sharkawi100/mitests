/* ==========================================================================
   Mitests.com - Teacher Tenant Mode
   Handles school teacher vs independent teacher UI behavior.
   ========================================================================== */

(function () {
  'use strict';

  var TENANT_KEY = 'mitests-tenant-type';
  var WORKSPACE_KEY = 'mitests-personal-workspace';
  var PROFILE_KEY = 'mitests-personal-teacher-profile';

  function getPathname() {
    var raw = window.location.pathname || '';
    var parts = raw.split('/');
    return String(parts[parts.length - 1] || '').toLowerCase();
  }

  function getTenantType() {
    try {
      return localStorage.getItem(TENANT_KEY) || 'school_teacher';
    } catch (e) {
      return 'school_teacher';
    }
  }

  function setTenantType(value) {
    try {
      localStorage.setItem(TENANT_KEY, value);
    } catch (e) {}
  }

  function isTeacherContextPage() {
    var page = getPathname();
    return (
      page.indexOf('teacher-') === 0 ||
      page.indexOf('exam-') === 0 ||
      page === 'teacher-personal-dashboard.html'
    );
  }

  function ensurePersonalWorkspace() {
    try {
      if (!localStorage.getItem(WORKSPACE_KEY)) {
        localStorage.setItem(WORKSPACE_KEY, JSON.stringify({
          workspaceId: 'PERS-TCH-001',
          name: 'مساحة المعلم الشخصية',
          plan: 'Personal Pro',
          tokenLimit: 10000,
          tokenUsed: 2300,
          groups: 3,
          students: 48,
          examsMonth: 7,
          createdAt: '2026-02-12'
        }));
      }
      if (!localStorage.getItem(PROFILE_KEY)) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({
          name: 'معلّم مستقل',
          email: 'teacher.personal@mitests.demo',
          subject: 'اللغة الإنجليزية'
        }));
      }
    } catch (e) {}
  }

  function labelByLang(values) {
    var lang = document.documentElement.getAttribute('lang') || 'ar';
    return values[lang] || values.ar;
  }

  function hideSchoolOnlyUI() {
    var nodes = document.querySelectorAll('[data-school-only], a[href="teacher-community.html"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var navItem = el.closest('.sidebar__item') || el.closest('.utility-card') || el.closest('section') || el;
      navItem.style.display = 'none';
    }
  }

  function showSchoolOnlyUI() {
    var nodes = document.querySelectorAll('[data-school-only], a[href="teacher-community.html"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var navItem = el.closest('.sidebar__item') || el.closest('.utility-card') || el.closest('section') || el;
      navItem.style.display = '';
    }
  }

  function updateTeacherHomeLinks(homeHref) {
    var links = document.querySelectorAll('a[href="teacher-dashboard.html"], a[data-teacher-home]');
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute('href', homeHref);
    }
  }

  function applyPersonalBrand() {
    var sidebarBrand = document.querySelector('.sidebar__brand-text');
    if (sidebarBrand) {
      sidebarBrand.textContent = labelByLang({
        ar: 'سراج - المعلم المستقل',
        he: 'סרָאג׳ - מורה עצמאי',
        en: 'Seraj - Independent Teacher'
      });
    }

    var tenantBadges = document.querySelectorAll('[data-tenant-badge]');
    for (var i = 0; i < tenantBadges.length; i++) {
      tenantBadges[i].textContent = labelByLang({
        ar: 'وضع المعلم المستقل',
        he: 'מצב מורה עצמאי',
        en: 'Independent Teacher Mode'
      });
    }
  }

  function applyTenantMode() {
    if (!isTeacherContextPage()) return;

    var page = getPathname();
    var tenantType = getTenantType();

    if (page === 'teacher-personal-dashboard.html' && tenantType !== 'personal_teacher') {
      setTenantType('personal_teacher');
      tenantType = 'personal_teacher';
    }

    if (tenantType === 'personal_teacher') {
      ensurePersonalWorkspace();

      if (page === 'teacher-dashboard.html') {
        window.location.replace('teacher-personal-dashboard.html');
        return;
      }

      if (page === 'teacher-community.html') {
        window.location.replace('teacher-personal-dashboard.html');
        return;
      }

      updateTeacherHomeLinks('teacher-personal-dashboard.html');
      hideSchoolOnlyUI();
      applyPersonalBrand();
    } else {
      showSchoolOnlyUI();
      updateTeacherHomeLinks('teacher-dashboard.html');
    }
  }

  document.addEventListener('DOMContentLoaded', applyTenantMode);
  document.addEventListener('mitests:languagechange', applyTenantMode);
})();
