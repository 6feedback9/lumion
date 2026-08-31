const burger = document.getElementById('burger');
const drawer = document.getElementById('mobileDrawer');
const overlay = document.getElementById('menuOverlay');
const body = document.body;

if (burger && drawer && overlay) {
  const openMenu = () => {
    drawer.classList.add('is-open');
    overlay.classList.add('is-visible');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    body.classList.add('menu-open');
  };

  const closeMenu = () => {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    body.classList.remove('menu-open');
  };

  burger.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('is-open');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener('click', closeMenu);

  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) {
      closeMenu();
    }
  });
}

// reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// stagger reveal for grouped cards
document.querySelectorAll('.cards .card, .platforms-grid .platform-card, .support-grid .support-card, .approach-grid .approach-item').forEach((el, index) => {
  el.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
});

// counters
const counters = document.querySelectorAll('[data-counter]');

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const el = entry.target;
    const target = Number(el.dataset.counter);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));

    const tick = () => {
      current += step;

      if (current >= target) {
        el.textContent = target + "+";
        return;
      }

      el.textContent = current + "+";
      requestAnimationFrame(tick);
    };

    tick();
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });

counters.forEach(counter => counterObserver.observe(counter));

// form
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');

    if (submitButton) {
      const isEnPage = window.location.pathname.startsWith('/en/');
      submitButton.disabled = true;
      submitButton.textContent = isEnPage ? 'Sending...' : 'Надсилання...';
    }

    if (formSuccess) {
      formSuccess.classList.remove('is-visible');
      formSuccess.textContent = '';
    }

    const formData = {
      name: form.querySelector('#name')?.value.trim() || '',
      phone: form.querySelector('#phone')?.value.trim() || '',
      message: form.querySelector('#message')?.value.trim() || ''
    };

    try {
      const payload = new URLSearchParams();
      payload.append('name', formData.name);
      payload.append('phone', formData.phone);
      payload.append('message', formData.message);

      const response = await fetch('https://script.google.com/macros/s/AKfycbz2W402DNZrD28ZAfJ1LtAKE2GoGPTjONZHIMh0eHX8SEGBUp4QyhPbyoLcZv2-epoP/exec', {
        method: 'POST',
        body: payload
      });

      const text = await response.text();
      console.log('Server response:', text);

      let result = {};
      try {
        result = JSON.parse(text);
      } catch (err) {
        console.warn('Response is not JSON:', text);
      }

      if (response.ok && (result.ok === true || text.toLowerCase().includes('ok'))) {
        if (formSuccess) {
          const isEnPage = window.location.pathname.startsWith('/en/');
          formSuccess.textContent = isEnPage ? 'Thank you! Your request has been sent successfully.' : 'Дякуємо! Заявку успішно надіслано.';
          formSuccess.classList.add('is-visible');
        }
        form.reset();
      } else {
        if (formSuccess) {
          const isEnPage = window.location.pathname.startsWith('/en/');
          formSuccess.textContent = result.message || (isEnPage ? 'An error occurred. Please try again.' : 'Сталася помилка. Спробуйте ще раз.');
          formSuccess.classList.add('is-visible');
        }
        console.error('Apps Script response error:', result, text);
      }
    } catch (error) {
      if (formSuccess) {
        const isEnPage = window.location.pathname.startsWith('/en/');
        formSuccess.textContent = isEnPage ? 'A sending error occurred. Please try again.' : 'Сталася помилка при відправці. Спробуйте ще раз.';
        formSuccess.classList.add('is-visible');
      }
      console.error('Fetch error:', error);
    } finally {
      if (submitButton) {
        const isEnPage = window.location.pathname.startsWith('/en/');
        submitButton.disabled = false;
        submitButton.textContent = isEnPage ? 'Send request' : 'Надіслати заявку';
      }
    }
  });
}

// case filters
const filterButtons = document.querySelectorAll('[data-filter]');
const caseCards = document.querySelectorAll('[data-category]');

function applyCaseFilter(filter) {
  caseCards.forEach(card => {
    const category = card.dataset.category;
    card.style.display = (filter === 'all' || category === filter) ? 'block' : 'none';
  });
}

if (filterButtons.length && caseCards.length) {
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      applyCaseFilter(filter);
    });
  });

  applyCaseFilter('all');
}

