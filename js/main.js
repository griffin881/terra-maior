/* Terra Maior v3 — editorial interaction script.
   Scope:
   - Reading progress bar at the top of viewport
   - Fade-up on scroll for section headers and content blocks
   - Side-rail + mobile nav active-section highlighting
   - Mobile nav open/close with scroll lock
   - Smooth scroll for internal anchors
   - Plate VI accessible marker toggles (click + keyboard)
   ------------------------------------------------------------ */
(function () {
  'use strict';

  /* ---------- Reading progress bar ---------- */
  const progressBar = document.getElementById('read-progress-bar');
  function updateProgress() {
    if (!progressBar) return;
    const doc = document.documentElement;
    const scrolled = window.scrollY || doc.scrollTop;
    const height = (doc.scrollHeight - doc.clientHeight) || 1;
    const pct = Math.max(0, Math.min(1, scrolled / height));
    progressBar.style.transform = 'scaleX(' + pct + ')';
  }
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  /* ---------- Fade-up on scroll ---------- */
  // Auto-tag likely candidates so author doesn't have to annotate manually.
  const fadeCandidateSel = [
    '.part-header', '.subsection', '.prefatory', '.colophon',
    'figure.plate', '.model-plate', '.triptych', '.proof-card',
    '.marg-item', '.bull-prop', '.falsif-card', '.premise',
    '.wound', '.wound-proof', '.conclusio', '.syllogism-final',
    '.broadsheet-col', '.atlas-card', '.lab-entry'
  ].join(',');
  const fadeTargets = document.querySelectorAll(fadeCandidateSel);
  fadeTargets.forEach((el) => el.classList.add('fade-up'));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    fadeTargets.forEach((el) => el.classList.add('in'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    fadeTargets.forEach((el) => io.observe(el));
  } else {
    fadeTargets.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Side-rail + mobile nav active highlight ---------- */
  const sideNav = document.getElementById('side-rail') || document.getElementById('side-nav');
  const mobileNav = document.getElementById('mobile-nav');
  const navScopes = [sideNav, mobileNav].filter(Boolean);
  const navLinks = [];
  navScopes.forEach(scope => {
    scope.querySelectorAll('a[href^="#"]').forEach(a => navLinks.push(a));
  });
  const trackedSections = Array.from(document.querySelectorAll(
    'main > section[id], main .part[id], #cover, #prefatory, #bibliography'
  )).filter(Boolean);

  function setActive(id) {
    navLinks.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  }

  if (trackedSections.length && navLinks.length && 'IntersectionObserver' in window) {
    const partIo = new IntersectionObserver((entries) => {
      let best = null;
      entries.forEach((e) => {
        if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) {
          best = e;
        }
      });
      if (best && best.target.id) setActive(best.target.id);
    }, { threshold: [0.15, 0.35, 0.6], rootMargin: '-15% 0px -55% 0px' });
    trackedSections.forEach((p) => { if (p.id) partIo.observe(p); });
  }

  /* ---------- Mobile nav toggle ---------- */
  const mobToggle = document.getElementById('mobile-nav-toggle');
  function closeMobile() {
    if (!mobileNav || !mobToggle) return;
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    mobToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function openMobile() {
    if (!mobileNav || !mobToggle) return;
    mobileNav.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    mobToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  if (mobToggle && mobileNav) {
    mobToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.contains('open');
      if (isOpen) closeMobile(); else openMobile();
    });
    mobileNav.addEventListener('click', (ev) => {
      if (ev.target.closest('a[href^="#"]')) closeMobile();
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && mobileNav.classList.contains('open')) closeMobile();
    });
  }

  /* ---------- Smooth scroll for in-page anchors ---------- */
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    ev.preventDefault();
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
  });
})();

/* ============================================================
   Plate VI — accessible click-toggle for annotation markers
   ============================================================ */
(function () {
  const markers = document.querySelectorAll('.plate6-marker');
  if (!markers.length) return;

  function closeAll(except) {
    markers.forEach(m => {
      if (m !== except) m.setAttribute('aria-expanded', 'false');
    });
  }

  markers.forEach(marker => {
    marker.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const open = marker.getAttribute('aria-expanded') === 'true';
      closeAll(marker);
      marker.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    marker.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        marker.click();
      } else if (ev.key === 'Escape') {
        marker.setAttribute('aria-expanded', 'false');
        marker.blur();
      }
    });
  });

  // Dismiss any open annotation when clicking outside the plate
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('.plate6-image-holder')) closeAll(null);
  });
})();
