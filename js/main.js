// ============================================================
// main.js — shared behavior for every Awalim page
// ============================================================

// Language toggle (AR <-> EN): flips html[data-lang], [lang], [dir]
const html = document.documentElement;
const langToggle = document.getElementById('langToggle');
if (langToggle) {
  langToggle.addEventListener('click', () => {
    const toEn = html.dataset.lang === 'ar';
    html.dataset.lang = toEn ? 'en' : 'ar';
    html.lang = toEn ? 'en' : 'ar';
    html.dir = toEn ? 'ltr' : 'rtl';
  });
}

// Count-up animation for .stat-num elements, triggered once on scroll into view
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nums = document.querySelectorAll('.stat-num');
function animateCount(el) {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  if (reduceMotion) {
    el.textContent = target.toLocaleString('en-US') + suffix;
    return;
  }
  const duration = 1500;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(eased * target).toLocaleString('en-US') + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString('en-US') + suffix;
  }
  requestAnimationFrame(tick);
}
if (nums.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  nums.forEach((n) => io.observe(n));
}

// Mobile nav: burger toggles the nav-links list as a full-width overlay
const burger = document.querySelector('.nav-burger');
const links = document.querySelector('.nav-links');
if (burger && links) {
  burger.addEventListener('click', () => {
    const open = links.style.display === 'flex';
    links.style.display = open ? 'none' : 'flex';
    links.style.cssText += open
      ? ''
      : 'position:fixed;inset-inline:0;top:64px;height:calc(100vh - 64px);overflow-y:auto;background:#FBF7EE;flex-direction:column;align-items:stretch;padding:1.5rem;gap:1.2rem;box-shadow:0 12px 24px -12px rgba(0,0,0,.15);z-index:60;';
  });
}

// Hierarchy mega-menus: each .nav-trigger toggles its matching #menu-<key> panel
const triggers = document.querySelectorAll('.nav-trigger');
function closeAllMenus(except) {
  triggers.forEach((btn) => {
    if (btn === except) return;
    btn.setAttribute('aria-expanded', 'false');
    const panel = document.getElementById('menu-' + btn.dataset.menu);
    if (panel) panel.hidden = true;
  });
}
triggers.forEach((btn) => {
  const panel = document.getElementById('menu-' + btn.dataset.menu);
  if (!panel) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    closeAllMenus(btn);
    btn.setAttribute('aria-expanded', String(!isOpen));
    panel.hidden = isOpen;
  });
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-item')) closeAllMenus(null);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllMenus(null);
});
