/**
 * LumiOn Widget v4
 * ─────────────────────────────────────────────────────────────
 * USAGE (auto-inject):
 *   <script src="..." data-brand="slug" data-api-url="..." data-lang="uk"></script>
 *
 * USAGE (manual button — brand controls placement & style):
 *   <button data-lumion="try-on"
 *           data-image="https://...product.jpg"
 *           data-id="product-123"
 *           data-name="Назва товару"
 *           data-url="https://...product-page">
 *     Приміряти
 *   </button>
 */
(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────
  const scriptTag = document.currentScript || (function () {
    const ss = document.querySelectorAll('script[data-brand]');
    return ss[ss.length - 1];
  })();

  const CFG = {
    brand:    scriptTag.getAttribute('data-brand') || '',
    apiUrl:   (scriptTag.getAttribute('data-api-url') || 'https://lumion.onrender.com').replace(/\/$/, ''),
    lang:     scriptTag.getAttribute('data-lang') || 'uk',
    color:    scriptTag.getAttribute('data-color') || '#111111',
    utm:      scriptTag.getAttribute('data-utm-campaign') || scriptTag.getAttribute('data-brand') || '',
    autoInject: scriptTag.getAttribute('data-auto-inject') !== 'false',
    cartSel:  scriptTag.getAttribute('data-cart-button') || '.add-to-cart,[name="add"],.btn-cart,.product-form__submit',
  };

  // ── TRANSLATIONS ────────────────────────────────────────────
  const I18N = {
    uk: {
      title: 'Віртуальна примірка',
      head: 'Завантаж своє фото',
      desc: 'Фото в повний зріст, природне освітлення, простий фон — так результат буде точнішим.',
      upload: 'Завантажити фото',
      generate: 'Приміряти',
      buy: 'Додати до кошика',
      retry: 'Спробувати ще раз',
      save: 'Зберегти',
      share: 'Поділитись',
      close: '✕',
      privacy: 'Завантажуючи фото, ви приймаєте умови та політику конфіденційності.',
      generating: 'Генеруємо...',
      genSub: 'ШІ приміряє одяг — зазвичай 15–30 сек',
      genMsgs: ['Аналіз силуету...', 'Накладання одягу...', 'Фінальні деталі...'],
      errUpload: 'Не вдалося завантажити фото. Спробуйте інше.',
      errGen: 'Щось пішло не так. Спробуйте ще раз.',
      steps: ['Фото', 'Генерація', 'Результат'],
      aiNote: 'Зображення створюється за допомогою AI. Результат може відрізнятися.',
    },
    ru: {
      title: 'Виртуальная примерка',
      head: 'Загрузи своё фото',
      desc: 'Фото в полный рост, естественное освещение, простой фон — так результат будет точнее.',
      upload: 'Загрузить фото',
      generate: 'Примерить',
      buy: 'Добавить в корзину',
      retry: 'Попробовать ещё раз',
      save: 'Сохранить',
      share: 'Поделиться',
      close: '✕',
      privacy: 'Загружая фото, вы принимаете условия и политику конфиденциальности.',
      generating: 'Генерируем...',
      genSub: 'ИИ примеряет одежду — обычно 15–30 сек',
      genMsgs: ['Анализ силуэта...', 'Наложение одежды...', 'Финальные детали...'],
      errUpload: 'Не удалось загрузить фото. Попробуйте другое.',
      errGen: 'Что-то пошло не так. Попробуйте ещё раз.',
      steps: ['Фото', 'Генерация', 'Результат'],
      aiNote: 'Изображение создаётся с помощью AI. Результат может отличаться.',
    },
    en: {
      title: 'Virtual Try-On',
      head: 'Upload your photo',
      desc: 'Full-body photo with natural lighting and a simple background for the best result.',
      upload: 'Upload photo',
      generate: 'Try On',
      buy: 'Add to cart',
      retry: 'Try Again',
      save: 'Save',
      share: 'Share',
      close: '✕',
      privacy: 'By uploading a photo, you accept our Terms and Privacy Policy.',
      generating: 'Generating...',
      genSub: 'AI is fitting the clothes — usually 15–30 sec',
      genMsgs: ['Analysing body...', 'Fitting garment...', 'Final details...'],
      errUpload: "We couldn't upload this photo. Please try another one.",
      errGen: 'Something went wrong. Please try again.',
      steps: ['Photo', 'Generate', 'Result'],
      aiNote: 'This image is generated using AI. Results may vary.',
    },
  };
  const T = I18N[CFG.lang] || I18N.uk;

  // ── SESSION ─────────────────────────────────────────────────
  const SID = (function () {
    let id = sessionStorage.getItem('lumion_sid');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('lumion_sid', id); }
    return id;
  })();

  // ── SVG PERSON SILHOUETTES ───────────────────────────────────
  const SVG1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" style="width:100%;height:100%;display:block">
    <rect width="100" height="160" fill="#f0ebe3"/>
    <ellipse cx="50" cy="26" rx="16" ry="17" fill="#d9cfc3"/>
    <path d="M26 50 Q50 44 74 50 L70 95 Q50 100 30 95Z" fill="#cec4b8"/>
    <rect x="16" y="52" width="12" height="40" rx="6" fill="#cec4b8"/>
    <rect x="72" y="52" width="12" height="40" rx="6" fill="#cec4b8"/>
    <rect x="30" y="93" width="14" height="50" rx="7" fill="#c4b9ac"/>
    <rect x="56" y="93" width="14" height="50" rx="7" fill="#c4b9ac"/>
  </svg>`;

  const SVG2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160" style="width:100%;height:100%;display:block">
    <rect width="100" height="160" fill="#e8e3dc"/>
    <ellipse cx="50" cy="25" rx="15" ry="16" fill="#ccc0b2"/>
    <path d="M24 48 Q50 42 76 48 L72 90 Q50 96 28 90Z" fill="#bfb3a5"/>
    <path d="M18 54 Q10 70 12 92" stroke="#bfb3a5" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M82 54 Q90 70 88 92" stroke="#bfb3a5" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M30 90 Q34 92 34 143" stroke="#b5a898" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M70 90 Q66 92 66 143" stroke="#b5a898" stroke-width="14" stroke-linecap="round" fill="none"/>
  </svg>`;

  // ── STYLES ───────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    .lo-trigger {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 13px 22px; width: 100%; margin: 8px 0;
      background: transparent; color: ${CFG.color};
      border: 1px solid ${CFG.color}; border-radius: 0;
      font-family: inherit; font-size: 13px; font-weight: 500;
      letter-spacing: 0.05em; cursor: pointer;
      transition: background .18s, color .18s;
    }
    .lo-trigger:hover { background: ${CFG.color}; color: #fff; }

    .lo-backdrop {
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: flex-end; justify-content: center;
      animation: loFade .22s ease;
    }
    @media(min-width:560px){
      .lo-backdrop { align-items: center; padding: 20px; }
    }
    @keyframes loFade { from{opacity:0} to{opacity:1} }

    .lo-modal {
      background: #fff; border-radius: 24px 24px 0 0;
      width: 100%; max-width: 500px;
      max-height: 92vh; overflow-y: auto;
      box-shadow: 0 -8px 60px rgba(0,0,0,.2);
      animation: loUp .3s cubic-bezier(.34,1.4,.64,1);
      font-family: 'Inter', sans-serif; scrollbar-width: none;
    }
    @media(min-width:560px){
      .lo-modal { border-radius: 24px; box-shadow: 0 32px 80px rgba(0,0,0,.25); animation: loScale .28s cubic-bezier(.34,1.4,.64,1); }
    }
    .lo-modal::-webkit-scrollbar { display: none; }
    @keyframes loUp   { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes loScale{ from{transform:scale(.95);opacity:0} to{transform:scale(1);opacity:1} }

    .lo-header {
      position: sticky; top: 0; z-index: 2;
      background: #fff; border-radius: 24px 24px 0 0;
      padding: 18px 20px 14px;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid #f0f0f0;
    }
    @media(min-width:560px){ .lo-header { border-radius: 24px 24px 0 0; } }
    .lo-header-left { display: flex; align-items: center; gap: 10px; }
    .lo-logo { font-size: 13px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #111; }
    .lo-close {
      width: 32px; height: 32px; border-radius: 50%;
      background: #f2f2f2; border: none; cursor: pointer;
      font-size: 14px; color: #777; display: flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s; flex-shrink: 0;
    }
    .lo-close:hover { background: #e5e5e5; color: #111; }

    .lo-steps {
      display: flex; align-items: center; padding: 14px 20px;
      border-bottom: 1px solid #f5f5f5;
    }
    .lo-step { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .lo-sep { flex: 1; height: 1px; background: #e8e8e8; margin: 0 6px; min-width: 14px; transition: background .3s; }
    .lo-sep.active { background: #111; }
    .lo-snum {
      width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid #ddd;
      font-size: 11px; font-weight: 600; color: #ccc;
      display: flex; align-items: center; justify-content: center; transition: all .22s;
    }
    .lo-slbl { font-size: 11px; color: #ccc; white-space: nowrap; transition: color .22s; }
    .lo-step.is-active .lo-snum { border-color: #111; color: #111; }
    .lo-step.is-active .lo-slbl { color: #111; font-weight: 500; }
    .lo-step.is-done .lo-snum { background: #111; border-color: #111; color: #fff; }
    .lo-step.is-done .lo-slbl { color: #aaa; }

    .lo-body { padding: 18px 20px 24px; }

    .lo-product {
      display: flex; gap: 12px; align-items: center;
      background: #f8f8f8; border-radius: 14px; padding: 12px;
      margin-bottom: 18px;
    }
    .lo-pimg { width: 52px; height: 68px; object-fit: cover; border-radius: 10px; background: #eee; flex-shrink: 0; }
    .lo-pname { font-size: 12px; font-weight: 500; color: #111; line-height: 1.45; }
    .lo-pprice { font-size: 12px; color: #999; margin-top: 2px; }

    .lo-upload-head { font-size: 20px; font-weight: 600; color: #111; margin-bottom: 6px; letter-spacing: -.02em; }
    .lo-upload-sub { font-size: 13px; color: #999; line-height: 1.6; margin-bottom: 18px; }

    .lo-zone {
      border: 1.5px dashed #ddd; border-radius: 16px;
      background: #fafafa; cursor: pointer;
      position: relative; overflow: hidden;
      transition: border-color .2s, background .2s;
      min-height: 260px; display: flex; align-items: center; justify-content: center;
    }
    .lo-zone:hover { border-color: #999; background: #f5f5f5; }
    .lo-zone.has-photo { border-style: solid; border-color: #111; min-height: unset; background: #fff; }
    .lo-finput { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .lo-preview { width: 100%; max-height: 320px; object-fit: contain; border-radius: 14px; display: none; }
    .lo-zone.has-photo .lo-preview { display: block; }
    .lo-zone.has-photo .lo-placeholder { display: none; }

    .lo-placeholder { padding: 30px 20px 26px; text-align: center; width: 100%; }
    .lo-silhouettes { display: flex; gap: 14px; justify-content: center; margin-bottom: 18px; }
    .lo-sil {
      width: 100px; height: 150px; border-radius: 12px; overflow: hidden; flex-shrink: 0;
      box-shadow: 0 6px 18px rgba(0,0,0,.1);
    }
    .lo-sil:first-child { transform: rotate(-4deg) translateY(6px); }
    .lo-sil:last-child  { transform: rotate(3deg)  translateY(3px); }
    .lo-upload-btn-text { font-size: 14px; font-weight: 600; color: #111; margin-bottom: 4px; }
    .lo-upload-hint { font-size: 12px; color: #bbb; }

    .lo-privacy { font-size: 11px; color: #c0c0c0; text-align: center; margin-top: 10px; line-height: 1.5; }
    .lo-error { background: #fff2f2; color: #d00; border-radius: 10px; padding: 10px 14px; font-size: 12px; margin-top: 10px; display: none; }

    .lo-btn {
      width: 100%; padding: 16px; border: none; border-radius: 14px;
      font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
      cursor: pointer; margin-top: 14px; transition: background .18s, transform .1s;
    }
    .lo-btn:active { transform: scale(.99); }
    .lo-btn-primary { background: #111; color: #fff; }
    .lo-btn-primary:hover { background: #2a2a2a; }
    .lo-btn-buy { background: #111; color: #fff; margin-top: 10px; }
    .lo-btn-buy:hover { background: #2a2a2a; }

    .lo-generating { text-align: center; padding: 60px 20px 52px; }
    .lo-spinner { width: 42px; height: 42px; margin: 0 auto 22px; border: 2.5px solid #eee; border-top-color: #111; border-radius: 50%; animation: loSpin .8s linear infinite; }
    @keyframes loSpin { to{transform:rotate(360deg)} }
    .lo-gen-title { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 6px; }
    .lo-gen-sub { font-size: 12px; color: #aaa; line-height: 1.6; }
    .lo-progress { height: 3px; background: #f0f0f0; border-radius: 2px; margin: 28px 0 0; overflow: hidden; }
    .lo-pbar { height: 100%; background: #111; border-radius: 2px; width: 0; transition: width 1.4s ease; }

    .lo-result-img { width: 100%; border-radius: 14px; display: block; max-height: 420px; object-fit: contain; background: #f8f8f8; }
    .lo-ai-note { font-size: 11px; color: #bbb; text-align: center; margin-top: 8px; line-height: 1.5; }
    .lo-actions { display: flex; gap: 8px; margin-top: 10px; }
    .lo-actions button {
      flex: 1; padding: 11px 8px; border: 1px solid #e8e8e8; border-radius: 10px;
      background: #fff; font-size: 11px; font-weight: 500; letter-spacing: .04em;
      cursor: pointer; color: #777; font-family: 'Inter', sans-serif; text-transform: uppercase;
      transition: border-color .15s, color .15s;
    }
    .lo-actions button:hover { border-color: #111; color: #111; }

    .lo-footer { text-align: center; padding: 14px 20px 22px; font-size: 10px; color: #ddd; letter-spacing: .08em; text-transform: uppercase; border-top: 1px solid #f5f5f5; margin-top: 4px; }
    .lo-footer a { color: #ccc; text-decoration: none; }
    .lo-footer a:hover { color: #888; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ── STATE ────────────────────────────────────────────────────
  let backdrop = null, personFile = null, resultUrl = null, tryonId = null, utmUrl = null;

  // ── OPEN WIDGET ──────────────────────────────────────────────
  function open(product) {
    if (backdrop) return;

    backdrop = document.createElement('div');
    backdrop.className = 'lo-backdrop';
    backdrop.innerHTML = `
      <div class="lo-modal" role="dialog" aria-modal="true" aria-label="${T.title}">

        <div class="lo-header">
          <div class="lo-header-left">
            <span class="lo-logo">⊙ LumiOn</span>
          </div>
          <button class="lo-close" aria-label="${T.close}">${T.close}</button>
        </div>

        <div class="lo-steps">
          ${T.steps.map((s, i) => `
            <div class="lo-step ${i===0?'is-active':''}" id="lo-s${i+1}">
              <div class="lo-snum">${i+1}</div>
              <div class="lo-slbl">${s}</div>
            </div>
            ${i < T.steps.length-1 ? `<div class="lo-sep" id="lo-sep${i+1}"></div>` : ''}
          `).join('')}
        </div>

        <div class="lo-body">

          ${product.name ? `
          <div class="lo-product">
            ${product.image ? `<img class="lo-pimg" src="${product.image}" alt="" onerror="this.style.display='none'">` : ''}
            <div>
              <div class="lo-pname">${product.name}</div>
              ${product.price ? `<div class="lo-pprice">${product.price}</div>` : ''}
            </div>
          </div>` : ''}

          <!-- Step 1: Upload -->
          <div id="lo-p1">
            <div class="lo-upload-head">${T.head}</div>
            <div class="lo-upload-sub">${T.desc}</div>
            <div class="lo-zone" id="lo-zone">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" class="lo-finput" id="lo-finput">
              <img class="lo-preview" id="lo-preview" alt="">
              <div class="lo-placeholder">
                <div class="lo-silhouettes">
                  <div class="lo-sil">${SVG1}</div>
                  <div class="lo-sil">${SVG2}</div>
                </div>
                <div class="lo-upload-btn-text">${T.upload}</div>
                <div class="lo-upload-hint">JPG · PNG · до 10 МБ</div>
              </div>
            </div>
            <div class="lo-privacy">${T.privacy}</div>
            <div class="lo-error" id="lo-e1"></div>
            <button class="lo-btn lo-btn-primary" id="lo-gbtn">${T.generate}</button>
          </div>

          <!-- Step 2: Generating -->
          <div id="lo-p2" style="display:none">
            <div class="lo-generating">
              <div class="lo-spinner"></div>
              <div class="lo-gen-title" id="lo-gstat">${T.generating}</div>
              <div class="lo-gen-sub">${T.genSub}</div>
              <div class="lo-progress"><div class="lo-pbar" id="lo-pbar"></div></div>
            </div>
          </div>

          <!-- Step 3: Result -->
          <div id="lo-p3" style="display:none">
            <img class="lo-result-img" id="lo-rimg" alt="Try-on result">
            <div class="lo-ai-note">${T.aiNote}</div>
            <div class="lo-actions">
              <button id="lo-save">⬇ ${T.save}</button>
              <button id="lo-share">↗ ${T.share}</button>
              <button id="lo-retry">↺ ${T.retry}</button>
            </div>
            <div class="lo-error" id="lo-e3"></div>
            <button class="lo-btn lo-btn-buy" id="lo-buy">${T.buy}</button>
          </div>

        </div>
        <div class="lo-footer"><a href="https://lumiwebagency.com" target="_blank" rel="noopener">LumiOn · Lumi Web Agency</a></div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    // Events
    backdrop.querySelector('.lo-close').addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onEsc);

    const zone    = backdrop.querySelector('#lo-zone');
    const finput  = backdrop.querySelector('#lo-finput');

    finput.addEventListener('change', e => { const f = e.target.files[0]; if (f) loadFile(f); });
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.style.borderColor = '#111'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) loadFile(f); });
    backdrop.querySelector('#lo-gbtn').addEventListener('click', () => generate(product));
  }

  function loadFile(file) {
    if (!file || !file.type.match(/^image\//)) return;
    personFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      const zone = backdrop.querySelector('#lo-zone');
      backdrop.querySelector('#lo-preview').src = e.target.result;
      zone.classList.add('has-photo');
    };
    reader.readAsDataURL(file);
  }

  async function generate(product) {
    const errEl = backdrop.querySelector('#lo-e1');
    if (!personFile) { errEl.textContent = T.errUpload; errEl.style.display = 'block'; return; }
    errEl.style.display = 'none';
    setStep(2);

    const pbar   = backdrop.querySelector('#lo-pbar');
    const gstat  = backdrop.querySelector('#lo-gstat');
    let prog = 0, mi = 0;
    const msgs = T.genMsgs;
    const iv = setInterval(() => {
      prog = Math.min(prog + Math.random() * 3.5, 90);
      pbar.style.width = prog + '%';
      if (mi < msgs.length && prog > [18, 48, 72][mi]) gstat.textContent = msgs[mi++];
    }, 700);

    try {
      const fd = new FormData();
      fd.append('person_photo', personFile, personFile.name);
      fd.append('brand',       CFG.brand);
      fd.append('session_id',  SID);
      fd.append('product_id',  product.id   || '');
      fd.append('product_name',product.name || '');
      fd.append('product_url', product.url  || '');
      if (product.image) fd.append('garment_url', product.image);

      const res = await fetch(`${CFG.apiUrl}/api/tryon`, { method: 'POST', body: fd });
      clearInterval(iv); pbar.style.width = '100%';

      if (!res.ok) throw new Error('api ' + res.status);
      const data = await res.json();
      resultUrl = data.result_url;
      tryonId   = data.tryon_id;
      utmUrl    = data.utm_url;

      await new Promise(r => setTimeout(r, 300));
      showResult(product);
    } catch (err) {
      clearInterval(iv);
      setStep(1);
      const e = backdrop.querySelector('#lo-e1');
      e.textContent = T.errGen; e.style.display = 'block';
      console.error('[LumiOn]', err);
    }
  }

  function showResult(product) {
    setStep(3);
    backdrop.querySelector('#lo-rimg').src = resultUrl;

    backdrop.querySelector('#lo-buy').addEventListener('click', () => {
      fetch(`${CFG.apiUrl}/api/order-ping`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ brand_slug: CFG.brand, tryon_id: tryonId, product_id: product.id }),
      }).catch(() => {});
      window.location.href = utmUrl || product.url;
    });

    backdrop.querySelector('#lo-save').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = resultUrl; a.download = `lumion_${Date.now()}.jpg`; a.click();
    });

    backdrop.querySelector('#lo-share').addEventListener('click', async () => {
      const link = utmUrl || product.url;
      if (navigator.share) { await navigator.share({ title: product.name, url: link }).catch(() => {}); }
      else {
        await navigator.clipboard.writeText(link).catch(() => {});
        const btn = backdrop.querySelector('#lo-share');
        const orig = btn.textContent; btn.textContent = '✓'; setTimeout(() => btn.textContent = orig, 2000);
      }
    });

    backdrop.querySelector('#lo-retry').addEventListener('click', () => {
      personFile = null; resultUrl = null;
      backdrop.querySelector('#lo-zone').classList.remove('has-photo');
      setStep(1);
    });
  }

  function setStep(n) {
    [1,2,3].forEach(i => {
      backdrop.querySelector(`#lo-p${i}`).style.display = i===n ? 'block' : 'none';
      const s = backdrop.querySelector(`#lo-s${i}`);
      s.classList.toggle('is-active', i===n);
      s.classList.toggle('is-done',   i<n);
      const sep = backdrop.querySelector(`#lo-sep${i}`);
      if (sep) sep.classList.toggle('active', i<n+1);
    });
  }

  function close() {
    if (!backdrop) return;
    document.removeEventListener('keydown', onEsc);
    backdrop.style.opacity = '0'; backdrop.style.transition = 'opacity .18s';
    setTimeout(() => { backdrop && backdrop.remove(); backdrop = null; document.body.style.overflow = ''; personFile = null; resultUrl = null; }, 180);
  }
  function onEsc(e) { if (e.key === 'Escape') close(); }

  // ── AUTO PAGE INFO ───────────────────────────────────────────
  function pageProduct() {
    const og = document.querySelector('meta[property="og:image"]');
    const h1 = document.querySelector('h1');
    const pr = document.querySelector('.price,.product-price,[class*="price"]');
    return {
      image: og ? og.content : null,
      name:  h1 ? h1.textContent.trim().slice(0,80) : document.title.slice(0,80),
      price: pr ? pr.textContent.trim().slice(0,24) : '',
      url:   window.location.href,
      id:    window.location.pathname.split('/').filter(Boolean).pop(),
    };
  }

  // ── BIND MANUAL [data-lumion] BUTTONS ────────────────────────
  function bindManualButtons() {
    document.querySelectorAll('[data-lumion="try-on"]').forEach(btn => {
      btn.addEventListener('click', () => {
        open({
          image: btn.dataset.image || null,
          id:    btn.dataset.id   || '',
          name:  btn.dataset.name || '',
          price: btn.dataset.price || '',
          url:   btn.dataset.url  || window.location.href,
        });
      });
    });
  }

  // ── AUTO-INJECT TRIGGER BUTTON ───────────────────────────────
  function autoInject() {
    const p = pageProduct();
    if (!p.image && !window.location.pathname.match(/product|item|goods|tovar/i)) return;

    const btn = document.createElement('button');
    btn.className = 'lo-trigger';
    btn.innerHTML = `<span style="font-size:16px;line-height:1">◎</span> ${T.generate}`;
    btn.addEventListener('click', () => open(p));

    const cartBtn = document.querySelector(CFG.cartSel);
    if (cartBtn) cartBtn.parentNode.insertBefore(btn, cartBtn.nextSibling);
    else {
      const h1 = document.querySelector('h1');
      if (h1) (h1.closest('section,article,[class*="product"]') || h1.parentNode).appendChild(btn);
    }
  }

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    bindManualButtons();
    if (CFG.autoInject) autoInject();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ── PUBLIC API ───────────────────────────────────────────────
  window.lumiOnWidget = {
    init: (opts) => { if (opts) Object.assign(CFG, opts); return window.lumiOnWidget; },
    open: (product) => open(product || pageProduct()),
    close,
    getInstance: () => ({ open, close }),
    eventService: {
      onOpen:      (fn) => document.addEventListener('lumion:open',      e => fn(e.detail)),
      onClose:     (fn) => document.addEventListener('lumion:close',     e => fn(e.detail)),
      onGenerate:  (fn) => document.addEventListener('lumion:generate',  e => fn(e.detail)),
      onGenerated: (fn) => document.addEventListener('lumion:generated', e => fn(e.detail)),
      onError:     (fn) => document.addEventListener('lumion:error',     e => fn(e.detail)),
    },
  };

  document.dispatchEvent(new CustomEvent('LumiOnLoaded'));

})();
