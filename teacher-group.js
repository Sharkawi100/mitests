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
        rawRows += '' +
          '<tr>' +
            '<td>' + first + ' ' + last + '</td>' +
            '<td>' + examNames[i % examNames.length] + '</td>' +
            '<td>' + score + '</td>' +
            '<td><a class="btn btn--teacher btn--sm" href="exam-report.html">عرض التقرير</a></td>' +
          '</tr>';
      }
      studentsBody.innerHTML = rawRows;
      return;
    }

    var rows = '';
    list.forEach(function (m, i) {
      var score = Math.max(50, Math.min(100, (Number(group.avgScore) || 80) + ((i % 5) - 2) * 3));
      rows += '' +
        '<tr>' +
          '<td>' + esc(m.studentName || 'طالب') + (m.studentId ? ' <small style="color:#6b7280;">(' + esc(m.studentId) + ')</small>' : '') + '</td>' +
          '<td>' + examNames[i % examNames.length] + '</td>' +
          '<td>' + score + '</td>' +
          '<td><a class="btn btn--teacher btn--sm" href="exam-report.html?group=' + encodeURIComponent(group.code) + '&student=' + encodeURIComponent(m.studentId || m.studentName || '') + '">عرض التقرير</a></td>' +
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
      alert('يرجى تعبئة كل الحقول بشكل صحيح.');
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
        alert('تم نسخ كود الانضمام.');
      }).catch(function () {
        alert('تعذر النسخ تلقائياً. الكود: ' + value);
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
      alert('تم نسخ كود الانضمام.');
    } catch (e) {
      alert('تعذر النسخ تلقائياً. الكود: ' + value);
    }
    document.body.removeChild(area);
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
        alert('يجب أن تبقى مجموعة واحدة على الأقل.');
        return;
      }
      if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return;

      groups = groups.filter(function (g) { return g.code !== code; });
      members = members.filter(function (m) { return m.groupCode !== code; });
      requests = requests.filter(function (r) { return r.groupCode !== code; });
      if (selectedCode === code && groups.length) selectedCode = groups[0].code;
      saveAll();
      renderGroups();
      renderDetails();
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
    if (!window.confirm('سيتم إنشاء كود جديد وإيقاف الكود الحالي. متابعة؟')) return;
    g.inviteCode = newInvite(g.name + Date.now());
    saveAll();
    renderGroups();
    renderDetails();
  });

  addGroupBtn.addEventListener('click', function () { openModal(false); });
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeModal(); });
  groupForm.addEventListener('submit', saveGroup);

  normalizeData();
  syncSchoolStudents();
  cleanOrphans();
  recalcCounts();
  ensureSelected();
  saveAll();
  renderGroups();
  renderDetails();
})();
