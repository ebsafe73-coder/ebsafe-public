/* e B-SAFE — Electronic Bullying Safety and Awareness System
 * Content is loaded from the JSON files in data/ (see data/ebsafe-content.json and README.txt).
 * Prototype note: content drafts, learning progress, and survey/evaluation responses are stored
 * only in this browser (localStorage). A static site cannot write back to the JSON files on a
 * Content lives in data/ as JSON. Editing happens in the local studio (repo: admin-local/,
 * never deployed); publish by exporting the JSON there and replacing the files in data/.
 */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  // Icon system: every icon on the site comes from the inline Lucide sprite at the top of
  // <body> (the source SVGs live in assets/icons/). Content may name any Lucide icon; an
  // unknown name falls back to a neutral icon instead of breaking the card.
  const ICON_NAMES = new Set($$('.icon-sprite symbol').map(symbol => symbol.id.replace(/^i-/, '')));
  const iconHTML = (name, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#i-${ICON_NAMES.has(name) ? name : 'circle-help'}"></use></svg>`;
  // app.js is shared by index.html and video.html. Some bindings below exist only on the
  // homepage, so they are guarded whenever the lesson page shell is the active document.
  const isVideoPage = !!document.getElementById('videoPageBody');
  const safeRead = (key, fallback) => {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  };
  const dropKey = key => { try { localStorage.removeItem(key); } catch { /* ignore */ } };
  const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  // Renders "1st/2nd/3rd" ordinals the way the printed handbook does.
  const ord = (value = '') => escapeHTML(value).replace(/(\d)(st|nd|rd|th)\b/g, '$1<sup>$2</sup>');
  const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const safeHttpURL = raw => {
    if (!raw) return '';
    try { const u = new URL(raw); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; }
    catch { return ''; }
  };
  const isDirectVideo = url => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || '');

  // ---------------------------------------------------------------------------
  // Content loading (JSON files in data/)
  // ---------------------------------------------------------------------------
  const DATA_FILES = {
    settings: 'data/settings.json',
    schoolInfo: 'data/school-info.json',
    topics: 'data/topics.json',
    lessons: 'data/lessons.json',
    quizzes: 'data/quizzes.json',
    announcements: 'data/announcements.json',
    handbook: 'data/handbook.json',
    survey: 'data/survey-questions.json',
    extras: 'data/extras.json'
  };
  const FILE_ORDER = Object.keys(DATA_FILES);
  const FILE_LABELS = {
    settings: 'settings.json',
    schoolInfo: 'school-info.json',
    topics: 'topics.json',
    lessons: 'lessons.json',
    quizzes: 'quizzes.json',
    announcements: 'announcements.json',
    handbook: 'handbook.json',
    survey: 'survey-questions.json',
    extras: 'extras.json'
  };
  const FILE_HELP = {
    settings: 'Branding and identity: school name, system name, logo path, hero image path, feature flags.',
    schoolInfo: 'School directory details, verified contacts, reporting guide, and the "About the Study" chapter content.',
    topics: 'The five bullying topic cards and their detail content.',
    lessons: 'Video lessons with categories, descriptions, video links, poster images, objectives, and takeaways.',
    quizzes: 'Awareness quiz questions (multiple choice and true/false) plus the "What would you do?" activity.',
    announcements: 'School posts. Use published=false to archive a post and pinned=true to keep it first.',
    handbook: 'Student handbook pages as structured blocks (transcribed text and summaries).',
    survey: 'Awareness survey items, website evaluation items, and local progress badge rules.',
    extras: 'Kindness pledge lines, myth vs. fact cards, learning tips, and FAQ answers.'
  };
  const validators = {
    settings: d => {
      const problems = [];
      if (!d || typeof d !== 'object') return ['The file must contain a JSON object.'];
      ['schoolName', 'systemName', 'logoPath'].forEach(k => { if (typeof d[k] !== 'string' || !d[k]) problems.push(`"${k}" must be a non-empty text value.`); });
      return problems;
    },
    schoolInfo: d => {
      const problems = [];
      if (!d || typeof d !== 'object') return ['The file must contain a JSON object.'];
      if (typeof d.schoolName !== 'string') problems.push('"schoolName" must be text.');
      if (!d.study || !Array.isArray(d.study.terms)) problems.push('"study.terms" must be an array (definition of terms).');
      if (!d.study || !d.study.statementOfProblem || !Array.isArray(d.study.statementOfProblem.questions)) problems.push('"study.statementOfProblem.questions" must be an array.');
      if (!d.reporting || !Array.isArray(d.reporting.steps)) problems.push('"reporting.steps" must be an array.');
      return problems;
    },
    topics: d => (!d || !Array.isArray(d.topics) || !d.topics.length) ? ['"topics" must be a non-empty array.'] : [],
    lessons: d => (!d || !Array.isArray(d.lessons)) ? ['"lessons" must be an array (it may be empty).'] : [],
    quizzes: d => {
      const problems = [];
      if (!d || !d.quiz || !Array.isArray(d.quiz.questions) || !d.quiz.questions.length) problems.push('"quiz.questions" must be a non-empty array.');
      if (d && Array.isArray(d.quiz?.questions)) {
        d.quiz.questions.forEach((q, i) => {
          if (!q || typeof q.question !== 'string') problems.push(`Question ${i + 1}: "question" must be text.`);
          else if (!Array.isArray(q.options) || q.options.length < 2) problems.push(`Question ${i + 1}: "options" must list at least two answers.`);
          else if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) problems.push(`Question ${i + 1}: "answer" must be the index of the correct option.`);
        });
      }
      return problems;
    },
    announcements: d => {
      if (!d || !Array.isArray(d.posts)) return ['"posts" must be an array.'];
      return d.posts.map((p, i) => (!p || typeof p.title !== 'string' || typeof p.body !== 'string') ? `Post ${i + 1}: "title" and "body" must be text.` : '').filter(Boolean);
    },
    handbook: d => (!d || !Array.isArray(d.pages)) ? ['"pages" must be an array.'] : d.pages.map((p, i) => (!p || typeof p.title !== 'string' || !Array.isArray(p.blocks)) ? `Page ${i + 1}: each page needs a "title" and a "blocks" array.` : '').filter(Boolean),
    survey: d => {
      const problems = [];
      if (!d || !d.awareness || !Array.isArray(d.awareness.dimensions)) problems.push('"awareness.dimensions" must be an array.');
      if (!d || !d.evaluation || !Array.isArray(d.evaluation.criteria)) problems.push('"evaluation.criteria" must be an array.');
      return problems;
    },
    extras: d => {
      const problems = [];
      if (!d || !d.pledge || !Array.isArray(d.pledge.lines) || !d.pledge.lines.length) problems.push('"pledge.lines" must be a non-empty array.');
      if (!d || !Array.isArray(d.myths)) problems.push('"myths" must be an array.');
      if (!d || !Array.isArray(d.tips)) problems.push('"tips" must be an array.');
      if (!d || !Array.isArray(d.faq)) problems.push('"faq" must be an array.');
      return problems;
    }
  };

  const draftKey = name => `ebsafe_draft_${name}`;
  let packaged = {};     // pristine JSON fetched from data/
  let content = {};      // active content (draft if present, otherwise packaged)
  let draftNames = [];   // file keys that have a local draft
  let contentProblems = [];
  let localVideoFiles = new Map(); // reserved for the local admin studios session preview

  function readDraft(name) {
    const raw = safeRead(draftKey(name), null);
    if (!raw || typeof raw !== 'object') return null;
    const problems = validators[name] ? validators[name](raw) : [];
    return problems.length ? null : raw;
  }
  async function fetchJSON(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${path} (HTTP ${response.status})`);
    return response.json();
  }

  async function loadContent() {
    contentProblems = [];
    let files = DATA_FILES;
    try {
      const manifest = await fetchJSON('data/ebsafe-content.json');
      if (manifest && manifest.files && typeof manifest.files === 'object') files = { ...DATA_FILES, ...manifest.files };
    } catch (error) {
      contentProblems.push(`data/ebsafe-content.json could not be loaded (${error.message}). Using the default file list.`);
    }
    const results = await Promise.allSettled(FILE_ORDER.map(async name => {
      const data = await fetchJSON(files[name] || DATA_FILES[name]);
      const problems = validators[name] ? validators[name](data) : [];
      if (problems.length) throw new Error(`${FILE_LABELS[name]} failed validation: ${problems[0]}`);
      return [name, data];
    }));
    results.forEach((result, index) => {
      const name = FILE_ORDER[index];
      if (result.status === 'fulfilled') {
        packaged[name] = result.value[1];
        content[name] = readDraft(name) || result.value[1];
      } else {
        contentProblems.push(result.reason?.message || `Could not load ${FILE_LABELS[name]}.`);
      }
    });
    draftNames = FILE_ORDER.filter(name => !!readDraft(name));
    showContentAlert();
  }

  function showContentAlert() {
    const box = $('#contentAlert');
    if (!box) return;
    const draftNote = draftNames.length ? ` Local drafts are active for: ${draftNames.map(n => FILE_LABELS[n]).join(', ')}.` : '';
    if (!contentProblems.length && !draftNote) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    const problemList = contentProblems.length ? `<ul class="content-alert-list">${contentProblems.map(p => `<li>${escapeHTML(p)}</li>`).join('')}</ul>` : '';
    const hint = contentProblems.length ? '<p>Some content files could not be read. If you opened index.html directly from a file, start the local server instead (see README.txt).</p>' : '';
    box.innerHTML = `<div class="content-alert"><strong>Content notice</strong>${problemList}${hint}${draftNote ? `<p>${escapeHTML(draftNote.trim())}</p>` : ''}</div>`;
  }

  // ---------------------------------------------------------------------------
  // Shared helpers for content
  // ---------------------------------------------------------------------------
  const settings = () => content.settings || {};
  const schoolInfo = () => content.schoolInfo || {};
  const topics = () => (content.topics && Array.isArray(content.topics.topics)) ? content.topics.topics : [];
  const lessons = () => (content.lessons && Array.isArray(content.lessons.lessons)) ? content.lessons.lessons.filter(l => l && l.published !== false) : [];
  const quizDef = () => (content.quizzes && content.quizzes.quiz) ? content.quizzes.quiz : { questions: [] };

  const posts = () => {
    const list = (content.announcements && Array.isArray(content.announcements.posts)) ? content.announcements.posts.filter(p => p && p.published !== false) : [];
    return [...list].sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  };
  const publishedPosts = () => (content.announcements && Array.isArray(content.announcements.posts)) ? content.announcements.posts.filter(p => p && p.published !== false) : [];
  const newestPost = () => posts()[0] || null;
  const handbookPages = () => (content.handbook && Array.isArray(content.handbook.pages)) ? content.handbook.pages : [];
  const surveyDef = () => content.survey || {};
  const extras = () => content.extras || {};
  const pledgeDef = () => (extras().pledge || { lines: [] });
  const findTopic = key => topics().find(t => t.id === key || t.name === key) || null;

  // ---------------------------------------------------------------------------
  // Theme, live announcements, printing, and small utilities
  // ---------------------------------------------------------------------------
  const THEME_KEY = 'ebsafe_theme'; // stored raw (not JSON) so the pre-paint script in index.html can read it
  const prefersReducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const prefersDark = () => !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  function storedTheme() { try { const raw = localStorage.getItem(THEME_KEY); return raw === 'dark' || raw === 'light' ? raw : ''; } catch { return ''; } }
  function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function applyTheme(theme, options) {
    const announceChange = !!(options && options.announceChange);
    const dark = theme === 'dark';
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    const toggle = $('#themeToggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      // The sun/moon SVGs are static markup in index.html and video.html; CSS picks
      // the visible one from [data-theme], so no icon text needs to be swapped here.
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0b241a' : '#116b43');
    if (announceChange) announce(dark ? 'Dark theme on.' : 'Light theme on.');
  }
  function initTheme() {
    const saved = storedTheme();
    applyTheme(saved || (prefersDark() ? 'dark' : 'light'));
    if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').addEventListener) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        if (!storedTheme()) applyTheme(event.matches ? 'dark' : 'light');
      });
    }
  }
  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    try {
      // Two-state toggle with a reachable system default: the choice is stored as a
      // literal value only while it differs from the system preference. Picking the
      // value the system already uses clears the stored override again, so the site
      // goes back to following the OS setting (and the pre-paint script agrees).
      if (next === (prefersDark() ? 'dark' : 'light')) localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch { /* ignore */ }
    const apply = () => applyTheme(next, { announceChange: true });
    // Crossfade the whole page between schemes where the View Transition API exists
    // and the user has not asked for reduced motion.
    if (!prefersReducedMotion() && typeof document.startViewTransition === 'function') {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  }
  let announceTimer = 0;
  function announce(message) {
    const region = $('#liveRegion');
    if (!region) return;
    region.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { region.textContent = message; }, 60);
  }
  function printHTML(html) {
    const root = $('#printRoot');
    if (!root) { window.print(); return; }
    root.innerHTML = html;
    root.hidden = false;
    root.classList.add('is-active');
    document.body.classList.add('print-mode');
    const cleanup = () => {
      document.body.classList.remove('print-mode');
      root.classList.remove('is-active');
      root.hidden = true;
      root.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  }
  const isVisible = el => el.getClientRects().length > 0;

  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Progress (local only)
  // ---------------------------------------------------------------------------
  const PROGRESS_KEY = 'ebsafe_progress';
  function getProgress() {
    const raw = safeRead(PROGRESS_KEY, {}) || {};
    return {
      watched: raw.watched && typeof raw.watched === 'object' ? raw.watched : {},
      completed: raw.completed && typeof raw.completed === 'object' ? raw.completed : {},
      bookmarks: raw.bookmarks && typeof raw.bookmarks === 'object' ? raw.bookmarks : {},
      pledge: raw.pledge && Array.isArray(raw.pledge.lines) ? raw.pledge : null,
      quizBest: Number(raw.quizBest) || 0,
      quizAttempts: Number(raw.quizAttempts) || 0,
      surveyCount: Number(raw.surveyCount) || 0
    };
  }
  function saveProgress(progress) { safeWrite(PROGRESS_KEY, progress); }
  function toggleBookmark(lessonId) {
    const progress = getProgress();
    const wasBookmarked = !!progress.bookmarks[lessonId];
    if (wasBookmarked) delete progress.bookmarks[lessonId];
    else progress.bookmarks[lessonId] = new Date().toISOString();
    saveProgress(progress);
    const lesson = lessons().find(l => l.id === lessonId);
    announce(`${lesson ? lesson.title : 'Lesson'} ${wasBookmarked ? 'removed from' : 'added to'} bookmarks.`);
    return !wasBookmarked;
  }
  function certificateReady() {
    const progress = getProgress();
    const published = lessons();
    return published.length > 0 && published.every(l => progress.completed[l.id]) && progress.quizBest >= 70;
  }
  function nextLesson() {
    const progress = getProgress();
    const list = lessons();
    const playable = list.filter(hasPlayableSource);
    return playable.find(l => !progress.completed[l.id])
      || list.find(l => !progress.completed[l.id])
      || list.find(l => !progress.watched[l.id])
      || list[0] || null;
  }
  function markWatched(lessonId) {
    const progress = getProgress();
    if (!progress.watched[lessonId]) {
      progress.watched[lessonId] = new Date().toISOString();
      saveProgress(progress);
      refreshAfterProgressChange();
    }
  }
  function markCompleted(lessonId) {
    const progress = getProgress();
    if (!progress.completed[lessonId]) {
      progress.completed[lessonId] = new Date().toISOString();
      saveProgress(progress);
      refreshAfterProgressChange();
    }
  }
  function paintCompletedButton(lessonId) {
    const lesson = lessons().find(l => l.id === lessonId);
    const label = lesson && hasPlayableSource(lesson) ? 'Marked as completed' : 'Marked as read';
    $$('[data-complete-lesson]').forEach(button => {
      if (button.dataset.completeLesson !== lessonId) return;
      const badge = document.createElement('span');
      badge.className = 'badge-pill';
      badge.innerHTML = iconHTML('circle-check', 'pill-ico') + label;
      button.replaceWith(badge);
    });
  }
  function earnedBadges() {
    const progress = getProgress();
    const published = lessons();
    const rules = {
      'first-lesson': Object.keys(progress.watched).length >= 1 || Object.keys(progress.completed).length >= 1,
      'all-lessons': published.length > 0 && published.every(l => progress.completed[l.id]),
      'quiz-starter': progress.quizAttempts >= 1,
      'quiz-ace': progress.quizBest >= 100,
      'awareness-check': progress.surveyCount >= 1,
      'pledge-keeper': pledgeDef().lines.length > 0 && !!progress.pledge && progress.pledge.lines.length >= pledgeDef().lines.length,
      'course-complete': certificateReady()
    };
    const defs = (surveyDef().progress && Array.isArray(surveyDef().progress.badges)) ? surveyDef().progress.badges : [];
    return defs.map(badge => ({ ...badge, earned: !!rules[badge.id] }));
  }

  // ---------------------------------------------------------------------------
  // Modal system
  // ---------------------------------------------------------------------------
  const modal = $('#appModal');
  const backdrop = $('#modalBackdrop');
  const modalTitle = $('#modalTitle');
  const modalEyebrow = $('#modalEyebrow');
  const modalContent = $('#modalContent');
  let activeObjectURL = '';

  let lastFocused = null;
  function openModal(title, html, eyebrow = 'E B-SAFE', options = {}) {
    if (modal.classList.contains('hidden')) lastFocused = document.activeElement;
    modalTitle.textContent = title;
    modalEyebrow.textContent = eyebrow;
    modalContent.innerHTML = html;
    // Long-form content (handbook pages) gets the wider reading layout.
    modal.classList.toggle('modal-wide', !!options.wide);
    backdrop.classList.remove('hidden');
    modal.classList.remove('hidden');
    updateVideoPreview();
    document.body.style.overflow = 'hidden';
    modal.scrollTop = 0;
    $('#modalClose').focus();
  }
  function closeModal() {
    modal.classList.add('hidden');
    updateVideoPreview();
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    // Closing a dialog must not stop the lesson playing on the lesson page.
    if (lastFocused && document.contains(lastFocused) && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus({ preventScroll: true }); } catch { /* ignore */ }
    }
    lastFocused = null;
  }
  $('#modalClose').addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', event => {
    if (modal.classList.contains('hidden')) return;
    if (event.key === 'Escape') { closeModal(); return; }
    if (event.key === 'Tab') {
      const focusables = $$('#appModal button, #appModal a[href], #appModal input, #appModal select, #appModal textarea, #appModal summary, #appModal video[controls], #appModal [tabindex]:not([tabindex="-1"])').filter(el => !el.disabled && isVisible(el));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!modal.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  }

  // ---------------------------------------------------------------------------
  // Secure backend (optional). With settings.apiBaseUrl set, the concern form and the
  // research submissions talk to the school's own API (see api/README.md). With it empty
  // the site stays in demo mode and says so — it never pretends a report was sent.
  // No token, key or session is ever stored in this browser: the public site only posts.
  // ---------------------------------------------------------------------------
  const apiBaseUrl = () => {
    const raw = String(settings().apiBaseUrl || '').trim().replace(/\/+$/, '');
    return /^https?:\/\//i.test(raw) ? raw : '';
  };
  let apiMetaCache = null;
  async function apiFetch(path, options = {}) {
    const base = apiBaseUrl();
    if (!base) return { ok: false, unconfigured: true, message: 'No school server is configured for this website.' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs || 8000);
    try {
      const res = await fetch(base + path, {
        method: options.method || 'GET',
        headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });
      const data = await res.json().catch(() => null);
      return {
        ok: res.ok, status: res.status, data,
        message: data && data.error ? data.error.message : 'The school server refused the request.'
      };
    } catch (error) {
      return {
        ok: false, offline: true,
        message: error && error.name === 'AbortError'
          ? 'The school server did not answer in time. Your message was not sent.'
          : 'The school server could not be reached. Your message was not sent.'
      };
    } finally {
      clearTimeout(timer);
    }
  }
  async function apiMeta() {
    if (apiMetaCache) return apiMetaCache;
    const result = await apiFetch('/api/v1/meta', { timeoutMs: 5000 });
    if (result.ok && result.data) apiMetaCache = result.data;
    return apiMetaCache;
  }

  // ---------------------------------------------------------------------------
  // Branding and school info
  // ---------------------------------------------------------------------------
  function applySettings() {
    const s = settings();
    const brandSchool = $('.brand-school');
    if (brandSchool && s.schoolName) {
      const parts = String(s.schoolName).split(/\s+National\s+/i);
      brandSchool.innerHTML = `<strong>${escapeHTML((parts[0] || s.schoolName).toUpperCase())}</strong><span>${escapeHTML(parts[1] ? `NATIONAL ${parts[1]}`.toUpperCase() : '')}</span>`;
    }
    {
      const logo = $('#schoolLogo');
      if (logo) {
        logo.innerHTML = `<img src="${escapeHTML(s.logoPath || 'assets/school-logo.jpg')}" alt="${escapeHTML(`${s.schoolName || 'School'} official logo`)}">`;
        logo.setAttribute('aria-label', `${s.schoolName || 'School'} logo`);
      }
    }
    const heroImg = $('.hero-art img');
    if (heroImg && s.heroImagePath) {
      const current = heroImg.getAttribute('src') || '';
      if (!current.includes(s.heroImagePath)) heroImg.setAttribute('src', s.heroImagePath);
    }
  }

  function renderReporting() {
    const info = schoolInfo().reporting || {};
    const copy = $('#reportCopy');
    const side = $('#reportSide');
    if (!copy || !side) return;
    copy.innerHTML = `<span class="eyebrow">${escapeHTML(info.eyebrow || 'You deserve to feel safe')}</span>
      <h2>${escapeHTML(info.title || 'Need help? You are not alone.')}</h2>
      <p>${escapeHTML(info.intro || '')}</p>
      <div class="report-steps">${(info.steps || []).map((step, index) => `<div><span>${index + 1}</span><p><strong>${escapeHTML(step.title || '')}</strong><small>${escapeHTML(step.text || '')}</small></p></div>`).join('')}</div>
      <div class="report-actions"><button class="btn btn-primary" id="openReportForm">${iconHTML('plus', 'btn-ico')}Open concern form</button>${apiBaseUrl()
        ? `<span class="demo-chip is-online">${iconHTML('shield-check')} Sent privately to the school inbox</span>`
        : `<span class="demo-chip">${iconHTML('info')} Demo form — nothing is sent</span>`}</div>
      <p class="privacy-note">${escapeHTML(apiBaseUrl() ? (info.liveNote || "Reports go to the school’s confidential inbox and are read by authorized staff only.") : (info.privacyNote || ''))}</p>`;
    const contact = (schoolInfo().contacts && schoolInfo().contacts.guidanceOffice) || '';
    const contactNote = contact || (schoolInfo().contacts && schoolInfo().contacts.guidanceOfficePlaceholder) || 'Official school contact details to be verified before publishing';
    side.innerHTML = `<img class="section-art support-art" src="assets/illustrations/ask-for-help-960.jpg" srcset="assets/illustrations/ask-for-help-480.jpg 480w, assets/illustrations/ask-for-help-960.jpg 960w" sizes="(max-width: 639px) calc(100vw - 80px), (max-width: 980px) 580px, 40vw" width="960" height="640" alt="" loading="lazy" decoding="async">
      <h3>${escapeHTML(info.sideTitle || 'Asking for help is a strong step.')}</h3>
      <p>${escapeHTML(info.sideText || 'Every student deserves respect, safety, and support.')}</p>
      <div class="help-contact"><span class="contact-icon">${iconHTML('phone')}</span><div><strong>${escapeHTML(info.contactTitle || 'School support contact')}</strong><small>${escapeHTML(contactNote)}</small></div></div>
      <div class="help-contact"><span class="contact-icon">${iconHTML('user-round')}</span><div><strong>${escapeHTML(info.trustedAdultTitle || 'Trusted adult')}</strong><small>${escapeHTML(info.trustedAdultNote || '')}</small></div></div>`;
    $('#openReportForm').addEventListener('click', openReportForm);
  }

  function renderStudy() {
    const study = schoolInfo().study || {};
    const pill = $('#studyPill');
    const title = $('#studyTitle');
    const statement = $('#studyStatement');
    const questions = $('#sopQuestions');
    const extra = $('#studyExtra');
    if (!statement || !questions || !extra) return;
    if (pill) pill.textContent = study.chapterLabel || 'Chapter 1';
    if (title) title.textContent = study.statementOfProblem ? 'Statement of the Problem' : (study.title || 'About the Study');
    const sop = study.statementOfProblem || {};
    statement.innerHTML = `<p>${(sop.intro || []).map(escapeHTML).join('</p><p>')}</p>${sop.lead ? `<p>${escapeHTML(sop.lead)}</p>` : ''}${sop.note ? `<p class="form-hint">${escapeHTML(sop.note)}</p>` : ''}`;
    // SOP groups carry a Lucide icon name in school-info.json (eye, shield-check, flag, search, smile).
    questions.innerHTML = (sop.questions || []).map(q => `<details><summary>${iconHTML(q.icon || 'circle-help', 'summary-ico')}${escapeHTML(q.q || '')}</summary><p>${(q.subs || []).map(escapeHTML).join('<br>')}</p></details>`).join('');
    const groups = [];
    if (Array.isArray(study.background) && study.background.length) groups.push(['Research background', `<p>${study.background.map(escapeHTML).join('</p><p>')}</p>`]);
    if (Array.isArray(study.objective) && study.objective.length) groups.push(['Objective of the Study', `<p>${study.objective.map(escapeHTML).join('</p><p>')}</p>`]);
    if (study.scope) groups.push(['Scope and Limitations', `<p>${escapeHTML(study.scope)}</p>`]);
    if (Array.isArray(study.significance) && study.significance.length) groups.push(['Significance of the Study', `<ul class="policy-list">${study.significance.map(s => `<li><strong>${escapeHTML(s.who || '')}</strong> — ${escapeHTML(s.text || '')}</li>`).join('')}</ul>`]);
    if (Array.isArray(study.terms) && study.terms.length) groups.push(['Definition of Terms', `<ul class="policy-list">${study.terms.map(t => `<li><strong>${escapeHTML(t.term || '')}</strong> — ${escapeHTML(t.definition || '')}</li>`).join('')}</ul>`]);
    extra.innerHTML = groups.map(([label, html]) => `<details><summary>${escapeHTML(label)}</summary>${html}</details>`).join('');
    const projectTitle = $('#studyProjectTitle');
    if (projectTitle) projectTitle.textContent = study.projectTitle || '';
    const studyFacts = $('#studyFacts');
    if (studyFacts) {
      studyFacts.innerHTML = `<div><strong>${topics().length || 5}</strong><small>Awareness topics</small></div><div><strong>${(handbookPages().length || 8)}</strong><small>Handbook pages</small></div><div><strong>1</strong><small>Safer school community</small></div>`;
    }
  }

  // ---------------------------------------------------------------------------
  // Topics
  // ---------------------------------------------------------------------------
  // Topic artwork is the Lucide icon named in topics.json (message-circle, hand,
  // smartphone, users, heart) shown on the topic's tinted card background.
  const topicArtHTML = topic => `<span class="topic-art">${iconHTML((topic && topic.icon) || 'eye')}</span>`;
  function renderTopics() {
    const grid = $('#topicGrid');
    if (!grid) return;
    const list = topics();
    grid.innerHTML = list.length ? list.map(t => `<button class="topic-card ${escapeHTML(t.colorClass || '')}" data-topic-id="${escapeHTML(t.id)}" data-topic="${escapeHTML(t.name)}">${topicArtHTML(t)}<span class="topic-tag">${escapeHTML(t.tag || '')}</span><strong>${escapeHTML(t.name)}</strong><p>${escapeHTML(t.cardText || '')}</p><span class="learn-more">Learn more ${iconHTML('arrow-right', 'link-ico')}</span></button>`).join('')
      : '<div class="no-results">Topic content is unavailable. Check data/topics.json.</div>';
    $$('#topicGrid .topic-card').forEach(card => card.addEventListener('click', () => topicModal(card.dataset.topicId)));
  }
  function topicModal(key) {
    const item = findTopic(key);
    if (!item) {
      openModal(String(key), `<p class="modal-lead">${escapeHTML(String(key))} is an important part of bullying awareness.</p><div class="topic-detail-list"><div><strong>Think about safety</strong><p>Do not join in, forward hurtful content, or put yourself at risk. Reach out to a trusted adult when you are concerned.</p></div><div><strong>Get support</strong><p>If you or another student may be at risk, speak with a teacher, adviser, Guidance Office, or another trusted adult.</p></div></div><a class="btn btn-primary" href="#reporting" data-close-and-go="reporting">Visit reporting guide ${iconHTML('arrow-right', 'btn-ico')}</a>`, 'Learn & practice');
      return;
    }
    const related = (item.relatedLessons || []).map(id => lessons().find(l => l.id === id)).filter(Boolean);
    let sectionIndex = 0;
    const detail = [
      ['What it is', item.definition],
      ['Examples', item.examples],
      ['Signs to notice', item.signs],
      ['Possible effects', item.effects],
      ['How to help prevent it', item.prevention],
      ['What you can do', item.responses],
      ['When to seek help', item.seekHelp]
    ].map(([label, value]) => {
      if (!value || (Array.isArray(value) && !value.length)) return '';
      const body = Array.isArray(value) ? `<ul class="topic-list">${value.map(v => `<li>${escapeHTML(v)}</li>`).join('')}</ul>` : `<p>${escapeHTML(value)}</p>`;
      sectionIndex += 1;
      return `<details class="topic-acc"${sectionIndex === 1 ? ' open' : ''}><summary>${label}</summary>${body}</details>`;
    }).join('');
    const relatedHTML = related.length ? `<div class="topic-video-row">${related.map(l => `<button class="btn btn-secondary btn-small" data-watch="${escapeHTML(l.id)}">${iconHTML('circle-play', 'btn-ico')}${escapeHTML(l.title)}</button>`).join('')}</div>` : '';
    const handbookPage = item.relatedHandbook ? handbookPages().find(p => p.id === item.relatedHandbook) : null;
    const handbookHTML = handbookPage ? `<button class="btn btn-secondary btn-small" type="button" data-open-policy="${escapeHTML(handbookPage.id)}">${iconHTML('book-open', 'btn-ico')}Handbook: ${escapeHTML(handbookPage.cardLabel || handbookPage.title)}${iconHTML('arrow-right', 'btn-ico')}</button>` : '';
    openModal(item.name, `<div class="topic-detail-list">${detail}</div>${relatedHTML}${handbookHTML ? `<div class="topic-video-row">${handbookHTML}</div>` : ''}<div class="alert-box">Not every disagreement is bullying. Repeated behavior, harm, power differences, and context matter. When you are unsure, ask a trusted adult for guidance.</div><button class="btn btn-primary" data-action="start-quiz">Check what you learned ${iconHTML('arrow-right', 'btn-ico')}</button>`, item.tag || 'Learn & practice');
  }

  // ---------------------------------------------------------------------------
  // Lessons and video player
  // ---------------------------------------------------------------------------
  function youtubeEmbed(url) {
    try {
      const u = new URL(url);
      let id = '';
      if (u.hostname.endsWith('youtu.be')) id = u.pathname.replace(/^\//, '').split('/')[0];
      else if (u.hostname.includes('youtube.com')) id = u.searchParams.get('v') || (u.pathname.includes('/embed/') ? u.pathname.split('/embed/')[1]?.split('/')[0] : '') || '';
      return /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    } catch { return ''; }
  }
  const THUMB_CLASSES = new Set(['thumb-green', 'thumb-blue', 'thumb-peach', 'thumb-rose', 'thumb-lilac']);
  function thumbClass(video) {
    const named = video.thumbnail && video.thumbnail.class;
    if (THUMB_CLASSES.has(named)) return named;
    const c = `${video.category || ''} ${video.title || ''}`.toLowerCase();
    if (c.includes('cyber') || c.includes('online')) return 'thumb-peach';
    if (c.includes('prevention') || c.includes('bystander') || c.includes('social')) return 'thumb-blue';
    return 'thumb-green';
  }
  function thumbSymbol(video) {
    // lessons.json names a Lucide icon in thumbnail.symbol; older emoji values fall
    // through to the category-based mapping below.
    if (video.thumbnail && ICON_NAMES.has(video.thumbnail.symbol)) return iconHTML(video.thumbnail.symbol);
    const c = `${video.category || ''} ${video.title || ''}`.toLowerCase();
    if (c.includes('cyber') || c.includes('online')) return iconHTML('smartphone');
    if (c.includes('prevention') || c.includes('bystander')) return iconHTML('handshake');
    if (c.includes('physical')) return iconHTML('hand');
    if (c.includes('social')) return iconHTML('users');
    if (c.includes('emotional') || c.includes('psych')) return iconHTML('heart');
    if (c.includes('basics') || c.includes('awareness')) return iconHTML('book-open');
    return iconHTML('circle-play');
  }
  let lessonFilter = 'all';
  let lessonQuery = '';
  function renderFilters() {
    const box = $('#lessonFilters');
    if (!box) return;
    const categories = [...new Set(lessons().map(l => l.category).filter(Boolean))];
    if (!categories.length) { box.innerHTML = ''; return; }
    const chips = [['all', 'All lessons'], ...categories.map(category => [category, category])];
    box.innerHTML = chips.map(([value, label]) => `<button class="chip" type="button" data-lesson-filter="${escapeHTML(value)}" aria-pressed="${lessonFilter === value}">${escapeHTML(label)}</button>`).join('');
  }
  function lessonMatches(video) {
    if (lessonFilter !== 'all' && (video.category || '') !== lessonFilter) return false;
    if (!lessonQuery) return true;
    return `${video.title} ${video.category || ''} ${video.description || ''} ${video.longDescription || ''}`.toLowerCase().includes(lessonQuery);
  }
  const TOPIC_CLASS_BY_ID = {
    verbal: 'topic-verbal',
    physical: 'topic-physical',
    cyberbullying: 'topic-cyber',
    social: 'topic-social',
    emotional: 'topic-emotional'
  };
  function readTopicFor(lesson) {
    // Use a topic hue only when the lesson's own category really matches one of
    // the five bullying forms. "Bullying Basics" and "Prevention" stay neutral.
    return matchTopic(lesson);
  }
  function topicClassFor(lesson) {
    const topic = readTopicFor(lesson);
    const className = topic ? TOPIC_CLASS_BY_ID[topic.id] : '';
    return className ? ` ${className}` : '';
  }

  function videoCardHTML(video, progress) {
    const watched = !!progress.watched[video.id];
    const completed = !!progress.completed[video.id];
    const percent = completed ? 0 : resumePercent(video.id, video);
    const inProgress = !completed && percent >= 5 && percent < 95;
    const statusPill = completed
      ? '<span class="watched-pill">' + iconHTML('circle-check', 'pill-ico') + 'Completed</span>'
      : inProgress
        ? `<span class="progress-pill">In progress · ${percent}%</span>`
        : watched
          ? '<span class="watched-pill">' + iconHTML('check', 'pill-ico') + 'Watched</span>'
          : '';
    const saved = !!progress.bookmarks[video.id];
    return `<article class="video-card" data-video-id="${escapeHTML(video.id)}">
      <button class="video-thumb ${thumbClass(video)}${video.poster ? ' has-poster' : ''}" type="button" data-watch="${escapeHTML(video.id)}" aria-label="Watch ${escapeHTML(video.title)}">
        ${video.poster ? `<img class="thumb-poster" src="${escapeHTML(video.poster)}" alt="" loading="lazy" decoding="async">` : ''}
        <span class="thumb-symbol">${thumbSymbol(video)}</span>
        <span class="thumb-play">${iconHTML('play', 'icon-solid')}</span>
        <span class="thumb-label">${escapeHTML((video.thumbnail && video.thumbnail.label) || video.category || 'Video lesson')}</span>
        <span class="video-duration">${escapeHTML(durationLabel(video))}</span>
        ${statusPill}
      </button>
      <div class="video-card-body">
        <span class="small-category">${escapeHTML(video.category || 'Video lesson')}</span>
        <h4>${escapeHTML(video.title)}</h4>
        <p>${escapeHTML(video.description || 'An e B-SAFE learning lesson.')}</p>
        <div class="lesson-actions">
          <button class="link-button" type="button" data-watch="${escapeHTML(video.id)}">Watch lesson ${iconHTML('arrow-right', 'link-ico')}</button>
          <button class="bookmark-btn" type="button" data-bookmark="${escapeHTML(video.id)}" aria-pressed="${saved}">${iconHTML('star', 'bm-ico')} ${saved ? 'Saved' : 'Save'}</button>
        </div>
      </div>
    </article>`;
  }

  function readCardHTML(lesson, progress) {
    const done = !!progress.completed[lesson.id];
    const saved = !!progress.bookmarks[lesson.id];
    const topicClass = topicClassFor(lesson);
    return `<article class="read-card${topicClass}" data-video-id="${escapeHTML(lesson.id)}">
      <div class="read-card-top">
        <span class="read-icon" aria-hidden="true">${thumbSymbol(lesson)}</span>
        <span class="read-status${done ? ' is-read' : ''}">${done ? 'Read' : 'Text lesson'}</span>
      </div>
      <span class="read-category">${escapeHTML(lesson.category || 'Read lesson')}</span>
      <h4>${escapeHTML(lesson.title)}</h4>
      <p>${escapeHTML(lesson.description || lesson.longDescription || 'An e B-SAFE reading lesson.')}</p>
      <div class="read-actions">
        <a class="read-link" href="video.html?lesson=${encodeURIComponent(lesson.id)}" data-watch="${escapeHTML(lesson.id)}">Read lesson ${iconHTML('arrow-right', 'inline-ico')}</a>
        <button class="bookmark-btn" type="button" data-bookmark="${escapeHTML(lesson.id)}" aria-pressed="${saved}">${iconHTML('star', 'bm-ico')} ${saved ? 'Saved' : 'Save'}</button>
      </div>
    </article>`;
  }

  function updateFeaturedHero(list) {
    const hero = $('#home');
    const media = $('#featuredVideoImage');
    const play = $('#featuredPlay');
    const title = $('#featuredTitle');
    const description = $('#featuredDescription');
    const category = $('#featuredCategory');
    const duration = $('#featuredDuration');
    const watch = $('#featuredWatch');
    const playable = list.filter(hasPlayableSource);
    const featured = playable.find(v => v.featured)
      || [...playable].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0]
      || null;

    if (!featured) {
      hero?.classList.add('no-video');
      if (play) play.hidden = true;
      const textFeature = list.find(v => v.featured) || list[0] || null;
      if (title) title.textContent = textFeature ? textFeature.title : 'Watch & learn';
      if (description) description.textContent = textFeature ? (textFeature.description || 'A reading lesson to start with.') : 'The lesson library is loading.';
      if (category) category.textContent = textFeature ? (textFeature.category || 'Lesson') : 'Lesson';
      if (duration) duration.textContent = textFeature ? 'Read lesson' : '';
      if (watch) {
        watch.dataset.watch = textFeature ? textFeature.id : '';
        watch.setAttribute('href', textFeature ? `video.html?lesson=${encodeURIComponent(textFeature.id)}` : '#videos');
        watch.innerHTML = 'Read this lesson ' + iconHTML('arrow-right', 'inline-ico');
      }
      return;
    }

    hero?.classList.remove('no-video');
    if (play) {
      play.hidden = false;
      play.dataset.watch = featured.id;
      play.setAttribute('aria-label', `Play ${featured.title}`);
    }
    if (title) title.textContent = featured.title;
    if (description) description.textContent = featured.description || featured.longDescription || '';
    if (category) category.textContent = featured.category || 'Video lesson';
    if (duration) duration.textContent = durationLabel(featured);
    if (watch) {
      watch.dataset.watch = featured.id;
      watch.setAttribute('href', `video.html?lesson=${encodeURIComponent(featured.id)}`);
      watch.innerHTML = 'Watch full lesson ' + iconHTML('arrow-right', 'inline-ico');
    }
    if (media) {
      media.querySelectorAll('img.featured-poster').forEach(img => img.remove());
      if (featured.poster) {
        const img = document.createElement('img');
        img.className = 'featured-poster';
        img.src = featured.poster;
        img.alt = '';
        img.loading = 'eager';
        img.decoding = 'async';
        img.fetchPriority = 'high';
        media.prepend(img);
      }
    }
    return featured;
  }

  // The homepage uses one muted preview at a time. Full lessons own learning progress.
  const PREVIEW_KEY = 'ebsafe_video_previews';
  const storedPreviewPreference = safeRead(PREVIEW_KEY, null);
  let previewPreference = typeof storedPreviewPreference === 'boolean' ? storedPreviewPreference : null;
  const previewButtons = $$('[data-preview-toggle]');
  const featuredPreviewHost = $('#featuredVideoImage');
  const previewRail = $('#videoGrid');
  const previewHosts = new Map();
  const failedPreviewSources = new Set();
  let featuredPreviewId = '';
  let featuredPlaylist = [];
  let currentPreview = null;
  let optedInThisPage = false;
  const previewThreshold = 0.55;
  const reducedPreviewMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const previewsEnabled = () => previewPreference !== false
    && (optedInThisPage || (!reducedPreviewMotion.matches && !navigator.connection?.saveData));

  function previewSource(raw) {
    if (!isDirectVideo(raw)) return '';
    try {
      const url = new URL(raw, document.baseURI);
      return url.origin === location.origin ? safeHttpURL(url.href) : '';
    } catch { return ''; }
  }

  function syncPreviewButtons() {
    previewButtons.forEach(button => {
      const enabled = previewsEnabled();
      button.hidden = !previewHosts.size;
      button.setAttribute('aria-pressed', String(enabled));
      $('span', button).textContent = enabled ? 'On' : 'Off';
    });
  }

  function stopVideoPreview() {
    if (!currentPreview) return;
    const { host, media } = currentPreview;
    currentPreview = null;
    media.pause();
    media.removeAttribute('src');
    media.load();
    media.remove();
    host.classList.remove('is-preview-active', 'is-preview-playing');
  }

  function nextPreview(items, currentIndex, canPlay) {
    for (let offset = 1; offset <= items.length; offset++) {
      const item = items[(currentIndex + offset) % items.length];
      if (canPlay(item)) return item;
    }
    return null;
  }

  function advanceFeaturedPreview(entry) {
    const index = featuredPlaylist.findIndex(item => item.lesson.id === entry.lessonId);
    const next = nextPreview(featuredPlaylist, index, item => !failedPreviewSources.has(item.source));
    if (!next) return;
    featuredPreviewId = next.lesson.id;
    entry.lessonId = next.lesson.id;
    entry.source = next.source;
    updateFeaturedHero([next.lesson]);
  }

  function nextShelfPreview(host) {
    const hosts = [...previewHosts.keys()].filter(item => item !== featuredPreviewHost);
    const next = nextPreview(hosts, hosts.indexOf(host), item => !failedPreviewSources.has(previewHosts.get(item).source));
    if (!next || !previewRail) return null;
    const entry = previewHosts.get(next);
    if (entry.ratio >= previewThreshold) return next;
    if (previewRail.contains(document.activeElement)) return null;
    const bounds = previewRail.getBoundingClientRect();
    const card = next.closest('.video-card');
    previewRail.scrollLeft += card.getBoundingClientRect().left - bounds.left;
    const clip = next.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(bounds.right, clip.right, innerWidth) - Math.max(bounds.left, clip.left, 0));
    const visibleHeight = Math.max(0, Math.min(clip.bottom, innerHeight) - Math.max(clip.top, 0));
    entry.ratio = clip.width && clip.height ? visibleWidth * visibleHeight / (clip.width * clip.height) : 0;
    return entry.ratio >= previewThreshold ? next : null;
  }

  function updateVideoPreview(preferredHost) {
    if (!previewsEnabled() || document.hidden || !modal.classList.contains('hidden') || document.body.classList.contains('nav-open')) {
      stopVideoPreview();
      return;
    }
    const eligible = entry => entry && entry.ratio >= previewThreshold && !failedPreviewSources.has(entry.source);
    const activeEntry = currentPreview && previewHosts.get(currentPreview.host);
    if (activeEntry && eligible(activeEntry)) return;
    stopVideoPreview();
    const preferred = previewHosts.get(preferredHost);
    const target = eligible(preferred)
      ? [preferredHost, preferred]
      : [...previewHosts].filter(([, entry]) => eligible(entry)).sort((a, b) => b[1].ratio - a[1].ratio)[0];
    if (!target) return;
    const [host, entry] = target;
    const media = document.createElement('video');
    media.className = 'lesson-preview';
    media.width = 640;
    media.height = 360;
    media.muted = true;
    media.defaultMuted = true;
    media.playsInline = true;
    media.preload = 'none';
    media.setAttribute('aria-hidden', 'true');
    media.tabIndex = -1;
    currentPreview = { host, media };
    const finish = failed => {
      if (currentPreview?.media !== media) return;
      if (failed) failedPreviewSources.add(entry.source);
      stopVideoPreview();
      if (host === featuredPreviewHost) {
        advanceFeaturedPreview(entry);
        updateVideoPreview(host);
      } else {
        updateVideoPreview(failed ? null : nextShelfPreview(host));
      }
    };
    media.addEventListener('playing', () => {
      if (currentPreview?.media === media) host.classList.add('is-preview-playing');
    });
    media.addEventListener('ended', () => finish(false), { once: true });
    media.addEventListener('error', () => finish(true), { once: true });
    media.src = entry.source;
    host.prepend(media);
    host.classList.add('is-preview-active');
    media.play()?.catch(() => finish(true));
  }

  const previewObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
      entries.forEach(({ target, intersectionRatio }) => {
        const entry = previewHosts.get(target);
        if (!entry) return;
        entry.ratio = intersectionRatio;
      });
      updateVideoPreview();
    }, { threshold: [0, previewThreshold, 0.8, 1] })
    : null;

  function registerVideoPreviews(featured, videoLessons, allLessons) {
    if (!previewObserver) return;
    const sources = new Map(videoLessons.map(lesson => [lesson.id, lesson.videoUrl]));
    featuredPlaylist = allLessons.map(lesson => ({ lesson, source: previewSource(lesson.videoUrl) })).filter(item => item.source);
    const targets = new Map();
    if (featuredPreviewHost && featured) targets.set(featuredPreviewHost, { source: previewSource(featured.videoUrl), lessonId: featured.id });
    if (previewRail) {
      previewRail.classList.toggle('preview-rail', videoLessons.length > 1);
      $$('.video-thumb', previewRail).forEach(host => targets.set(host, { source: previewSource(sources.get(host.dataset.watch)) }));
    }
    for (const [host, entry] of previewHosts) {
      const next = targets.get(host);
      if (next?.source === entry.source && next.lessonId === entry.lessonId) continue;
      previewObserver.unobserve(host);
      previewHosts.delete(host);
    }
    for (const [host, entry] of targets) {
      if (!entry.source || previewHosts.has(host)) continue;
      previewHosts.set(host, { ...entry, ratio: 0 });
      previewObserver.observe(host);
    }
    syncPreviewButtons();
    updateVideoPreview();
  }

  if (previewObserver) {
    previewButtons.forEach(button => button.addEventListener('click', () => {
      previewPreference = !previewsEnabled();
      optedInThisPage = previewPreference;
      safeWrite(PREVIEW_KEY, previewPreference);
      if (previewPreference) failedPreviewSources.clear();
      syncPreviewButtons();
      updateVideoPreview();
    }));
    const syncPreferences = () => {
      optedInThisPage = false;
      syncPreviewButtons();
      updateVideoPreview();
    };
    reducedPreviewMotion.addEventListener?.('change', syncPreferences);
    navigator.connection?.addEventListener?.('change', syncPreferences);
    document.addEventListener('visibilitychange', updateVideoPreview);
    window.addEventListener('pagehide', stopVideoPreview);
    window.addEventListener('pageshow', updateVideoPreview);
  }

  function renderLessonShelves() {
    const list = lessons();
    const progress = getProgress();
    const matching = list.filter(lessonMatches);
    const videoLessons = matching.filter(hasPlayableSource);
    const readLessons = matching.filter(lesson => !hasPlayableSource(lesson));
    const videoGrid = $('#videoGrid');
    const readGrid = $('#readGrid');
    if (videoGrid) {
      videoGrid.innerHTML = videoLessons.length
        ? videoLessons.map(video => videoCardHTML(video, progress)).join('')
        : '<div class="no-results"><strong>No video lessons match this filter</strong><p>Choose “All lessons” or clear the search to see the videos again.</p></div>';
    }
    if (readGrid) {
      readGrid.innerHTML = readLessons.length
        ? readLessons.map(lesson => readCardHTML(lesson, progress)).join('')
        : '<div class="no-results"><strong>No read lessons match this filter</strong><p>Choose “All lessons” or clear the search to see the reading lessons again.</p></div>';
    }
    const videoCount = $('#videoCount');
    if (videoCount) videoCount.textContent = `${videoLessons.length} video${videoLessons.length === 1 ? '' : 's'}`;
    const readCount = $('#readCount');
    if (readCount) readCount.textContent = `${readLessons.length} read lesson${readLessons.length === 1 ? '' : 's'}`;
    const summary = $('#librarySummary');
    if (summary) {
      const allVideos = list.filter(hasPlayableSource).length;
      const allRead = list.filter(lesson => !hasPlayableSource(lesson)).length;
      summary.textContent = `${allVideos} video${allVideos === 1 ? '' : 's'} and ${allRead} read lesson${allRead === 1 ? '' : 's'} for Grade 7.`;
    }
    registerVideoPreviews(updateFeaturedHero(list), videoLessons, list);
    return matching.length;
  }

  function refreshLessonVisibility() {
    return renderLessonShelves();
  }

  function renderLessons() {
    renderFilters();
    renderLessonShelves();
  }

  // Playback positions live next to the progress record so a student can leave a lesson and
  // come back to the same minute. Entries are {s: seconds, d: duration} and are pruned when a
  // lesson is finished (>=95%) or barely started (<3s).
  const RESUME_KEY = 'ebsafe_resume';
  const VOLUME_KEY = 'ebsafe_volume';
  const PLAYER_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  function formatClock(value) {
    const total = Math.max(0, Math.floor(Number(value) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = number => String(number).padStart(2, '0');
    return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
  }
  function getResumeMap() {
    const raw = safeRead(RESUME_KEY, {});
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const map = {};
    Object.keys(raw).forEach(key => {
      const entry = raw[key];
      const seconds = Number(entry && typeof entry === 'object' ? entry.s : entry);
      const duration = Number(entry && typeof entry === 'object' ? entry.d : 0);
      const updated = Number(entry && typeof entry === 'object' ? entry.t : 0);
      if (Number.isFinite(seconds) && seconds >= 3) map[key] = { s: Math.round(seconds), d: Number.isFinite(duration) ? Math.round(duration) : 0, t: Number.isFinite(updated) ? updated : 0 };
    });
    return map;
  }
  function resumeFor(lessonId) {
    const entry = getResumeMap()[lessonId];
    return entry ? entry.s : 0;
  }
  function resumeEntry(lessonId) {
    return getResumeMap()[lessonId] || null;
  }
  function resumePercent(lessonId, video) {
    const entry = resumeEntry(lessonId);
    if (!entry) return 0;
    const total = entry.d || Number(video && (video.durationSeconds || video.seconds)) || 0;
    if (!total) return 0;
    return Math.min(100, Math.max(0, Math.round((entry.s / total) * 100)));
  }
  function saveResume(lessonId, seconds, duration) {
    if (!lessonId) return;
    const map = getResumeMap();
    const total = Number(duration) || 0;
    const at = Number(seconds) || 0;
    const finished = total > 0 && at / total >= 0.95;
    if (!Number.isFinite(at) || at < 3 || finished) delete map[lessonId];
    else map[lessonId] = { s: Math.round(at), d: Math.round(total), t: Date.now() };
    const keys = Object.keys(map).sort((a, b) => (Number(map[a].t) || 0) - (Number(map[b].t) || 0));
    if (keys.length > 40) keys.slice(0, keys.length - 40).forEach(key => delete map[key]);
    safeWrite(RESUME_KEY, map);
  }
  function clearResume(lessonId) {
    const map = getResumeMap();
    if (!(lessonId in map)) return;
    delete map[lessonId];
    safeWrite(RESUME_KEY, map);
  }
  function storedVolume() {
    const value = Number(safeRead(VOLUME_KEY, 1));
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 1;
  }
  // The control bar is real: every button and slider below is wired to the <video> element in
  // initLessonPlayer(). YouTube embeds keep their own native controls because they are
  // cross-origin and cannot be scripted.
  function mediaPlayerHTML({ src, poster, captions, title, videoId, local = false }) {
    const posterAttr = poster ? ` poster="${escapeHTML(poster)}"` : '';
    const track = captions ? `<track kind="captions" src="${escapeHTML(captions)}" srclang="en" label="English">` : '';
    const speeds = PLAYER_SPEEDS.map(rate => `<button class="player-speed-option" type="button" role="menuitemradio" aria-checked="${rate === 1}" data-player-rate="${rate}">${rate === 1 ? 'Normal' : `${rate}×`}</button>`).join('');
    return `<div class="video-player-wrap is-player" data-player data-video-id="${escapeHTML(videoId || '')}" tabindex="0" role="group" aria-label="${escapeHTML(title || 'Lesson video')} player. Press Space to play or pause.">
      <video class="lesson-video" src="${escapeHTML(src)}"${posterAttr} playsinline preload="metadata" aria-label="${escapeHTML(title || 'Lesson video')}">${track}Your browser does not support the video player.</video>
      <span class="player-loading" data-player-loading aria-hidden="true"><i></i></span>
      <button class="player-bigplay" type="button" data-player-toggle aria-label="Play video">${iconHTML('play', 'icon-solid')}</button>
      <p class="player-resume" data-player-resume hidden></p>
      <div class="player-fallback" data-player-error hidden role="alert"><strong>This video could not play</strong><p>The file may be missing or in a format this browser cannot open. Try again, or come back to this lesson later.</p><button class="btn btn-light btn-small" type="button" data-player-retry>Try again</button></div>
      <div class="player-controls" data-player-controls>
        <input class="player-seek" type="range" min="0" max="1000" step="1" value="0" data-player-seek aria-label="Video progress">
        <div class="player-bar">
          <button class="player-btn" type="button" data-player-toggle aria-label="Play video"><span data-player-icon aria-hidden="true">${iconHTML('play', 'icon-solid')}</span></button>
          <button class="player-btn" type="button" data-player-mute aria-label="Mute"><span data-player-mute-icon aria-hidden="true">${iconHTML('volume-2', 'icon-solid')}</span></button>
          <input class="player-volume" type="range" min="0" max="1" step="0.05" value="1" data-player-volume aria-label="Volume">
          <span class="player-time"><span data-player-elapsed>0:00</span><span class="player-sep" aria-hidden="true">/</span><span data-player-total>0:00</span></span>
          <span class="player-spacer"></span>
          <div class="player-speed">
            <button class="player-btn player-btn-wide" type="button" data-player-speed-toggle aria-expanded="false" aria-label="Playback speed">1×</button>
            <div class="player-speed-menu" data-player-speed-menu role="menu" hidden>${speeds}</div>
          </div>
          ${captions ? '<button class="player-btn player-btn-cc" type="button" data-player-captions aria-pressed="false" aria-label="Show captions">CC</button>' : ''}
          <button class="player-btn" type="button" data-player-fullscreen aria-label="Enter fullscreen"><span data-player-fs-icon aria-hidden="true">${iconHTML('maximize', 'icon-solid')}</span></button>
        </div>
      </div>
    </div>${local ? '<p class="form-hint">Local preview only — this file exists in your current browser session. To publish it, place the file in assets/videos/ and set the path in lessons.json.</p>' : ''}`;
  }
  function buildPlayerHTML(video) {
    let player = '';
    try {
      if (localVideoFiles.has(video.id)) {
        const file = localVideoFiles.get(video.id);
        if (activeObjectURL) URL.revokeObjectURL(activeObjectURL);
        activeObjectURL = URL.createObjectURL(file);
        player = mediaPlayerHTML({ src: activeObjectURL, poster: video.poster || '', captions: '', title: video.title, videoId: video.id, local: true });
      }
      if (!player && video.videoUrl) {
        const url = safeHttpURL(video.videoUrl);
        const yt = url ? youtubeEmbed(url) : '';
        if (yt) player = `<div class="video-player-wrap is-embed"><iframe src="${yt}" title="${escapeHTML(video.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`;
        else if (isDirectVideo(video.videoUrl)) player = mediaPlayerHTML({ src: video.videoUrl, poster: video.poster || '', captions: video.captionsPath || '', title: video.title, videoId: video.id });
        else if (url) player = `<div class="video-player-wrap"><div class="video-empty"><strong>Open the linked lesson</strong><p>This link will open in a new browser tab. Check that it is a school-approved video.</p><a class="btn btn-light" target="_blank" rel="noopener noreferrer" href="${escapeHTML(url)}">Open video link ${iconHTML('arrow-up-right', 'inline-ico')}</a></div></div>`;
      }
    } catch (error) {
      console.warn('Video preview issue:', error);
    }
    // Lessons without a playable source get an honest "coming soon" panel — never a
    // play button over an empty player (audit: do not show an active play control when
    // there is nothing to play).
    if (!player) {
      const browseHref = isVideoPage ? 'index.html#videos' : '#videos';
      player = `<div class="video-player-wrap" data-soon><div class="video-empty"><span class="video-empty-icon" aria-hidden="true"><svg><use href="#i-book-open"></use></svg></span><strong>Read this lesson</strong><p>This lesson does not have a school-approved video yet. Read the lesson description, goals, and key points below.</p><div class="btn-row"><a class="btn btn-light" href="${browseHref}">Browse all lessons</a></div></div></div>`;
    }
    return player;
  }
  function stopStageMedia(scope) {
    if (!scope) return;
    const video = scope.querySelector('video');
    if (video) {
      const player = video.closest('[data-player]');
      if (player && player.dataset.videoId) saveResume(player.dataset.videoId, video.currentTime, video.duration);
      try { video.pause(); } catch { /* ignore */ }
      video.removeAttribute('src');
      try { video.load(); } catch { /* ignore */ }
    }
    const frame = scope.querySelector('iframe');
    if (frame) frame.removeAttribute('src');
  }
  // Wires one rendered custom player. Every listener below uses an AbortController so swapping
  // lessons (or leaving the page) detaches all of them at once instead of leaking handlers.
  let activePlayerCleanup = null;
  function initLessonPlayer(scope) {
    if (activePlayerCleanup) { activePlayerCleanup(); activePlayerCleanup = null; }
    const player = scope.querySelector('[data-player]');
    if (!player) return;
    const video = player.querySelector('video');
    if (!video) return;
    const videoId = player.dataset.videoId || '';
    const controller = new AbortController();
    const { signal } = controller;
    const on = (node, type, handler, options = {}) => node.addEventListener(type, handler, { ...options, signal });
    const toggleButtons = $$('[data-player-toggle]', player);
    const seek = player.querySelector('[data-player-seek]');
    const elapsed = player.querySelector('[data-player-elapsed]');
    const total = player.querySelector('[data-player-total]');
    const volume = player.querySelector('[data-player-volume]');
    const muteButton = player.querySelector('[data-player-mute]');
    const muteIcon = player.querySelector('[data-player-mute-icon]');
    const speedButton = player.querySelector('[data-player-speed-toggle]');
    const speedMenu = player.querySelector('[data-player-speed-menu]');
    const fullButton = player.querySelector('[data-player-fullscreen]');
    const fsIcon = player.querySelector('[data-player-fs-icon]');
    const captionsButton = player.querySelector('[data-player-captions]');
    const errorBox = player.querySelector('[data-player-error]');
    const resumeHint = player.querySelector('[data-player-resume]');
    const resumeAt = resumeFor(videoId);
    let scrubbing = false;
    let hintTimer = 0;
    let lastSaved = 0;
    const setIcon = playing => {
      const glyph = iconHTML(playing ? 'pause' : 'play', 'icon-solid');
      $$('[data-player-icon]', player).forEach(node => { node.innerHTML = glyph; });
      toggleButtons.forEach(button => button.setAttribute('aria-label', playing ? 'Pause video' : 'Play video'));
      player.classList.toggle('is-playing', playing);
    };
    const paintVolume = () => {
      const muted = video.muted || video.volume === 0;
      if (muteIcon) muteIcon.innerHTML = iconHTML(muted || video.volume === 0 ? 'volume-x' : 'volume-2', 'icon-solid');
      if (muteButton) muteButton.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
      if (volume && !muted) volume.value = String(video.volume);
      player.classList.toggle('is-muted', muted);
    };
    const paintTime = () => {
      if (elapsed) elapsed.textContent = formatClock(video.currentTime);
      if (total) total.textContent = formatClock(video.duration);
      if (seek && !scrubbing) {
        const ratio = video.duration > 0 ? video.currentTime / video.duration : 0;
        seek.value = String(Math.round(Math.min(1, Math.max(0, ratio)) * 1000));
        seek.style.setProperty('--played', `${(Math.min(1, Math.max(0, ratio)) * 100).toFixed(2)}%`);
      }
    };
    const showError = () => {
      player.classList.add('has-error');
      player.classList.remove('is-buffering');
      if (errorBox) errorBox.hidden = false;
    };
    const togglePlay = () => {
      if (video.paused) {
        const attempt = video.play();
        if (attempt && typeof attempt.catch === 'function') attempt.catch(showError);
      } else {
        video.pause();
      }
    };
    video.volume = storedVolume();
    paintVolume();
    paintTime();
    setIcon(false);
    const tryResume = () => {
      if (!resumeAt || video.currentTime > 1) return;
      const duration = Number(video.duration) || 0;
      try { video.currentTime = Math.min(resumeAt, duration > 1 ? duration - 1 : resumeAt); } catch { /* ignore */ }
      if (resumeHint) {
        resumeHint.textContent = `Resuming from ${formatClock(resumeAt)}`;
        resumeHint.hidden = false;
        clearTimeout(hintTimer);
        hintTimer = window.setTimeout(() => { resumeHint.hidden = true; }, 4200);
      }
      paintTime();
    };
    if (video.readyState >= 1) tryResume();
    else on(video, 'loadedmetadata', tryResume, { once: true });
    toggleButtons.forEach(button => on(button, 'click', togglePlay));
    on(video, 'play', () => {
      setIcon(true);
      if (resumeHint) resumeHint.hidden = true;
      if (videoId) markWatched(videoId);
    });
    on(video, 'pause', () => setIcon(false));
    on(video, 'timeupdate', () => {
      paintTime();
      if (videoId && Math.abs(video.currentTime - lastSaved) >= 3) {
        lastSaved = video.currentTime;
        saveResume(videoId, video.currentTime, video.duration);
      }
    });
    on(video, 'durationchange', paintTime);
    on(video, 'waiting', () => player.classList.add('is-buffering'));
    on(video, 'playing', () => player.classList.remove('is-buffering'));
    on(video, 'canplay', () => player.classList.remove('is-buffering'));
    on(video, 'ended', () => {
      setIcon(false);
      if (videoId) {
        clearResume(videoId);
        markCompleted(videoId);
        paintCompletedButton(videoId);
        announce('Video finished. Lesson completed.');
      } else {
        announce('Video finished.');
      }
    });
    on(video, 'error', showError);
    if (seek) {
      on(seek, 'pointerdown', () => { scrubbing = true; });
      on(seek, 'input', () => {
        const duration = Number(video.duration) || 0;
        if (duration > 0) {
          video.currentTime = (Number(seek.value) / 1000) * duration;
          seek.style.setProperty('--played', `${(Number(seek.value) / 10).toFixed(2)}%`);
          if (elapsed) elapsed.textContent = formatClock(video.currentTime);
        }
      });
      const endScrub = () => {
        scrubbing = false;
        if (videoId) saveResume(videoId, video.currentTime, video.duration);
      };
      on(seek, 'pointerup', endScrub);
      on(seek, 'change', endScrub);
    }
    if (volume) {
      on(volume, 'input', () => {
        const next = Number(volume.value);
        video.volume = next;
        video.muted = next === 0;
        safeWrite(VOLUME_KEY, next);
        paintVolume();
      });
    }
    if (muteButton) {
      on(muteButton, 'click', () => {
        video.muted = !video.muted;
        if (!video.muted && video.volume === 0) video.volume = 0.6;
        paintVolume();
        announce(video.muted ? 'Audio muted.' : 'Audio on.');
      });
    }
    if (speedButton && speedMenu) {
      const setRate = rate => {
        video.playbackRate = rate;
        speedButton.textContent = `${rate}×`;
        $$('[data-player-rate]', speedMenu).forEach(option => option.setAttribute('aria-checked', String(Number(option.dataset.playerRate) === rate)));
      };
      const closeMenu = () => { speedMenu.hidden = true; speedButton.setAttribute('aria-expanded', 'false'); };
      on(speedButton, 'click', event => {
        event.stopPropagation();
        const open = speedMenu.hidden;
        speedMenu.hidden = !open;
        speedButton.setAttribute('aria-expanded', String(open));
      });
      $$('[data-player-rate]', speedMenu).forEach(option => {
        on(option, 'click', () => { setRate(Number(option.dataset.playerRate)); closeMenu(); speedButton.focus(); });
      });
      on(document, 'click', event => { if (!player.contains(event.target)) closeMenu(); });
      on(player, 'keydown', event => { if (event.key === 'Escape') closeMenu(); });
    }
    if (captionsButton) {
      on(captionsButton, 'click', () => {
        const textTrack = video.textTracks && video.textTracks[0];
        if (!textTrack) { announce('Captions are not available for this video.'); return; }
        const showing = textTrack.mode !== 'showing';
        textTrack.mode = showing ? 'showing' : 'hidden';
        captionsButton.setAttribute('aria-pressed', String(showing));
        captionsButton.setAttribute('aria-label', showing ? 'Hide captions' : 'Show captions');
        announce(showing ? 'Captions on.' : 'Captions off.');
      });
    }
    if (fullButton) {
      const paintFs = () => {
        const active = document.fullscreenElement === player;
        if (fsIcon) fsIcon.innerHTML = iconHTML(active ? 'minimize' : 'maximize', 'icon-solid');
        fullButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
      };
      on(fullButton, 'click', () => {
        if (!document.fullscreenElement) {
          const request = player.requestFullscreen || player.webkitRequestFullscreen;
          if (!request) { announce('Fullscreen is not available in this browser.'); return; }
          try { const result = request.call(player); if (result && typeof result.catch === 'function') result.catch(() => {}); } catch { /* ignore */ }
        } else {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) { try { exit.call(document); } catch { /* ignore */ } }
        }
      });
      on(document, 'fullscreenchange', paintFs);
      on(document, 'webkitfullscreenchange', paintFs);
      paintFs();
    }
    const retry = player.querySelector('[data-player-retry]');
    if (retry) on(retry, 'click', () => {
      player.classList.remove('has-error');
      if (errorBox) errorBox.hidden = true;
      try { video.load(); const attempt = video.play(); if (attempt && attempt.catch) attempt.catch(showError); } catch { /* ignore */ }
    });
    // Keyboard support: space/K play-pause, arrows seek ±5s, M mute, F fullscreen.
    // The shell itself is a tab stop so those shortcuts are reachable without first
    // landing on one of the buttons inside it.
    player.setAttribute('tabindex', '0');
    on(player, 'keydown', event => {
      if (event.target !== player && event.target.matches('input, button, select, textarea')) return;
      const key = event.key.toLowerCase();
      if (event.key === ' ' || key === 'k') { event.preventDefault(); togglePlay(); return; }
      if (key === 'm') { event.preventDefault(); muteButton?.click(); return; }
      if (key === 'c' && captionsButton) { event.preventDefault(); captionsButton.click(); return; }
      if (key === 'f') { event.preventDefault(); fullButton?.click(); return; }
      if (event.key === 'ArrowRight') { event.preventDefault(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); return; }
      if (event.key === 'ArrowLeft') { event.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
    });
    on(window, 'pagehide', () => { if (videoId) saveResume(videoId, video.currentTime, video.duration); });
    activePlayerCleanup = () => {
      clearTimeout(hintTimer);
      if (videoId) saveResume(videoId, video.currentTime, video.duration);
      controller.abort();
    };
  }
  // Every [data-watch] control routes here. On the homepage that means a same-tab navigation
  // to video.html; on video.html the lesson is swapped in place so Back does not fill up with
  // one history entry per lesson.
  let activeLessonId = null;
  function goToLesson(id) {
    if (!id) return;
    if (!isVideoPage) { window.location.assign(`video.html?lesson=${encodeURIComponent(id)}`); return; }
    if (!modal.classList.contains('hidden')) closeModal();
    if (id === activeLessonId) { $('#videoPageBody')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' }); return; }
    renderVideoPage(id);
    try { history.replaceState(null, '', `video.html?lesson=${encodeURIComponent(id)}`); } catch { /* ignore */ }
  }
  // Related lessons: explicit `related` ids first, then same category, then everything else —
  // always without the video that is currently playing, and topped up so the sidebar is never
  // mostly empty when the library has more lessons to offer.
  // A lesson can be published before its file is uploaded. Those entries stay in the
  // catalogue, but a student should not be sent from one empty player into another, so
  // the ordered candidates are split into "has a video" and "waiting for upload" while
  // keeping the relevance order inside each group.
  function hasPlayableSource(video) { return !!(video && video.videoUrl); }
  function relatedLessons(video, limit = 8) {
    if (!video) return [];
    const pool = lessons().filter(l => l.id !== video.id);
    const ordered = [];
    const take = item => { if (item && item.id !== video.id && !ordered.some(p => p.id === item.id)) ordered.push(item); };
    (Array.isArray(video.related) ? video.related : []).forEach(id => take(pool.find(l => l.id === id)));
    const topicName = currentTopicName(video);
    pool.filter(l => (l.category || '') === (video.category || '')).forEach(take);
    if (topicName) pool.filter(l => lessonTopic(l) === topicName).forEach(take);
    pool.forEach(take);
    return [...ordered.filter(hasPlayableSource), ...ordered.filter(l => !hasPlayableSource(l))].slice(0, limit);
  }
  function currentTopicName(video) {
    const topic = matchTopic(video);
    return topic ? topic.name : '';
  }
  function matchTopic(video) {
    const haystack = `${video.category || ''} ${video.title || ''}`.toLowerCase();
    return topics().find(topic => {
      const name = (topic.name || '').toLowerCase();
      const id = (topic.id || '').toLowerCase();
      const stem = name.replace(/[^a-z]/g, '').slice(0, 8);
      return (name && haystack.includes(name)) || (stem && haystack.replace(/[^a-z]/g, '').includes(stem)) || (id && haystack.includes(id));
    }) || null;
  }
  function lessonTopic(video) {
    const topic = matchTopic(video);
    return topic ? topic.name : '';
  }
  function durationLabel(video) {
    const value = Number(video.durationSeconds || video.seconds || 0);
    if (Number.isFinite(value) && value > 0) return formatClock(value);
    const text = String(video.duration || '').trim();
    return text || 'Lesson';
  }
  function recCardHTML(video) {
    const progress = getProgress();
    const playable = hasPlayableSource(video);
    const resume = resumeFor(video.id);
    const topicName = lessonTopic(video);
    const meta = [video.category || 'Lesson', topicName && topicName !== video.category ? topicName : ''].filter(Boolean).join(' · ');
    return `<article class="rec-card">
      <button class="rec-thumb ${thumbClass(video)}${video.poster ? ' has-poster' : ''}" type="button" data-watch="${escapeHTML(video.id)}" aria-label="${playable ? 'Play ' : 'Read '}${escapeHTML(video.title)}">
        ${video.poster ? `<img src="${escapeHTML(video.poster)}" alt="" loading="lazy" decoding="async">` : `<span class="rec-symbol" aria-hidden="true">${thumbSymbol(video)}</span>`}
        <span class="rec-duration">${playable ? escapeHTML(durationLabel(video)) : 'Read'}</span>
        ${progress.completed[video.id] || progress.watched[video.id] ? '<span class="rec-watched" aria-hidden="true">' + iconHTML('check') + '</span>' : ''}
        ${resume ? `<span class="rec-resume-bar" aria-hidden="true"><i style="width:${resumePercent(video.id, video)}%"></i></span>` : ''}
      </button>
      <div class="rec-copy">
        <button class="rec-title" type="button" data-watch="${escapeHTML(video.id)}">${escapeHTML(video.title)}</button>
        <p class="rec-meta">${escapeHTML(meta || 'Lesson')}</p>
        ${resume ? `<p class="rec-resume">Resume at ${formatClock(resume)}</p>` : ''}
      </div>
    </article>`;
  }
  function relatedPanelHTML(video) {
    const list = relatedLessons(video);
    const progress = getProgress();
    const continueIds = Object.entries(getResumeMap())
      .sort((a, b) => (Number(b[1].t) || 0) - (Number(a[1].t) || 0))
      .map(([id]) => id)
      .filter(id => id !== video.id && !progress.completed[id] && lessons().some(l => l.id === id && hasPlayableSource(l)));
    const continueList = continueIds.slice(0, 2).map(id => lessons().find(l => l.id === id)).filter(Boolean);
    const continueHTML = continueList.length
      ? `<section class="watch-panel rec-panel-continue" aria-labelledby="continueHeading"><h2 class="watch-panel-title" id="continueHeading">Continue watching</h2>${continueList.map(l => `<button class="continue-row" type="button" data-watch="${escapeHTML(l.id)}"><span class="continue-row-copy"><strong>${escapeHTML(l.title)}</strong><small>Resume at ${formatClock(resumeFor(l.id))} · ${escapeHTML(l.category || 'Lesson')}</small></span><span class="continue-row-play" aria-hidden="true">${iconHTML('play', 'icon-solid')}</span></button>`).join('')}</section>`
      : '';
    const body = list.length
      ? list.map(recCardHTML).join('')
      : `<div class="rec-empty"><strong>No other lessons yet</strong><p>When the school publishes more videos, they will show up here. For now, try the awareness quiz to check what you remember.</p><button class="btn btn-secondary btn-small" type="button" data-action="start-quiz">Take the quiz ${iconHTML('arrow-right', 'btn-ico')}</button></div>`;
    const currentHTML = `<section class="watch-panel rec-panel-now" aria-labelledby="nowHeading"><h2 class="watch-panel-title" id="nowHeading">Current lesson</h2><p class="rec-current-title">${escapeHTML(video.title)}</p></section>`;
    return `${currentHTML}${continueHTML}<section class="watch-panel rec-panel" aria-labelledby="relatedHeading">
      <div class="rec-head"><h2 class="watch-panel-title" id="relatedHeading">Recommended lessons</h2><span class="rec-count">${list.length} lesson${list.length === 1 ? '' : 's'}</span></div>
      <div class="rec-list">${body}</div>
      <a class="rec-all" href="index.html#videos">Browse all lessons ${iconHTML('arrow-right', 'inline-ico')}</a>
    </section>${progress.watched[video.id] ? '<p class="rec-footnote">' + iconHTML('check', 'inline-ico') + ' Saved in your local progress. Nothing is uploaded.</p>' : ''}`;
  }
  // The description always renders in full; CSS clamps it to 4 lines until expanded.
  // Whether the toggle is needed depends on the real rendered height, not a character
  // count, because 180 characters can overflow on a phone yet fit on a desktop. The
  // toggle starts hidden and initWatchPage reveals it only when the text is clamped.
  function watchDescriptionHTML(video) {
    const long = String(video.longDescription || '').trim();
    const short = String(video.description || '').trim();
    const text = long || short || 'An e B-SAFE learning lesson.';
    return `<div class="watch-desc" data-watch-desc>
      <p class="watch-desc-text" data-watch-desc-text>${escapeHTML(text)}</p>
      <button class="watch-desc-toggle" type="button" data-watch-desc-toggle aria-expanded="false" hidden>Show more ${iconHTML('chevron-down', 'inline-ico')}</button>
    </div>`;
  }
  function objectivesHTML(video) {
    const objectives = Array.isArray(video.learningObjectives) ? video.learningObjectives : [];
    const takeaways = Array.isArray(video.keyTakeaways) ? video.keyTakeaways : [];
    if (!objectives.length && !takeaways.length) return '';
    return `<div class="watch-learn-grid">${objectives.length ? `<section class="watch-learn-card"><h2>What you will learn</h2><ul>${objectives.map(o => `<li>${escapeHTML(o)}</li>`).join('')}</ul></section>` : ''}${takeaways.length ? `<section class="watch-learn-card"><h2>Key takeaways</h2><ul>${takeaways.map(o => `<li>${escapeHTML(o)}</li>`).join('')}</ul></section>` : ''}</div>`;
  }
  function videoDetailHTML(video) {
    const progress = getProgress();
    const playable = hasPlayableSource(video);
    const completeButton = progress.completed[video.id]
      ? '<span class="badge-pill">' + iconHTML('circle-check', 'pill-ico') + (playable ? 'Marked as completed' : 'Marked as read') + '</span>'
      : '<button class="btn btn-secondary" data-complete-lesson="' + escapeHTML(video.id) + '">' + (playable ? 'Mark lesson as completed' : 'Mark as read') + '</button>';
    const bookmarked = !!progress.bookmarks[video.id];
    const bookmarkButton = `<button class="bookmark-btn" type="button" data-bookmark="${escapeHTML(video.id)}" aria-pressed="${bookmarked}">${iconHTML('star', 'bm-ico')} ${bookmarked ? 'Saved' : 'Save lesson'}</button>`;
    const transcriptHTML = `<details class="transcript-box"><summary>Transcript</summary>${video.transcript ? `<p>${escapeHTML(video.transcript)}</p>` : '<p class="form-hint">No transcript yet for this lesson. The school can add one for this video.</p>'}${video.captionsPath ? '<p class="form-hint">Captions are available from the player controls.</p>' : ''}</details>`;
    const topic = matchTopic(video);
    const related = relatedLessons(video, 1);
    const nextCandidate = related[0] || null;
    const nextButton = nextCandidate ? `<button class="btn btn-primary watch-next" type="button" data-watch="${escapeHTML(nextCandidate.id)}"><span class="watch-next-copy"><small>Up next</small><strong>${escapeHTML(nextCandidate.title)}</strong></span><span aria-hidden="true">${iconHTML('arrow-right', 'btn-ico')}</span></button>` : '';
    const resume = resumeFor(video.id);
    return `<div class="watch-primary">
      <div class="watch-player-shell">${buildPlayerHTML(video)}</div>
      <div class="watch-head">
        <div class="watch-head-copy">
          <h1 class="watch-title">${escapeHTML(video.title)}</h1>
          <div class="video-meta watch-meta"><span>${iconHTML('clock', 'meta-ico')} ${escapeHTML(durationLabel(video))}</span><span>${iconHTML('badge-check', 'meta-ico')} ${escapeHTML(video.audience || 'Grade 7 friendly')}</span><span>${iconHTML('book-open', 'meta-ico')} ${escapeHTML(video.category || 'Lesson')}</span>${resume ? `<span class="watch-resume-note">↻ Resume at ${formatClock(resume)}</span>` : ''}</div>
        </div>
        <div class="watch-actions">${bookmarkButton}${nextButton}</div>
      </div>
      <section class="watch-panel watch-desc-panel" aria-label="About this lesson">
        ${watchDescriptionHTML(video)}
        ${transcriptHTML}
      </section>
      ${objectivesHTML(video)}
      <section class="watch-panel watch-quick-check" aria-labelledby="lessonQuickCheckTitle">
        <div>
          <h2 id="lessonQuickCheckTitle">Quick check</h2>
          <p>Nine short questions about bullying awareness. Your best score stays in this browser.</p>
          <p class="quick-check-best">${progress.quizBest ? `Your best: ${progress.quizBest}%` : 'No attempt yet.'}</p>
        </div>
        <button class="btn btn-primary" type="button" data-action="start-quiz">Start quick check ${iconHTML('arrow-right', 'btn-ico')}</button>
      </section>
      <div class="lesson-actions watch-foot-actions">${completeButton}<button class="btn btn-secondary" type="button" data-open-progress>My progress</button></div>
      <div class="alert-box watch-reminder">Learning reminder: if you recognize a bullying situation, keep yourself safe and ask a trusted adult for help. <a href="index.html#reporting">See how to get help ${iconHTML('arrow-right', 'inline-ico')}</a></div>
      <p class="watch-backline"><a class="watch-back-link" href="index.html#videos">${iconHTML('arrow-left', 'inline-ico')} Back to all video lessons</a></p>
    </div>
    <aside class="watch-aside" aria-label="Recommended videos">${relatedPanelHTML(video)}</aside>`;
  }
  function videoNotFoundHTML(requested) {
    const label = requested ? `“${escapeHTML(requested)}”` : 'That lesson';
    return `<div class="video-not-found"><span class="content-pill">Lesson not found</span><h1>${label} is not available.</h1><p>The lesson may have been unpublished, renamed, or the link may be incomplete. Published lessons are listed on the Watch &amp; Learn section.</p><a class="btn btn-primary" href="index.html#videos">${iconHTML('arrow-left', 'btn-ico')}Browse all video lessons</a></div>`;
  }
  function renderVideoPage(id) {
    const body = $('#videoPageBody');
    if (!body) return;
    const video = id ? lessons().find(v => v.id === id) : null;
    stopStageMedia(body);
    // A previously previewed local file has no use once another lesson is rendered.
    if (activeObjectURL) { URL.revokeObjectURL(activeObjectURL); activeObjectURL = ''; }
    activeLessonId = video ? video.id : null;
    body.classList.remove('is-loading', 'is-swapping');
    body.removeAttribute('aria-busy');
    if (!video) {
      body.className = 'watch-solo';
      body.innerHTML = videoNotFoundHTML(id);
      document.title = 'Lesson not found | e B-SAFE';
      announce('That lesson is not available. Browse the lesson list to choose another video.');
      return;
    }
    body.className = 'watch-grid';
    body.innerHTML = videoDetailHTML(video);
    initLessonPlayer(body);
    initWatchPage(body);
    document.title = `${video.title} | e B-SAFE`;
    announce(`Now playing: ${video.title}.`);
    const reduceMotion = prefersReducedMotion();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    try { body.focus({ preventScroll: true }); } catch { /* ignore */ }
  }
  // The description is always rendered in full and CSS clamps it to 4 lines. Showing
  // "Show more" only when the text is really cut off keeps the control honest: on a wide
  // screen a 180-character summary fits, on a phone it does not.
  function syncWatchDescToggle(desc, toggle, textNode) {
    if (!desc || !toggle || !textNode || !desc.isConnected) return;
    if (desc.classList.contains('is-open')) { toggle.hidden = false; return; }
    toggle.hidden = textNode.scrollHeight - textNode.clientHeight < 2;
  }
  let watchDescResizeBound = false;
  // A single resize listener for the life of the page rather than one per lesson swap.
  function bindWatchDescResize() {
    if (watchDescResizeBound) return;
    watchDescResizeBound = true;
    window.addEventListener('resize', () => {
      const live = $('#videoPageBody');
      if (!live) return;
      syncWatchDescToggle(
        live.querySelector('[data-watch-desc]'),
        live.querySelector('[data-watch-desc-toggle]'),
        live.querySelector('[data-watch-desc-text]')
      );
    }, { passive: true });
  }
  // Page-level extras for the watch layout: description expand/collapse and the thumbnail
  // cross-fade. Both are one-shot listeners on elements that get replaced on every swap.
  function initWatchPage(scope) {
    const toggle = scope.querySelector('[data-watch-desc-toggle]');
    const desc = scope.querySelector('[data-watch-desc]');
    const textNode = scope.querySelector('[data-watch-desc-text]');
    if (toggle && desc && textNode) {
      toggle.addEventListener('click', () => {
        const open = desc.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.innerHTML = open ? 'Show less ' + iconHTML('chevron-up', 'inline-ico') : 'Show more ' + iconHTML('chevron-down', 'inline-ico');
        if (!open) syncWatchDescToggle(desc, toggle, textNode);
      });
      syncWatchDescToggle(desc, toggle, textNode);
      bindWatchDescResize();
    }
    $$('.rec-thumb img', scope).forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('is-loaded');
        return;
      }
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    });
  }

  // ---------------------------------------------------------------------------
  // Awareness quiz and activity
  // ---------------------------------------------------------------------------
  let quizIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;
  function currentQuestions() { return quizDef().questions || []; }
  function startQuiz() {
    if (!currentQuestions().length) { openModal('Quiz unavailable', '<p class="modal-lead">Quiz content is unavailable. Check data/quizzes.json.</p>', 'Learning check'); return; }
    quizIndex = 0; quizScore = 0; quizAnswered = false; renderQuiz();
  }
  function renderQuiz() {
    const questions = currentQuestions();
    if (quizIndex >= questions.length) {
      const percent = Math.round(quizScore / questions.length * 100);
      const progress = getProgress();
      progress.quizAttempts += 1;
      progress.quizBest = Math.max(progress.quizBest, percent);
      saveProgress(progress);
      refreshAfterProgressChange();
      if (certificateReady()) announce('Well done. The completion certificate is now unlocked.');
      openModal('Quiz complete!', `<div class="success-box"><strong>You finished the quick awareness quiz.</strong><br>You answered ${quizScore} out of ${questions.length} questions correctly (${percent}%). Keep learning and ask a trusted adult if you need help with a real situation.</div><div class="topic-detail-list"><div><strong>Your next step</strong><p>Revisit any topic you want to understand better, then try again when you're ready.</p></div></div><button class="btn btn-primary" data-action="restart-quiz">Try again</button>`, 'Learning check');
      return;
    }
    const item = questions[quizIndex];
    openModal(quizDef().title || 'Quick awareness quiz', `<div class="quiz-progress"><span style="width:${(quizIndex / questions.length) * 100}%"></span></div><div class="quiz-count">Question ${quizIndex + 1} of ${questions.length}${item.type === 'true-false' ? ' · True or false' : item.type === 'scenario' ? ' · Scenario' : ''}</div>${item.type === 'scenario' ? `<div class="quiz-scenario">${escapeHTML(item.question || '')}</div>` : `<div class="quiz-question">${escapeHTML(item.question || '')}</div>`}<div class="quiz-answers">${(item.options || []).map((option, index) => `<button data-quiz-answer="${index}">${item.type === 'true-false' ? '' : `${String.fromCharCode(65 + index)}. &nbsp;`}${escapeHTML(option)}</button>`).join('')}</div><div class="quiz-feedback hidden" id="quizFeedback" role="status"></div><div class="quiz-footer"><span class="quiz-count">One question at a time</span><button class="btn btn-primary hidden" id="quizNext">${quizIndex === questions.length - 1 ? 'See results' : 'Next question'} ${iconHTML('arrow-right', 'btn-ico')}</button></div>`, 'Watch, think, learn');
  }

  const activitiesDef = () => (content.quizzes && Array.isArray(content.quizzes.activities)) ? content.quizzes.activities : [];
  let scenarioIndex = 0;
  let scenarioAnswered = false;
  function renderScenario() {
    const panel = $('#scenarioPanel');
    if (!panel) return;
    const list = activitiesDef();
    if (!list.length) { panel.innerHTML = '<div class="scenario-copy"><h3>What would you do?</h3><p>The activity is unavailable. Check data/quizzes.json.</p></div>'; return; }
    if (scenarioIndex >= list.length) {
      panel.innerHTML = `<div class="scenario-icon">${iconHTML('award')}</div><div class="scenario-copy"><span class="eyebrow">QUICK INTERACTIVE ACTIVITY</span><h3>You finished all ${list.length} scenarios!</h3><p>Every choice is a chance to practice keeping classmates safe. Remember: do not join in, support the person, and tell a trusted adult.</p><button class="btn btn-secondary" type="button" data-scenario-restart>Try the scenarios again</button></div>`;
      return;
    }
    const activity = list[scenarioIndex];
    scenarioAnswered = false;
    panel.innerHTML = `<div class="scenario-icon">${iconHTML('message-circle')}</div><div class="scenario-copy"><span class="eyebrow">Quick interactive activity · Scenario ${scenarioIndex + 1} of ${list.length}</span><h3>${escapeHTML(activity.title || 'What would you do?')}</h3><p>${escapeHTML(activity.prompt || '')}</p><div class="scenario-options" id="scenarioOptions">${(activity.options || []).map((option, index) => `<button type="button" data-scenario-answer="${index}">${escapeHTML(option.text || '')}</button>`).join('')}</div><div class="scenario-feedback hidden" id="scenarioFeedback" role="status"></div><div class="scenario-next hidden" id="scenarioNext"><button class="btn btn-primary" type="button" data-scenario-next>${scenarioIndex === list.length - 1 ? 'See the summary' : 'Next scenario'} ${iconHTML('arrow-right', 'btn-ico')}</button></div></div>`;
  }
  function handleScenarioClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const list = activitiesDef();
    if (button.hasAttribute('data-scenario-restart')) { scenarioIndex = 0; scenarioAnswered = false; renderScenario(); announce('Scenarios restarted.'); return; }
    if (button.hasAttribute('data-scenario-next')) {
      scenarioIndex += 1;
      renderScenario();
      const next = list[scenarioIndex];
      announce(next ? `Scenario ${scenarioIndex + 1} of ${list.length}.` : 'You finished all scenarios.');
      return;
    }
    if (button.dataset.scenarioAnswer !== undefined && !scenarioAnswered) {
      const activity = list[scenarioIndex];
      if (!activity) return;
      const chosen = (activity.options || [])[Number(button.dataset.scenarioAnswer)] || {};
      scenarioAnswered = true;
      const optionButtons = $$('#scenarioOptions button');
      optionButtons.forEach(b => { b.disabled = true; b.classList.remove('chosen-correct', 'chosen-wrong'); });
      button.classList.add(chosen.correct ? 'chosen-correct' : 'chosen-wrong');
      if (!chosen.correct) {
        const correctIndex = (activity.options || []).findIndex(o => o.correct);
        if (optionButtons[correctIndex]) optionButtons[correctIndex].classList.add('chosen-correct');
      }
      const feedback = $('#scenarioFeedback');
      if (feedback) {
        // Say plainly whether the choice was safe, then why (the JSON carries the explanation).
        feedback.className = `scenario-feedback ${chosen.correct ? 'is-correct' : 'is-wrong'}`;
        feedback.innerHTML = `<strong>${chosen.correct ? iconHTML('circle-check', 'inline-ico') + ' Safe choice' : iconHTML('circle-alert', 'inline-ico') + ' Not the safest choice'}</strong><span>${escapeHTML(chosen.feedback || '')}</span>`;
      }
      const next = $('#scenarioNext');
      if (next) next.classList.remove('hidden');
      announce(chosen.correct ? 'That is a safe choice.' : 'That choice can spread the harm. The safe option is highlighted.');
    }
  }

  // ---------------------------------------------------------------------------
  // Announcements
  // ---------------------------------------------------------------------------
  function announcementHTML(item, index) {
    return `<article class="announcement-item"><span class="announcement-symbol ${index % 2 ? 'gold' : ''}">${index % 2 ? iconHTML('heart') : iconHTML('sparkles')}</span><div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.body)}</p><small>${escapeHTML(item.label || 'School update')}${item.publishedAt ? ` · ${escapeHTML(item.publishedAt)}` : ''} · e B-SAFE</small></div></article>`;
  }
  function renderAnnouncements() {
    const list = posts();
    const latest = newestPost();
    const stripTitle = $('#announcementStripTitle');
    const stripBody = $('#announcementStripBody');
    if (stripTitle) stripTitle.textContent = latest ? latest.title : 'No announcements yet.';
    if (stripBody) stripBody.textContent = latest ? latest.body : 'Check back later for school updates.';
    const btn = $('#viewAllAnnouncements');
    if (btn) btn.innerHTML = `View all (${list.length}) ${iconHTML('arrow-right', 'btn-ico')}`;
  }
  function openAllAnnouncements() {
    const list = posts();
    const content = list.length ? `<div class="announcement-list single">${list.map(announcementHTML).join('')}</div>` : '<div class="no-results">No announcements yet. Check back later.</div>';
    openModal('All announcements', content, 'From your school');
  }

  // ---------------------------------------------------------------------------
  // Handbook
  // ---------------------------------------------------------------------------
  function renderBlocks(blocks) {
    const itemHTML = item => {
      if (typeof item === 'string') return `<li>${ord(item)}</li>`;
      const nestedTag = item.kind === 'alpha' ? 'ol' : 'ul';
      const nestedClass = item.kind === 'alpha' ? 'hb-alpha' : 'hb-plain';
      const nested = Array.isArray(item.items) ? `<${nestedTag} class="${nestedClass}">${item.items.map(itemHTML).join('')}</${nestedTag}>` : '';
      return `<li>${ord(item.text || '')}${nested}</li>`;
    };
    return (blocks || []).map(block => {
      if (!block || typeof block !== 'object') return '';
      switch (block.type) {
        case 'heading': return `<h3 class="hb-heading">${ord(block.text || '')}</h3>`;
        case 'title': return `<p class="hb-title">${ord(block.text || '')}</p>`;
        case 'subtitle': return `<p class="hb-subtitle">${ord(block.text || '')}</p>`;
        case 'label': return `<p class="hb-label">${ord(block.text || '')}</p>`;
        case 'labelParagraph': return `<p><b>${escapeHTML(block.label || '')}</b> ${ord(block.text || '')}</p>`;
        case 'paragraph': return `<p>${Array.isArray(block.lines) ? block.lines.map(ord).join('<br>') : ord(block.text || '')}</p>`;
        case 'objectives': return `<div class="hb-objectives">${(block.items || []).map(t => `<p>${ord(t)}</p>`).join('')}</div>`;
        case 'fields': return `<div class="hb-fields">${(block.items || []).map(field => {
          let value;
          if (field.blank) value = '<span class="hb-blank"></span>';
          else if (Array.isArray(field.stack)) value = `<span class="hb-stack">${field.stack.map(line => `<span>${ord(line)}</span>`).join('')}</span>`;
          else value = `<span>${ord(field.value || '')}</span>`;
          return `<div class="hb-field"><b>${escapeHTML(field.label || '')}</b>${value}</div>`;
        }).join('')}</div>`;
        case 'columns': return `<div class="hb-columns">${(block.columns || []).map(column => `<div><p class="hb-subtitle">${ord(column.title || '')}</p>${(column.groups || []).map(group => `<p class="hb-label">${ord(group.label || '')}</p><ul class="hb-plain">${(group.items || []).map(t => `<li>${ord(t)}</li>`).join('')}</ul>`).join('')}</div>`).join('')}</div>`;
        case 'list': {
          const kinds = { ordered: ['ol', ''], alpha: ['ol', 'hb-alpha'], plain: ['ul', 'hb-plain'], values: ['ul', 'hb-values'] };
          const [tag, cls] = kinds[block.kind] || kinds.plain;
          const start = block.kind === 'ordered' && block.start ? ` start="${Number(block.start)}"` : '';
          return `<${tag}${cls ? ` class="${cls}"` : ''}${start}>${(block.items || []).map(itemHTML).join('')}</${tag}>`;
        }
        default: return '';
      }
    }).join('');
  }
  function renderHandbookCards() {
    const grid = $('#handbookGrid');
    if (!grid) return;
    const pages = handbookPages();
    grid.innerHTML = pages.length ? pages.map(page => `<button class="handbook-card" data-policy="${escapeHTML(page.id)}"><span class="handbook-icon ${escapeHTML(page.iconClass || 'icon-green')}">${iconHTML(ICON_NAMES.has(page.icon) ? page.icon : 'book-open')}</span><span><strong>${escapeHTML(page.cardLabel || page.title)}</strong><small>${escapeHTML(page.cardNote || '')}</small></span>${iconHTML('chevron-right', 'card-arrow')}</button>`).join('')
      : '<div class="no-results">Handbook content is unavailable. Check data/handbook.json.</div>';
    $$('#handbookGrid .handbook-card').forEach(button => button.addEventListener('click', () => openPolicy(button.dataset.policy)));
  }
  function openPolicy(key) {
    const pages = handbookPages();
    const index = pages.findIndex(p => p.id === key);
    const page = index >= 0 ? pages[index] : null;
    if (!page) return;
    const note = page.status === 'summary'
      ? 'This is a web-friendly summary of provided handbook information, not a replacement for the official handbook. The school must verify the current wording and procedures.'
      : "This page is transcribed from the school's printed student handbook for online reading. The school should still verify and approve the exact wording before publication.";
    // Chapter navigation: readers can move through the handbook without closing the modal.
    const chapterBtn = (target, direction) => target
      ? `<button class="hb-chapter-btn${direction === 'next' ? ' is-next' : ''}" type="button" data-open-policy="${escapeHTML(target.id)}"><svg aria-hidden="true"><use href="#i-${direction === 'next' ? 'arrow-right' : 'arrow-left'}"></use></svg><span class="hb-chapter-copy"><small>${direction === 'next' ? 'Next chapter' : 'Previous chapter'}</small><b>${escapeHTML(target.cardLabel || target.title)}</b></span></button>`
      : '';
    const chapters = pages.length > 1
      ? `<nav class="hb-chapter-nav" aria-label="Handbook chapters">${chapterBtn(index > 0 ? pages[index - 1] : null, 'prev')}<span class="hb-chapter-count">Chapter ${index + 1} of ${pages.length}</span>${chapterBtn(index < pages.length - 1 ? pages[index + 1] : null, 'next')}</nav>`
      : '';
    const blocks = Array.isArray(page.blocks) ? page.blocks : [];
    // A transcribed page whose printed list starts at item 4 should say why, instead of
    // leaving the reader wondering where the first items went.
    const continuedList = blocks.find(block => block && block.type === 'list' && block.kind === 'ordered' && Number(block.start) > 1);
    const continued = continuedList
      ? `<p class="hb-continued">${iconHTML('info', 'inline-ico')}<span>The printed list continues from the previous chapter, so this page starts at ${Number(continuedList.start)}.</span></p>`
      : '';
    const pageBody = blocks.length
      ? `<div class="handbook-page">${continued}${renderBlocks(blocks)}</div>`
      : `<div class="handbook-page"><div class="no-results"><span class="no-results-icon" aria-hidden="true">${iconHTML('file-text')}</span><strong>This page has no content yet</strong><p>The school can add the text in data/handbook.json or through the Content Manager.</p></div></div>`;
    openModal(page.title, `${pageBody}${chapters}<p class="hb-source-note">${iconHTML('info', 'inline-ico')}<span>${escapeHTML(note)}</span></p>`, 'School handbook', { wide: true });
    // Reading flow: put focus on the chapter title so the new page is announced.
    const titleNode = $('#modalTitle');
    if (titleNode) { titleNode.setAttribute('tabindex', '-1'); titleNode.focus({ preventScroll: true }); }
  }

  // ---------------------------------------------------------------------------
  // Awareness survey, website evaluation, and response files
  // ---------------------------------------------------------------------------
  const SURVEY_KEY = 'ebsafe_survey_responses';
  const EVAL_KEY = 'ebsafe_evaluation_responses';
  const getResponses = key => { const list = safeRead(key, []); return Array.isArray(list) ? list : []; };
  const addResponse = (key, entry) => { const list = getResponses(key); list.push(entry); safeWrite(key, list.slice(-500)); };
  function scaleLegend(scale) { return `<div class="survey-legend">${(scale || []).map(s => `<span><b>${s.value}</b> ${escapeHTML(s.label)}</span>`).join('')}</div>`; }
  function scaleOptions(scale, name, label) {
    return `<div class="survey-scale" role="radiogroup" aria-label="${escapeHTML(label)}">${(scale || []).map(s => `<label class="survey-opt" title="${escapeHTML(s.label)}"><input type="radio" name="${name}" value="${s.value}" required><span>${s.value}</span><small>${escapeHTML(s.label)}</small></label>`).join('')}</div>`;
  }

  function openSurvey() {
    const def = surveyDef().awareness;
    if (!def || !Array.isArray(def.dimensions)) { openModal('Awareness check', '<p class="modal-lead">Survey content is unavailable. Check data/survey-questions.json.</p>', 'Research'); return; }
    const scale = def.scale || [];
    const groups = def.dimensions.map(dimension => `<div class="survey-group"><strong>${escapeHTML(dimension.label || '')}</strong>${(dimension.statements || []).map((statement, index) => `<div class="survey-item"><p>${escapeHTML(statement)}</p>${scaleOptions(scale, `q_${dimension.id}_${index}`, statement)}</div>`).join('')}</div>`).join('');
    const experience = def.experience ? `<div class="survey-group"><strong>${escapeHTML(def.experience.label || '')}</strong><div class="form-field"><label for="surveyExperience" class="sr-only">Personal experience (optional)</label><select id="surveyExperience" name="experience"><option value="">Prefer not to answer</option>${(def.experience.options || []).map(o => `<option>${escapeHTML(o)}</option>`).join('')}</select></div></div>` : '';
    openModal('Bullying Awareness Check', `<p class="modal-lead">${escapeHTML(def.intro || '')}</p>${scaleLegend(scale)}<form id="surveyForm">${groups}${experience}<div class="alert-box">${escapeHTML(def.privacyNote || 'Responses stay in this browser only.')}</div><button class="btn btn-primary" type="submit">Submit awareness check</button></form><div id="surveyStatus" class="success-box hidden" role="status"></div>`, 'RESEARCH · AWARENESS');
  }

  function submitSurvey(form) {
    const def = surveyDef().awareness || {};
    const scale = def.scale || [];
    const answers = {};
    for (const dimension of def.dimensions || []) answers[dimension.id] = [];
    const data = new FormData(form);
    for (const [name, value] of data.entries()) {
      if (!name.startsWith('q_')) continue;
      const parts = name.split('_');
      const dimensionId = parts.slice(1, parts.length - 1).join('_');
      if (answers[dimensionId]) answers[dimensionId].push(Number(value));
    }
    const entry = {
      type: 'ebsafe.survey-response',
      version: 1,
      id: uid('resp'),
      submittedAt: new Date().toISOString(),
      scaleMax: Math.max(...scale.map(s => Number(s.value) || 5)),
      answers,
      experience: String(data.get('experience') || '') || 'Prefer not to answer'
    };
    addResponse(SURVEY_KEY, entry);
    const progress = getProgress();
    progress.surveyCount += 1;
    saveProgress(progress);
    const status = $('#surveyStatus');
    status.classList.remove('hidden');
    status.innerHTML = `<strong>Thank you. Your awareness check was saved in this browser.</strong><br>You can download your anonymous response file below and give it to the researchers if they asked for it.`;
    // When the school runs its own research server, the anonymous scores are also posted
    // there; the local copy above stays, so the check still works offline.
    if (apiBaseUrl()) {
      apiFetch('/api/v1/research/responses', {
        method: 'POST',
        body: { kind: 'awareness', category: 'Grade 7 awareness check', consent: 'assent-given', completion: 'complete', answers: Object.fromEntries(Object.entries(answers).flatMap(([dimension, scores]) => scores.map((score, index) => [dimension + '.' + (index + 1), score]))) }
      }).then(result => {
        const line = document.createElement('p');
        line.className = 'form-hint';
        line.textContent = result.ok && result.data && result.data.id
          ? 'Your anonymous response was also received by the school\u2019s research server. Reference: ' + result.data.id
          : 'Saved in this browser only. The school\u2019s research server could not be reached: ' + (result.message || 'try again later.');
        status.appendChild(line);
      });
    }
    const actions = document.createElement('div');
    actions.className = 'download-row';
    actions.innerHTML = `<button class="btn btn-secondary" type="button" id="downloadSurveySingle">Download my response (JSON)</button><button class="btn btn-secondary" type="button" data-close-modal>Close</button>`;
    status.appendChild(actions);
    form.querySelector('button[type="submit"]').disabled = true;
    const button = $('#downloadSurveySingle');
    if (button) button.addEventListener('click', () => downloadJSON(`ebsafe-survey-response-${entry.id}.json`, entry));
  }

  function openEvaluation() {
    const def = surveyDef().evaluation;
    if (!def || !Array.isArray(def.criteria)) { openModal('Website evaluation', '<p class="modal-lead">Evaluation content is unavailable. Check data/survey-questions.json.</p>', 'SOP 5 · USABILITY'); return; }
    const scale = def.scale || [];
    const fields = def.criteria.map((criterion, index) => `<div class="form-field"><label for="rate_${escapeHTML(criterion.id)}">${index + 1}. ${escapeHTML(criterion.text)}</label><select id="rate_${escapeHTML(criterion.id)}" name="${escapeHTML(criterion.id)}" required><option value="">Choose a rating</option>${scale.map(s => `<option value="${s.value}">${s.value} — ${escapeHTML(s.label)}</option>`).join('')}</select></div>`).join('');
    openModal('Website evaluation', `<p class="modal-lead">${escapeHTML(def.intro || 'Please rate the website.')}</p><form id="evaluationForm">${fields}<button class="btn btn-primary" type="submit">Submit evaluation</button></form><div id="evaluationStatus" class="success-box hidden" role="status"></div>`, 'SOP 5 · USABILITY');
  }
  function submitEvaluation(form) {
    const data = new FormData(form);
    const scores = {};
    let sum = 0; let count = 0;
    for (const [key, value] of data.entries()) { const score = Number(value); if (!score) return; scores[key] = score; sum += score; count += 1; }
    const entry = { type: 'ebsafe.evaluation-response', version: 1, id: uid('eval'), submittedAt: new Date().toISOString(), scores, average: Number((sum / Math.max(count, 1)).toFixed(2)) };
    addResponse(EVAL_KEY, entry);
    const status = $('#evaluationStatus');
    status.classList.remove('hidden');
    status.innerHTML = `<strong>Thank you. Your evaluation was recorded in this browser.</strong><br>Your average rating was ${entry.average}/5. You can download your anonymous response file below.`;
    const actions = document.createElement('div');
    actions.className = 'download-row';
    actions.innerHTML = '<button class="btn btn-secondary" type="button" id="downloadEvalSingle">Download my response (JSON)</button><button class="btn btn-secondary" type="button" data-close-modal>Close</button>';
    status.appendChild(actions);
    form.querySelector('button[type="submit"]').disabled = true;
    const button = $('#downloadEvalSingle');
    if (button) button.addEventListener('click', () => downloadJSON(`ebsafe-evaluation-response-${entry.id}.json`, entry));
  }


  // ---------------------------------------------------------------------------
  // Myth vs. fact, kindness pledge, FAQ, tip of the day, progress preview
  // ---------------------------------------------------------------------------
  function renderMyths() {
    const box = $('#mythSection');
    if (!box) return;
    const myths = Array.isArray(extras().myths) ? extras().myths : [];
    if (!myths.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<h3 class="faq-group-title">Myth vs. fact</h3><p class="section-sub">Choose “Show the fact” on a card to reveal what is really true.</p><div class="myth-grid">${myths.map((m, i) => `<article class="myth-card" data-myth-card="${i}"><span class="myth-line">${iconHTML('x', 'inline-ico')} Myth: ${escapeHTML(m.myth || '')}</span><button class="btn btn-secondary btn-small" type="button" data-reveal-myth="${i}" aria-expanded="false">Show the fact</button><div class="myth-fact-body"><span class="fact-line">${iconHTML('check', 'inline-ico')} Fact: ${escapeHTML(m.fact || '')}</span><p>${escapeHTML(m.explanation || '')}</p></div></article>`).join('')}</div>`;
  }
  function handleMythClick(event) {
    const button = event.target.closest('[data-reveal-myth]');
    if (!button) return;
    const card = button.closest('.myth-card');
    if (!card) return;
    card.classList.add('revealed');
    button.setAttribute('aria-expanded', 'true');
    button.remove();
    announce('Fact revealed.');
  }
  function renderPledge() {
    const box = $('#pledgeCard');
    if (!box) return;
    const def = pledgeDef();
    const lines = Array.isArray(def.lines) ? def.lines : [];
    if (!lines.length) { box.innerHTML = '<p class="form-hint">The pledge content is unavailable. Check data/extras.json.</p>'; return; }
    const progress = getProgress();
    const ticked = progress.pledge ? progress.pledge.lines : [];
    box.innerHTML = `<div><h3>${escapeHTML(def.title || 'My Digital Kindness Pledge')}</h3><p class="modal-lead">${escapeHTML(def.intro || '')}</p><ul class="pledge-list">${lines.map((line, i) => `<li><label><input type="checkbox" data-pledge-line="${i}" ${ticked.includes(i) ? 'checked' : ''}><span>${escapeHTML(line)}</span></label></li>`).join('')}</ul></div><div class="pledge-side"><h3 id="pledgeCount">${ticked.length} of ${lines.length} promises ticked</h3><p class="pledge-count">Tick every line to earn the Pledge Keeper badge. Ticks are saved only in this browser.</p><div class="form-field"><label for="pledgeName">Your name for the printed card (optional — never saved)</label><input id="pledgeName" maxlength="60" placeholder="Type your name for the printed card"></div><button class="btn btn-primary" type="button" data-pledge-print>Print my pledge card</button><p class="form-hint">${escapeHTML(def.closing || '')}</p></div>`;
  }
  function handlePledgeChange(event) {
    const input = event.target.closest('[data-pledge-line]');
    if (!input) return;
    const lines = pledgeDef().lines;
    const progress = getProgress();
    const current = new Set(progress.pledge ? progress.pledge.lines : []);
    const index = Number(input.dataset.pledgeLine);
    if (input.checked) current.add(index); else current.delete(index);
    progress.pledge = { lines: [...current].sort((x, y) => x - y), at: new Date().toISOString() };
    saveProgress(progress);
    const count = $('#pledgeCount');
    if (count) count.textContent = `${progress.pledge.lines.length} of ${lines.length} promises ticked`;
    announce(`${progress.pledge.lines.length} of ${lines.length} promises ticked.`);
    if (progress.pledge.lines.length >= lines.length) announce('Pledge complete. The Pledge Keeper badge is yours.');
  }
  // ---------------------------------------------------------------------------
  // Awareness extras: effects of bullying and consequences for students who bully
  // (extras.json → awarenessExtra). Each section becomes an accordion block.
  // ---------------------------------------------------------------------------
  const awarenessSections = () => (Array.isArray(extras().awarenessExtra) ? extras().awarenessExtra : []);
  function renderAwarenessExtra() {
    const wrap = $('#awarenessExtra');
    const grid = $('#awarenessExtraGrid');
    if (!wrap || !grid) return;
    const sections = awarenessSections();
    if (!sections.length) { grid.innerHTML = ''; wrap.hidden = true; return; }
    grid.innerHTML = sections.map((section, s) => {
      const items = Array.isArray(section.items) ? section.items : [];
      const id = section.id || `extra-${s + 1}`;
      const icon = ['heart', 'shield', 'eye', 'chat', 'book', 'life-ring'].includes(section.icon) ? section.icon : 'heart';
      return `<section class="extra-block" id="${escapeHTML(id)}" aria-labelledby="${escapeHTML(id)}-title">
        <div class="extra-head"><span class="extra-icon" aria-hidden="true"><svg><use href="#i-${icon}"></use></svg></span><div class="extra-head-copy">${section.eyebrow ? `<span class="eyebrow">${escapeHTML(section.eyebrow)}</span>` : ''}<h2 id="${escapeHTML(id)}-title">${escapeHTML(section.title || '')}</h2>${section.intro ? `<p>${escapeHTML(section.intro)}</p>` : ''}</div></div>
        <div class="extra-list">${items.map((item, index) => `<details class="extra-item"><summary><span class="extra-num" aria-hidden="true">${index + 1}</span><span class="extra-title">${escapeHTML(item.title || '')}</span><span class="extra-ico" aria-hidden="true">${iconHTML(item.icon || 'heart')}</span><span class="extra-chev" aria-hidden="true">${iconHTML('chevron-right')}</span></summary><div class="extra-body"><p>${escapeHTML(item.text || '')}</p></div></details>`).join('')}</div>
        ${section.note ? `<p class="extra-note">${escapeHTML(section.note)}</p>` : ''}
      </section>`;
    }).join('');
    wrap.hidden = false;
  }
  function renderFaq() {
    const box = $('#faqList');
    if (!box) return;
    const groups = Array.isArray(extras().faq) ? extras().faq : [];
    box.innerHTML = groups.length
      ? groups.map(group => `<div class="faq-group"><h3 class="faq-group-title">${escapeHTML(group.group || '')}</h3>${(group.items || []).map(item => `<details class="faq-item"><summary>${escapeHTML(item.q || '')}</summary><p>${escapeHTML(item.a || '')}</p></details>`).join('')}</div>`).join('')
      : '<p class="form-hint">FAQ content is unavailable. Check data/extras.json.</p>';
  }
  function renderTip() {
    const box = $('#tipCard');
    if (!box) return;
    const tips = Array.isArray(extras().tips) ? extras().tips : [];
    if (!tips.length) { box.hidden = true; box.innerHTML = ''; return; }
    const day = Math.floor(Date.now() / 86400000);
    box.hidden = false;
    box.innerHTML = `<span class="tip-icon" aria-hidden="true">${iconHTML('lightbulb')}</span><div><b>Learning tip of the day</b><p>${escapeHTML(tips[day % tips.length])}</p></div>`;
  }
  function railCardHTML(lesson, progress, kind) {
    const playable = hasPlayableSource(lesson);
    const topicClass = topicClassFor(lesson);
    const pct = kind === 'continue' ? resumePercent(lesson.id, lesson) : 0;
    const meta = kind === 'continue'
      ? `Resume at ${formatClock(resumeFor(lesson.id))} · ${lesson.category || 'Lesson'}`
      : `${playable ? 'Video lesson' : 'Read lesson'} · ${lesson.category || 'Lesson'}`;
    const thumb = playable
      ? `<span class="rail-thumb">${lesson.poster ? `<img src="${escapeHTML(lesson.poster)}" alt="" loading="lazy" decoding="async">` : `<span class="rail-read" aria-hidden="true">${thumbSymbol(lesson)}</span>`}<span class="rail-play" aria-hidden="true">${iconHTML('play', 'icon-solid')}</span>${kind === 'continue' ? `<span class="rail-progress" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ''}</span>`
      : `<span class="rail-read" aria-hidden="true">${thumbSymbol(lesson)}</span>`;
    return `<a class="rail-card${topicClass}" href="video.html?lesson=${encodeURIComponent(lesson.id)}" data-watch="${escapeHTML(lesson.id)}">
      ${thumb}
      <span class="rail-copy"><strong>${escapeHTML(lesson.title)}</strong><small>${escapeHTML(meta)}</small></span>
    </a>`;
  }

  function renderContinueWatching() {
    const section = $('#continueWatching');
    const row = $('#continueRow');
    if (!section || !row) return;
    const progress = getProgress();
    const list = lessons();
    const entries = Object.entries(getResumeMap())
      .map(([id, entry]) => ({ lesson: list.find(l => l.id === id), entry }))
      .filter(item => item.lesson && hasPlayableSource(item.lesson) && !progress.completed[item.lesson.id])
      .sort((a, b) => (Number(b.entry.t) || 0) - (Number(a.entry.t) || 0))
      .slice(0, 4);
    if (!entries.length) {
      section.hidden = true;
      row.innerHTML = '';
      const count = $('#continueCount');
      if (count) count.textContent = '';
      return;
    }
    section.hidden = false;
    const count = $('#continueCount');
    if (count) count.textContent = `${entries.length} lesson${entries.length === 1 ? '' : 's'}`;
    row.innerHTML = entries.map(item => railCardHTML(item.lesson, progress, 'continue')).join('');
  }

  function renderSavedVideos() {
    const section = $('#savedVideos');
    const row = $('#savedRow');
    if (!section || !row) return;
    const progress = getProgress();
    const list = lessons();
    const entries = Object.entries(progress.bookmarks)
      .map(([id, at]) => ({ lesson: list.find(l => l.id === id), at }))
      .filter(item => item.lesson)
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 4);
    if (!entries.length) {
      section.hidden = true;
      row.innerHTML = '';
      const count = $('#savedCount');
      if (count) count.textContent = '';
      return;
    }
    section.hidden = false;
    const count = $('#savedCount');
    if (count) count.textContent = `${entries.length} lesson${entries.length === 1 ? '' : 's'}`;
    row.innerHTML = entries.map(item => railCardHTML(item.lesson, progress, 'saved')).join('');
  }

  function renderQuickCheck() {
    const nodes = $$('.quick-check-best');
    if (!nodes.length) return;
    const progress = getProgress();
    const text = progress.quizBest
      ? `Your best: ${progress.quizBest}% · ${progress.quizAttempts} attempt${progress.quizAttempts === 1 ? '' : 's'}`
      : 'No attempt yet.';
    nodes.forEach(node => { node.textContent = text; });
  }

  function renderProgressPreview() {
    const box = $('#progressPreview');
    if (!box) return;
    const list = lessons();
    const progress = getProgress();
    const videoLessons = list.filter(hasPlayableSource);
    const readLessons = list.filter(lesson => !hasPlayableSource(lesson));
    const videosWatched = videoLessons.filter(l => progress.watched[l.id] || progress.completed[l.id]).length;
    const readCompleted = readLessons.filter(l => progress.completed[l.id]).length;
    const completed = list.filter(l => progress.completed[l.id]).length;
    const saved = Object.keys(progress.bookmarks).length;
    const badges = earnedBadges().filter(badge => badge.earned).slice(0, 3);
    const hasProgress = completed > 0 || videosWatched > 0 || saved > 0 || progress.quizAttempts > 0 || !!progress.pledge;
    if (!hasProgress || !list.length) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    const percent = Math.round((completed / list.length) * 100);
    const upNext = nextLesson();
    const upLabel = upNext ? (hasPlayableSource(upNext) ? 'Continue' : 'Read next') : '';
    box.hidden = false;
    box.innerHTML = `<div class="progress-strip-copy">
        <strong>Your progress</strong>
        <small>${videosWatched} of ${videoLessons.length} videos · ${readCompleted} of ${readLessons.length} read · best quiz ${progress.quizBest}%${saved ? ` · ${saved} saved` : ''}</small>
        <div class="progress-bar" aria-hidden="true"><i style="width:${percent}%"></i></div>
      </div>
      <div class="progress-badges">${badges.map(badge => `<span class="progress-badge is-earned">${iconHTML(ICON_NAMES.has(badge.icon) ? badge.icon : 'award', '')}${escapeHTML(badge.label)}</span>`).join('')}</div>
      <div class="progress-actions">
        ${upNext ? `<button class="btn btn-primary" type="button" data-watch="${escapeHTML(upNext.id)}">${iconHTML(hasPlayableSource(upNext) ? 'circle-play' : 'book-open', 'btn-ico')}${upLabel}: ${escapeHTML(upNext.title)}</button>` : ''}
        <button class="btn btn-secondary" type="button" data-open-progress>My progress</button>
      </div>`;
  }

  function refreshAfterProgressChange() {
    renderLessons();
    renderContinueWatching();
    renderSavedVideos();
    renderProgressPreview();
    renderQuickCheck();
  }

  function openCertificate() {
    const progress = getProgress();
    const s = settings();
    const ready = certificateReady();
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const body = ready
      ? `<div class="certificate-card" id="certCard"><span class="cert-eyebrow">${escapeHTML(s.schoolName || 'Leonor M. Bautista National High School')}</span><h2>Certificate of Completion</h2><p>This certifies that</p><div class="cert-name" id="certNameLabel">________________</div><p>completed the <strong>${escapeHTML(s.systemName || 'e B-SAFE')}</strong> bullying awareness lessons and passed the awareness quiz with a best score of <strong>${progress.quizBest}%</strong>.</p><p>${escapeHTML((schoolInfo().study || {}).projectTitle || 'e B-SAFE — Electronic Bullying Safety and Awareness System')}</p><div class="cert-meta"><span class="cert-sign">Class adviser / Guidance Office</span><span>${escapeHTML(today)}</span></div></div><div class="form-field" style="margin-top:16px"><label for="certNameInput">Name for the printed certificate (used only for printing — never saved)</label><input id="certNameInput" maxlength="60" placeholder="Type your full name"></div><div class="pane-actions"><button class="btn btn-primary" type="button" data-cert-print>Print certificate</button><button class="btn btn-secondary" type="button" data-close-modal>Close</button></div><p class="form-hint">The name you type is shown only on the printed sheet in this browser session. It is not stored, and nothing is sent anywhere.</p>`
      : `<p class="modal-lead">The certificate unlocks when you complete every lesson — watch the three videos and read the three text lessons — and score at least 70% on the awareness quiz.</p><div class="study-facts"><div><strong>${Object.keys(progress.completed).length}/${lessons().length}</strong><small>Lessons completed</small></div><div><strong>${progress.quizBest}%</strong><small>Best quiz score (needs 70%)</small></div></div><div class="pane-actions">${(() => { const upNext = nextLesson(); return upNext ? `<button class="btn btn-primary" type="button" data-watch="${escapeHTML(upNext.id)}">${hasPlayableSource(upNext) ? 'Continue' : 'Read next'}: ${escapeHTML(upNext.title)}${iconHTML('arrow-right', 'btn-ico')}</button>` : ''; })()}<button class="btn btn-secondary" type="button" data-action="start-quiz">Take the quiz ${iconHTML('arrow-right', 'btn-ico')}</button><button class="btn btn-secondary" type="button" data-close-modal>Close</button></div>`;
    openModal('Certificate of Completion', body, 'My progress');
  }
  function printCertificate() {
    const card = $('#certCard');
    if (!card) return;
    const nameInput = $('#certNameInput');
    const nameLabel = $('#certNameLabel');
    const typed = nameInput ? nameInput.value.trim() : '';
    if (nameLabel) nameLabel.textContent = typed || '________________';
    printHTML(card.outerHTML);
  }
  function printPledge() {
    const def = pledgeDef();
    const lines = Array.isArray(def.lines) ? def.lines : [];
    const progress = getProgress();
    const ticked = progress.pledge ? progress.pledge.lines : [];
    const nameInput = $('#pledgeName');
    const typed = nameInput ? nameInput.value.trim() : '';
    const s = settings();
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    printHTML(`<div class="certificate-card"><span class="cert-eyebrow">${escapeHTML(s.schoolName || 'Leonor M. Bautista National High School')}</span><h2>${escapeHTML(def.title || 'My Digital Kindness Pledge')}</h2><p>${escapeHTML(def.intro || '')}</p><ul style="text-align:left;max-width:520px;margin:12px auto;font-size:13px;line-height:1.9">${lines.map((line, i) => `<li>${ticked.includes(i) ? '✓' : '○'} ${escapeHTML(line)}</li>`).join('')}</ul><div class="cert-name">${escapeHTML(typed || '________________')}</div><p>${escapeHTML(def.closing || '')}</p><div class="cert-meta"><span>${escapeHTML(today)}</span><span class="cert-sign">Signature</span></div></div>`);
  }

  function openProgress() {
    const progress = getProgress();
    const list = lessons();
    const videoLessons = list.filter(hasPlayableSource);
    const readLessons = list.filter(l => !hasPlayableSource(l));
    const videosWatched = videoLessons.filter(l => progress.watched[l.id] || progress.completed[l.id]).length;
    const readCompleted = readLessons.filter(l => progress.completed[l.id]).length;
    const badges = earnedBadges();
    const rows = list.length ? list.map(l => {
      const playable = hasPlayableSource(l);
      const done = !!progress.completed[l.id];
      const watched = !!progress.watched[l.id];
      const status = done
        ? iconHTML('check', 'inline-ico') + (playable ? ' Completed' : ' Read')
        : playable
          ? (watched ? iconHTML('check', 'inline-ico') + ' Watched' : 'Not watched yet')
          : 'Not read yet';
      return `<div class="admin-list-item"><div><strong>${escapeHTML(l.title)}</strong><small>${status}</small></div><button class="mini-delete" type="button" data-watch="${escapeHTML(l.id)}">${playable ? 'Open' : 'Read'}</button></div>`;
    }).join('') : '<p class="form-hint">No lessons available.</p>';
    const savedIds = Object.keys(progress.bookmarks);
    const savedRows = savedIds.length
      ? savedIds.map(id => list.find(l => l.id === id) || { id, title: id }).map(l => `<div class="admin-list-item"><div><strong>${escapeHTML(l.title)}</strong><small>${iconHTML('star', 'inline-ico')} Saved lesson</small></div><button class="mini-delete" type="button" data-watch="${escapeHTML(l.id)}">${hasPlayableSource(l) ? 'Open' : 'Read'}</button></div>`).join('')
      : '<p class="form-hint">No saved lessons yet. Use the Save button on any lesson card.</p>';
    const upNext = nextLesson();
    const ready = certificateReady();
    openModal('My Learning Progress', `<div class="study-facts"><div><strong>${videosWatched}/${videoLessons.length}</strong><small>Videos watched</small></div><div><strong>${readCompleted}/${readLessons.length}</strong><small>Read lessons</small></div><div><strong>${progress.quizBest}%</strong><small>Best quiz score</small></div><div><strong>${badges.filter(b => b.earned).length}/${badges.length}</strong><small>Badges earned</small></div></div>
      <div class="pane-actions">${upNext ? `<button class="btn btn-primary" type="button" data-watch="${escapeHTML(upNext.id)}">${iconHTML(hasPlayableSource(upNext) ? 'circle-play' : 'book-open', 'btn-ico')}${hasPlayableSource(upNext) ? 'Continue' : 'Read next'}: ${escapeHTML(upNext.title)}</button>` : ''}<button class="btn ${ready ? 'btn-primary' : 'btn-secondary'}" type="button" data-open-certificate>${ready ? iconHTML('award', 'btn-ico') + 'Print my certificate' : iconHTML('award', 'btn-ico') + 'Certificate (locked)'}</button></div>
      <h4 class="admin-subhead">Lessons</h4>${rows}
      <h4 class="admin-subhead">Saved lessons</h4>${savedRows}
      <h4 class="admin-subhead">Badges</h4><div class="badge-row">${badges.map(b => `<span class="badge-pill ${b.earned ? '' : 'badge-locked'}" title="${escapeHTML(b.rule || '')}">${iconHTML(ICON_NAMES.has(b.icon) ? b.icon : 'award', 'badge-ico')} ${escapeHTML(b.label)}</span>`).join('')}</div>
      <p class="form-hint">Progress is stored only in this browser and does not sync to other devices. There are no public rankings. The certificate unlocks after completing every lesson — watching the videos and reading the text lessons — and scoring at least 70% on the quiz.</p>
      <button class="btn btn-secondary" type="button" data-close-modal>Close</button>`, 'My progress');
  }

  // ---------------------------------------------------------------------------
  // Report form (demo only)
  // ---------------------------------------------------------------------------
  function openReportForm() {
    if (apiBaseUrl()) { openLiveReportForm(); return; }
    openModal('Get help / report a concern', `<div class="demo-banner"><span class="demo-banner-icon" aria-hidden="true">${iconHTML('info')}</span><div><strong>Demo only — this form does not send anything</strong><p>Nothing typed here reaches the school or is saved anywhere. If you need help now, talk to a trusted adult or a verified school contact. Do not enter real names or private details.</p></div></div><p class="modal-lead">This demo illustrates the form layout only. It does not send a report to the school. For real help, please talk directly to a trusted adult or verified school contact.</p><div class="alert-box">For the live website, the school must provide a secure reporting channel, authorized recipients, and a clear response procedure.</div><form id="reportDemoForm"><div class="form-field"><label for="reportType">What would you like help with?</label><select id="reportType" required><option value="">Choose a concern type</option><option>Bullying I experienced</option><option>Bullying I witnessed</option><option>Online safety concern</option><option>I need advice</option></select></div><div class="form-field"><label for="reportNote">Practice message (do not enter real names/details)</label><textarea id="reportNote" placeholder="Example: I would like to speak to someone about a concern…" required></textarea></div><button class="btn btn-primary" type="submit">Preview demo submission</button></form><div id="reportDemoStatus" class="success-box hidden" role="status"></div>`, 'Student support');
  }

  // The live form appears only when the school has configured its own backend, so a
  // student never types a real report into a page that cannot deliver it.
  const FALLBACK_CATEGORIES = ['Bullying I experienced', 'Bullying I witnessed', 'Online safety concern', 'Threat or safety risk', 'I need advice'];
  async function openLiveReportForm() {
    const meta = await apiMeta();
    const categories = (meta && Array.isArray(meta.incidentCategories) && meta.incidentCategories.length) ? meta.incidentCategories : FALLBACK_CATEGORIES;
    openModal('Send a confidential report', `<div class="demo-banner is-online"><span class="demo-banner-icon" aria-hidden="true">${iconHTML('shield-check')}</span><div><strong>Sending to the school's confidential inbox</strong><p>Only authorized school staff can read this. You can leave your contact details empty to stay anonymous. If you are in danger right now, talk to a trusted adult immediately.</p></div></div>
      <form id="reportLiveForm">
        <div class="form-field"><label for="liveReportType">What would you like help with? *</label><select id="liveReportType" required><option value="">Choose a concern type</option>${categories.map(category => `<option>${escapeHTML(category)}</option>`).join('')}</select></div>
        <div class="form-field"><label for="liveReportDetails">What happened? *</label><textarea id="liveReportDetails" minlength="20" maxlength="4000" required placeholder="Describe what happened, when, and where. Include names only if it is necessary for the school to act."></textarea><p class="form-hint">At least 20 characters. Please do not include more personal detail than the school needs.</p></div>
        <div class="form-field"><label for="liveReportContact">How can the school reach you? (optional)</label><input id="liveReportContact" maxlength="160" placeholder="Email address or phone number, or leave empty"><p class="form-hint">Leave this empty to stay anonymous. Contact details are visible only to authorized staff.</p></div>
        <label class="consent-field"><input type="checkbox" id="liveReportConsent" required> I understand this report goes to the school's confidential inbox.</label>
        <button class="btn btn-primary" type="submit">Send report</button>
      </form>
      <div id="reportLiveStatus" class="success-box hidden" role="status"></div>`, 'Confidential report');
  }

  async function submitLiveReport(form) {
    const status = $('#reportLiveStatus');
    const button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }
    const result = await apiFetch('/api/v1/incidents', {
      method: 'POST',
      body: {
        category: String($('#liveReportType').value || ''),
        details: String($('#liveReportDetails').value || ''),
        contact: String($('#liveReportContact').value || '') || undefined,
        reporterKind: 'student',
        consent: true
      }
    });
    if (!status) return;
    status.classList.remove('hidden');
    if (result.ok && result.data && result.data.reference) {
      status.className = 'success-box';
      status.innerHTML = `<strong>Report received.</strong> Your reference number is <b>${escapeHTML(result.data.reference)}</b>. Keep it if you want to follow up with the school.`;
      if (button) button.textContent = 'Report sent';
      form.querySelectorAll('input, select, textarea, button').forEach(node => { node.disabled = true; });
      announce('Your report was sent to the school.');
    } else {
      status.className = 'alert-box';
      status.innerHTML = `<strong>Your report was not sent.</strong> ${escapeHTML(result.message || 'Please try again.')} You can still talk to a trusted adult, your adviser, or the Guidance Office.`;
      if (button) { button.disabled = false; button.textContent = 'Try sending again'; }
    }
  }

  // ---------------------------------------------------------------------------
  // Modal interactions (delegated)
  // ---------------------------------------------------------------------------
  function handleSharedClick(event) {
    const target = event.target.closest('button, a');
    if (!target) return false;
    if (target.hasAttribute('data-open-progress')) { openProgress(); return true; }
    if (target.hasAttribute('data-open-certificate')) { openCertificate(); return true; }
    if (target.hasAttribute('data-cert-print')) { printCertificate(); return true; }
    if (target.hasAttribute('data-pledge-print')) { printPledge(); return true; }
    if (target.dataset.openPolicy) { openPolicy(target.dataset.openPolicy); return true; }
    // Shared by the modal delegation and the page delegation so quiz and completion controls
    // behave the same inside a dialog and on the lesson page.
    if (target.dataset.action === 'start-quiz' || target.dataset.action === 'restart-quiz') { startQuiz(); return true; }
    if (target.dataset.completeLesson) {
      const lessonId = target.dataset.completeLesson;
      markCompleted(lessonId);
      paintCompletedButton(lessonId);
      announce('Lesson completed.');
      return true;
    }
    return false;
  }

  modalContent.addEventListener('click', async event => {
    const target = event.target.closest('button, a');
    if (!target) return;
    if (handleSharedClick(event)) return;
    if (target.dataset.watch) { event.preventDefault(); goToLesson(target.dataset.watch); return; }
    if (target.dataset.bookmark !== undefined) {
      const nowSaved = toggleBookmark(target.dataset.bookmark);
      target.setAttribute('aria-pressed', String(nowSaved));
      target.innerHTML = iconHTML('star', 'bm-ico') + (nowSaved ? ' Saved' : ' Save lesson');
      renderLessons();
      renderSavedVideos();
      renderProgressPreview();
      return;
    }
    if (target.id === 'themeToggle') { toggleTheme(); return; }
    if (target.hasAttribute('data-close-modal')) { closeModal(); return; }
    if (target.dataset.closeAndGo) { const id = target.dataset.closeAndGo; closeModal(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (target.dataset.quizAnswer !== undefined) {
      if (quizAnswered) return;
      quizAnswered = true;
      const question = currentQuestions()[quizIndex];
      const selected = Number(target.dataset.quizAnswer);
      if (selected === question.answer) quizScore += 1;
      $$('.quiz-answers button', modalContent).forEach((button, index) => {
        button.disabled = true;
        if (index === question.answer) button.classList.add('correct');
        if (index === selected && selected !== question.answer) button.classList.add('incorrect');
      });
      const feedback = $('#quizFeedback', modalContent);
      feedback.classList.remove('hidden');
      feedback.innerHTML = `<strong>${selected === question.answer ? 'That’s right!' : 'Let’s learn from this.'}</strong> ${escapeHTML(question.explanation || '')}`;
      $('#quizNext', modalContent).classList.remove('hidden');
      $('#quizNext', modalContent).focus();
      return;
    }
    if (target.id === 'quizNext') { quizIndex += 1; quizAnswered = false; renderQuiz(); return; }
  });

  modalContent.addEventListener('submit', async event => {
    event.preventDefault();
    if (event.target.id === 'reportLiveForm') { submitLiveReport(event.target); return; }
    if (event.target.id === 'reportDemoForm') {
      const status = $('#reportDemoStatus');
      status.classList.remove('hidden');
      status.innerHTML = '<strong>Demo preview only — nothing was sent.</strong><br>This prototype does not contact the school or save this message. For a live website, connect a secure reporting service and verify who receives concerns.';
      event.target.querySelector('button[type="submit"]').disabled = true;
      return;
    }
    if (event.target.id === 'evaluationForm') { submitEvaluation(event.target); return; }
    if (event.target.id === 'surveyForm') { submitSurvey(event.target); return; }
  });


  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  let searchAnnounceTimer = 0;
  const siteSearch = $('#siteSearch');
  if (siteSearch) siteSearch.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    const cards = $$('#topicGrid .topic-card');
    let shown = 0;
    cards.forEach(card => {
      const topic = findTopic(card.dataset.topicId);
      const haystack = `${card.innerText} ${(topic && topic.definition) || ''}`.toLowerCase();
      const match = !query || haystack.includes(query);
      card.classList.toggle('hidden', !match);
      if (match) shown += 1;
    });
    const noResults = $('#topicNoResults');
    if (noResults) noResults.classList.toggle('hidden', shown !== 0);
    // Awareness accordion cards (effects / consequences) follow the same search.
    let extraShown = 0;
    $$('#awarenessExtraGrid .extra-block').forEach(block => {
      let blockShown = 0;
      $$('.extra-item', block).forEach(item => {
        const match = !query || item.textContent.toLowerCase().includes(query);
        item.classList.toggle('hidden', !match);
        if (match) blockShown += 1;
      });
      block.classList.toggle('hidden', blockShown === 0);
      extraShown += blockShown;
    });
    lessonQuery = query;
    const lessonsShown = refreshLessonVisibility();
    let handbookShown = 0;
    $$('#handbookGrid .handbook-card').forEach(card => {
      const match = !query || card.innerText.toLowerCase().includes(query);
      card.classList.toggle('hidden', !match);
      if (match) handbookShown += 1;
    });
    clearTimeout(searchAnnounceTimer);
    searchAnnounceTimer = setTimeout(() => {
      if (!query) { announce('Search cleared. Showing all content.'); return; }
      announce(`${shown} topic${shown === 1 ? '' : 's'}, ${lessonsShown} lesson${lessonsShown === 1 ? '' : 's'}, ${extraShown} awareness card${extraShown === 1 ? '' : 's'}, and ${handbookShown} handbook page${handbookShown === 1 ? '' : 's'} match “${query}”.`);
    }, 600);
  });

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  // Sliding pill: one indicator element inside the nav that moves to the active link
  // (as the section spy updates it), to the hovered link, and to the focused link.
  // It measures the real boxes, so it also works in the stacked mobile drawer.
  let updateNavPill = () => {};
  function initNavPill() {
    const nav = $('#mainNav');
    const pill = nav && $('.nav-pill', nav);
    if (!nav || !pill) return;
    const links = $$('.nav-link', nav);
    if (!links.length) return;
    const canHover = () => !window.matchMedia || window.matchMedia('(hover: hover)').matches;
    const activeLink = () => links.find(link => link.classList.contains('active')) || links[0];
    const place = (target, instant) => {
      const link = target || activeLink();
      if (!link || getComputedStyle(nav).display === 'none') { pill.style.opacity = '0'; return; }
      const box = link.getBoundingClientRect();
      if (!box.width) { pill.style.opacity = '0'; return; }
      const navBox = nav.getBoundingClientRect();
      const styles = getComputedStyle(nav);
      const insetLeft = (parseFloat(styles.borderLeftWidth) || 0);
      const insetTop = (parseFloat(styles.borderTopWidth) || 0);
      if (instant) pill.style.transition = 'none';
      pill.style.width = `${Math.round(box.width)}px`;
      pill.style.height = `${Math.round(box.height)}px`;
      pill.style.transform = `translate(${Math.round(box.left - navBox.left - insetLeft)}px, ${Math.round(box.top - navBox.top - insetTop)}px)`;
      pill.style.opacity = '1';
      if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
    };
    updateNavPill = (instant = false) => {
      // While a pointer rests on a link, the pill stays under that link.
      const hovered = canHover() && nav.matches(':hover') ? $('.nav-link:hover', nav) : null;
      place(hovered || null, instant);
    };
    nav.classList.add('nav-has-pill');
    place(null, true);
    // The section spy and the click handler toggle .active on the links.
    const spy = new MutationObserver(() => updateNavPill());
    links.forEach(link => spy.observe(link, { attributes: true, attributeFilter: ['class'] }));
    links.forEach(link => {
      link.addEventListener('mouseenter', () => { if (canHover()) place(link); });
      link.addEventListener('focus', () => place(link));
    });
    nav.addEventListener('mouseleave', () => place());
    window.addEventListener('resize', () => updateNavPill(true), { passive: true });
    if (window.ResizeObserver) { new ResizeObserver(() => updateNavPill(true)).observe(nav); }
    nav.addEventListener('scroll', () => updateNavPill(true), { passive: true });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') updateNavPill(true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => updateNavPill(true)).catch(() => {});
    window.addEventListener('load', () => updateNavPill(true), { once: true });
  }
  // Mobile navigation drawer: the panel dims and locks the page behind it, closes with
  // Escape or a backdrop click, moves focus into the drawer, and restores it on close.
  const menuToggle = $('#menuToggle');
  if (menuToggle) {
    const nav = $('#mainNav');
    const navBackdrop = $('#navBackdrop');
    const wideNavigation = window.matchMedia('(min-width: 1024px)');
    const drawerOpen = () => nav.classList.contains('open');
    const setDrawer = open => {
      nav.classList.toggle('open', open);
      document.body.classList.toggle('nav-open', open);
      updateVideoPreview();
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (navBackdrop) {
        if (open) {
          navBackdrop.hidden = false;
          requestAnimationFrame(() => navBackdrop.classList.add('is-open'));
        } else {
          navBackdrop.classList.remove('is-open');
          setTimeout(() => { if (!drawerOpen()) navBackdrop.hidden = true; }, 280);
        }
      }
      // The pill re-measures in the open drawer: once now and once after the panel settles.
      requestAnimationFrame(() => updateNavPill(true));
      setTimeout(() => updateNavPill(true), 260);
      if (open) {
        const first = $('.nav-link', nav);
        if (first) first.focus({ preventScroll: true });
      } else if (!wideNavigation.matches && nav.contains(document.activeElement)) {
        menuToggle.focus({ preventScroll: true });
      }
    };
    menuToggle.addEventListener('click', () => setDrawer(!drawerOpen()));
    if (navBackdrop) navBackdrop.addEventListener('click', () => setDrawer(false));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drawerOpen()) { event.preventDefault(); setDrawer(false); }
    });
    wideNavigation.addEventListener?.('change', event => {
      if (event.matches && drawerOpen()) setDrawer(false);
    });
    $$('.nav-link').forEach(link => link.addEventListener('click', () => {
      $$('.nav-link').forEach(a => {
        const active = a.hash === link.hash;
        a.classList.toggle('active', active);
        if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      setDrawer(false);
    }));
  }
  document.addEventListener('click', event => {
    if (modal.contains(event.target)) return; // inside the dialog: handled by the modal delegation
    if (handleSharedClick(event)) return;
    const themeButton = event.target.closest('#themeToggle');
    if (themeButton) { toggleTheme(); return; }
    const bookmark = event.target.closest('[data-bookmark]');
    if (bookmark) {
      const nowSaved = toggleBookmark(bookmark.dataset.bookmark);
      bookmark.setAttribute('aria-pressed', String(nowSaved));
      if (bookmark.closest('#videoPageBody')) bookmark.innerHTML = iconHTML('star', 'bm-ico') + (nowSaved ? ' Saved' : ' Save lesson');
      renderLessons();
      renderSavedVideos();
      renderProgressPreview();
      return;
    }
    const chip = event.target.closest('[data-lesson-filter]');
    if (chip) {
      lessonFilter = chip.dataset.lessonFilter || 'all';
      $$('[data-lesson-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lessonFilter === lessonFilter)));
      const shown = renderLessonShelves();
      announce(lessonFilter === 'all' ? `Showing all ${lessons().length} lessons.` : `Showing ${shown} lesson${shown === 1 ? '' : 's'} in ${lessonFilter}.`);
      return;
    }
    const reveal = event.target.closest('[data-reveal-myth]');
    if (reveal) { handleMythClick(event); return; }
    const watch = event.target.closest('[data-watch]');
    if (watch) { event.preventDefault(); goToLesson(watch.dataset.watch); return; }
    const topic = event.target.closest('[data-topic]');
    const topicGrid = $('#topicGrid');
    if (topic && topicGrid && !topicGrid.contains(topic)) { event.preventDefault(); topicModal(topic.dataset.topic); }
  });
  const pledgeCard = $('#pledgeCard');
  if (pledgeCard) pledgeCard.addEventListener('change', handlePledgeChange);
  const scenarioPanel = $('#scenarioPanel');
  if (scenarioPanel) scenarioPanel.addEventListener('click', handleScenarioClick);
  const dismissAnnouncement = $('#dismissAnnouncement');
  if (dismissAnnouncement) dismissAnnouncement.addEventListener('click', () => $('.announcement-bar')?.remove());
  const currentYear = $('#currentYear');
  if (currentYear) currentYear.textContent = new Date().getFullYear();

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function initPageChrome() {
    const bar = $('#readingProgress span');
    const toTop = $('#backToTop');
    let lastY = window.scrollY;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(doc.scrollHeight - window.innerHeight, 1);
      const percent = Math.min(100, Math.round((window.scrollY / max) * 100));
      if (bar) bar.style.width = percent + '%';
      if (toTop) {
        // The floating button stays out of the way while the page is scrolling down
        // (it used to sit on top of the last awareness cards) and comes back as soon
        // as the reader scrolls up.
        const y = window.scrollY;
        const goingDown = y > lastY + 6;
        const goingUp = y < lastY - 6;
        if (goingDown || goingUp) lastY = y;
        const visible = y >= 600;
        toTop.hidden = !visible;
        toTop.classList.toggle('is-tucked', visible && goingDown);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    if (toTop) toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      const skip = $('.skip-link');
      if (skip) skip.focus({ preventScroll: true });
    });
  }
  function initNavSpy() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.nav-link');
    const sections = links.map(link => { try { return document.querySelector(link.getAttribute('href')); } catch { return null; } }).filter(Boolean);
    if (!sections.length) return;
    const setActive = id => {
      links.forEach(link => {
        const active = link.getAttribute('href') === '#' + id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      });
    };
    try {
      const io = new IntersectionObserver(entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((x, y) => y.intersectionRatio - x.intersectionRatio)[0];
        if (visible && visible.target.id) setActive(visible.target.id);
      }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.6] });
      sections.forEach(section => io.observe(section));
    } catch { /* ignore */ }
  }

  function renderAll() {
    applySettings();
    renderTopics();
    renderLessons();
    renderScenario();
    renderAnnouncements();
    renderHandbookCards();
    renderStudy();
    renderReporting();
    renderMyths();
    renderPledge();
    renderFaq();
    renderAwarenessExtra();
    renderTip();
    renderContinueWatching();
    renderSavedVideos();
    renderQuickCheck();
    renderProgressPreview();
  }

  (async function init() {
    await loadContent();
    if (isVideoPage) {
      // The lesson page only needs branding, theme, and the requested lesson.
      applySettings();
      initTheme();
      initPageChrome();
      const requested = new URLSearchParams(window.location.search).get('lesson');
      renderVideoPage(requested);
      return;
    }
    renderAll();
    const viewAllAnnouncements = $('#viewAllAnnouncements');
    if (viewAllAnnouncements) viewAllAnnouncements.addEventListener('click', openAllAnnouncements);
    const progressButton = $('#openProgress');
    if (progressButton) progressButton.addEventListener('click', openProgress);
    const surveyButton = $('#openSurvey');
    if (surveyButton) surveyButton.addEventListener('click', openSurvey);
    const evaluationButton = $('#openEvaluation');
    if (evaluationButton) evaluationButton.addEventListener('click', openEvaluation);
    const navHelp = $('#navGetHelp');
    if (navHelp) navHelp.addEventListener('click', () => {
      const reporting = document.querySelector('#reporting');
      if (reporting) reporting.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      openReportForm();
    });
    const featuredQuizButton = $('#featuredQuiz'); // was a dead button: the featured card's quiz CTA had no listener
    if (featuredQuizButton) featuredQuizButton.addEventListener('click', startQuiz);
    initTheme();
    initPageChrome();
    initNavSpy();
    initNavPill();
  })();
})();
