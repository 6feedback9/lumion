/**
 * LumiOn Widget — Lumi Web Agency
 * Embed: <script src="https://lumion.lumiwebagency.com/widget.js"
 *           data-brand="ambitna"
 *           data-api-url="https://api.lumion.lumiwebagency.com"
 *           data-lang="uk">
 *        </script>
 *
 * The script auto-injects a "Примерити 👗" button on product pages.
 * Clicking it opens a fullscreen overlay with the try-on flow.
 */

(function () {
  'use strict';

  // ── Config from script tag ──────────────────────────────────
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
    buttonText: scriptTag.getAttribute('data-button-text') || null,
    productImageSelector: scriptTag.getAttribute('data-product-image') || '[property="og:image"]',
    productNameSelector: scriptTag.getAttribute('data-product-name') || 'h1',
    productPriceSelector: scriptTag.getAttribute('data-product-price') || '.price',
    cartButtonSelector: scriptTag.getAttribute('data-cart-button') || '.add-to-cart, [name="add"], .btn-cart',
  };

  // ── Translations ────────────────────────────────────────────
  const T = {
    uk: {
      btn: '👗 Приміряти',
      step1: 'Оберіть фото',
      step1desc: 'Завантажте чітке фото в повний зріст',
      step2: 'Генерація...',
      step2desc: 'ШІ приміряє одяг на вас',
      step3: 'Ваша примірка',
      upload: 'Завантажити фото',
      uploadHint: 'JPG або PNG, до 10 МБ',
      generate: '✨ Приміряти',
      buy: '🛒 Купити',
      retry: 'Спробувати ще раз',
      share: 'Поділитись',
      save: 'Зберегти фото',
      close: '×',
      poweredBy: 'LumiOn від Lumi Web Agency',
      errorUpload: 'Будь ласка, завантажте фото',
      errorGenerate: 'Не вдалось згенерувати. Спробуйте ще раз.',
      privacy: 'Фото не зберігаються після примірки',
      steps: ['Фото', 'Генерація', 'Результат'],
    },
    ru: {
      btn: '👗 Примерить',
      step1: 'Выберите фото',
      step1desc: 'Загрузите чёткое фото в полный рост',
      step2: 'Генерация...',
      step2desc: 'ИИ примеряет одежду на вас',
      step3: 'Ваша примерка',
      upload: 'Загрузить фото',
      uploadHint: 'JPG или PNG, до 10 МБ',
      generate: '✨ Примерить',
      buy: '🛒 Купить',
      retry: 'Попробовать ещё раз',
      share: 'Поделиться',
      save: 'Сохранить фото',
      close: '×',
      poweredBy: 'LumiOn by Lumi Web Agency',
      errorUpload: 'Пожалуйста, загрузите фото',
      errorGenerate: 'Не удалось сгенерировать. Попробуйте ещё раз.',
      privacy: 'Фото не сохраняются после примерки',
      steps: ['Фото', 'Генерация', 'Результат'],
    },
    en: {
      btn: '👗 Try On',
      step1: 'Upload your photo',
      step1desc: 'Upload a clear full-body photo',
      step2: 'Generating...',
      step2desc: 'AI is fitting the clothes on you',
      step3: 'Your try-on',
      upload: 'Upload photo',
      uploadHint: 'JPG or PNG, up to 10 MB',
      generate: '✨ Try On',
      buy: '🛒 Buy Now',
      retry: 'Try Again',
      share: 'Share',
      save: 'Save photo',
      close: '×',
      poweredBy: 'LumiOn by Lumi Web Agency',
      errorUpload: 'Please upload a photo',
      errorGenerate: 'Generation failed. Please try again.',
      privacy: 'Photos are not stored after try-on',
      steps: ['Photo', 'Generate', 'Result'],
    },
  };
  const t = T[CONFIG.lang] || T.uk;

  // ── Session ID ──────────────────────────────────────────────
  const sessionId = (function () {
    let id = sessionStorage.getItem('tryon_session');
    if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem('tryon_session', id); }
    return id;
  })();

  // ── Get product info from page ──────────────────────────────
  function getProductInfo() {
    const ogImage = document.querySelector('meta[property="og:image"]');
    const imageUrl = ogImage ? ogImage.content : null;
    const nameEl = document.querySelector(CONFIG.productNameSelector);
    const priceEl = document.querySelector(CONFIG.productPriceSelector);
    const pageUrl = window.location.href;
    const productId = new URLSearchParams(window.location.search).get('product_id')
      || pageUrl.split('/').filter(Boolean).pop();

    return {
      imageUrl,
      name: nameEl ? nameEl.textContent.trim() : document.title,
      price: priceEl ? priceEl.textContent.trim() : '',
      url: pageUrl,
      id: productId,
    };
  }

  // ── Inject CSS ──────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

    .tryon-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 13px 20px; background: transparent; color: ${CONFIG.accentColor};
      border: 1px solid ${CONFIG.accentColor}; border-radius: 0;
      font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;
      cursor: pointer; transition: background 0.2s, color 0.2s;
      width: 100%; margin: 8px 0; font-family: 'Inter', sans-serif;
    }
    .tryon-btn:hover { background: ${CONFIG.accentColor}; color: #fff; }

    .tryon-overlay {
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center;
      animation: tryonFadeIn 0.2s ease;
    }
    @keyframes tryonFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .tryon-modal {
      background: #fff; border-radius: 0;
      width: min(460px, 96vw); max-height: 94vh; overflow-y: auto;
      animation: tryonSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);
      scrollbar-width: none; font-family: 'Inter', sans-serif;
    }
    .tryon-modal::-webkit-scrollbar { display: none; }
    @keyframes tryonSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .tryon-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 22px 26px 0;
    }
    .tryon-modal-title { font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #111; margin: 0; }
    .tryon-close { width: 28px; height: 28px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #bbb; transition: color 0.15s; font-size: 18px; padding: 0; }
    .tryon-close:hover { color: #111; }

    .tryon-steps { display: flex; align-items: center; padding: 18px 26px 0; }
    .tryon-step-item { display: flex; align-items: center; }
    .tryon-step-item:not(:last-child) { flex: 1; }
    .tryon-step-item:not(:last-child)::after { content: ''; flex: 1; height: 1px; background: #e8e8e8; margin: 0 10px; }
    .tryon-step-item.done::after { background: #111; }
    .tryon-step-dot { width: 22px; height: 22px; border: 1px solid #e0e0e0; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500; color: #ccc; flex-shrink: 0; transition: all 0.2s; }
    .tryon-step-item.active .tryon-step-dot { border-color: #111; color: #111; }
    .tryon-step-item.done .tryon-step-dot { background: #111; border-color: #111; color: #fff; }
    .tryon-step-label { display: none; }

    .tryon-body { padding: 18px 26px 26px; }

    .tryon-product-strip { display: flex; align-items: center; gap: 12px; padding: 12px 0; margin-bottom: 18px; border-bottom: 1px solid #f0f0f0; }
    .tryon-product-thumb { width: 44px; height: 56px; object-fit: cover; background: #f5f5f5; flex-shrink: 0; }
    .tryon-product-name { font-size: 11px; font-weight: 500; color: #111; letter-spacing: 0.04em; line-height: 1.5; }
    .tryon-product-price { font-size: 11px; color: #aaa; margin-top: 2px; }

    .tryon-upload-area { border: 1px dashed #d8d8d8; padding: 36px 20px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; position: relative; overflow: hidden; background: #fafafa; }
    .tryon-upload-area:hover { border-color: #888; background: #f5f5f5; }
    .tryon-upload-area.has-file { border-style: solid; border-color: #111; background: #fff; }
    .tryon-upload-icon { font-size: 24px; margin-bottom: 10px; opacity: 0.35; }
    .tryon-upload-text { font-size: 12px; font-weight: 500; color: #111; margin: 0 0 4px; letter-spacing: 0.04em; }
    .tryon-upload-hint { font-size: 11px; color: #bbb; margin: 0; }
    .tryon-upload-preview { width: 100%; max-height: 220px; object-fit: contain; display: none; margin: 0 auto; }
    .tryon-upload-area.has-file .tryon-upload-preview { display: block; }
    .tryon-upload-area.has-file .tryon-upload-placeholder { display: none; }
    input[type=file].tryon-file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }

    .tryon-privacy { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #ccc; margin-top: 10px; justify-content: center; letter-spacing: 0.04em; }

    .tryon-action-btn { width: 100%; padding: 13px; border: 1px solid #111; border-radius: 0; font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; margin-top: 12px; transition: all 0.2s; font-family: 'Inter', sans-serif; }
    .tryon-action-btn.primary { background: #111; color: #fff; }
    .tryon-action-btn.primary:hover { background: #333; }
    .tryon-action-btn.secondary { background: #fff; color: #111; border-color: #e0e0e0; }
    .tryon-action-btn.secondary:hover { border-color: #111; }
    .tryon-action-btn.buy-btn { background: #111; color: #fff; border-color: #111; font-size: 11px; }
    .tryon-action-btn.buy-btn:hover { background: #333; }

    .tryon-generating { text-align: center; padding: 48px 0 40px; }
    .tryon-spinner { width: 36px; height: 36px; border: 1px solid #eee; border-top-color: #111; border-radius: 50%; animation: tryonSpin 0.9s linear infinite; margin: 0 auto 20px; }
    @keyframes tryonSpin { to { transform: rotate(360deg); } }
    .tryon-gen-title { font-size: 12px; font-weight: 500; color: #111; margin: 0 0 6px; letter-spacing: 0.06em; text-transform: uppercase; }
    .tryon-gen-sub { font-size: 11px; color: #bbb; margin: 0; }
    .tryon-progress { height: 1px; background: #f0f0f0; margin: 24px 0 0; overflow: hidden; }
    .tryon-progress-bar { height: 100%; background: #111; width: 0; transition: width 1.5s ease; }

    .tryon-result-img { width: 100%; display: block; max-height: 420px; object-fit: contain; background: #f8f8f8; }
    .tryon-result-actions { display: flex; gap: 6px; margin-top: 10px; }
    .tryon-result-actions button { flex: 1; padding: 9px 6px; border: 1px solid #e8e8e8; background: #fff; font-size: 10px; font-weight: 500; letter-spacing: 0.08em; cursor: pointer; color: #888; font-family: 'Inter', sans-serif; text-transform: uppercase; transition: border-color 0.15s, color 0.15s; }
    .tryon-result-actions button:hover { border-color: #111; color: #111; }

    .tryon-utm-badge { display: none; }

    .tryon-powered { text-align: center; padding: 14px 26px 20px; font-size: 10px; color: #ddd; letter-spacing: 0.08em; text-transform: uppercase; }
    .tryon-powered a { color: #ccc; text-decoration: none; }
    .tryon-powered a:hover { color: #999; }

    .tryon-error { background: #fff; color: #cc0000; padding: 10px 14px; font-size: 11px; margin-top: 10px; display: none; border-left: 2px solid #cc0000; }
  `;
  document.head.appendChild(style);

  // ── Widget State ────────────────────────────────────────────
  let overlay = null;
  let currentStep = 1; // 1=upload, 2=generating, 3=result
  let personFile = null;
  let resultUrl = null;
  let tryonId = null;
  let utmUrl = null;

  // ── Create overlay HTML ──────────────────────────────────────
  function createOverlay(product) {
    overlay = document.createElement('div');
    overlay.className = 'tryon-overlay';
    overlay.innerHTML = `
      <div class="tryon-modal" role="dialog" aria-modal="true" aria-label="${t.btn}">
        <div class="tryon-modal-header">
          <h2 class="tryon-modal-title">${t.btn}</h2>
          <button class="tryon-close" aria-label="${t.close}">${t.close}</button>
        </div>

        <div class="tryon-steps">
          ${t.steps.map((s, i) => `
            <div class="tryon-step-item ${i === 0 ? 'active' : ''}" id="tryon-step-${i + 1}">
              <div class="tryon-step-dot">${i + 1}</div>
              <div class="tryon-step-label">${s}</div>
            </div>
          `).join('')}
        </div>

        <div class="tryon-body">
          ${product.imageUrl || product.name ? `
            <div class="tryon-product-strip">
              ${product.imageUrl ? `<img src="${product.imageUrl}" class="tryon-product-thumb" alt="${product.name}" onerror="this.style.display='none'">` : ''}
              <div>
                <div class="tryon-product-name">${product.name}</div>
                ${product.price ? `<div class="tryon-product-price">${product.price}</div>` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Step 1: Upload -->
          <div id="tryon-panel-1">
            <p style="font-size:14px;color:#888;margin:0 0 12px;">${t.step1desc}</p>
            <div class="tryon-upload-area" id="tryon-drop-zone">
              <input type="file" accept="image/jpeg,image/png,image/webp" class="tryon-file-input" id="tryon-file-input">
              <img class="tryon-upload-preview" id="tryon-preview" alt="Your photo preview">
              <div class="tryon-upload-placeholder">
                <div class="tryon-upload-icon">📸</div>
                <p class="tryon-upload-text">${t.upload}</p>
                <p class="tryon-upload-hint">${t.uploadHint}</p>
              </div>
            </div>
            <div class="tryon-privacy">🔒 ${t.privacy}</div>
            <div class="tryon-error" id="tryon-error-1">${t.errorUpload}</div>
            <button class="tryon-action-btn primary" id="tryon-generate-btn">${t.generate}</button>
          </div>

          <!-- Step 2: Generating -->
          <div id="tryon-panel-2" style="display:none;">
            <div class="tryon-generating">
              <div class="tryon-spinner"></div>
              <p class="tryon-gen-title" id="tryon-gen-status">${t.step2}</p>
              <p class="tryon-gen-sub">${t.step2desc}</p>
              <div class="tryon-progress"><div class="tryon-progress-bar" id="tryon-progress"></div></div>
            </div>
          </div>

          <!-- Step 3: Result -->
          <div id="tryon-panel-3" style="display:none;">
            <img class="tryon-result-img" id="tryon-result-img" alt="Try-on result">
            <div style="text-align:center;margin:8px 0;">
              <span class="tryon-utm-badge" id="tryon-utm-display">utm_source=tryon</span>
            </div>
            <div class="tryon-result-actions">
              <button id="tryon-save-btn">💾 ${t.save}</button>
              <button id="tryon-share-btn">📤 ${t.share}</button>
              <button id="tryon-retry-btn">🔄 ${t.retry}</button>
            </div>
            <div class="tryon-error" id="tryon-error-3"></div>
            <button class="tryon-action-btn buy-btn" id="tryon-buy-btn">${t.buy}</button>
          </div>
        </div>

        <div class="tryon-powered">
          <a href="https://lumiwebagency.com" target="_blank" rel="noopener">${t.poweredBy}</a>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    bindOverlayEvents(product);
  }

  function bindOverlayEvents(product) {
    // Close
    overlay.querySelector('.tryon-close').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
    document.addEventListener('keydown', onKeyDown);

    // File input
    const fileInput = overlay.querySelector('#tryon-file-input');
    fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

    // Drag & drop
    const dropZone = overlay.querySelector('#tryon-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = CONFIG.accentColor; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    });

    // Generate
    overlay.querySelector('#tryon-generate-btn').addEventListener('click', handleGenerate.bind(null, product));

    // Result actions (added after result renders)
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    personFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      const preview = overlay.querySelector('#tryon-preview');
      const dropZone = overlay.querySelector('#tryon-drop-zone');
      preview.src = e.target.result;
      dropZone.classList.add('has-file');
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerate(product) {
    if (!personFile) {
      overlay.querySelector('#tryon-error-1').style.display = 'block';
      return;
    }
    overlay.querySelector('#tryon-error-1').style.display = 'none';

    // Switch to step 2
    setStep(2);

    // Animate progress bar
    const bar = overlay.querySelector('#tryon-progress');
    const statusEl = overlay.querySelector('#tryon-gen-status');
    let prog = 0;
    const progMessages = [
      [10, t.step2],
      [35, CONFIG.lang === 'uk' ? 'Аналіз силуету...' : CONFIG.lang === 'ru' ? 'Анализ силуэта...' : 'Analysing silhouette...'],
      [65, CONFIG.lang === 'uk' ? 'Накладання одягу...' : CONFIG.lang === 'ru' ? 'Наложение одежды...' : 'Fitting garment...'],
      [88, CONFIG.lang === 'uk' ? 'Фінальні деталі...' : CONFIG.lang === 'ru' ? 'Финальные детали...' : 'Final details...'],
    ];

    let msgIdx = 0;
    const progInterval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 3, 92);
      bar.style.width = prog + '%';
      if (msgIdx < progMessages.length && prog >= progMessages[msgIdx][0]) {
        statusEl.textContent = progMessages[msgIdx][1];
        msgIdx++;
      }
    }, 600);

    try {
      const formData = new FormData();
      formData.append('person_photo', personFile, personFile.name);
      formData.append('brand', CONFIG.brand);
      formData.append('session_id', sessionId);
      formData.append('product_id', product.id || '');
      formData.append('product_name', product.name || '');
      formData.append('product_url', product.url || '');

      if (product.imageUrl) {
        formData.append('garment_url', product.imageUrl);
      }

      // UTM campaign
      formData.append('utm_campaign', CONFIG.utmCampaign);

      const res = await fetch(`${CONFIG.apiUrl}/api/tryon`, {
        method: 'POST',
        headers: { 'x-brand-key': CONFIG.apiKey || '' }, // injected at embed time
        body: formData,
      });

      clearInterval(progInterval);
      bar.style.width = '100%';

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      resultUrl = data.result_url;
      tryonId = data.tryon_id;
      utmUrl = data.utm_url;

      // Short pause for UX
      await new Promise(r => setTimeout(r, 400));
      showResult(utmUrl, product);

    } catch (err) {
      clearInterval(progInterval);
      setStep(1);
      overlay.querySelector('#tryon-error-1').textContent = t.errorGenerate;
      overlay.querySelector('#tryon-error-1').style.display = 'block';
      console.error('[TryOn widget] Generation error:', err);
    }
  }

  function showResult(utmUrl, product) {
    setStep(3);

    const img = overlay.querySelector('#tryon-result-img');
    img.src = resultUrl;

    const utmDisplay = overlay.querySelector('#tryon-utm-display');
    utmDisplay.textContent = `utm_source=tryon · utm_campaign=${CONFIG.utmCampaign}`;

    // Buy button
    const buyBtn = overlay.querySelector('#tryon-buy-btn');
    buyBtn.addEventListener('click', () => {
      // Ping order conversion
      fetch(`${CONFIG.apiUrl}/api/order-ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_slug: CONFIG.brand, tryon_id: tryonId, product_id: product.id }),
      }).catch(() => {});

      window.location.href = utmUrl || product.url;
    });

    // Save
    overlay.querySelector('#tryon-save-btn').addEventListener('click', async () => {
      try {
        const a = document.createElement('a');
        a.href = resultUrl;
        a.download = `tryon_${CONFIG.brand}_${Date.now()}.jpg`;
        a.click();
      } catch (e) { window.open(resultUrl, '_blank'); }
    });

    // Share
    overlay.querySelector('#tryon-share-btn').addEventListener('click', async () => {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: utmUrl || product.url });
      } else {
        await navigator.clipboard.writeText(utmUrl || product.url);
        overlay.querySelector('#tryon-share-btn').textContent = '✓ Скопійовано';
      }
    });

    // Retry
    overlay.querySelector('#tryon-retry-btn').addEventListener('click', () => {
      personFile = null;
      resultUrl = null;
      tryonId = null;
      setStep(1);
      const dropZone = overlay.querySelector('#tryon-drop-zone');
      dropZone.classList.remove('has-file');
    });
  }

  function setStep(n) {
    currentStep = n;
    [1, 2, 3].forEach(i => {
      const panel = overlay.querySelector(`#tryon-panel-${i}`);
      const stepEl = overlay.querySelector(`#tryon-step-${i}`);
      if (panel) panel.style.display = i === n ? 'block' : 'none';
      if (stepEl) {
        stepEl.classList.toggle('active', i === n);
        stepEl.classList.toggle('done', i < n);
      }
    });
  }

  function closeOverlay() {
    if (!overlay) return;
    document.removeEventListener('keydown', onKeyDown);
    overlay.style.animation = 'tryonFadeIn 0.15s ease reverse';
    setTimeout(() => {
      overlay.remove();
      overlay = null;
      document.body.style.overflow = '';
      currentStep = 1;
      personFile = null;
      resultUrl = null;
    }, 150);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') closeOverlay();
  }

  // ── Inject "Try On" button on page ───────────────────────────
  function injectButton() {
    const product = getProductInfo();

    // Don't inject on non-product pages
    if (!product.imageUrl && !window.location.pathname.includes('product')) return;

    const btn = document.createElement('button');
    btn.className = 'tryon-btn';
    btn.setAttribute('aria-label', t.btn);
    btn.innerHTML = CONFIG.buttonText || t.btn;

    btn.addEventListener('click', () => {
      createOverlay(product);
    });

    // Try to insert after cart button
    const cartBtn = document.querySelector(CONFIG.cartButtonSelector);
    if (cartBtn) {
      cartBtn.parentNode.insertBefore(btn, cartBtn.nextSibling);
    } else {
      // Fallback: find a likely spot (near h1)
      const h1 = document.querySelector('h1');
      if (h1) {
        const section = h1.closest('section, article, div') || h1.parentNode;
        section.appendChild(btn);
      } else {
        document.body.appendChild(btn);
      }
    }
  }

  // ── Init ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }

  // Expose API for manual control
  window.TryOnWidget = { open: () => createOverlay(getProductInfo()), close: closeOverlay };

})();