// language switcher UA <-> EN
const langToggle = document.getElementById('langToggle');
if (langToggle) {
  const isEn = window.location.pathname.startsWith('/en/');
  const ukOpt = langToggle.querySelector('.lang-opt--uk');
  const enOpt = langToggle.querySelector('.lang-opt--en');

  // Set active state
  if (isEn) {
    enOpt.classList.add('is-active');
    ukOpt.classList.remove('is-active');
  } else {
    ukOpt.classList.add('is-active');
    enOpt.classList.remove('is-active');
  }

  ukOpt.addEventListener('click', (e) => {
    // If UA opt already has a real href (set in HTML for en/ pages), let it navigate
    const href = ukOpt.getAttribute('href');
    if (href && href !== '#') return; // navigate normally
    e.preventDefault();
    if (!isEn) return;
    const path = window.location.pathname.replace('/en/', '/');
    window.location.href = path || '/';
  });

  enOpt.addEventListener('click', (e) => {
    // If EN opt already has a real href (set in HTML for UA pages), let it navigate
    const href = enOpt.getAttribute('href');
    if (href && href !== '#') return; // navigate normally
    e.preventDefault();
    if (isEn) return;
    const raw = window.location.pathname;
    const filename = (raw === '/' || raw === '') ? 'index.html' : raw.split('/').pop();
    window.location.href = '/en/' + filename;
  });
}

// logo: если мы на главной — скроллим наверх, если нет — переходим на главную
document.querySelectorAll('.logo').forEach((logo) => {
  logo.addEventListener('click', (e) => {
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html';
    if (isHomePage) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    // если не на главной — переход по ссылке href="/" отработает стандартно
  });
});
const backToTop = document.getElementById('backToTop');

if (backToTop) {
  const toggleBackToTop = () => {
    if (window.scrollY > 700) {
      backToTop.classList.add('is-visible');
    } else {
      backToTop.classList.remove('is-visible');
    }
  };

  toggleBackToTop();

  window.addEventListener('scroll', toggleBackToTop, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    history.pushState(
      "",
      document.title,
      window.location.pathname + window.location.search
    );
  });
}

// terminal-like typing line in hero
const heroTypingText = document.getElementById('heroTypingText');

if (heroTypingText && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  const lines = (heroTypingText.dataset.lines || '')
    .split(',')
    .map((line) => line.trim())
    .filter(Boolean);

  let lineIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  const typeDelay = 58;
  const deleteDelay = 36;
  const holdDelay = 1400;
  const nextDelay = 300;

  const tickTyping = () => {
    if (!lines.length) return;

    const currentLine = lines[lineIndex];

    if (!isDeleting) {
      charIndex += 1;
      heroTypingText.textContent = currentLine.slice(0, charIndex);

      if (charIndex >= currentLine.length) {
        isDeleting = true;
        setTimeout(tickTyping, holdDelay);
        return;
      }

      setTimeout(tickTyping, typeDelay);
      return;
    }

    charIndex -= 1;
    heroTypingText.textContent = currentLine.slice(0, Math.max(charIndex, 0));

    if (charIndex <= 0) {
      isDeleting = false;
      lineIndex = (lineIndex + 1) % lines.length;
      setTimeout(tickTyping, nextDelay);
      return;
    }

    setTimeout(tickTyping, deleteDelay);
  };

  tickTyping();
} else if (heroTypingText) {
  const lines = (heroTypingText.dataset.lines || '').split(',').map((line) => line.trim()).filter(Boolean);
  heroTypingText.textContent = lines[0] || 'build --site --seo --crm';
}

// subtle parallax for hero spotlight
const heroShowcase = document.querySelector('.hero-showcase');
const heroGlow = document.querySelector('.hero-showcase__glow');

if (heroShowcase && heroGlow && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  let frameId = null;

  const moveGlow = (event) => {
    const rect = heroShowcase.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 18;

    if (frameId) cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => {
      heroGlow.style.transform = `translate(${x}px, ${y}px)`;
    });
  };

  heroShowcase.addEventListener('mousemove', moveGlow);
  heroShowcase.addEventListener('mouseleave', () => {
    heroGlow.style.transform = 'translate(0, 0)';
  });
}

