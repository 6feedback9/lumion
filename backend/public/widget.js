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
      border: 1.5px solid ${CONFIG.accentColor}; border-radius: 0;
      font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase;
      cursor: pointer; transition: background 0.2s, color 0.2s;
      width: 100%; margin: 8px 0; font-family: 'Inter', sans-serif;
    }
    .tryon-btn:hover { background: ${CONFIG.accentColor}; color: #fff; }

    .tryon-overlay {
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(0,0,0,0.4);
      display: flex; align-items: stretch; justify-content: flex-start;
      animation: tryonFadeIn 0.2s ease;
    }
    @keyframes tryonFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .tryon-panel {
      background: #fff;
      width: min(400px, 92vw);
      height: 100vh;
      overflow-y: auto;
      display: flex; flex-direction: column;
      animation: tryonSlideIn 0.32s cubic-bezier(0.16,1,0.3,1);
      scrollbar-width: none;
      font-family: 'Inter', sans-serif;
    }
    .tryon-panel::-webkit-scrollbar { display: none; }
    @keyframes tryonSlideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }

    .tryon-panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #f0f0f0;
      position: sticky; top: 0; background: #fff; z-index: 2;
    }
    .tryon-panel-logo {
      font-size: 13px; font-weight: 600; letter-spacing: 0.08em;
      color: #111; text-transform: uppercase;
    }
    .tryon-close {
      width: 30px; height: 30px; background: none; border: none;
      cursor: pointer; color: #aaa; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: color 0.15s; padding: 0;
    }
    .tryon-close:hover { color: #111; }

    .tryon-panel-steps {
      display: flex; align-items: center;
      padding: 14px 24px;
      border-bottom: 1px solid #f5f5f5;
    }
    .tryon-step-item { display: flex; align-items: center; gap: 6px; }
    .tryon-step-line { flex: 1; height: 1px; background: #e8e8e8; margin: 0 6px; min-width: 20px; }
    .tryon-step-dot {
      width: 20px; height: 20px; border: 1px solid #ddd;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 500; color: #bbb; flex-shrink: 0;
      transition: all 0.2s;
    }
    .tryon-step-label { font-size: 10px; color: #bbb; letter-spacing: 0.06em; white-space: nowrap; }
    .tryon-step-item.active .tryon-step-dot { border-color: #111; color: #111; }
    .tryon-step-item.active .tryon-step-label { color: #111; font-weight: 500; }
    .tryon-step-item.done .tryon-step-dot { background: #111; border-color: #111; color: #fff; }
    .tryon-step-item.done .tryon-step-label { color: #999; }

    .tryon-panel-body { padding: 20px 24px; flex: 1; }

    .tryon-product-row {
      display: flex; gap: 12px; align-items: flex-start;
      margin-bottom: 20px; padding-bottom: 18px;
      border-bottom: 1px solid #f5f5f5;
    }
    .tryon-product-thumb { width: 52px; height: 66px; object-fit: cover; background: #f5f5f5; flex-shrink: 0; }
    .tryon-product-name { font-size: 11px; font-weight: 500; color: #111; line-height: 1.5; letter-spacing: 0.02em; }
    .tryon-product-price { font-size: 11px; color: #aaa; margin-top: 3px; }

    .tryon-upload-label { font-size: 14px; font-weight: 600; color: #111; margin-bottom: 6px; letter-spacing: -0.01em; }
    .tryon-upload-desc { font-size: 12px; color: #999; line-height: 1.6; margin: 0 0 16px; }

    .tryon-drop-zone {
      border: 1px dashed #d5d5d5; background: #fafafa;
      padding: 28px 20px; text-align: center; cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      position: relative; overflow: hidden; margin-bottom: 4px;
    }
    .tryon-drop-zone:hover { border-color: #999; background: #f5f5f5; }
    .tryon-drop-zone.has-file { border-style: solid; border-color: #111; background: #fff; }
    .tryon-upload-preview { width: 100%; max-height: 260px; object-fit: contain; display: none; }
    .tryon-drop-zone.has-file .tryon-upload-preview { display: block; }
    .tryon-drop-zone.has-file .tryon-upload-placeholder { display: none; }
    input[type=file].tryon-file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }

    .tryon-upload-examples { display: flex; gap: 8px; justify-content: center; margin-bottom: 14px; }
    .tryon-example-photo {
      width: 72px; height: 96px; background: #ede9e3;
      position: relative; overflow: hidden;
    }
    .tryon-example-photo::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(160deg, #d4ccc4 0%, #c8bfb5 100%);
    }
    .tryon-example-1 { transform: rotate(-3deg) translateX(-4px); }
    .tryon-example-2 { transform: rotate(2deg) translateX(4px); }
    .tryon-upload-cta { font-size: 12px; font-weight: 500; color: #555; letter-spacing: 0.04em; }

    .tryon-main-btn {
      width: 100%; padding: 14px; background: #111; color: #fff;
      border: none; border-radius: 0; font-size: 11px; font-weight: 500;
      letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer;
      margin-top: 14px; transition: background 0.2s;
      font-family: 'Inter', sans-serif;
    }
    .tryon-main-btn:hover { background: #333; }
    .tryon-buy-btn { background: #111; margin-top: 12px; }

    .tryon-privacy { font-size: 10px; color: #c0c0c0; text-align: center; margin-top: 12px; letter-spacing: 0.03em; }

    .tryon-generating { text-align: center; padding: 60px 0 50px; }
    .tryon-spinner { width: 32px; height: 32px; border: 1px solid #eee; border-top-color: #111; border-radius: 50%; animation: tryonSpin 0.9s linear infinite; margin: 0 auto 18px; }
    @keyframes tryonSpin { to { transform: rotate(360deg); } }
    .tryon-gen-title { font-size: 12px; font-weight: 500; color: #111; margin-bottom: 6px; letter-spacing: 0.06em; text-transform: uppercase; }
    .tryon-gen-sub { font-size: 11px; color: #bbb; }
    .tryon-progress { height: 1px; background: #f0f0f0; margin: 24px 0 0; overflow: hidden; }
    .tryon-progress-bar { height: 100%; background: #111; width: 0; transition: width 1.5s ease; }

    .tryon-result-img { width: 100%; display: block; max-height: 380px; object-fit: contain; background: #f8f8f8; }
    .tryon-result-actions { display: flex; gap: 6px; margin-top: 10px; }
    .tryon-result-actions button { flex: 1; padding: 9px 6px; border: 1px solid #e8e8e8; background: #fff; font-size: 10px; font-weight: 500; letter-spacing: 0.08em; cursor: pointer; color: #777; font-family: 'Inter', sans-serif; text-transform: uppercase; transition: border-color 0.15s, color 0.15s; }
    .tryon-result-actions button:hover { border-color: #111; color: #111; }

    .tryon-panel-footer { padding: 16px 24px 24px; text-align: center; font-size: 10px; color: #ddd; letter-spacing: 0.08em; text-transform: uppercase; margin-top: auto; }
    .tryon-panel-footer a { color: #ccc; text-decoration: none; }
    .tryon-panel-footer a:hover { color: #888; }

    .tryon-error { color: #c00; font-size: 11px; margin-top: 8px; display: none; padding: 8px 0 0; border-top: 1px solid #fee; }
    .tryon-utm-badge { display: none; }
  `;
  document.head.appendChild(style);

  // ── Widget State ────────────────────────────────────────────
  let overlay = null;
  let currentStep = 1; // 1=upload, 2=generating, 3=result
  let personFile = null;
  let resultUrl = null;
  let tryonId = null;
  let utmUrl = null;

  // ── Create overlay HTML (side panel layout) ────────────────
  function createOverlay(product) {
    overlay = document.createElement('div');
    overlay.className = 'tryon-overlay';
    overlay.innerHTML = `
      <div class="tryon-panel" role="dialog" aria-modal="true">

        <div class="tryon-panel-header">
          <div class="tryon-panel-logo">⊙ LumiOn</div>
          <button class="tryon-close" aria-label="${t.close}">&#x2715;</button>
        </div>

        <div class="tryon-panel-steps">
          ${t.steps.map((s, i) => `
            <div class="tryon-step-item ${i === 0 ? 'active' : ''}" id="tryon-step-${i + 1}">
              <div class="tryon-step-dot"><span>${i + 1}</span></div>
              <div class="tryon-step-label">${s}</div>
            </div>
          `).join('<div class="tryon-step-line"></div>')}
        </div>

        <div class="tryon-panel-body">

          <!-- Step 1: Upload -->
          <div id="tryon-panel-1">
            <div class="tryon-product-row">
              ${product.imageUrl ? `<img src="${product.imageUrl}" class="tryon-product-thumb" alt="${product.name}" onerror="this.style.display='none'">` : ''}
              <div class="tryon-product-info">
                <div class="tryon-product-name">${product.name}</div>
                ${product.price ? `<div class="tryon-product-price">${product.price}</div>` : ''}
              </div>
            </div>

            <div class="tryon-upload-label">${t.step1}</div>
            <p class="tryon-upload-desc">${t.step1desc}</p>

            <div class="tryon-drop-zone" id="tryon-drop-zone">
              <input type="file" accept="image/jpeg,image/png,image/webp" class="tryon-file-input" id="tryon-file-input">
              <img class="tryon-upload-preview" id="tryon-preview" alt="preview">
              <div class="tryon-upload-placeholder">
                <div class="tryon-upload-examples">
                  <div class="tryon-example-photo tryon-example-1"></div>
                  <div class="tryon-example-photo tryon-example-2"></div>
                </div>
                <div class="tryon-upload-cta">${t.upload}</div>
              </div>
            </div>

            <div class="tryon-error" id="tryon-error-1">${t.errorUpload}</div>

            <button class="tryon-main-btn" id="tryon-generate-btn">${t.generate}</button>

            <div class="tryon-privacy">🔒 ${t.privacy}</div>
          </div>

          <!-- Step 2: Generating -->
          <div id="tryon-panel-2" style="display:none;">
            <div class="tryon-generating">
              <div class="tryon-spinner"></div>
              <div class="tryon-gen-title" id="tryon-gen-status">${t.step2}</div>
              <div class="tryon-gen-sub">${t.step2desc}</div>
              <div class="tryon-progress"><div class="tryon-progress-bar" id="tryon-progress"></div></div>
            </div>
          </div>

          <!-- Step 3: Result -->
          <div id="tryon-panel-3" style="display:none;">
            <img class="tryon-result-img" id="tryon-result-img" alt="Try-on result">
            <div class="tryon-result-actions">
              <button id="tryon-save-btn">&#8595; ${t.save}</button>
              <button id="tryon-share-btn">&#8599; ${t.share}</button>
              <button id="tryon-retry-btn">&#8635; ${t.retry}</button>
            </div>
            <div class="tryon-error" id="tryon-error-3"></div>
            <button class="tryon-main-btn tryon-buy-btn" id="tryon-buy-btn">${t.buy}</button>
          </div>

        </div>

        <div class="tryon-panel-footer">
          <a href="https://lumiwebagency.com" target="_blank" rel="noopener">LumiOn · Lumi Web Agency</a>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    bindOverlayEvents(product);
  }

  function bindOverlayEvents(product) {
    overlay.querySelector('.tryon-close').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
    document.addEventListener('keydown', onKeyDown);

    const fileInput = overlay.querySelector('#tryon-file-input');
    fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

    const dropZone = overlay.querySelector('#tryon-drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = '#111'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ''; });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFile(f);
    });

    overlay.querySelector('#tryon-generate-btn').addEventListener('click', handleGenerate.bind(null, product));
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
