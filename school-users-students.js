(function () {
  'use strict';

  function getSchoolId() {
    try {
      var id = localStorage.getItem('mitests-school-id');
      if (id) return id;
      localStorage.setItem('mitests-school-id', 'SCH-001');
    } catch (e) {}
    return 'SCH-001';
  }

  var scope = 'school:' + getSchoolId();
  var studentsKey = 'mitests-school-students:' + scope;

  var defaults = [
    {
      id: 'STD-202401',
      name: 'يوسف لؤي',
      grade: 'التاسع',
      section: '1 (أ)',
      guardian: '0599123456',
      lastLogin: 'اليوم، 10:30 ص',
      status: 'active'
    },
    {
      id: 'STD-202442',
      name: 'ليان حسن',
      grade: 'الثامن',
      section: '3 (ج)',
      guardian: '0568987654',
      lastLogin: 'منذ 3 أيام',
      status: 'inactive'
    },
    {
      id: 'STD-202447',
      name: 'مالك العلي',
      grade: 'العاشر',
      section: '2 (ب)',
      guardian: '0595556677',
      lastLogin: 'أمس، 8:05 م',
      status: 'active'
    }
  ];

  function loadStudents() {
    try {
      var raw = localStorage.getItem(studentsKey);
      if (!raw) return defaults.slice();
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return defaults.slice();
  }

  var students = loadStudents();
  var editingId = '';

  var tableBody = document.getElementById('students-table-body');
  var addBtn = document.getElementById('add-student-btn');
  var addSaveBtn = document.getElementById('modal-save');
  var addCloseBtn = document.getElementById('modal-close');

  var addNameInput = document.getElementById('student-name');
  var addGradeInput = document.getElementById('student-grade');
  var addSectionInput = document.getElementById('student-section');
  var addGuardianInput = document.getElementById('student-guardian');

  var editModal = document.getElementById('edit-student-modal');
  var editNameInput = document.getElementById('edit-student-name');
  var editGradeInput = document.getElementById('edit-student-grade');
  var editSectionInput = document.getElementById('edit-student-section');
  var editGuardianInput = document.getElementById('edit-student-guardian');
  var editSaveBtn = document.getElementById('edit-student-save-btn');

  function saveStudents() {
    try {
      localStorage.setItem(studentsKey, JSON.stringify(students));
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

  function statusTag(status) {
    if (status === 'active') {
      return '<span class="status-badge status-active">نشط</span>';
    }
    return '<span class="status-badge status-inactive">بانتظار التفعيل</span>';
  }

  function closeEditModal() {
    editModal.classList.remove('modal-overlay--active');
    editModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openEditModal(student) {
    editingId = student.id;
    editNameInput.value = student.name || '';
    editGradeInput.value = student.grade || '';
    editSectionInput.value = student.section || '';
    editGuardianInput.value = student.guardian || '';
    editModal.classList.add('modal-overlay--active');
    editModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function renderStudents() {
    if (!students.length) {
      tableBody.innerHTML = '<tr><td colspan="7">لا يوجد طلاب حتى الآن.</td></tr>';
      return;
    }

    var rows = '';
    students.forEach(function (student) {
      var letter = String(student.name || 'ط').trim().charAt(0) || 'ط';
      rows += '' +
        '<tr>' +
          '<td><div style="display:flex;align-items:center;gap:8px;"><div style="width:32px;height:32px;background:#dcfce7;color:#166534;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;">' + esc(letter) + '</div><div><div style="font-weight:600">' + esc(student.name) + '</div><div style="font-size:11px;color:#6b7280">' + esc(student.id) + '</div></div></div></td>' +
          '<td>' + esc(student.grade) + '</td>' +
          '<td>' + esc(student.section) + '</td>' +
          '<td>' + esc(student.guardian) + '</td>' +
          '<td>' + esc(student.lastLogin || '-') + '</td>' +
          '<td>' + statusTag(student.status) + '</td>' +
          '<td>' +
            '<button class="btn-icon edit" title="تعديل" data-action="edit" data-id="' + esc(student.id) + '"><i class="fas fa-pen"></i></button>' +
            '<button class="btn-icon" title="تقرير الطالب"><i class="fas fa-file-lines"></i></button>' +
            '<button class="btn-icon delete" title="حذف" data-action="delete" data-id="' + esc(student.id) + '"><i class="fas fa-trash"></i></button>' +
          '</td>' +
        '</tr>';
    });

    tableBody.innerHTML = rows;
  }

  function createStudentId() {
    var year = new Date().getFullYear();
    var serial = String(Math.floor(100 + Math.random() * 900));
    return 'STD-' + year + serial;
  }

  function addStudent() {
    var name = String(addNameInput.value || '').trim();
    var grade = String(addGradeInput.value || '').trim();
    var section = String(addSectionInput.value || '').trim();
    var guardian = String(addGuardianInput.value || '').trim();

    if (!name || !grade) {
      alert('يرجى إدخال اسم الطالب والصف الدراسي.');
      return;
    }

    students.unshift({
      id: createStudentId(),
      name: name,
      grade: grade,
      section: section || '-',
      guardian: guardian || '-',
      lastLogin: 'لم يسجل الدخول بعد',
      status: 'inactive'
    });

    saveStudents();
    renderStudents();
    addCloseBtn.click();
  }

  function saveEditedStudent() {
    var index = students.findIndex(function (s) { return s.id === editingId; });
    if (index < 0) return;

    var name = String(editNameInput.value || '').trim();
    var grade = String(editGradeInput.value || '').trim();
    if (!name || !grade) {
      alert('يرجى إدخال اسم الطالب والصف الدراسي.');
      return;
    }

    students[index].name = name;
    students[index].grade = grade;
    students[index].section = String(editSectionInput.value || '').trim() || '-';
    students[index].guardian = String(editGuardianInput.value || '').trim() || '-';

    saveStudents();
    renderStudents();
    closeEditModal();
  }

  addBtn.addEventListener('click', function () {
    addNameInput.value = '';
    addGradeInput.value = '';
    addSectionInput.value = '';
    addGuardianInput.value = '';
  });

  addSaveBtn.addEventListener('click', addStudent);
  editSaveBtn.addEventListener('click', saveEditedStudent);

  tableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;

    var id = btn.getAttribute('data-id');
    var action = btn.getAttribute('data-action');
    var student = students.find(function (s) { return s.id === id; });
    if (!student) return;

    if (action === 'edit') {
      openEditModal(student);
      return;
    }

    if (action === 'delete') {
      if (!window.confirm('هل تريد حذف هذا الطالب؟')) return;
      students = students.filter(function (s) { return s.id !== id; });
      saveStudents();
      renderStudents();
    }
  });

  editModal.addEventListener('click', function (e) {
    if (e.target === editModal) closeEditModal();
  });

  document.querySelectorAll('#edit-student-modal [data-modal-close]').forEach(function (btn) {
    btn.addEventListener('click', closeEditModal);
  });

  saveStudents();
  renderStudents();
})();