// premium tilt effect for cards
const tiltCards = document.querySelectorAll('.card, .platform-card, .approach-item, .support-card, .contact-form');

if (tiltCards.length && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  tiltCards.forEach((card) => {
    let raf = null;

    const updateTilt = (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 6;
      const rotateX = (0.5 - py) * 6;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });
    };

    card.addEventListener('mousemove', updateTilt);
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// === Live scroll preview для кейсов ===
// Desktop: при hover картинка скроллится сверху вниз
// Mobile: автоматически при попадании в видимую область экрана
function initCaseScrollPreview() {
  const caseImages = document.querySelectorAll('.case-card__image');
  // Определяем тип устройства — есть ли поддержка hover
  const isTouchDevice = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  caseImages.forEach(imageWrap => {
    const img = imageWrap.querySelector('img');
    if (!img) return;

    const setupScrollPreview = () => {
      const naturalRatio = img.naturalHeight / img.naturalWidth;

      console.log('[case-preview]', img.src.split('/').pop(),
                  `${img.naturalWidth}x${img.naturalHeight}`,
                  'ratio:', naturalRatio.toFixed(2),
                  'scrollable:', naturalRatio >= 1.5,
                  'touch:', isTouchDevice);

      // Если высота картинки больше ширины в 1.5+ раза — это длинный скриншот
      if (naturalRatio < 1.5) return;

      imageWrap.classList.add('is-scrollable');

      const card = imageWrap.closest('.case-card');
      if (!card) return;

      // Пересчёт расстояния скролла
      const getScrollDistance = () => {
        const wrapWidth = imageWrap.offsetWidth;
        const wrapHeight = imageWrap.offsetHeight;
        const scaledImgHeight = wrapWidth * naturalRatio;
        return Math.max(0, scaledImgHeight - wrapHeight);
      };

      const startScroll = () => {
        const distance = getScrollDistance();
        const duration = Math.max(3, Math.min(10, distance / 200));
        img.style.transition = `transform ${duration}s linear`;
        img.style.transform = `translateY(-${distance}px)`;
      };

      const resetScroll = () => {
        img.style.transition = `transform 0.8s ease`;
        img.style.transform = 'translateY(0)';
      };

      if (isTouchDevice) {
        // === МОБИЛЬНАЯ ВЕРСИЯ ===
        // Запускаем скролл, когда карточка попадает в центр экрана
        let isScrolling = false;

        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            // Карточка достаточно видна (60%+) — запускаем скролл
            if (entry.intersectionRatio >= 0.6 && !isScrolling) {
              isScrolling = true;
              startScroll();
            }
            // Карточка ушла из view — сбрасываем
            else if (entry.intersectionRatio < 0.2 && isScrolling) {
              isScrolling = false;
              resetScroll();
            }
          });
        }, {
          threshold: [0, 0.2, 0.6, 1]
        });

        observer.observe(card);
      } else {
        // === DESKTOP (hover) ===
        card.addEventListener('mouseenter', startScroll);
        card.addEventListener('mouseleave', resetScroll);
      }
    };

    if (img.complete && img.naturalHeight !== 0) {
      setupScrollPreview();
    } else {
      img.addEventListener('load', setupScrollPreview);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCaseScrollPreview);
} else {
  initCaseScrollPreview();
}

// Cookie banner
(function() {
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;

  const COOKIE_KEY = 'lumi_cookie_consent';

  if (!localStorage.getItem(COOKIE_KEY)) {
    setTimeout(() => banner.classList.add('is-visible'), 800);
  }

  document.getElementById('cookieAccept')?.addEventListener('click', () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    banner.classList.remove('is-visible');
  });

  document.getElementById('cookieDecline')?.addEventListener('click', () => {
    localStorage.setItem(COOKIE_KEY, 'declined');
    banner.classList.remove('is-visible');
  });
})();


/* ==========================================
   LÚMI GEO MAP — INTERACTION + REVEAL
   ========================================== */
