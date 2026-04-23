/* Terra Maior — minimal interaction script.
   Scope:
   - Fade-in on scroll for section headers and subsections
   - Draw horizontal rules when section enters viewport
   - Highlight active part in the side navigation
   - Smooth scroll for internal links
*/
(function () {
  'use strict';

  // IntersectionObserver fade-in
  const fadeTargets = document.querySelectorAll(
    '.part-header, .subsection, .prefatory, .toc-section, .biblio, .colophon, figure.plate, .model-plate, .triptych'
  );
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  fadeTargets.forEach((el) => io.observe(el));

  // Side nav active-part highlight
  const nav = document.getElementById('side-nav');
  const parts = Array.from(document.querySelectorAll('main > section, main .part'));
  const navLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];

  function setActive(id) {
    navLinks.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  }

  if (parts.length && navLinks.length) {
    const partIo = new IntersectionObserver((entries) => {
      // pick the entry with greatest intersection ratio
      let best = null;
      entries.forEach((e) => {
        if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) {
          best = e;
        }
      });
      if (best && best.target.id) setActive(best.target.id);
    }, { threshold: [0.18, 0.5], rootMargin: '-20% 0px -60% 0px' });
    parts.forEach((p) => { if (p.id) partIo.observe(p); });
  }

  // Smooth scroll for any in-page anchor
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    ev.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
