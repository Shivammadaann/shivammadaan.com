// script.js - dark-only site: small niceties (scroll reveal + smooth scrolling + keyboard shortcuts)
(function () {
  // Smooth in-page link scrolling
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Reveal sections when they enter viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // optionally unobserve to avoid repeated triggers
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // Hero text subtle parallax on pointer move (small, tasteful)
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      hero.style.transform = `translate3d(${px * 6}px, ${py * 4}px, 0)`;
      hero.style.transition = 'transform 220ms ease';
    });
    hero.addEventListener('pointerleave', () => {
      hero.style.transform = '';
    });
  }

  // Keyboard shortcut: "L" jumps to releases
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'l' && !(e.ctrlKey || e.metaKey || e.altKey)) {
      const releases = document.getElementById('releases');
      if (releases) releases.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // small loaded animation for hero image (preload)
  window.addEventListener('load', () => {
    document.querySelectorAll('.animate-up').forEach((el, i) => {
      // stagger re-run on load to ensure they show
      el.style.animationDelay = (parseInt(getComputedStyle(el).getPropertyValue('--delay')) || (i*80)) + 'ms';
    });
  });
})();