(function initGeoMap() {
  const wrap = document.querySelector('.geo-map-wrap');
  const svg = document.getElementById('geoSvg') || document.getElementById('geoSvgEn');
  if (!wrap || !svg) return;

  const countries = svg.querySelectorAll('.ga[data-ua][data-en]');
  const lines = svg.querySelector('#glines');
  const pins = svg.querySelector('#gpins');

  // Localized tooltip
  const tip = document.getElementById('geoTip') || document.getElementById('geoTipEn');
  const isEnglish = window.location.pathname.startsWith('/en/');

  function getCountryName(path) {
    return isEnglish ? path.dataset.en : path.dataset.ua;
  }

  function showCountryTip(path, event) {
    if (!tip) return;
    tip.textContent = getCountryName(path);
    const rect = wrap.getBoundingClientRect();
    tip.style.left = `${event.clientX - rect.left + 12}px`;
    tip.style.top = `${event.clientY - rect.top - 12}px`;
    tip.classList.add('vis');
  }

  function hideCountryTip() {
    tip?.classList.remove('vis');
  }

  countries.forEach(path => {
    path.setAttribute('role', 'button');
    path.setAttribute('tabindex', '0');
    path.setAttribute('aria-label', getCountryName(path));

    path.addEventListener('mouseenter', e => showCountryTip(path, e));
    path.addEventListener('mousemove', e => showCountryTip(path, e));
    path.addEventListener('mouseleave', hideCountryTip);
    path.addEventListener('focus', () => {
      if (tip) {
        tip.textContent = getCountryName(path);
        tip.style.left = '50%';
        tip.style.top = '18px';
        tip.classList.add('vis');
      }
    });
    path.addEventListener('blur', hideCountryTip);
    path.addEventListener('keydown', e => {
      if (e.key === 'Escape') hideCountryTip();
    });
  });

  // Mobile: crop the existing vector map with viewBox instead of CSS-scaling the
  // entire world. This preserves SVG sharpness and makes the four active countries
  // readable on small screens.
  const baseViewBox = svg.getAttribute('viewBox') || '0 0 1000 500';
  const mobileQuery = window.matchMedia('(max-width: 600px)');
  const applyResponsiveViewBox = () => {
    if (mobileQuery.matches) {
      // Central/Eastern Europe: Austria, Czech Republic, Poland, Ukraine + neighbours.
      svg.setAttribute('viewBox', '490 60 150 131');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    } else {
      svg.setAttribute('viewBox', baseViewBox);
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
  };
  applyResponsiveViewBox();
  mobileQuery.addEventListener?.('change', applyResponsiveViewBox);

  // Cursor-following map zoom: the map gently enlarges around the hovered area
  // so nearby country borders become easier to read without changing the layout.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf = 0;
    let lastX = 0;
    let lastY = 0;

    const updateZoom = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(0, Math.min(100, ((lastX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((lastY - rect.top) / rect.height) * 100));
      wrap.style.setProperty('--geo-zoom-x', `${x}%`);
      wrap.style.setProperty('--geo-zoom-y', `${y}%`);
      wrap.classList.add('is-cursor-zoom');
    };

    wrap.addEventListener('pointermove', e => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!raf) raf = requestAnimationFrame(updateZoom);
    });

    wrap.addEventListener('pointerleave', () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      wrap.classList.remove('is-cursor-zoom');
    });
  }

  // Animate only once, when the map enters the viewport.
  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      wrap.classList.add('is-animated');
      reveal.unobserve(wrap);
    });
  }, { threshold: 0.18 });

  reveal.observe(wrap);
})();

/* ============================================================
   Services accordion — tap to open on touch / click to pin.
   Hover-reveal is handled purely in CSS for desktop.
   ============================================================ */
