/**
 * LumiOn Widget v3
 * Embed: <script src="..." data-brand="slug" data-api-url="..." data-lang="uk"></script>
 */
(function () {
  'use strict';

  const scriptTag = document.currentScript || (function () {
    const scripts = document.querySelectorAll('script[data-brand]');
    return scripts[scripts.length - 1];
  })();

  const CONFIG = {
    brand: scriptTag.getAttribute('data-brand') || '',
    apiUrl: scriptTag.getAttribute('data-api-url') || 'https://api.lumion.lumiwebagency.com',
    lang: scriptTag.getAttribute('data-lang') || 'uk',
    utmCampaign: scriptTag.getAttribute('data-utm-campaign') || scriptTag.getAttribute('data-brand') || '',
    accentColor: scriptTag.getAttribute('data-color') || '#1a1a1a',
    cartButtonSelector: scriptTag.getAttribute('data-cart-button') || '.add-to-cart, [name="add"], .btn-cart, .product-form__submit, [data-testid="add-to-cart"]',
  };

  const T = {
    uk: { btn: 'Приміряти', title: 'Віртуальна примірка', upload: 'Завантажити фото', hint: 'Фото в повний зріст, чіткий фон', generate: 'Приміряти', buy: 'Купити', retry: 'Спробувати ще', save: 'Зберегти', share: 'Поділитись', close: '×', privacy: 'Фото видаляються після примірки', error: 'Не вдалось. Спробуйте ще раз.', steps: ['Фото', 'Генерація', 'Результат'], generating: 'Генеруємо...', genSub: 'ШІ приміряє одяг — зазвичай 15-30 сек' },
    ru: { btn: 'Примерить', title: 'Виртуальная примерка', upload: 'Загрузить фото', hint: 'Фото в полный рост, чёткий фон', generate: 'Примерить', buy: 'Купить', retry: 'Попробовать ещё', save: 'Сохранить', share: 'Поделиться', close: '×', privacy: 'Фото удаляются после примерки', error: 'Не удалось. Попробуйте ещё раз.', steps: ['Фото', 'Генерация', 'Результат'], generating: 'Генерируем...', genSub: 'ИИ примеряет одежду — обычно 15-30 сек' },
    en: { btn: 'Try On', title: 'Virtual Try-On', upload: 'Upload photo', hint: 'Full-body photo, clear background', generate: 'Try On', buy: 'Buy Now', retry: 'Try Again', save: 'Save', share: 'Share', close: '×', privacy: 'Photos deleted after try-on', error: 'Failed. Please try again.', steps: ['Photo', 'Generate', 'Result'], generating: 'Generating...', genSub: 'AI is fitting the clothes — usually 15-30 sec' },
  };
  const t = T[CONFIG.lang] || T.uk;

  const sessionId = (function () {
    let id = sessionStorage.getItem('lumion_sid');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('lumion_sid', id); }
    return id;
  })();

  function getProductInfo() {
    const ogImage = document.querySelector('meta[property="og:image"]');
    const h1 = document.querySelector('h1');
    const price = document.querySelector('.price, .product-price, [class*="price"]');
    return {
      imageUrl: ogImage ? ogImage.content : null,
      name: h1 ? h1.textContent.trim().slice(0, 80) : document.title.slice(0, 80),
      price: price ? price.textContent.trim().slice(0, 20) : '',
      url: window.location.href,
      id: window.location.pathname.split('/').filter(Boolean).pop(),
    };
  }

  // ── STYLES ──────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    .lo-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; padding: 14px 20px; margin: 10px 0;
      background: transparent; color: ${CONFIG.accentColor};
      border: 1px solid ${CONFIG.accentColor};
      font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
      letter-spacing: 0.06em; text-transform: uppercase;
      cursor: pointer; transition: all 0.18s;
    }
    .lo-btn:hover { background: ${CONFIG.accentColor}; color: #fff; }

    .lo-overlay {
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(10,10,10,0.6);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: loFadeIn 0.22s ease;
    }
    @keyframes loFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .lo-modal {
      background: #fff; border-radius: 20px;
      width: 100%; max-width: 480px;
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 32px 80px rgba(0,0,0,0.28);
      animation: loSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1);
      font-family: 'Inter', sans-serif;
      scrollbar-width: none;
    }
    .lo-modal::-webkit-scrollbar { display: none; }
    @keyframes loSlideUp { from { transform: translateY(32px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }

    .lo-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 22px 16px;
    }
    .lo-title { font-size: 15px; font-weight: 600; color: #111; margin: 0; }
    .lo-brand-tag {
      font-size: 10px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;
      color: #bbb; margin-left: 8px;
    }
    .lo-close {
      width: 34px; height: 34px; border-radius: 50%;
      background: #f4f4f4; border: none; cursor: pointer;
      font-size: 16px; color: #777; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s; flex-shrink: 0;
    }
    .lo-close:hover { background: #eaeaea; color: #111; }

    .lo-steps {
      display: flex; align-items: center;
      padding: 0 22px 16px; gap: 0;
    }
    .lo-step { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .lo-step-sep { flex: 1; height: 1px; background: #e8e8e8; margin: 0 4px; min-width: 16px; transition: background 0.3s; }
    .lo-step-sep.done { background: #111; }
    .lo-step-num {
      width: 24px; height: 24px; border-radius: 50%;
      border: 1.5px solid #e0e0e0; background: #fff;
      font-size: 11px; font-weight: 600; color: #ccc;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.22s; flex-shrink: 0;
    }
    .lo-step-lbl { font-size: 11px; color: #ccc; transition: color 0.22s; white-space: nowrap; }
    .lo-step.active .lo-step-num { border-color: #111; color: #111; }
    .lo-step.active .lo-step-lbl { color: #111; font-weight: 500; }
    .lo-step.done .lo-step-num { background: #111; border-color: #111; color: #fff; font-size: 10px; }

    .lo-divider { height: 1px; background: #f2f2f2; margin: 0 22px; }

    .lo-body { padding: 18px 22px 22px; }

    .lo-product {
      display: flex; gap: 12px; align-items: center;
      padding: 12px; background: #f8f8f8; border-radius: 12px;
      margin-bottom: 18px;
    }
    .lo-product-img { width: 50px; height: 62px; object-fit: cover; border-radius: 8px; background: #eee; flex-shrink: 0; }
    .lo-product-name { font-size: 12px; font-weight: 500; color: #111; line-height: 1.45; }
    .lo-product-price { font-size: 12px; color: #999; margin-top: 2px; }

    .lo-upload-zone {
      border: 1.5px dashed #d8d8d8; border-radius: 14px;
      padding: 0; text-align: center; cursor: pointer;
      background: #fafafa; position: relative; overflow: hidden;
      transition: border-color 0.2s, background 0.2s;
      min-height: 200px; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .lo-upload-zone:hover { border-color: #aaa; background: #f5f5f5; }
    .lo-upload-zone.has-photo { border-style: solid; border-color: #111; background: #fff; min-height: unset; }
    .lo-file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .lo-upload-preview { width: 100%; max-height: 300px; object-fit: contain; display: none; border-radius: 12px; }
    .lo-upload-zone.has-photo .lo-upload-preview { display: block; }
    .lo-upload-zone.has-photo .lo-upload-placeholder { display: none; }

    .lo-upload-placeholder { padding: 28px 20px 24px; width: 100%; }
    .lo-photos-row { display: flex; gap: 12px; justify-content: center; margin-bottom: 16px; }

    .lo-photo-card {
      width: 88px; height: 120px; border-radius: 10px;
      overflow: hidden; flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      position: relative;
    }
    .lo-photo-card:first-child { transform: rotate(-4deg) translateY(4px); }
    .lo-photo-card:last-child { transform: rotate(3deg) translateY(2px); }
    .lo-photo-card img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .lo-upload-title { font-size: 14px; font-weight: 600; color: #111; margin-bottom: 4px; }
    .lo-upload-hint { font-size: 12px; color: #aaa; }

    .lo-privacy { font-size: 11px; color: #c0c0c0; text-align: center; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 4px; }

    .lo-error { background: #fff2f2; color: #d00; border-radius: 10px; padding: 10px 14px; font-size: 12px; margin-top: 10px; display: none; }

    .lo-main-btn {
      width: 100%; padding: 15px; background: #111; color: #fff;
      border: none; border-radius: 12px; font-size: 13px; font-weight: 600;
      letter-spacing: 0.04em; cursor: pointer; margin-top: 14px;
      transition: background 0.18s; font-family: 'Inter', sans-serif;
    }
    .lo-main-btn:hover { background: #2a2a2a; }
    .lo-buy-btn { background: #111; margin-top: 10px; }

    .lo-generating { text-align: center; padding: 52px 20px 44px; }
    .lo-spinner {
      width: 44px; height: 44px; margin: 0 auto 20px;
      border: 2.5px solid #f0f0f0; border-top-color: #111;
      border-radius: 50%; animation: loSpin 0.8s linear infinite;
    }
    @keyframes loSpin { to { transform: rotate(360deg); } }
    .lo-gen-title { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 6px; }
    .lo-gen-sub { font-size: 12px; color: #aaa; line-height: 1.6; }
    .lo-progress { height: 3px; background: #f0f0f0; border-radius: 2px; margin: 24px 0 0; overflow: hidden; }
    .lo-progress-bar { height: 100%; background: #111; width: 0; border-radius: 2px; transition: width 1.4s ease; }

    .lo-result-img { width: 100%; display: block; max-height: 420px; object-fit: contain; border-radius: 12px; background: #f8f8f8; }
    .lo-result-btns { display: flex; gap: 8px; margin-top: 10px; }
    .lo-result-btns button {
      flex: 1; padding: 10px 8px; border: 1px solid #e8e8e8; border-radius: 10px;
      background: #fff; font-size: 11px; font-weight: 500; letter-spacing: 0.04em;
      cursor: pointer; color: #777; font-family: 'Inter', sans-serif;
      text-transform: uppercase; transition: border-color 0.15s, color 0.15s;
    }
    .lo-result-btns button:hover { border-color: #111; color: #111; }

    .lo-footer { text-align: center; padding: 14px 22px 20px; font-size: 10px; color: #ddd; letter-spacing: 0.08em; text-transform: uppercase; }
    .lo-footer a { color: #ccc; text-decoration: none; }
    .lo-footer a:hover { color: #888; }
  `;
  document.head.appendChild(style);

  // ── STATE ────────────────────────────────────────────────────
  let overlay = null, personFile = null, resultUrl = null, tryonId = null, utmUrl = null;

  // ── EXAMPLE PERSON PHOTOS (base64 SVG data URIs) ─────────────
  const PERSON_1 = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 120"><rect width="88" height="120" fill="#f0ebe4"/><ellipse cx="44" cy="22" rx="12" ry="13" fill="#d4c4b0"/><rect x="30" y="34" width="28" height="36" rx="4" fill="#c8b89a"/><rect x="22" y="36" width="10" height="30" rx="5" fill="#c8b89a"/><rect x="56" y="36" width="10" height="30" rx="5" fill="#c8b89a"/><rect x="31" y="68" width="11" height="38" rx="5" fill="#bfae9a"/><rect x="46" y="68" width="11" height="38" rx="5" fill="#bfae9a"/></svg>`);
  const PERSON_2 = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 120"><rect width="88" height="120" fill="#e8e4df"/><ellipse cx="44" cy="21" rx="11" ry="12" fill="#c4b5a0"/><path d="M28 35 Q44 32 60 35 L58 70 Q44 74 30 70Z" fill="#bba890"/><rect x="21" y="36" width="9" height="28" rx="4" fill="#bba890"/><rect x="58" y="36" width="9" height="28" rx="4" fill="#bba890"/><path d="M31 70 Q36 68 38 106" stroke="#b0a090" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M57 70 Q52 68 50 106" stroke="#b0a090" stroke-width="10" stroke-linecap="round" fill="none"/></svg>`);

  // ── CREATE MODAL ──────────────────────────────────────────────
  function createModal(product) {
    overlay = document.createElement('div');
    overlay.className = 'lo-overlay';
    overlay.innerHTML = `
      <div class="lo-modal" role="dialog" aria-modal="true" aria-label="${t.title}">
        <div class="lo-header">
          <div style="display:flex;align-items:baseline;gap:0">
            <h2 class="lo-title">${t.title}</h2>
          </div>
          <button class="lo-close" aria-label="${t.close}">${t.close}</button>
        </div>

        <div class="lo-steps">
          ${t.steps.map((s, i) => `
            <div class="lo-step ${i === 0 ? 'active' : ''}" id="lo-step-${i+1}">
              <div class="lo-step-num"><span>${i+1}</span></div>
              <div class="lo-step-lbl">${s}</div>
            </div>
            ${i < t.steps.length - 1 ? `<div class="lo-step-sep" id="lo-sep-${i+1}"></div>` : ''}
          `).join('')}
        </div>

        <div class="lo-divider"></div>

        <div class="lo-body">
          ${product.name ? `
            <div class="lo-product">
              ${product.imageUrl ? `<img class="lo-product-img" src="${product.imageUrl}" alt="" onerror="this.style.display='none'">` : ''}
              <div>
                <div class="lo-product-name">${product.name}</div>
                ${product.price ? `<div class="lo-product-price">${product.price}</div>` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Step 1 -->
          <div id="lo-panel-1">
            <div class="lo-upload-zone" id="lo-zone">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" class="lo-file-input" id="lo-file">
              <img class="lo-upload-preview" id="lo-preview" alt="">
              <div class="lo-upload-placeholder">
                <div class="lo-photos-row">
                  <div class="lo-photo-card"><img src="${PERSON_1}" alt=""></div>
                  <div class="lo-photo-card"><img src="${PERSON_2}" alt=""></div>
                </div>
                <div class="lo-upload-title">${t.upload}</div>
                <div class="lo-upload-hint">${t.hint}</div>
              </div>
            </div>
            <div class="lo-privacy">🔒 ${t.privacy}</div>
            <div class="lo-error" id="lo-err1">${t.error}</div>
            <button class="lo-main-btn" id="lo-gen-btn">${t.generate}</button>
          </div>

          <!-- Step 2 -->
          <div id="lo-panel-2" style="display:none">
            <div class="lo-generating">
              <div class="lo-spinner"></div>
              <div class="lo-gen-title" id="lo-gen-status">${t.generating}</div>
              <div class="lo-gen-sub">${t.genSub}</div>
              <div class="lo-progress"><div class="lo-progress-bar" id="lo-bar"></div></div>
            </div>
          </div>

          <!-- Step 3 -->
          <div id="lo-panel-3" style="display:none">
            <img class="lo-result-img" id="lo-result-img" alt="">
            <div class="lo-result-btns">
              <button id="lo-save">⬇ ${t.save}</button>
              <button id="lo-share">↗ ${t.share}</button>
              <button id="lo-retry">↺ ${t.retry}</button>
            </div>
            <div class="lo-error" id="lo-err3"></div>
            <button class="lo-main-btn lo-buy-btn" id="lo-buy">${t.buy}</button>
          </div>
        </div>

        <div class="lo-footer"><a href="https://lumiwebagency.com" target="_blank" rel="noopener">LumiOn · Lumi Web Agency</a></div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.querySelector('.lo-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    const fileInput = overlay.querySelector('#lo-file');
    const zone = overlay.querySelector('#lo-zone');

    fileInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) handleFile(f);
    });

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = '#111'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    });

    overlay.querySelector('#lo-gen-btn').addEventListener('click', () => generate(product));
  }

  function handleFile(file) {
    if (!file || !file.type.match(/^image\//)) return;
    personFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      const preview = overlay.querySelector('#lo-preview');
      const zone = overlay.querySelector('#lo-zone');
      preview.src = e.target.result;
      zone.classList.add('has-photo');
    };
    reader.readAsDataURL(file);
  }

  async function generate(product) {
    if (!personFile) {
      const err = overlay.querySelector('#lo-err1');
      err.textContent = t.error;
      err.style.display = 'block';
      return;
    }
    overlay.querySelector('#lo-err1').style.display = 'none';
    setStep(2);

    const bar = overlay.querySelector('#lo-bar');
    const status = overlay.querySelector('#lo-gen-status');
    const msgs = CONFIG.lang === 'uk'
      ? ['Аналіз силуету...', 'Накладання одягу...', 'Фінальні деталі...']
      : CONFIG.lang === 'ru'
      ? ['Анализ силуэта...', 'Наложение одежды...', 'Финальные детали...']
      : ['Analysing body...', 'Fitting garment...', 'Final details...'];

    let prog = 0, mi = 0;
    const iv = setInterval(() => {
      prog = Math.min(prog + Math.random() * 4, 90);
      bar.style.width = prog + '%';
      if (mi < msgs.length && prog > [20, 50, 75][mi]) { status.textContent = msgs[mi++]; }
    }, 600);

    try {
      const fd = new FormData();
      fd.append('person_photo', personFile, personFile.name);
      fd.append('brand', CONFIG.brand);
      fd.append('session_id', sessionId);
      fd.append('product_id', product.id || '');
      fd.append('product_name', product.name || '');
      fd.append('product_url', product.url || '');
      if (product.imageUrl) fd.append('garment_url', product.imageUrl);

      const res = await fetch(`${CONFIG.apiUrl}/api/tryon`, {
        method: 'POST',
        body: fd,
      });

      clearInterval(iv);
      bar.style.width = '100%';

      if (!res.ok) throw new Error('API error ' + res.status);

      const data = await res.json();
      resultUrl = data.result_url;
      tryonId = data.tryon_id;
      utmUrl = data.utm_url;

      await new Promise(r => setTimeout(r, 300));
      showResult(product);

    } catch (err) {
      clearInterval(iv);
      setStep(1);
      const errEl = overlay.querySelector('#lo-err1');
      errEl.textContent = t.error;
      errEl.style.display = 'block';
      console.error('[LumiOn]', err);
    }
  }

  function showResult(product) {
    setStep(3);
    overlay.querySelector('#lo-result-img').src = resultUrl;

    overlay.querySelector('#lo-buy').addEventListener('click', () => {
      fetch(`${CONFIG.apiUrl}/api/order-ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_slug: CONFIG.brand, tryon_id: tryonId, product_id: product.id }),
      }).catch(() => {});
      window.location.href = utmUrl || product.url;
    });

    overlay.querySelector('#lo-save').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = resultUrl;
      a.download = `lumion_${Date.now()}.jpg`;
      a.click();
    });

    overlay.querySelector('#lo-share').addEventListener('click', async () => {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: utmUrl || product.url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(utmUrl || product.url).catch(() => {});
        const btn = overlay.querySelector('#lo-share');
        const orig = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      }
    });

    overlay.querySelector('#lo-retry').addEventListener('click', () => {
      personFile = null; resultUrl = null; tryonId = null;
      overlay.querySelector('#lo-zone').classList.remove('has-photo');
      setStep(1);
    });
  }

  function setStep(n) {
    [1, 2, 3].forEach(i => {
      const panel = overlay.querySelector(`#lo-panel-${i}`);
      const step = overlay.querySelector(`#lo-step-${i}`);
      if (panel) panel.style.display = i === n ? 'block' : 'none';
      if (step) {
        step.classList.toggle('active', i === n);
        step.classList.toggle('done', i < n);
        const numEl = step.querySelector('.lo-step-num span');
        if (i < n && numEl) numEl.textContent = '✓';
      }
      const sep = overlay.querySelector(`#lo-sep-${i}`);
      if (sep) sep.classList.toggle('done', i < n);
    });
  }

  function close() {
    if (!overlay) return;
    document.removeEventListener('keydown', onKey);
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.18s';
    setTimeout(() => {
      if (overlay) { overlay.remove(); overlay = null; }
      document.body.style.overflow = '';
      personFile = null; resultUrl = null;
    }, 180);
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  // ── INJECT BUTTON ─────────────────────────────────────────────
  function injectButton() {
    const product = getProductInfo();
    if (!product.imageUrl && !window.location.pathname.match(/product|item|goods|tovar/i)) return;

    const btn = document.createElement('button');
    btn.className = 'lo-btn';
    btn.innerHTML = `<span style="font-size:15px">◎</span> ${t.btn}`;
    btn.addEventListener('click', () => createModal(product));

    const cartBtn = document.querySelector(CONFIG.cartButtonSelector);
    if (cartBtn) {
      cartBtn.parentNode.insertBefore(btn, cartBtn.nextSibling);
    } else {
      const h1 = document.querySelector('h1');
      if (h1) (h1.closest('section,article,div') || h1.parentNode).appendChild(btn);
      else document.body.appendChild(btn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }

  window.LumiOn = { open: () => { const p = getProductInfo(); createModal(p); }, close };

})();
