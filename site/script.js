(() => {
  'use strict';

  const header = document.getElementById('site-header');
  const navToggle = document.getElementById('nav-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const yearEl = document.getElementById('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* header background once scrolled */
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* mobile nav overlay */
  const closeMobileNav = () => {
    mobileNav.hidden = true;
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  const openMobileNav = () => {
    mobileNav.hidden = false;
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMobileNav() : openMobileNav();
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileNav);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !mobileNav.hidden) closeMobileNav();
  });

  /* stagger index custom property */
  document.querySelectorAll('.reveal-stagger').forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty('--i', i);
    });
  });

  /* scroll reveals */
  const revealTargets = document.querySelectorAll('.reveal, .reveal-stagger');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    revealTargets.forEach((el) => io.observe(el));
  }

  /* hero title line reveal on load */
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    if (reduceMotion) {
      heroTitle.classList.add('is-visible');
    } else {
      requestAnimationFrame(() => {
        setTimeout(() => heroTitle.classList.add('is-visible'), 120);
      });
    }
  }
})();