(function () {
  const accordions = document.querySelectorAll('[data-svc-accordion]');
  if (!accordions.length) return;

  accordions.forEach(acc => {
    const heads = acc.querySelectorAll('.svc-row__head');
    heads.forEach(head => {
      head.addEventListener('click', () => {
        const row = head.closest('.svc-row');
        const isOpen = row.classList.contains('is-open');

        // Close other pinned rows so only one stays open on tap.
        acc.querySelectorAll('.svc-row.is-open').forEach(r => {
          if (r !== row) {
            r.classList.remove('is-open');
            const h = r.querySelector('.svc-row__head');
            if (h) h.setAttribute('aria-expanded', 'false');
          }
        });

        row.classList.toggle('is-open', !isOpen);
        head.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  });
})();

// Blog category filters
(function() {
  const filters = document.querySelectorAll('.blog-filter');
  const grid = document.getElementById('blogGrid');
  if (!filters.length || !grid) return;

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      grid.querySelectorAll('.blog-card').forEach(card => {
        if (cat === 'all' || card.dataset.cat === cat) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
})();

/* ============================================================
   Free consultation popup — floating trigger + form + a daily
   "N of TOTAL free consultations left" counter.

   NOTE on the counter: this site has no backend, so the counter
   is local to each visitor's browser (localStorage), not a
   single number synced across every visitor in real time. Each
   calendar day it seeds a plausible "already taken" starting
   value, then decrements by 1 in this browser when this visitor
   submits the form. Good enough for urgency messaging; if a true
   shared/global counter is wanted later, it needs a small backend
   endpoint to track submissions per day.
   ============================================================ */
(function () {
  const isEnPage = window.location.pathname.startsWith('/en/');
  const TOTAL_SLOTS = 5;
  const STORAGE_KEY = 'lumiConsultState';
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz2W402DNZrD28ZAfJ1LtAKE2GoGPTjONZHIMh0eHX8SEGBUp4QyhPbyoLcZv2-epoP/exec';

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function seedFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function getState() {
    let state = null;
    try {
      state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (err) {
      state = null;
    }
    const today = todayKey();
    if (!state || state.date !== today) {
      const seed = seedFromString(today);
      state = { date: today, taken: 1 + (seed % 3), submitted: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    return state;
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* localStorage unavailable — counter just won't persist */
    }
  }

  function remainingSlots(state) {
    return Math.max(0, TOTAL_SLOTS - state.taken);
  }

  const copy = isEnPage ? {
    trigger: 'Free consultation',
    eyebrow: 'Lúmi Web Agency',
    title: 'Free consultation',
    subtitle: 'Tell us briefly about your project — we’ll help you figure out where to start and what it will cost. No obligations.',
    counter: (n) => n > 0
      ? `${n} of ${TOTAL_SLOTS} free consultations left today`
      : `Today’s free consultation slots are booked — leave a request and we’ll reach out first thing tomorrow`,
    name: 'Your name',
    phone: 'Phone / Telegram',
    message: 'Briefly about your task (optional)',
    submit: 'Get free consultation',
    sending: 'Sending...',
    success: 'Thank you! We will contact you shortly.',
    error: 'An error occurred. Please try again.',
    close: 'Close',
    sourceLabel: 'Source: popup "Free consultation"'
  } : {
    trigger: 'Безкоштовна консультація',
    eyebrow: 'Lúmi Web Agency',
    title: 'Безкоштовна консультація',
    subtitle: 'Розкажіть коротко про проєкт — підкажемо, з чого почати і скільки це коштуватиме. Без зобов’язань.',
    counter: (n) => n > 0
      ? `Сьогодні доступно ${n} з ${TOTAL_SLOTS} безкоштовних консультацій`
      : `На сьогодні безкоштовні консультації вже розібрали — залиште заявку, і ми зв’яжемось з вами першими завтра`,
    name: 'Ваше ім’я',
    phone: 'Телефон / Telegram',
    message: 'Коротко про задачу (необов’язково)',
    submit: 'Отримати консультацію',
    sending: 'Надсилання...',
    success: 'Дякуємо! Ми зв’яжемось з вами найближчим часом.',
    error: 'Сталася помилка. Спробуйте ще раз.',
    close: 'Закрити',
    sourceLabel: 'Джерело: попап «Безкоштовна консультація»'
  };

  document.body.insertAdjacentHTML('beforeend', `
    <button type="button" class="consult-trigger" id="consultTrigger" aria-haspopup="dialog">
      <span class="consult-trigger__icon" aria-hidden="true">🎁</span>
      <span class="consult-trigger__text">${copy.trigger}</span>
      <span class="consult-trigger__badge" id="consultBadge"></span>
    </button>
    <div class="consult-overlay" id="consultOverlay" role="presentation">
      <div class="consult-modal" role="dialog" aria-modal="true" aria-labelledby="consultTitle">
        <button type="button" class="consult-modal__close" id="consultClose" aria-label="${copy.close}">✕</button>
        <div class="consult-modal__head">
          <span class="eyebrow">${copy.eyebrow}</span>
          <h3 id="consultTitle">${copy.title}</h3>
          <p>${copy.subtitle}</p>
        </div>
        <div class="consult-counter" id="consultCounter">
          <div class="consult-counter__bar"><div class="consult-counter__fill" id="consultFill"></div></div>
          <span class="consult-counter__text" id="consultCounterText"></span>
        </div>
        <form class="consult-form" id="consultForm" novalidate>
          <div class="form-row">
            <label for="consultName">${copy.name}</label>
            <input id="consultName" name="name" type="text" placeholder="${copy.name}" required />
          </div>
          <div class="form-row">
            <label for="consultPhone">${copy.phone}</label>
            <input id="consultPhone" name="phone" type="text" placeholder="+380..." required />
          </div>
          <div class="form-row">
            <label for="consultMessage">${copy.message}</label>
            <textarea id="consultMessage" name="message" rows="3" placeholder="${copy.message}"></textarea>
          </div>
          <button type="submit" class="btn btn--primary btn--full" id="consultSubmit">${copy.submit}</button>
          <p class="form-success" id="consultSuccess"></p>
        </form>
      </div>
    </div>
  `);

  const trigger = document.getElementById('consultTrigger');
  const overlay = document.getElementById('consultOverlay');
  const closeBtn = document.getElementById('consultClose');
  const modalForm = document.getElementById('consultForm');
  const successEl = document.getElementById('consultSuccess');
  const counterText = document.getElementById('consultCounterText');
  const counterFill = document.getElementById('consultFill');
  const badge = document.getElementById('consultBadge');
  const submitBtn = document.getElementById('consultSubmit');

  function renderCounter() {
    const state = getState();
    const left = remainingSlots(state);
    counterText.textContent = copy.counter(left);
    counterFill.style.width = `${(left / TOTAL_SLOTS) * 100}%`;
    if (left > 0) {
      badge.textContent = String(left);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function openModal() {
    overlay.classList.add('is-open');
    document.body.classList.add('consult-open');
    renderCounter();
  }

  function closeModal() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('consult-open');
  }

  trigger.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal();
  });

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    successEl.classList.remove('is-visible');
    successEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = copy.sending;

    const name = modalForm.querySelector('#consultName')?.value.trim() || '';
    const phone = modalForm.querySelector('#consultPhone')?.value.trim() || '';
    const rawMessage = modalForm.querySelector('#consultMessage')?.value.trim() || '';
    const message = rawMessage ? `${copy.sourceLabel}\n${rawMessage}` : copy.sourceLabel;

    try {
      const payload = new URLSearchParams();
      payload.append('name', name);
      payload.append('phone', phone);
      payload.append('message', message);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: payload
      });

      const text = await response.text();
      let result = {};
      try {
        result = JSON.parse(text);
      } catch (err) {
        console.warn('Response is not JSON:', text);
      }

      if (response.ok && (result.ok === true || text.toLowerCase().includes('ok'))) {
        successEl.textContent = copy.success;
        successEl.classList.add('is-visible');
        modalForm.reset();

        const state = getState();
        if (remainingSlots(state) > 0) {
          state.taken += 1;
        }
        state.submitted = true;
        saveState(state);
        renderCounter();
      } else {
        successEl.textContent = result.message || copy.error;
        successEl.classList.add('is-visible');
        console.error('Apps Script response error:', result, text);
      }
    } catch (error) {
      successEl.textContent = copy.error;
      successEl.classList.add('is-visible');
      console.error('Fetch error:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = copy.submit;
    }
  });

  renderCounter();
})();

/* ============================================================
   Hero visual — node network, subtle cursor parallax (desktop only,
   the section itself is hidden on mobile via CSS).
   ============================================================ */
(function () {
  const showcase = document.getElementById('heroShowcase');
  const net = document.getElementById('heroNet');
  if (!showcase || !net) return;

  showcase.addEventListener('pointermove', (e) => {
    const rect = showcase.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    net.style.transform = `translate(${px * 16}px, ${py * 16}px)`;
  });

  showcase.addEventListener('pointerleave', () => {
    net.style.transform = 'translate(0, 0)';
  });
})();
