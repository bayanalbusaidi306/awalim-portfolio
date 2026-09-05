// ============================================================
// editor.js — local content editor (gear icon, top-start)
// IMPORTANT: this edits content only inside the visitor's own
// browser (saved to localStorage). It does NOT change the live
// deployed site for other visitors. Use "تصدير HTML" to download
// an updated index.html with your edits baked in, then re-upload
// that file to GitHub the same way as any other update.
//
// Storage model (localStorage key AWALIM_STORAGE_KEY):
//   singleEdits : { dataKey: innerHTML }              — one-off fields (hero title, mission text...)
//   cardEdits   : { itemKey: innerHTML }               — edited repeatable cards (people/name/tag/book)
//   addedCards  : { containerId: [{key, html}, ...] }  — brand-new cards added via "+"
//   removedKeys : [itemKey, ...]                       — original cards the user deleted
// ============================================================

(function () {
  const STORAGE_KEY = 'awalim_site_edits_v2';

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        singleEdits: raw.singleEdits || {},
        cardEdits: raw.cardEdits || {},
        addedCards: raw.addedCards || {},
        addedSections: raw.addedSections || [],
        removedKeys: raw.removedKeys || [],
      };
    } catch (e) {
      return { singleEdits: {}, cardEdits: {}, addedCards: {}, addedSections: [], removedKeys: [] };
    }
  }
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      alert('تعذّر الحفظ محليًا — المساحة المتاحة بالمتصفح ممتلئة (الصور الكبيرة تستهلكها بسرعة).');
    }
  }

  let state = loadState();

  // ---------- Font size control (independent of edit mode) ----------
  const FONT_KEY = 'awalim_font_size';
  const sizeBtns = document.querySelectorAll('.font-size-control button');
  function applyFontSize(size) {
    document.documentElement.classList.remove('font-md', 'font-lg');
    if (size === 'md') document.documentElement.classList.add('font-md');
    if (size === 'lg') document.documentElement.classList.add('font-lg');
    sizeBtns.forEach((b) => b.classList.toggle('active', b.dataset.size === size));
  }
  applyFontSize(localStorage.getItem(FONT_KEY) || 'sm');
  sizeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyFontSize(btn.dataset.size);
      localStorage.setItem(FONT_KEY, btn.dataset.size);
    });
  });

  // ---------- Apply saved state on load ----------
  function applyAll() {
    // 1) remove originals the user deleted
    state.removedKeys.forEach((key) => {
      const el = document.querySelector('[data-item-key="' + CSS.escape(key) + '"]');
      if (el) el.remove();
    });
    // 2) one-off field overrides
    Object.keys(state.singleEdits).forEach((key) => {
      const el = document.querySelector('[data-key="' + CSS.escape(key) + '"]');
      if (!el) return;
      const val = state.singleEdits[key];
      if (el.dataset.editable === 'image') {
        if (el.tagName === 'IMG') el.src = val;
        else { el.style.backgroundImage = 'url(' + val + ')'; el.classList.add('has-image'); }
      } else {
        el.innerHTML = val;
      }
    });
    // 3) edited existing cards (full innerHTML swap)
    Object.keys(state.cardEdits).forEach((key) => {
      const el = document.querySelector('[data-item-key="' + CSS.escape(key) + '"]');
      if (el) el.innerHTML = state.cardEdits[key];
    });
    // 4) newly added sections (inserted just before the footer) — must happen before step 5,
    //    so that cards belonging to a brand-new section's own containers have somewhere to land
    const footer = document.querySelector('footer.footer-cta');
    state.addedSections.forEach((item) => {
      if (document.querySelector('[data-item-key="' + CSS.escape(item.key) + '"]')) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = item.html;
      const node = wrap.firstElementChild;
      if (node && footer) footer.parentNode.insertBefore(node, footer);
    });
    // 5) newly added cards
    Object.keys(state.addedCards).forEach((containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      state.addedCards[containerId].forEach((item) => {
        if (container.querySelector('[data-item-key="' + CSS.escape(item.key) + '"]')) return;
        const wrap = document.createElement('div');
        wrap.innerHTML = item.html;
        const node = wrap.firstElementChild;
        if (node) container.appendChild(node);
      });
    });
  }
  applyAll();

  // ---------- Settings panel open/close ----------
  const gear = document.getElementById('settingsToggle');
  const panel = document.getElementById('editorPanel');
  const backdrop = document.getElementById('editorBackdrop');
  const editSwitch = document.getElementById('editModeSwitch');
  const exportBtn = document.getElementById('exportHtmlBtn');
  const clearBtn = document.getElementById('clearEditsBtn');
  const fileInput = document.getElementById('editorFileInput');
  let activeImageTarget = null;

  function openPanel() { panel.classList.add('open'); backdrop.classList.add('open'); gear.classList.add('spin'); }
  function closePanel() { panel.classList.remove('open'); backdrop.classList.remove('open'); gear.classList.remove('spin'); }
  if (gear) gear.addEventListener('click', () => { panel.classList.contains('open') ? closePanel() : openPanel(); });
  if (backdrop) backdrop.addEventListener('click', closePanel);

  // ---------- Edit mode ----------
  function setEditMode(on) {
    document.body.classList.toggle('edit-mode', on);
    editSwitch.classList.toggle('on', on);
    // singular fields
    document.querySelectorAll('[data-editable="text"]').forEach((el) => { el.contentEditable = on ? 'true' : 'false'; });
    // inside repeatable cards: make the innermost bilingual spans editable first...
    document.querySelectorAll('[data-item-key] .t-ar, [data-item-key] .t-en').forEach((el) => {
      el.contentEditable = on ? 'true' : 'false';
    });
    // ...then any OTHER text line that has no bilingual children of its own (avoid nested contentEditable)
    document.querySelectorAll('[data-item-key] h3, [data-item-key] h4, [data-item-key] h5, [data-item-key] p, [data-item-key] span:not(.dot)').forEach((el) => {
      if (el.classList.contains('t-ar') || el.classList.contains('t-en')) return;
      if (el.querySelector('.t-ar, .t-en')) return;
      if (el.closest('[data-editable="image"]')) return;
      el.contentEditable = on ? 'true' : 'false';
    });
    if (on) injectControls(); else removeControls();
  }
  if (editSwitch) editSwitch.addEventListener('click', () => setEditMode(!document.body.classList.contains('edit-mode')));

  // ---------- Inject +/× controls while in edit mode ----------
  function injectControls() {
    document.querySelectorAll('[data-item-key]').forEach((card) => {
      if (card.querySelector(':scope > .item-remove-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'item-remove-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'حذف');
      if (card.tagName === 'SECTION') {
        btn.innerHTML = '<span class="t-ar">حذف القسم ×</span><span class="t-en">Delete Section ×</span>';
      } else {
        btn.textContent = '×';
      }
      btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); removeCard(card); });
      card.style.position = 'relative';
      card.prepend(btn);
    });
    document.querySelectorAll('[data-add-target]').forEach((container) => {
      if (container.querySelector(':scope > .item-add-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'item-add-btn';
      btn.type = 'button';
      btn.innerHTML = '<span class="t-ar">+ إضافة</span><span class="t-en">+ Add</span>';
      btn.addEventListener('click', (e) => { e.preventDefault(); addCard(container); });
      container.appendChild(btn);
    });
  }
  function removeControls() {
    document.querySelectorAll('.item-remove-btn').forEach((b) => b.remove());
    document.querySelectorAll('.item-add-btn').forEach((b) => b.remove());
  }

  function saveCardEditFor(card) {
    const key = card.dataset.itemKey;
    if (!key) return;
    // clone without the remove button, and strip transient edit-mode attributes
    const clone = card.cloneNode(true);
    const rm = clone.querySelector('.item-remove-btn');
    if (rm) rm.remove();
    clone.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    clone.style.position = '';
    if (key.startsWith('added-')) {
      Object.keys(state.addedCards).forEach((cid) => {
        const arr = state.addedCards[cid];
        const item = arr && arr.find((i) => i.key === key);
        if (item) item.html = clone.outerHTML;
      });
    } else {
      state.cardEdits[key] = clone.innerHTML;
    }
    saveState(state);
  }

  function removeCard(card) {
    const isSection = card.tagName === 'SECTION';
    if (isSection) {
      const ok = confirm('حذف هذا القسم بالكامل؟ يشمل كل محتوياته. يمكن التراجع لاحقًا من "مسح كل التعديلات" فقط.');
      if (!ok) return;
    }
    const key = card.dataset.itemKey;
    const container = card.closest('[data-add-target]');
    if (key && key.startsWith('added-section-')) {
      state.addedSections = state.addedSections.filter((i) => i.key !== key);
    } else if (key && key.startsWith('added-') && container && container.id) {
      const arr = state.addedCards[container.id] || [];
      state.addedCards[container.id] = arr.filter((i) => i.key !== key);
    } else if (key) {
      if (!state.removedKeys.includes(key)) state.removedKeys.push(key);
      delete state.cardEdits[key];
    }
    saveState(state);
    card.remove();
  }

  function addCard(container) {
    const items = container.querySelectorAll(':scope > [data-item-key]');
    const last = items[items.length - 1];
    if (!last) return;
    const clone = last.cloneNode(true);
    const rm = clone.querySelector('.item-remove-btn');
    if (rm) rm.remove();
    const newKey = 'added-' + Date.now();
    clone.dataset.itemKey = newKey;
    clone.style.position = 'relative';
    // reset text fields to a friendly placeholder instead of duplicating content
    clone.querySelectorAll('h3, h4, h5, p, span:not(.dot)').forEach((el) => {
      if (el.querySelector('img')) return;
      if (el.classList.contains('t-ar')) el.textContent = 'نص جديد';
      else if (el.classList.contains('t-en')) el.textContent = 'New text';
      else if (el.querySelector('.t-ar, .t-en')) return; // has its own inner spans, leave structure
      else el.textContent = '...';
    });
    // reset any image slot to the generic placeholder look
    clone.querySelectorAll('[data-editable="image"]').forEach((img) => {
      img.style.backgroundImage = '';
      img.classList.remove('has-image');
      if (img.tagName !== 'IMG') img.textContent = img.closest('.book-cover') ? '📖' : '👤';
    });
    container.insertBefore(clone, container.querySelector('.item-add-btn'));

    if (!container.id) container.id = 'container-' + Date.now();
    if (!state.addedCards[container.id]) state.addedCards[container.id] = [];
    state.addedCards[container.id].push({ key: newKey, html: clone.outerHTML });
    saveState(state);

    // now layer on the transient edit-mode UI (not saved to storage)
    const btn = document.createElement('button');
    btn.className = 'item-remove-btn'; btn.type = 'button'; btn.textContent = '×';
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); removeCard(clone); });
    clone.prepend(btn);
    clone.querySelectorAll('.t-ar, .t-en').forEach((el) => { el.contentEditable = 'true'; });
    clone.querySelectorAll('h3, h4, h5, p, span:not(.dot)').forEach((el) => {
      if (el.classList.contains('t-ar') || el.classList.contains('t-en')) return;
      if (el.querySelector('.t-ar, .t-en')) return;
      if (!el.closest('[data-editable="image"]')) el.contentEditable = 'true';
    });

    const firstField = clone.querySelector('.t-ar[contenteditable="true"], h5[contenteditable="true"], h4[contenteditable="true"], p[contenteditable="true"]');
    if (firstField) firstField.focus();
  }

  // Save on blur: singular fields -> singleEdits ; fields inside a card -> whole-card save
  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el || !el.isContentEditable) return;
    if (el.dataset && el.dataset.editable === 'text') {
      state.singleEdits[el.dataset.key] = el.innerHTML;
      saveState(state);
      return;
    }
    const card = el.closest('[data-item-key]');
    if (card) saveCardEditFor(card);
  });

  // ---------- Image replacement (singular fields + inside cards) ----------
  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('edit-mode')) return;
    const target = e.target.closest('[data-editable="image"]');
    if (!target) return;
    activeImageTarget = target;
    fileInput.click();
  });
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file || !activeImageTarget) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (activeImageTarget.tagName === 'IMG') activeImageTarget.src = dataUrl;
        else { activeImageTarget.style.backgroundImage = 'url(' + dataUrl + ')'; activeImageTarget.classList.add('has-image'); }
        if (activeImageTarget.dataset.editable === 'image' && activeImageTarget.dataset.key) {
          state.singleEdits[activeImageTarget.dataset.key] = dataUrl;
          saveState(state);
        }
        const card = activeImageTarget.closest('[data-item-key]');
        if (card) saveCardEditFor(card);
        fileInput.value = '';
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- Export current HTML (with edits baked in) ----------
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const wasEdit = document.body.classList.contains('edit-mode');
      if (wasEdit) setEditMode(false);
      closePanel();
      const clone = document.documentElement.cloneNode(true);
      const html = '<!DOCTYPE html>\n' + clone.outerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'index.html'; a.click();
      URL.revokeObjectURL(url);
      if (wasEdit) setEditMode(true);
    });
  }

  // ---------- Clear all local edits ----------
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('مسح كل التعديلات المحفوظة بهذا المتصفح؟ لا يمكن التراجع.')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    });
  }

  // ---------- Add a brand-new section (choice of templates) ----------
  const addSectionBtn = document.getElementById('addSectionBtn');
  const sectionTypePicker = document.getElementById('sectionTypePicker');

  const headBlock =
    '<div class="zone-head">' +
      '<span class="eyebrow"><span class="t-ar">عنوان فرعي</span><span class="t-en">Eyebrow</span></span>' +
      '<h2 class="display"><span class="t-ar">عنوان القسم الجديد</span><span class="t-en">New Section Title</span></h2>' +
      '<p><span class="t-ar">وصف مختصر لهذا القسم — اضغطي لتعديله.</span><span class="t-en">A short description of this section — click to edit.</span></p>' +
    '</div>';

  const templates = {
    list: (id) =>
      '<div class="wrap">' + headBlock +
        '<div class="name-grid" data-add-target="name" id="names-' + id + '" style="margin-top:1.4rem;">' +
          '<div class="name-card" data-item-key="starter-' + id + '"><span class="dot"></span><div><h5><span class="t-ar">عنصر جديد</span><span class="t-en">New Item</span></h5></div></div>' +
        '</div>' +
      '</div>',
    image: (id) =>
      '<div class="wrap" style="display:grid; grid-template-columns:1fr 1fr; gap:2rem; align-items:center;">' +
        headBlock.replace('<div class="zone-head">', '<div class="zone-head" style="text-align:start; margin-inline:0;">') +
        '<div class="person-photo" data-editable="image" data-key="img-' + id + '" style="aspect-ratio:4/3; border-radius:var(--radius-md); font-size:2.4rem;">🖼️</div>' +
      '</div>',
    stats: (id) =>
      '<div class="wrap">' + headBlock +
        '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr); margin-top:1.4rem;">' +
          '<div class="stat-card" data-item-key="stat-a-' + id + '"><span class="stat-num" style="color:var(--teal-700);">0</span><span class="stat-label"><span class="t-ar">تسمية</span><span class="t-en">Label</span></span></div>' +
          '<div class="stat-card" data-item-key="stat-b-' + id + '"><span class="stat-num" style="color:var(--sage-600);">0</span><span class="stat-label"><span class="t-ar">تسمية</span><span class="t-en">Label</span></span></div>' +
          '<div class="stat-card" data-item-key="stat-c-' + id + '"><span class="stat-num" style="color:var(--gold-600);">0</span><span class="stat-label"><span class="t-ar">تسمية</span><span class="t-en">Label</span></span></div>' +
        '</div>' +
      '</div>',
  };

  function insertNewSection(type) {
    const id = 'section-' + Date.now();
    const key = 'added-section-' + Date.now();
    const footer = document.querySelector('footer.footer-cta');
    const wrap = document.createElement('div');
    wrap.innerHTML = '<section class="zone" id="' + id + '" data-item-key="' + key + '">' + templates[type](id) + '</section>';
    const node = wrap.firstElementChild;
    if (footer) footer.parentNode.insertBefore(node, footer);

    state.addedSections.push({ key: key, html: node.outerHTML });
    saveState(state);

    injectControls();
    node.querySelectorAll('.t-ar, .t-en').forEach((el) => { el.contentEditable = 'true'; });
    node.querySelectorAll('h2, h3, p, span:not(.dot)').forEach((el) => {
      if (el.classList.contains('t-ar') || el.classList.contains('t-en')) return;
      if (el.querySelector('.t-ar, .t-en')) return;
      if (el.closest('[data-editable="image"]')) return;
      el.contentEditable = 'true';
    });
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    closePanel();
  }

  if (addSectionBtn && sectionTypePicker) {
    addSectionBtn.addEventListener('click', () => {
      sectionTypePicker.hidden = !sectionTypePicker.hidden;
    });
    sectionTypePicker.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        insertNewSection(btn.dataset.type);
        sectionTypePicker.hidden = true;
      });
    });
  }
})();
