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
  var profileKey = 'mitests-current-student-profile:' + scope;

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
    { code: 'grade9-eng', name: 'الصف تاسع 1', grade: 'الصف التاسع', section: '1 (أ)', subject: 'اللغة الإنجليزية', inviteCode: 'ENG9-1001' },
    { code: 'grade8-math', name: 'الصف ثامن 3', grade: 'الصف الثامن', section: '3 (ج)', subject: 'الرياضيات', inviteCode: 'MATH8-1002' },
    { code: 'grade10-sci', name: 'الصف عاشر 2', grade: 'الصف العاشر', section: '2 (ب)', subject: 'العلوم', inviteCode: 'SCI10-1003' }
  ];

  function loadArray(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback.slice();
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return fallback.slice();
  }

  function loadObject(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return Object.assign({}, fallback);
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {}
    return Object.assign({}, fallback);
  }

  var groups = loadArray(groupsKey, defaultGroups);
  var requests = loadArray(requestsKey, []);
  var members = loadArray(membersKey, []);
  var history = loadArray(historyKey, []);
  var resources = loadArray(resourcesKey, []);
  var profile = loadObject(profileKey, {
    studentId: 'STD-202401',
    name: 'يوسف لؤي',
    grade: 'التاسع',
    section: '1 (أ)'
  });

  var joinInput = document.getElementById('join-code-input');
  var joinBtn = document.getElementById('join-group-btn');
  var joinFeedback = document.getElementById('join-feedback');
  var pendingBody = document.getElementById('pending-requests-body');
  var historyBody = document.getElementById('request-history-body');
  var groupsGrid = document.getElementById('student-groups-grid');
  var contentGrid = document.getElementById('student-content-grid');
  var contentHint = document.getElementById('student-content-hint');
  var tenantBadge = document.getElementById('tenant-badge');

  var studentNameInput = document.getElementById('student-name');
  var studentIdInput = document.getElementById('student-id');
  var studentGradeInput = document.getElementById('student-grade');
  var studentSectionInput = document.getElementById('student-section');
  var saveProfileBtn = document.getElementById('save-student-profile-btn');

  function saveAll() {
    try {
      localStorage.setItem(requestsKey, JSON.stringify(requests));
      localStorage.setItem(membersKey, JSON.stringify(members));
      localStorage.setItem(historyKey, JSON.stringify(history));
      localStorage.setItem(resourcesKey, JSON.stringify(resources));
      localStorage.setItem(profileKey, JSON.stringify(profile));
    } catch (e) {}
  }

  function normalizeGrade(v) {
    return String(v || '').replace(/\s+/g, '').replace(/^الصف/u, '').replace(/^صف/u, '').toLowerCase();
  }

  function normalizeSection(v) {
    return String(v || '').replace(/\s+/g, '').toLowerCase();
  }

  function esc(v) {
    return String(v || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isCurrentStudent(entry) {
    var pId = String(profile.studentId || '').trim().toLowerCase();
    var eId = String(entry.studentId || entry.id || '').trim().toLowerCase();
    if (pId && eId) return pId === eId;

    var pName = String(profile.name || '').trim().toLowerCase();
    var eName = String(entry.studentName || entry.name || '').trim().toLowerCase();
    return pName && eName && pName === eName;
  }

  function findGroupByCode(inviteCode) {
    var code = String(inviteCode || '').trim().toUpperCase();
    for (var i = 0; i < groups.length; i++) {
      if (String(groups[i].inviteCode || '').trim().toUpperCase() === code) return groups[i];
    }
    return null;
  }

  function getGroupByRef(code) {
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].code === code) return groups[i];
    }
    return null;
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

  function inferResourceType(item) {
    var link = String((item && (item.websiteLink || item.link)) || '').trim();
    if (parseYouTubeId(link)) return 'video';
    var name = String((item && item.attachmentName) || '').toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'docx';
    if (!name && isWebUrl(link)) return 'link';
    return 'file';
  }

  function resourceTypeLabel(type) {
    if (type === 'video') return 'فيديو';
    if (type === 'pdf') return 'PDF';
    if (type === 'docx') return 'DOCX';
    if (type === 'link') return 'رابط';
    return 'ملف';
  }

  function getDemoTargetGroup(preferredCode, preferredSubject) {
    var byCode = getGroupByRef(preferredCode);
    if (byCode) return byCode;

    for (var i = 0; i < groups.length; i++) {
      if (String(groups[i].subject || '').trim() === String(preferredSubject || '').trim()) return groups[i];
    }

    return groups.length ? groups[0] : null;
  }

  function seedDemoResources() {
    var changed = false;
    var mathGroup = getDemoTargetGroup('grade8-math', 'الرياضيات');
    var englishGroup = getDemoTargetGroup('grade9-eng', 'اللغة الإنجليزية');

    var seedItems = [];
    if (mathGroup) {
      seedItems.push({
        demoSeedId: 'student-demo-math-video',
        groupCode: mathGroup.code,
        title: 'فيديو تمهيدي: حل المعادلات الخطية',
        websiteLink: 'https://www.youtube.com/watch?v=H14bBuluwB8',
        youtubeId: 'H14bBuluwB8',
        note: 'ابدأ بهذا الفيديو قبل حل الواجب.',
        type: 'video',
        createdAt: '2026-02-10T08:20:00.000Z'
      });
      seedItems.push({
        demoSeedId: 'student-demo-math-sheet',
        groupCode: mathGroup.code,
        title: 'ورقة تدريب: المعادلات والتطبيقات',
        attachmentName: 'ورقة-تدريب-رياضيات-ثامن.docx',
        attachmentMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        attachmentSizeBytes: 98304,
        attachmentSizeText: '96 KB',
        note: 'حل الأسئلة 1-8 قبل الحصة القادمة.',
        type: 'docx',
        createdAt: '2026-02-10T08:10:00.000Z'
      });
    }

    if (englishGroup) {
      seedItems.push({
        demoSeedId: 'student-demo-eng-summary',
        groupCode: englishGroup.code,
        title: 'ملخص قواعد Unit 4',
        attachmentName: 'english-unit4-summary.pdf',
        attachmentMime: 'application/pdf',
        attachmentSizeBytes: 356352,
        attachmentSizeText: '348 KB',
        note: 'راجع الملخص قبل الاختبار القصير.',
        type: 'pdf',
        createdAt: '2026-02-09T13:35:00.000Z'
      });
      seedItems.push({
        demoSeedId: 'student-demo-eng-practice',
        groupCode: englishGroup.code,
        title: 'تدريبات تفاعلية على القراءة',
        websiteLink: 'https://learnenglish.britishcouncil.org/skills/reading',
        note: 'اختر تمرين B1 وسجّل نتيجتك.',
        type: 'link',
        createdAt: '2026-02-09T13:15:00.000Z'
      });
    }

    for (var i = 0; i < seedItems.length; i++) {
      var item = seedItems[i];
      var exists = resources.some(function (r) {
        if (!r) return false;
        if (String(r.groupCode || '') !== String(item.groupCode || '')) return false;
        if (String(r.demoSeedId || '') === String(item.demoSeedId || '')) return true;
        var sameTitle = String(r.title || '').trim() === String(item.title || '').trim();
        var sameLink = String(r.websiteLink || '').trim() === String(item.websiteLink || '').trim();
        return sameTitle && sameLink;
      });
      if (exists) continue;

      item.id = 'res-demo-' + item.demoSeedId;
      resources.unshift(item);
      changed = true;
    }

    return changed;
  }

  function showFeedback(type, text) {
    joinFeedback.textContent = text;
    joinFeedback.className = 'feedback show ' + type;
  }

  function clearFeedback() {
    joinFeedback.textContent = '';
    joinFeedback.className = 'feedback';
  }

  function renderTenantBadge() {
    tenantBadge.textContent = tenantType === 'personal_teacher' ? 'وضع المعلم المستقل' : 'وضع المدرسة';
  }

  function fillProfile() {
    studentNameInput.value = profile.name || '';
    studentIdInput.value = profile.studentId || '';
    studentGradeInput.value = profile.grade || '';
    studentSectionInput.value = profile.section || '';
  }

  function updateProfileFromInputs() {
    profile.name = String(studentNameInput.value || '').trim();
    profile.studentId = String(studentIdInput.value || '').trim();
    profile.grade = String(studentGradeInput.value || '').trim();
    profile.section = String(studentSectionInput.value || '').trim();
  }

  function ensureSchoolMembership() {
    if (tenantType !== 'school_teacher') return;

    var schoolStudents = loadArray(schoolStudentsKey, []);
    var existsInSchool = schoolStudents.some(function (s) {
      var sId = String(s.studentId || s.id || '').trim().toLowerCase();
      var pId = String(profile.studentId || '').trim().toLowerCase();
      if (sId && pId) return sId === pId;
      return String(s.name || '').trim().toLowerCase() === String(profile.name || '').trim().toLowerCase();
    });
    if (!existsInSchool) return;

    var changed = false;
    var pGrade = normalizeGrade(profile.grade);
    var pSection = normalizeSection(profile.section);

    groups.forEach(function (g) {
      var gradeMatch = pGrade && pGrade === normalizeGrade(g.grade);
      var groupSection = normalizeSection(g.section);
      var sectionMatch = !groupSection || !pSection || groupSection === pSection;
      if (!gradeMatch || !sectionMatch) return;

      var already = members.some(function (m) {
        return m.groupCode === g.code && isCurrentStudent(m);
      });
      if (already) return;

      members.push({
        id: 'student-sync-' + Date.now() + '-' + g.code,
        groupCode: g.code,
        studentName: profile.name || 'طالب',
        studentId: profile.studentId || '',
        grade: profile.grade || '',
        section: profile.section || '',
        source: 'school_auto',
        joinedAt: new Date().toISOString()
      });
      changed = true;
    });

    if (changed) saveAll();
  }

  function renderPendingRequests() {
    var ownRequests = requests.filter(function (r) { return isCurrentStudent(r); });
    if (!ownRequests.length) {
      pendingBody.innerHTML = '<tr><td colspan="4">لا توجد طلبات معلقة.</td></tr>';
      return;
    }

    var rows = '';
    ownRequests.forEach(function (r) {
      var group = getGroupByRef(r.groupCode);
      rows += '' +
        '<tr>' +
          '<td>' + esc(group ? group.name + ' - ' + (group.subject || '') : 'مجموعة محذوفة') + '</td>' +
          '<td>' + esc(r.inviteCode || '-') + '</td>' +
          '<td>' + new Date(r.requestedAt || Date.now()).toLocaleString('ar-SA', { hour12: true, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</td>' +
          '<td><span style="padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;">قيد المراجعة</span></td>' +
        '</tr>';
    });

    pendingBody.innerHTML = rows;
  }

  function renderGroups() {
    var ownMembers = members.filter(function (m) { return isCurrentStudent(m); });
    var used = {};
    var html = '';

    ownMembers.forEach(function (m) {
      if (used[m.groupCode]) return;
      used[m.groupCode] = true;
      var group = getGroupByRef(m.groupCode);
      if (!group) return;

      html += '' +
        '<a class="group-link" href="student-group-detail.html?group=' + encodeURIComponent(group.code) + '">' +
          '<article class="group-card">' +
            '<h3>' + esc(group.name) + ' - ' + esc(group.subject || '') + '</h3>' +
            '<p>الصف: ' + esc(group.grade || '-') + (group.section ? ' / ' + esc(group.section) : '') + '</p>' +
            '<small style="color:var(--color-student);font-weight:700;">عرض تفاصيل المجموعة ←</small>' +
          '</article>' +
        '</a>';
    });

    if (!html) {
      var hint = tenantType === 'personal_teacher'
        ? 'لا توجد مجموعات بعد. اطلب من المعلم المستقل مشاركة كود الانضمام.'
        : 'لا توجد مجموعات مرتبطة بحسابك حالياً. استخدم كود الانضمام أو تواصل مع المدرسة.';
      groupsGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">' + esc(hint) + '</div>';
      return;
    }

    groupsGrid.innerHTML = html;
  }

  function renderGroupContentPreview() {
    if (!contentGrid) return;

    var ownMembers = members.filter(function (m) { return isCurrentStudent(m); });
    var groupCodes = {};
    for (var i = 0; i < ownMembers.length; i++) {
      groupCodes[ownMembers[i].groupCode] = true;
    }

    var list = resources.filter(function (item) {
      return !!groupCodes[item.groupCode];
    });

    var demoFallback = false;
    if (!list.length) {
      demoFallback = true;
      list = resources.slice();
    }

    list.sort(function (a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    list = list.slice(0, 6);

    if (contentHint) {
      contentHint.textContent = demoFallback
        ? 'لا توجد مجموعات منضم إليها بعد، لذلك نعرض محتوى تجريبيًا. انضم لمجموعة لرؤية محتواك الفعلي.'
        : 'أحدث الملفات والروابط المنشورة في مجموعاتك.';
    }

    if (!list.length) {
      contentGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">لا يوجد محتوى متاح حالياً.</div>';
      return;
    }

    var html = '';
    for (var j = 0; j < list.length; j++) {
      var item = list[j] || {};
      var group = getGroupByRef(item.groupCode);
      var groupLabel = group ? (group.name + ' - ' + (group.subject || '')) : (item.groupCode || 'مجموعة');
      var link = String(item.websiteLink || item.link || '').trim();
      var type = inferResourceType(item);
      var actionHtml = '';

      if (item.attachmentDataUrl) {
        var dlName = item.attachmentName || 'attachment';
        actionHtml = '<a class="btn btn--student btn--sm" href="' + esc(item.attachmentDataUrl) + '" download="' + esc(dlName) + '"><i class="fas fa-paperclip"></i><span>تحميل</span></a>';
      } else if (isWebUrl(link)) {
        actionHtml = '<a class="btn btn--outline btn--sm" href="' + esc(link) + '" target="_blank" rel="noopener"><i class="fas fa-link"></i><span>فتح</span></a>';
      } else if (item.groupCode) {
        actionHtml = '<a class="btn btn--outline btn--sm" href="student-group-detail.html?group=' + encodeURIComponent(item.groupCode) + '"><i class="fas fa-arrow-up-right-from-square"></i><span>التفاصيل</span></a>';
      } else {
        actionHtml = '<span class="hint">لا يوجد رابط مباشر.</span>';
      }

      html += ''
        + '<article class="content-card">'
        + '<h3>' + esc(item.title || 'محتوى تعليمي') + '</h3>'
        + '<div class="content-card__meta">'
        + '<span class="content-card__type">' + resourceTypeLabel(type) + '</span>'
        + '<span>' + esc(groupLabel) + '</span>'
        + '</div>'
        + (item.note ? '<p class="hint" style="margin:0;">' + esc(item.note) + '</p>' : '')
        + '<div>' + actionHtml + '</div>'
        + '</article>';
    }

    contentGrid.innerHTML = html;
  }

  function renderRequestHistory() {
    var ownHistory = history.filter(function (h) { return isCurrentStudent(h); });
    if (!ownHistory.length) {
      historyBody.innerHTML = '<tr><td colspan="4">لا يوجد سجل قرارات حتى الآن.</td></tr>';
      return;
    }

    ownHistory.sort(function (a, b) {
      return new Date(b.decidedAt || 0).getTime() - new Date(a.decidedAt || 0).getTime();
    });

    var rows = '';
    ownHistory.forEach(function (item) {
      var group = getGroupByRef(item.groupCode);
      var approved = item.status === 'approved';
      var badge = approved
        ? '<span style="padding:2px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;">تمت الموافقة</span>'
        : '<span style="padding:2px 8px;border-radius:999px;background:#fef2f2;color:#991b1b;font-size:12px;font-weight:700;">مرفوض</span>';
      var note = approved ? 'تمت إضافتك إلى المجموعة.' : 'يمكنك إعادة الإرسال لاحقاً بكود صالح.';
      rows += '' +
        '<tr>' +
          '<td>' + esc(group ? group.name + ' - ' + (group.subject || '') : 'مجموعة محذوفة') + '</td>' +
          '<td>' + badge + '</td>' +
          '<td>' + new Date(item.decidedAt || Date.now()).toLocaleString('ar-SA', { hour12: true, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</td>' +
          '<td>' + note + '</td>' +
        '</tr>';
    });

    historyBody.innerHTML = rows;
  }

  function handleJoin() {
    clearFeedback();
    var inviteCode = String(joinInput.value || '').trim().toUpperCase();
    if (!inviteCode) {
      showFeedback('error', 'يرجى إدخال كود الانضمام أولاً.');
      return;
    }

    var group = findGroupByCode(inviteCode);
    if (!group) {
      showFeedback('error', 'الكود غير صحيح أو غير متاح حالياً.');
      return;
    }

    var memberExists = members.some(function (m) {
      return m.groupCode === group.code && isCurrentStudent(m);
    });
    if (memberExists) {
      showFeedback('error', 'أنت منضم بالفعل إلى هذه المجموعة.');
      return;
    }

    var requestExists = requests.some(function (r) {
      return r.groupCode === group.code && isCurrentStudent(r);
    });
    if (requestExists) {
      showFeedback('error', 'طلبك لهذه المجموعة قيد المراجعة بالفعل.');
      return;
    }

    requests.push({
      id: 'req-' + Date.now(),
      groupCode: group.code,
      inviteCode: inviteCode,
      studentName: profile.name || 'طالب',
      studentId: profile.studentId || '',
      grade: profile.grade || '',
      section: profile.section || '',
      requestedAt: new Date().toISOString()
    });

    saveAll();
    renderPendingRequests();
    renderRequestHistory();
    renderGroupContentPreview();
    showFeedback('success', 'تم إرسال طلب الانضمام بنجاح. انتظر موافقة المعلم.');
    joinInput.value = '';
  }

  joinBtn.addEventListener('click', handleJoin);
  joinInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleJoin();
    }
  });

  saveProfileBtn.addEventListener('click', function () {
    updateProfileFromInputs();
    if (!profile.name || !profile.studentId) {
      showFeedback('error', 'يرجى إدخال اسم الطالب والرقم التعريفي على الأقل.');
      return;
    }
    saveAll();
    ensureSchoolMembership();
    renderPendingRequests();
    renderRequestHistory();
    renderGroups();
    renderGroupContentPreview();
    showFeedback('success', 'تم حفظ بيانات الطالب وتحديث المجموعات.');
  });

  if (seedDemoResources()) saveAll();
  renderTenantBadge();
  fillProfile();
  ensureSchoolMembership();
  renderPendingRequests();
  renderRequestHistory();
  renderGroups();
  renderGroupContentPreview();
})();
