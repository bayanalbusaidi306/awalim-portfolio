// ============================================================
// main.js — core behavior for the one-page site
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

// Scroll progress bar
const progressBar = document.querySelector('.scroll-progress');
function updateProgress() {
  if (!progressBar) return;
  const h = document.documentElement;
  const scrolled = h.scrollTop;
  const height = h.scrollHeight - h.clientHeight;
  const pct = height > 0 ? (scrolled / height) * 100 : 0;
  progressBar.style.width = pct + '%';
}
document.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

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
  const statsIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statsIo.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  nums.forEach((n) => statsIo.observe(n));
}

// Scroll-reveal: fade + rise elements into view as the visitor scrolls, replaying both ways
const revealTargets = document.querySelectorAll('.reveal, .reveal-stagger');
if (revealTargets.length) {
  // Small negative bottom margin: the element must actually be on screen (past the
  // viewport edge by a bit) before it triggers, so the motion is visible as it
  // happens instead of finishing off-screen. sweepReveal (below) is the safety net
  // for fast flicks/jump-scrolls, so this margin doesn't need to do that job too.
  const revealIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('in', entry.isIntersecting);
    });
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  revealTargets.forEach((t) => revealIo.observe(t));

  // Safety net: whatever the scroll pattern was (a fast flick, an End-key jump, a
  // scrollbar-track click), nothing already scrolled past — or currently on
  // screen — should stay invisible. Things still further down the page are left
  // alone so the progressive reveal-as-you-scroll effect still plays normally.
  function sweepReveal() {
    const vh = window.innerHeight;
    revealTargets.forEach((t) => {
      if (t.classList.contains('in')) return;
      const r = t.getBoundingClientRect();
      if (r.bottom <= 0 || r.top < vh) t.classList.add('in');
    });
  }
  let sweepTimer = null;
  document.addEventListener('scroll', () => {
    if (sweepTimer) return;
    sweepTimer = setTimeout(() => { sweepReveal(); sweepTimer = null; }, 150);
  }, { passive: true });
  window.addEventListener('load', sweepReveal);
}

// Org-structure "Projects" curtain: center it on the page rather than on its own
// tab, since the tab itself sits slightly off page-center.
const centerCurtain = document.querySelector('#org-structure .tab-reveal.dir-up');
if (centerCurtain) {
  const centerTab = centerCurtain.closest('.phil-tab');
  const wrap = centerTab.closest('.wrap');
  function updateCenterOffset() {
    const wrapRect = wrap.getBoundingClientRect();
    const tabRect = centerTab.getBoundingClientRect();
    const pageCenterX = wrapRect.left + wrapRect.width / 2;
    const tabCenterX = tabRect.left + tabRect.width / 2;
    centerCurtain.style.setProperty('--center-offset', (pageCenterX - tabCenterX) + 'px');
  }
  centerTab.addEventListener('mouseenter', updateCenterOffset);
  window.addEventListener('resize', updateCenterOffset);
  updateCenterOffset();
}
