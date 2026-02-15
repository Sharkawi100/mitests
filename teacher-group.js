(function () {
  'use strict';

  var tenantType = 'school_teacher';
  try { tenantType = localStorage.getItem('mitests-tenant-type') || 'school_teacher'; } catch (e) {}

  function getSchoolId() {
    try {
      var id = localStorage.getItem('mitests-school-id');
      if (id) return id;
      localStorage.setItem('mitests-school-id', 'SCH-001');
    } catch (e) {}
    return 'SCH-001';
  }

  function getScope() {
    if (tenantType === 'personal_teacher') {
      try {
        var raw = localStorage.getItem('mitests-personal-workspace');
        if (raw) {
          var ws = JSON.parse(raw);
          if (ws && ws.workspaceId) return 'personal:' + String(ws.workspaceId);
        }
      } catch (e) {}
      return 'personal:default';
    }
    return 'school:' + getSchoolId();
  }

  var scope = getScope();
  var groupsKey = 'mitests-teacher-groups:' + scope;
  var requestsKey = 'mitests-group-join-requests:' + scope;
  var membersKey = 'mitests-group-memberships:' + scope;
  var historyKey = 'mitests-group-join-history:' + scope;
  var resourcesKey = 'mitests-group-resources:' + scope;
  var schoolStudentsKey = 'mitests-school-students:' + scope;

  function migrateLegacy(primaryKey, legacyKey) {
    try {
      if (localStorage.getItem(primaryKey)) return;
      var legacy = localStorage.getItem(legacyKey);
      if (legacy) localStorage.setItem(primaryKey, legacy);
    } catch (e) {}
  }

  migrateLegacy(groupsKey, 'mitests-teacher-groups:' + tenantType);
  migrateLegacy(requestsKey, 'mitests-group-join-requests:' + tenantType);
  migrateLegacy(membersKey, 'mitests-group-memberships:' + tenantType);
  migrateLegacy(historyKey, 'mitests-group-join-history:' + tenantType);
  migrateLegacy(resourcesKey, 'mitests-group-resources:' + tenantType);

  var defaultGroups = [
    { id: 1, code: 'grade9-eng', name: 'الصف تاسع 1', grade: 'الصف التاسع', section: '1 (أ)', subject: 'اللغة الإنجليزية', studentsCount: 0, examsMonth: 5, avgScore: 84, inviteCode: 'ENG9-1001' },
    { id: 2, code: 'grade8-math', name: 'الصف ثامن 3', grade: 'الصف الثامن', section: '3 (ج)', subject: 'الرياضيات', studentsCount: 0, examsMonth: 4, avgScore: 81, inviteCode: 'MATH8-1002' },
    { id: 3, code: 'grade10-sci', name: 'الصف عاشر 2', grade: 'الصف العاشر', section: '2 (ب)', subject: 'العلوم', studentsCount: 0, examsMonth: 3, avgScore: 87, inviteCode: 'SCI10-1003' },
    { id: 4, code: 'grade7-eng', name: 'الصف سابع 1', grade: 'الصف السابع', section: '1 (أ)', subject: 'اللغة الإنجليزية', studentsCount: 0, examsMonth: 6, avgScore: 83, inviteCode: 'ENG7-1004' }
  ];

  var firstNames = ['يوسف', 'سارة', 'ريم', 'خالد', 'سلمى', 'عبدالله', 'ليان', 'نور', 'مالك', 'جود'];
  var lastNames = ['لؤي', 'بدر', 'العمري', 'السيد', 'المطيري', 'حسن', 'الزهراني', 'القحطاني'];
  var examNames = ['اختبار قراءة', 'اختبار مفاهيم', 'اختبار وحدة', 'اختبار نصف الفصل'];

  function loadArray(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback.slice();
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return fallback.slice();
  }

  var groups = loadArray(groupsKey, defaultGroups);
  var requests = loadArray(requestsKey, []);
  var members = loadArray(membersKey, []);
  var history = loadArray(historyKey, []);
  var resources = loadArray(resourcesKey, []);
  var selectedCode = '';
  var editCode = null;

  var groupsGrid = document.getElementById('groups-grid');
  var groupTitle = document.getElementById('group-title');
  var groupSubtitle = document.getElementById('group-subtitle');
  var groupExamLink = document.getElementById('group-exam-link');
  var studentsBody = document.getElementById('students-body');
  var requestsBody = document.getElementById('join-requests-body');
  var statStudents = document.getElementById('stat-students');
  var statExams = document.getElementById('stat-exams');
  var statScore = document.getElementById('stat-score');
  var inviteCodeValue = document.getElementById('invite-code-value');
  var resourcesBody = document.getElementById('resources-body');
  var resourceTitleInput = document.getElementById('resource-title');
  var resourceModeInput = document.getElementById('resource-mode');
  var resourceFileInput = document.getElementById('resource-file');
  var resourceFileField = document.getElementById('resource-file-field');
  var resourceLinkField = document.getElementById('resource-link-field');
  var resourceLinkInput = document.getElementById('resource-link');
  var resourceNoteInput = document.getElementById('resource-note');
  var addResourceBtn = document.getElementById('add-resource-btn');
  var streamPreview = document.getElementById('group-stream-preview');
  var toastNode = document.getElementById('group-toast');
  var toastTimer = null;
  var undoTimer = null;
  var pendingUndo = null;

  var addGroupBtn = document.getElementById('add-group-btn');
  var modalOverlay = document.getElementById('group-modal-overlay');
  var modalClose = document.getElementById('group-modal-close');
  var modalCancel = document.getElementById('group-modal-cancel');
  var modalTitle = document.getElementById('group-modal-title');
  var groupForm = document.getElementById('group-form');
  var groupNameInput = document.getElementById('group-name');
  var groupSubjectInput = document.getElementById('group-subject');
  var groupGradeInput = document.getElementById('group-grade');
  var groupSectionInput = document.getElementById('group-section');
  var groupCountInput = document.getElementById('group-count');

  function saveAll() {
    try {
      localStorage.setItem(groupsKey, JSON.stringify(groups));
      localStorage.setItem(requestsKey, JSON.stringify(requests));
      localStorage.setItem(membersKey, JSON.stringify(members));
      localStorage.setItem(historyKey, JSON.stringify(history));
      localStorage.setItem(resourcesKey, JSON.stringify(resources));
    } catch (e) {}
  }

  function esc(v) {
    return String(v || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slug(v) {
    return String(v || '').toLowerCase().replace(/[^\u0600-\u06FFa-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function normalizeGrade(v) {
    return String(v || '').replace(/\s+/g, '').replace(/^الصف/u, '').replace(/^صف/u, '').toLowerCase();
  }

  function normalizeSection(v) {
    return String(v || '').replace(/\s+/g, '').toLowerCase();
  }

  function sameStudent(a, b) {
    var aId = String(a.studentId || a.id || '').trim().toLowerCase();
    var bId = String(b.studentId || b.id || '').trim().toLowerCase();
    if (aId && bId) return aId === bId;
    var aName = String(a.studentName || a.name || '').trim().toLowerCase();
    var bName = String(b.studentName || b.name || '').trim().toLowerCase();
    return aName && bName && aName === bName;
  }

  function getGroup(code) {
    for (var i = 0; i < groups.length; i++) if (groups[i].code === code) return groups[i];
    return null;
  }

  function membersOf(code) {
    return members.filter(function (m) { return m.groupCode === code; });
  }

  function requestsOf(code) {
    return requests.filter(function (r) { return r.groupCode === code; });
  }

  function resourcesOf(code) {
    return resources.filter(function (r) { return r.groupCode === code; });
  }

  function inviteExists(code) {
    var c = String(code || '').toUpperCase();
    for (var i = 0; i < groups.length; i++) if (String(groups[i].inviteCode || '').toUpperCase() === c) return true;
    return false;
  }

  function newInvite(seed) {
    var base = String(seed || 'GRP').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (base.length < 4) base += 'GRP1';
    base = base.slice(0, 5);
    var code = '';
    do {
      code = base + '-' + String(Math.floor(1000 + Math.random() * 9000));
    } while (inviteExists(code));
    return code;
  }

  function normalizeData() {
    var used = {};
    groups.forEach(function (g, i) {
      g.name = String(g.name || '').trim();
      g.code = String(g.code || (slug(g.name || ('group-' + i)) + '-' + Date.now().toString().slice(-4)));
      g.grade = String(g.grade || '').trim();
      g.section = String(g.section || '').trim();
      g.subject = String(g.subject || '').trim();
      g.studentsCount = Math.max(0, Number(g.studentsCount) || 0);
      g.examsMonth = Math.max(0, Number(g.examsMonth) || 0);
      g.avgScore = Math.max(0, Math.min(100, Number(g.avgScore) || 0));
      var c = String(g.inviteCode || '').toUpperCase();
      if (!c || used[c]) c = newInvite(g.name + g.grade);
      used[c] = true;
      g.inviteCode = c;
    });
  }

  function syncSchoolStudents() {
    if (tenantType !== 'school_teacher') return;
    var schoolStudents = loadArray(schoolStudentsKey, []);
    if (!schoolStudents.length) return;
    var changed = false;

    groups.forEach(function (g) {
      var gGrade = normalizeGrade(g.grade);
      var gSection = normalizeSection(g.section);
      schoolStudents.forEach(function (s, i) {
        var gradeMatch = gGrade && gGrade === normalizeGrade(s.grade);
        var sectionMatch = !gSection || !s.section || gSection === normalizeSection(s.section);
        if (!gradeMatch || !sectionMatch) return;

        var exists = members.some(function (m) { return m.groupCode === g.code && sameStudent(m, s); });
        if (exists) return;

        members.push({
          id: 'auto-' + Date.now() + '-' + i,
          groupCode: g.code,
          studentName: String(s.name || s.studentName || 'طالب'),
          studentId: String(s.studentId || s.id || ''),
          grade: String(s.grade || ''),
          section: String(s.section || ''),
          source: 'school_auto',
          joinedAt: new Date().toISOString()
        });
        changed = true;
      });
    });

    if (changed) recalcCounts();
  }

  function recalcCounts() {
    groups.forEach(function (g) {
      var count = membersOf(g.code).length;
      if (count > 0 || tenantType === 'school_teacher') g.studentsCount = count;
    });
  }

  function cleanOrphans() {
    var valid = {};
    groups.forEach(function (g) { valid[g.code] = true; });
    members = members.filter(function (m) { return !!valid[m.groupCode]; });
    requests = requests.filter(function (r) { return !!valid[r.groupCode]; });
    resources = resources.filter(function (r) { return !!valid[r.groupCode]; });
  }

  function subjectShort(s) {
    if (s === 'اللغة الإنجليزية') return 'إنجليزي';
    if (s === 'الرياضيات') return 'رياضيات';
    if (s === 'العلوم') return 'علوم';
    if (s === 'اللغة العربية') return 'عربي';
    return s || 'مادة';
  }

  function fmtDate(v) {
    var d = new Date(v || Date.now());
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('ar-SA', { hour12: true, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function setGroupInUrl(code) {
    var p = new URLSearchParams(window.location.search);
    p.set('g', code);
    window.history.replaceState({}, '', window.location.pathname + '?' + p.toString());
  }

  function ensureSelected() {
    var q = new URLSearchParams(window.location.search).get('g');
    if (q && getGroup(q)) { selectedCode = q; return; }
    selectedCode = groups.length ? groups[0].code : '';
  }

  function renderGroups() {
    if (!groups.length) {
      groupsGrid.innerHTML = '<div class="empty-state">لا توجد مجموعات حتى الآن. اضغط "إضافة مجموعة" للبدء.</div>';
      return;
    }

    var html = '';
    groups.forEach(function (g) {
      var count = membersOf(g.code).length || Number(g.studentsCount) || 0;
      html += '' +
        '<article class="group-card-item' + (g.code === selectedCode ? ' group-card-item--active' : '') + '">' +
          '<h3>' + esc(g.name) + ' - ' + esc(subjectShort(g.subject)) + '</h3>' +
          '<div class="group-card-meta">' +
            '<span>' + esc(g.grade) + (g.section ? ' / ' + esc(g.section) : '') + '</span>' +
            '<span>' + count + ' طالب</span>' +
            '<span>كود: ' + esc(g.inviteCode) + '</span>' +
          '</div>' +
          '<div class="group-card-actions">' +
            '<button type="button" class="btn btn--teacher btn--sm" data-action="open" data-code="' + esc(g.code) + '">فتح</button>' +
            '<button type="button" class="btn btn--outline btn--sm" data-action="edit" data-code="' + esc(g.code) + '">تعديل</button>' +
            '<button type="button" class="btn btn--outline btn--sm" data-action="delete" data-code="' + esc(g.code) + '">حذف</button>' +
          '</div>' +
        '</article>';
    });

    groupsGrid.innerHTML = html;
  }
  function renderStudents(group) {
    var list = membersOf(group.code);
    if (!list.length) {
      var fallback = Math.max(0, Number(group.studentsCount) || 0);
      if (!fallback) {
        studentsBody.innerHTML = '<tr><td colspan="4">لا يوجد طلاب حالياً. شارك كود الانضمام أو اربط الطلاب من إدارة المدرسة.</td></tr>';
        return;
      }
      var rawRows = '';
      for (var i = 0; i < fallback; i++) {
        var first = firstNames[i % firstNames.length];
        var last = lastNames[(i * 2) % lastNames.length];
        var score = Math.max(50, Math.min(100, (Number(group.avgScore) || 80) + ((i % 5) - 2) * 3));
        var reportHref = buildReportHref(group, null, examNames[i % examNames.length], score);
        rawRows += '' +
          '<tr>' +
            '<td>' + first + ' ' + last + '</td>' +
            '<td>' + examNames[i % examNames.length] + '</td>' +
            '<td>' + score + '</td>' +
            '<td><a class="btn btn--teacher btn--sm" href="' + reportHref + '">عرض التقرير</a></td>' +
          '</tr>';
      }
      studentsBody.innerHTML = rawRows;
      return;
    }

    var rows = '';
    list.forEach(function (m, i) {
      var score = Math.max(50, Math.min(100, (Number(group.avgScore) || 80) + ((i % 5) - 2) * 3));
      var reportHref = buildReportHref(group, m, examNames[i % examNames.length], score);
      rows += '' +
        '<tr>' +
          '<td>' + esc(m.studentName || 'طالب') + (m.studentId ? ' <small style="color:#6b7280;">(' + esc(m.studentId) + ')</small>' : '') + '</td>' +
          '<td>' + examNames[i % examNames.length] + '</td>' +
          '<td>' + score + '</td>' +
          '<td><a class="btn btn--teacher btn--sm" href="' + reportHref + '">عرض التقرير</a></td>' +
        '</tr>';
    });
    studentsBody.innerHTML = rows;
  }

  function renderRequests(group) {
    var list = requestsOf(group.code);
    if (!list.length) {
      requestsBody.innerHTML = '<tr><td colspan="4">لا توجد طلبات انضمام حالياً.</td></tr>';
      return;
    }

    var rows = '';
    list.forEach(function (r) {
      rows += '' +
        '<tr>' +
          '<td>' + esc(r.studentName || 'طالب') + (r.studentId ? ' <small style="color:#6b7280;">(' + esc(r.studentId) + ')</small>' : '') + '</td>' +
          '<td>' + esc(r.grade || '-') + (r.section ? ' / ' + esc(r.section) : '') + '</td>' +
          '<td>' + fmtDate(r.requestedAt) + '</td>' +
          '<td style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button type="button" class="btn btn--teacher btn--sm" data-request-action="approve" data-request-id="' + esc(r.id) + '">موافقة</button>' +
            '<button type="button" class="btn btn--outline btn--sm" data-request-action="reject" data-request-id="' + esc(r.id) + '">رفض</button>' +
          '</td>' +
        '</tr>';
    });
    requestsBody.innerHTML = rows;
  }

  function isWebUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
  }

  function parseYouTubeId(url) {
    var value = String(url || '').trim();
    if (!value) return '';
    var match = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    return match ? match[1] : '';
  }

  function fileExt(fileName) {
    var name = String(fileName || '').trim().toLowerCase();
    var idx = name.lastIndexOf('.');
    if (idx < 0) return '';
    return name.slice(idx + 1);
  }

  function inferResourceType(item) {
    var webLink = String(item.websiteLink || item.link || '').trim();
    if (parseYouTubeId(webLink)) return 'video';

    var ext = fileExt(item.attachmentName);
    if (ext === 'pdf') return 'pdf';
    if (ext === 'doc' || ext === 'docx') return 'docx';
    if (ext === 'mp4' || ext === 'webm') return 'video';
    if (!item.attachmentName && isWebUrl(webLink)) return 'link';
    return item.type || 'file';
  }

  function resourceTypeLabel(type) {
    if (type === 'pdf') return 'PDF';
    if (type === 'docx') return 'DOCX';
    if (type === 'link') return 'رابط';
    if (type === 'video') return 'فيديو';
    return 'ملف مرفق';
  }

  function renderResourceStreamPreview(group) {
    if (!streamPreview) return;
    if (!group) {
      streamPreview.innerHTML = '<div class="stream-empty">لا توجد مجموعة محددة.</div>';
      return;
    }

    var list = resourcesOf(group.code);
    if (!list.length) {
      streamPreview.innerHTML = '<div class="stream-empty">لا يوجد محتوى منشور في التدفق حتى الآن.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var websiteLink = String(item.websiteLink || item.link || '').trim();
      var youtubeId = String(item.youtubeId || parseYouTubeId(websiteLink) || '').trim();
      var attachmentName = String(item.attachmentName || '').trim();
      var attachmentHref = String(item.attachmentDataUrl || '').trim();
      var note = String(item.note || '').trim();

      var actions = '';
      if (attachmentHref) {
        actions += '<a href="' + esc(attachmentHref) + '" download="' + esc(attachmentName || 'attachment') + '" class="btn btn--teacher btn--sm"><i class="fas fa-paperclip"></i><span>تحميل المرفق</span></a>';
      } else if (attachmentName) {
        actions += '<span class="hint">مرفق: ' + esc(attachmentName) + '</span>';
      }
      if (isWebUrl(websiteLink)) {
        actions += '<a href="' + esc(websiteLink) + '" target="_blank" rel="noopener" class="btn btn--outline btn--sm"><i class="fas fa-link"></i><span>فتح الرابط</span></a>';
      }
      if (!actions) {
        actions = '<span class="hint">لا يوجد رابط مباشر.</span>';
      }

      var bodyHtml = note ? '<div class="stream-item__body">' + esc(note) + '</div>' : '';
      if (youtubeId) {
        bodyHtml += '<iframe class="stream-video" src="https://www.youtube.com/embed/' + esc(youtubeId) + '" title="' + esc(item.title || 'YouTube video') + '" loading="lazy" allowfullscreen></iframe>';
      }

      html += ''
        + '<article class="stream-item">'
        + '<div class="stream-item__head">'
        + '<div class="stream-item__title">' + esc(item.title || 'محتوى تعليمي') + '</div>'
        + '<div class="stream-item__meta">' + esc(fmtDate(item.createdAt)) + '</div>'
        + '</div>'
        + bodyHtml
        + '<div class="stream-item__actions">' + actions + '</div>'
        + '</article>';
    }

    streamPreview.innerHTML = html;
  }

  function renderResources(group) {
    if (!resourcesBody) return;
    var list = resourcesOf(group.code);

    if (!list.length) {
      resourcesBody.innerHTML = '<tr><td colspan="5">لا يوجد محتوى مضاف بعد. أضف مرفقًا أو رابطًا للمجموعة.</td></tr>';
      renderResourceStreamPreview(group);
      return;
    }

    var rows = '';
    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var websiteLink = String(item.websiteLink || item.link || '').trim();
      var oldFileRef = item.attachmentName ? '' : (isWebUrl(websiteLink) ? '' : websiteLink);
      var attachmentName = String(item.attachmentName || oldFileRef || '').trim();
      var attachmentSize = String(item.attachmentSizeText || item.size || '').trim();
      var attachmentHtml = '-';
      if (attachmentName) {
        if (item.attachmentDataUrl) {
          attachmentHtml = '<a href="' + esc(item.attachmentDataUrl) + '" download="' + esc(attachmentName) + '">' + esc(attachmentName) + '</a>';
        } else {
          attachmentHtml = esc(attachmentName);
        }
        if (attachmentSize) attachmentHtml += ' <small style="color:#6b7280;">(' + esc(attachmentSize) + ')</small>';
      }

      var linkHtml = '-';
      if (isWebUrl(websiteLink)) {
        linkHtml = '<a href="' + esc(websiteLink) + '" target="_blank" rel="noopener">' + esc(websiteLink) + '</a>';
      }

      var note = String(item.note || '').trim();
      rows += '' +
        '<tr>' +
          '<td>' + esc(item.title || 'محتوى') + (note ? ' <small style="color:#6b7280;">(' + esc(note) + ')</small>' : '') + '</td>' +
          '<td>' + resourceTypeLabel(inferResourceType(item)) + '</td>' +
          '<td>' + attachmentHtml + '</td>' +
          '<td>' + linkHtml + '</td>' +
          '<td><button type="button" class="btn btn--outline btn--sm" data-resource-action="delete" data-resource-id="' + esc(item.id) + '">حذف</button></td>' +
        '</tr>';
    }
    resourcesBody.innerHTML = rows;
    renderResourceStreamPreview(group);
  }

  function renderDetails() {
    var g = getGroup(selectedCode);
    if (!g) {
      groupTitle.textContent = '-';
      groupSubtitle.textContent = 'لا توجد مجموعة محددة.';
      statStudents.textContent = '0';
      statExams.textContent = '0';
      statScore.textContent = '0%';
      inviteCodeValue.textContent = '-';
      studentsBody.innerHTML = '<tr><td colspan="4">لا توجد بيانات طلاب.</td></tr>';
      requestsBody.innerHTML = '<tr><td colspan="4">لا توجد طلبات.</td></tr>';
      if (resourcesBody) resourcesBody.innerHTML = '<tr><td colspan="5">لا توجد مجموعة محددة.</td></tr>';
      renderResourceStreamPreview(null);
      return;
    }

    var mCount = membersOf(g.code).length || Number(g.studentsCount) || 0;
    groupTitle.textContent = g.name + ' - ' + subjectShort(g.subject);
    groupSubtitle.textContent = 'إدارة الطلاب ومتابعة الأداء لمجموعة ' + g.grade + (g.section ? ' / ' + g.section : '') + '.';
    statStudents.textContent = String(mCount);
    statExams.textContent = String(Number(g.examsMonth) || 0);
    statScore.textContent = String(Number(g.avgScore) || 0) + '%';
    inviteCodeValue.textContent = g.inviteCode || '-';
    groupExamLink.href = 'exam-wizard.html?group=' + encodeURIComponent(g.code);

    renderStudents(g);
    renderRequests(g);
    renderResources(g);
    setGroupInUrl(g.code);
  }

  function openModal(isEdit, code) {
    editCode = null;
    groupForm.reset();
    groupCountInput.value = '25';
    groupSectionInput.value = '';
    modalTitle.textContent = isEdit ? 'تعديل المجموعة' : 'إضافة مجموعة';

    if (isEdit && code) {
      var g = getGroup(code);
      if (!g) return;
      editCode = code;
      groupNameInput.value = g.name || '';
      groupSubjectInput.value = g.subject || '';
      groupGradeInput.value = g.grade || '';
      groupSectionInput.value = g.section || '';
      groupCountInput.value = String(Number(g.studentsCount) || 25);
    }

    modalOverlay.classList.add('on');
    modalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modalOverlay.classList.remove('on');
    modalOverlay.setAttribute('aria-hidden', 'true');
  }

  function saveGroup(e) {
    e.preventDefault();
    var name = String(groupNameInput.value || '').trim();
    var subject = String(groupSubjectInput.value || '').trim();
    var grade = String(groupGradeInput.value || '').trim();
    var section = String(groupSectionInput.value || '').trim();
    var count = Number(groupCountInput.value || 0);

    if (!name || !subject || !grade || !count || count < 1) {
      showToast('يرجى تعبئة كل الحقول بشكل صحيح.');
      return;
    }

    if (editCode) {
      var g = getGroup(editCode);
      if (!g) return;
      g.name = name;
      g.subject = subject;
      g.grade = grade;
      g.section = section;
      g.studentsCount = count;
    } else {
      var code = slug(grade + '-' + subject + '-' + name).slice(0, 40) + '-' + Date.now().toString().slice(-4);
      groups.unshift({
        id: Date.now(),
        code: code,
        name: name,
        grade: grade,
        section: section,
        subject: subject,
        studentsCount: count,
        examsMonth: 0,
        avgScore: 0,
        inviteCode: newInvite(name + grade)
      });
      selectedCode = code;
    }

    normalizeData();
    syncSchoolStudents();
    recalcCounts();
    cleanOrphans();
    saveAll();
    closeModal();
    renderGroups();
    renderDetails();
    showToast(editCode ? 'تم تحديث المجموعة بنجاح.' : 'تم إنشاء المجموعة بنجاح.');
  }

  function approveRequest(id) {
    var req = null;
    for (var i = 0; i < requests.length; i++) {
      if (requests[i].id === id) { req = requests[i]; break; }
    }
    if (!req) return;

    var exists = members.some(function (m) {
      return m.groupCode === req.groupCode && sameStudent(m, req);
    });

    if (!exists) {
      members.push({
        id: 'manual-' + Date.now(),
        groupCode: req.groupCode,
        studentName: req.studentName || 'طالب',
        studentId: req.studentId || '',
        grade: req.grade || '',
        section: req.section || '',
        source: 'invite',
        joinedAt: new Date().toISOString()
      });
    }

    pushHistory(req, 'approved');
    requests = requests.filter(function (r) { return r.id !== id; });
    recalcCounts();
    saveAll();
    renderGroups();
    renderDetails();
  }

  function rejectRequest(id) {
    var req = null;
    for (var i = 0; i < requests.length; i++) {
      if (requests[i].id === id) { req = requests[i]; break; }
    }
    if (req) {
      pushHistory(req, 'rejected');
    }
    requests = requests.filter(function (r) { return r.id !== id; });
    saveAll();
    renderDetails();
  }

  function pushHistory(req, status) {
    if (!req) return;
    history.unshift({
      id: 'hist-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      requestId: req.id || '',
      groupCode: req.groupCode || '',
      inviteCode: req.inviteCode || '',
      studentName: req.studentName || 'طالب',
      studentId: req.studentId || '',
      grade: req.grade || '',
      section: req.section || '',
      requestedAt: req.requestedAt || '',
      status: status,
      decidedAt: new Date().toISOString(),
      decidedBy: 'teacher'
    });
    if (history.length > 500) {
      history = history.slice(0, 500);
    }
  }

  function copyText(value) {
    if (!value) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(function () {
        showToast('تم نسخ كود الانضمام.');
      }).catch(function () {
        showToast('تعذر النسخ تلقائياً. الكود: ' + value);
      });
      return;
    }

    var area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    try {
      document.execCommand('copy');
      showToast('تم نسخ كود الانضمام.');
    } catch (e) {
      showToast('تعذر النسخ تلقائياً. الكود: ' + value);
    }
    document.body.removeChild(area);
  }

  function formatFileSize(bytes) {
    var size = Number(bytes) || 0;
    if (size <= 0) return '';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function readAttachmentAsDataUrl(file, done) {
    if (!file) {
      done({ dataUrl: '', sizeText: '' });
      return;
    }

    var sizeText = formatFileSize(file.size);
    var maxBytes = 1024 * 1024;
    if (file.size > maxBytes) {
      done({ dataUrl: '', sizeText: sizeText });
      showToast('حجم الملف كبير؛ سيتم حفظ اسم الملف فقط بدون معاينة مباشرة.');
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      done({ dataUrl: String(reader.result || ''), sizeText: sizeText });
    };
    reader.onerror = function () {
      done({ dataUrl: '', sizeText: sizeText });
    };
    reader.readAsDataURL(file);
  }

  function addResource() {
    var group = getGroup(selectedCode);
    if (!group) {
      showToast('اختر مجموعة أولاً لإضافة المحتوى.');
      return;
    }

    var title = String(resourceTitleInput && resourceTitleInput.value || '').trim();
    var websiteLink = String(resourceLinkInput && resourceLinkInput.value || '').trim();
    var note = String(resourceNoteInput && resourceNoteInput.value || '').trim();
    var attachment = resourceFileInput && resourceFileInput.files && resourceFileInput.files.length
      ? resourceFileInput.files[0]
      : null;

    var mode = getResourceMode();
    if (!title) {
      showToast('يرجى إدخال عنوان المحتوى.');
      return;
    }
    if (mode === 'file' && !attachment) {
      showToast('يرجى إضافة مرفق ملف.');
      return;
    }
    if (mode === 'link' && !websiteLink) {
      showToast('يرجى إضافة رابط موقع.');
      return;
    }
    if (!attachment && !websiteLink) {
      showToast('أضف مرفقًا أو رابط موقع على الأقل.');
      return;
    }
    if (websiteLink && !isWebUrl(websiteLink)) {
      showToast('يرجى إدخال رابط صحيح يبدأ بـ http أو https.');
      return;
    }

    readAttachmentAsDataUrl(attachment, function (attachmentInfo) {
      var resourceItem = {
        id: 'res-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        groupCode: group.code,
        title: title,
        websiteLink: websiteLink,
        note: note,
        createdAt: new Date().toISOString()
      };

      if (attachment) {
        resourceItem.attachmentName = attachment.name || 'attachment';
        resourceItem.attachmentMime = attachment.type || '';
        resourceItem.attachmentSizeBytes = Number(attachment.size) || 0;
        resourceItem.attachmentSizeText = attachmentInfo.sizeText || formatFileSize(attachment.size);
        resourceItem.attachmentDataUrl = attachmentInfo.dataUrl || '';
      }

      var youtubeId = parseYouTubeId(websiteLink);
      if (youtubeId) resourceItem.youtubeId = youtubeId;
      resourceItem.type = inferResourceType(resourceItem);

      resources.unshift(resourceItem);

      saveAll();
      renderResources(group);

      if (resourceTitleInput) resourceTitleInput.value = '';
      if (resourceLinkInput) resourceLinkInput.value = '';
      if (resourceNoteInput) resourceNoteInput.value = '';
      if (resourceFileInput) resourceFileInput.value = '';
      showToast('تمت إضافة المحتوى للمجموعة بنجاح.');
    });
  }
  groupsGrid.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;

    var action = btn.getAttribute('data-action');
    var code = btn.getAttribute('data-code');
    var group = getGroup(code);
    if (!group) return;

    if (action === 'open') {
      selectedCode = code;
      renderGroups();
      renderDetails();
      return;
    }

    if (action === 'edit') {
      openModal(true, code);
      return;
    }

    if (action === 'delete') {
      if (groups.length === 1) {
        showToast('يجب أن تبقى مجموعة واحدة على الأقل.');
        return;
      }
      var removedGroup = group;
      var removedMembers = members.filter(function (m) { return m.groupCode === code; });
      var removedRequests = requests.filter(function (r) { return r.groupCode === code; });
      var removedResources = resources.filter(function (r) { return r.groupCode === code; });

      groups = groups.filter(function (g) { return g.code !== code; });
      members = members.filter(function (m) { return m.groupCode !== code; });
      requests = requests.filter(function (r) { return r.groupCode !== code; });
      resources = resources.filter(function (r) { return r.groupCode !== code; });
      if (selectedCode === code && groups.length) selectedCode = groups[0].code;
      renderGroups();
      renderDetails();
      scheduleUndo(function () {
        saveAll();
        showToast('تم حذف المجموعة.', false);
      }, function () {
        groups.unshift(removedGroup);
        members = members.concat(removedMembers);
        requests = requests.concat(removedRequests);
        resources = resources.concat(removedResources);
        selectedCode = removedGroup.code;
        renderGroups();
        renderDetails();
        showToast('تم استرجاع المجموعة.');
      }, 'تم حذف المجموعة. يمكنك التراجع');
    }
  });

  requestsBody.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-request-action]');
    if (!btn) return;
    var id = btn.getAttribute('data-request-id');
    var action = btn.getAttribute('data-request-action');
    if (!id) return;

    if (action === 'approve') approveRequest(id);
    if (action === 'reject') rejectRequest(id);
  });

  document.getElementById('copy-invite-code-btn').addEventListener('click', function () {
    var g = getGroup(selectedCode);
    if (!g) return;
    copyText(g.inviteCode || '');
  });

  document.getElementById('rotate-invite-code-btn').addEventListener('click', function () {
    var g = getGroup(selectedCode);
    if (!g) return;
    var oldCode = g.inviteCode;
    g.inviteCode = newInvite(g.name + Date.now());
    renderGroups();
    renderDetails();
    scheduleUndo(function () {
      saveAll();
      showToast('تم تحديث كود الانضمام.');
    }, function () {
      g.inviteCode = oldCode;
      renderGroups();
      renderDetails();
      showToast('تمت استعادة الكود السابق.');
    }, 'تم إنشاء كود جديد. يمكنك التراجع');
  });

  if (addResourceBtn) {
    addResourceBtn.addEventListener('click', addResource);
  }

  if (resourceModeInput) {
    resourceModeInput.addEventListener('change', applyResourceMode);
  }

  if (resourceLinkInput) {
    resourceLinkInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addResource();
      }
    });
  }

  if (resourcesBody) {
    resourcesBody.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-resource-action]');
      if (!btn) return;

      var action = btn.getAttribute('data-resource-action');
      var resourceId = btn.getAttribute('data-resource-id');
      if (action !== 'delete' || !resourceId) return;
      var removed = null;
      resources = resources.filter(function (item) {
        if (item.id === resourceId) {
          removed = item;
          return false;
        }
        return true;
      });
      if (!removed) return;
      var current = getGroup(selectedCode);
      if (current) renderResources(current);
      scheduleUndo(function () {
        saveAll();
      }, function () {
        resources.unshift(removed);
        var currentGroup = getGroup(selectedCode);
        if (currentGroup) renderResources(currentGroup);
      }, 'تم حذف المحتوى. يمكنك التراجع');
    });
  }

  addGroupBtn.addEventListener('click', function () { openModal(false); });
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeModal(); });
  groupForm.addEventListener('submit', saveGroup);

  function applyLanguage(lang) {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
       // Simple data-i18n check could be added here if needed, 
       // but teacher-group.html labels are mostly static for now.
       // We'll just ensure the page respects the language change event.
    }
  }

  document.addEventListener('mitests:languagechange', function (e) {
    applyLanguage(e.detail.lang || 'ar');
    renderGroups();
    renderDetails();
  });

  normalizeData();
  syncSchoolStudents();
  cleanOrphans();
  recalcCounts();
  ensureSelected();
  applyResourceMode();
  saveAll();
  renderGroups();
  renderDetails();
})();
  function showToast(message, actionLabel, actionFn, timeoutMs) {
    if (!toastNode) return;
    if (toastTimer) clearTimeout(toastTimer);
    toastNode.innerHTML = '';

    var text = document.createElement('span');
    text.textContent = String(message || '');
    toastNode.appendChild(text);

    if (actionLabel && typeof actionFn === 'function') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = actionLabel;
      btn.addEventListener('click', function () {
        actionFn();
        hideToast();
      });
      toastNode.appendChild(btn);
    }

    toastNode.classList.add('on');
    toastTimer = setTimeout(hideToast, timeoutMs || (actionLabel ? 5600 : 2600));
  }

  function hideToast() {
    if (!toastNode) return;
    toastNode.classList.remove('on');
  }

  function clearPendingUndo() {
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = null;
    pendingUndo = null;
  }

  function scheduleUndo(commitFn, rollbackFn, message) {
    clearPendingUndo();
    pendingUndo = { commitFn: commitFn };
    showToast(message, 'تراجع', function () {
      if (typeof rollbackFn === 'function') rollbackFn();
      clearPendingUndo();
    }, 5600);
    undoTimer = setTimeout(function () {
      if (!pendingUndo) return;
      try { pendingUndo.commitFn(); } catch (e) {}
      clearPendingUndo();
    }, 5200);
  }

  function getResourceMode() {
    return (resourceModeInput && resourceModeInput.value) ? resourceModeInput.value : 'both';
  }

  function applyResourceMode() {
    var mode = getResourceMode();
    if (resourceFileField) {
      var showFile = mode !== 'link';
      resourceFileField.classList.toggle('is-muted', !showFile);
      resourceFileField.hidden = !showFile;
    }
    if (resourceLinkField) {
      var showLink = mode !== 'file';
      resourceLinkField.classList.toggle('is-muted', !showLink);
      resourceLinkField.hidden = !showLink;
    }
  }

  function buildReportHref(group, item, fallbackTitle, fallbackScore) {
    var params = new URLSearchParams();
    params.set('kind', 'exam');
    params.set('title', item && item.title ? item.title : (fallbackTitle || 'اختبار المجموعة'));
    params.set('group', (group && (group.name || group.code)) ? (group.name || group.code) : '');
    params.set('status', 'published');
    params.set('from', 'teacher-group');
    params.set('scheduledAt', new Date().toISOString());
    if (group && group.subject) params.set('subject', group.subject);
    if (item && item.studentName) params.set('student', item.studentName);
    if (item && item.studentId) params.set('studentId', item.studentId);
    if (fallbackScore !== undefined && fallbackScore !== null) params.set('score', String(fallbackScore));
    return 'exam-report.html?' + params.toString();
  }
