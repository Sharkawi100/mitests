(function() {
  'use strict';

  // --- CONSTANTS ---

  var CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  var CEFR_SKILLS = {
    reading: { ar: 'القراءة', he: 'קריאה', en: 'Reading' },
    listening: { ar: 'الاستماع', he: 'האזנה', en: 'Listening' },
    writing: { ar: 'الكتابة', he: 'כתיבה', en: 'Writing' },
    speaking: { ar: 'تحدث', he: 'דיבור', en: 'Speaking' },
    interaction: { ar: 'تفاعل', he: 'אינטראקציה', en: 'Interaction' },
    mediation: { ar: 'وساطة', he: 'גישור', en: 'Mediation' }
  };

  var GENERIC_SKILLS = {
    critical_reading: { ar: 'القراءة الناقدة', he: 'קריאה ביקורתית', en: 'Critical Reading' },
    problem_solving: { ar: 'حل المشكلات', he: 'פתרון בעיות', en: 'Problem Solving' },
    analytical_thinking: { ar: 'التفكير التحليلي', he: 'חשיבה אנליטית', en: 'Analytical Thinking' },
    conclusion: { ar: 'استخلاص النتائج', he: 'הסקת מסקנות', en: 'Conclusion Extraction' }
  };

  var LEARNER_TRACKS = {
    ar_learning_he: { ar: 'ناطق بالعربية يتعلم العبرية', he: 'דובר ערבית לומד עברית', en: 'Arabic speaker learning Hebrew' },
    he_learning_ar: { ar: 'ناطق بالعبرية يتعلم العربية', he: 'דובר עברית לומד ערבית', en: 'Hebrew speaker learning Arabic' },
    ar_learning_en: { ar: 'ناطق بالعربية يتعلم الإنجليزية', he: 'דובר ערבית לומד אנגלית', en: 'Arabic speaker learning English' },
    he_learning_en: { ar: 'ناطق بالعبرية يتعلم الإنجليزية', he: 'דובר עברית לומד אנגלית', en: 'Hebrew speaker learning English' }
  };

  var LANGUAGE_SUBJECTS = {
    ar: ['اللغة العربية', 'العربية', 'عربي'],
    he: ['اللغة العبرية', 'العبرية', 'عبري', 'עברית', 'שפה עברית'],
    en: ['اللغة الإنجليزية', 'الإنجليزية', 'إنجليزي', 'אנגלית', 'שפה אנגלית', 'English']
  };

  // --- DATA ---

  // Seeding initial descriptors if empty
  function seedDescriptors() {
    var key = 'mitests-cefr-descriptors';
    if (localStorage.getItem(key)) return;

    var descriptors = [
      // A1 Reading
      { id: 'R-A1-01', level: 'A1', skill: 'reading', i18n: { ar: 'فهم كلمات مألوفة وجمل بسيطة جداً.', he: 'הבנת מילים מוכרות ומשפטים פשוטים מאוד.', en: 'Understand familiar titles and simple sentences.' } },
      { id: 'R-A1-02', level: 'A1', skill: 'reading', i18n: { ar: 'فهم النصوص القصيرة والبسيطة في البطاقات.', he: 'הבנת טקסטים קצרים ופשוטים בכרטיסים.', en: 'Understand short simple texts on cards.' } },
      // A2 Reading
      { id: 'R-A2-01', level: 'A2', skill: 'reading', i18n: { ar: 'قراءة نصوص قصيرة وبسيطة جداً.', he: 'קריאת טקסטים קצרים ופשוטים מאוד.', en: 'Read very short, simple texts.' } },
      { id: 'R-A2-02', level: 'A2', skill: 'reading', i18n: { ar: 'العثور على معلومات محددة في نصوص بسيطة.', he: 'מציאת מידע ספציפי בטקסטים פשוטים.', en: 'Find specific information in simple texts.' } },
      // B1 Reading
      { id: 'R-B1-01', level: 'B1', skill: 'reading', i18n: { ar: 'فهم نصوص تتضمن مفردات شائعة.', he: 'הבנת טקסטים הכוללים אוצר מילים נפוץ.', en: 'Understand texts with common vocabulary.' } },
      // A1 Writing
      { id: 'W-A1-01', level: 'A1', skill: 'writing', i18n: { ar: 'كتابة بطاقة بريدية قصيرة وبسيطة.', he: 'כתיבת גלויה קצרה ופשוטה.', en: 'Write a short, simple postcard.' } },
      // A2 Writing
      { id: 'W-A2-01', level: 'A2', skill: 'writing', i18n: { ar: 'كتابة ملاحظات ورسائل قصيرة وبسيطة.', he: 'כתיבת הערות והודעות קצרות ופשוטות.', en: 'Write short, simple notes and messages.' } }
    ];
    localStorage.setItem(key, JSON.stringify(descriptors));
  }

  // --- UTILITIES ---

  function isLanguageSubject(subjectName) {
    if (!subjectName) return false;
    var s = String(subjectName).trim().toLowerCase();
    
    // Check Arabic variants
    for (var i = 0; i < LANGUAGE_SUBJECTS.ar.length; i++) {
        if (s.indexOf(LANGUAGE_SUBJECTS.ar[i].toLowerCase()) >= 0) return true;
    }
    // Check Hebrew variants
    for (var i = 0; i < LANGUAGE_SUBJECTS.he.length; i++) {
        if (s.indexOf(LANGUAGE_SUBJECTS.he[i].toLowerCase()) >= 0) return true;
    }
    // Check English variants
    for (var i = 0; i < LANGUAGE_SUBJECTS.en.length; i++) {
        if (s.indexOf(LANGUAGE_SUBJECTS.en[i].toLowerCase()) >= 0) return true;
    }
    return false;
  }

  function inferTargetLanguage(subjectName) {
    if (!subjectName) return 'en'; // Default or fallback
    var s = String(subjectName).trim().toLowerCase();
    
    for (var i = 0; i < LANGUAGE_SUBJECTS.ar.length; i++) {
        if (s.indexOf(LANGUAGE_SUBJECTS.ar[i].toLowerCase()) >= 0) return 'ar';
    }
    for (var i = 0; i < LANGUAGE_SUBJECTS.he.length; i++) {
        if (s.indexOf(LANGUAGE_SUBJECTS.he[i].toLowerCase()) >= 0) return 'he';
    }
    return 'en';
  }

  function getAutoLearnerTrack(uiLang, targetLang) {
      // Logic:
      // UI=ar -> Speaker=ar. If target=he -> ar_learning_he. If target=en -> ar_learning_en
      // UI=he -> Speaker=he. If target=ar -> he_learning_ar. If target=en -> he_learning_en
      // UI=en -> Ambiguous, default to null or force manual pick
      
      if (uiLang === 'ar') {
          if (targetLang === 'he') return 'ar_learning_he';
          if (targetLang === 'en') return 'ar_learning_en';
          return 'ar_learning_en'; // Default
      }
      if (uiLang === 'he') {
          if (targetLang === 'ar') return 'he_learning_ar';
          if (targetLang === 'en') return 'he_learning_en';
          return 'he_learning_en'; // Default
      }
      // For English UI, we might default to he_learning_en if in Israel context, or leave empty
      return ''; 
  }

  function getLocalizedDescriptor(descriptorId, lang) {
      var key = 'mitests-cefr-descriptors';
      try {
          var list = JSON.parse(localStorage.getItem(key) || '[]');
          var item = list.find(function(d) { return d.id === descriptorId; });
          if (item && item.i18n) {
              return item.i18n[lang] || item.i18n['en'] || '';
          }
      } catch(e) {}
      return '';
  }

  function getDescriptorsByLevel(level) {
      var key = 'mitests-cefr-descriptors';
      try {
          var list = JSON.parse(localStorage.getItem(key) || '[]');
          return list.filter(function(d) { return d.level === level; });
      } catch(e) { return []; }
  }

  // --- INIT ---
  seedDescriptors();

  // --- EXPORT ---
  window.MitestsCEFR = {
    LEVELS: CEFR_LEVELS,
    SKILLS: CEFR_SKILLS,
    GENERIC_SKILLS: GENERIC_SKILLS,
    TRACKS: LEARNER_TRACKS,
    isLanguageSubject: isLanguageSubject,
    inferTargetLanguage: inferTargetLanguage,
    getAutoLearnerTrack: getAutoLearnerTrack,
    getLocalizedDescriptor: getLocalizedDescriptor,
    getDescriptorsByLevel: getDescriptorsByLevel
  };

})();
