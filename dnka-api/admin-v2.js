
/* ---------- Layout v2: each banner is a compact row (picture, title, sites)
   that opens into a full-width editor — computer · phone · texts side by side.
   Banners that are no longer needed go to the archive: hidden on every site,
   kept with all their settings, and can be restored or deleted for good. ---------- */
const openCards = new Set();
groups.hero.archived = [];
groups.category.archived = [];

function bannerTitle(b){
  return String(b.heading || b.heading_en || b.heading_uk || '').trim() || 'Без заголовка';
}
function bannerMeta(b){
  const link = b.button_link || b.button_link_en || b.button_link_uk || '';
  const text = b.button_text || b.button_text_en || b.button_text_uk || '';
  const parts = [];
  if (text) parts.push('Кнопка «' + text + '»');
  if (link) parts.push(link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
  return parts.join(' → ') || 'Без кнопки';
}
// Schedule shown in the row: per site, in that site's own time zone, grouped
// when several sites share the same dates.
const SCHED_LANGS = [['pl', '', 'PL'], ['en', '_en', 'EN'], ['uk', '_uk', 'UK']];
function shortWall(v){
  // "2026-11-05T10:00" → "05.11 10:00" (year only when it isn't this year)
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(v || '');
  if (!m) return '';
  return `${m[3]}.${m[2]}${+m[1] !== new Date().getFullYear() ? '.' + m[1] : ''} ${m[4]}`;
}
function scheduleChips(sched){
  const groupsBy = new Map();
  for (const s of sched) {
    if (!s.start && !s.end) continue;
    const key = s.start + '|' + s.end;
    if (!groupsBy.has(key)) groupsBy.set(key, Object.assign({ sites: [] }, s));
    groupsBy.get(key).sites.push(s.label);
  }
  if (!groupsBy.size) return '<span class="sched-chip none">+ Дата показу</span>';
  const now = Date.now();
  return [...groupsBy.values()].map(g => {
    const startMs = g.start ? Date.parse(zonedInputToIso(g.start, SITE_TZ[g.lang])) : -Infinity;
    const endMs = g.end ? Date.parse(zonedInputToIso(g.end, SITE_TZ[g.lang])) : Infinity;
    const state = now < startMs ? 'soon' : now >= endMs ? 'over' : 'live';
    const hint = { soon: 'Ще не почався', live: 'Показується зараз', over: 'Вже закінчився' }[state];
    const text = (g.start ? 'з ' + shortWall(g.start) : '') + (g.start && g.end ? ' ' : '') + (g.end ? 'до ' + shortWall(g.end) : '');
    return `<span class="sched-chip ${state}" title="${hint}"><b>${g.sites.join(' · ')}</b> ${escapeHtml(text)}</span>`;
  }).join('');
}

function thumbHtml(b){
  return `<div class="sum-thumb">${b.image_url ? `<img src="${escapeAttr(b.image_url)}" alt="" loading="lazy">` : '<span>немає фото</span>'}</div>`;
}

loadBanners = async function(){
  const { data, error } = await sb.from('banners').select('*').order('position', { ascending: true });
  if (error) { toast('Помилка завантаження: ' + error.message); return; }
  for (const placement of ['hero', 'category']) {
    const all = (data || []).filter(b => b.placement === placement);
    groups[placement].list = all.filter(b => !b.archived);
    groups[placement].archived = all.filter(b => b.archived);
  }
  render('hero');
  render('category');
};

const renderV1 = render;
render = function(placement){
  renderV1(placement);
  renderArchive(placement);
};

const renderCardV1 = renderCard;
renderCard = function(placement, b, idx){
  const card = renderCardV1(placement, b, idx);
  enhanceCard(card, placement, b);
  return card;
};

function enhanceCard(card, placement, b){
  card.classList.add('v2');
  const head = card.querySelector('.card-head');
  const grid = card.querySelector('.grid');
  const imgCol = grid.querySelector('.img-col');
  const fields = grid.querySelector('.fields');

  // compact summary in place of the empty spacer of the old header
  const sum = document.createElement('div');
  sum.className = 'card-sum';
  sum.title = 'Натисніть, щоб відкрити або згорнути';
  sum.innerHTML = thumbHtml(b) + `<div class="sum-text"><div class="sum-title"></div><div class="sum-meta"></div></div>`;
  const spacer = [...head.children].find(el => el.getAttribute('style') === 'flex:1');
  if (spacer) spacer.replaceWith(sum); else head.insertBefore(sum, head.querySelector('.badges-lang'));
  const actions = document.createElement('div');
  actions.className = 'head-actions';
  actions.innerHTML = `<button type="button" class="btn-ghost act-archive" title="Сховати з усіх сайтів і перенести в архів">В архів</button>
    <button type="button" class="btn-toggle"></button>`;
  const sched = document.createElement('button');
  sched.type = 'button';
  sched.className = 'sum-sched';
  sched.title = 'Змінити дати показу';
  head.insertBefore(sched, head.querySelector('.badges-lang'));
  head.appendChild(actions);

  // three columns: computer picture (+ button position) · phone picture · texts
  const body = document.createElement('div');
  body.className = 'card-body';
  const colD = document.createElement('div');
  colD.className = 'col-desk img-col';
  colD.innerHTML = `<div class="col-title">Комп'ютер</div>`;
  const colM = document.createElement('div');
  colM.className = 'col-mob img-col';
  colM.innerHTML = `<div class="col-title">Телефон</div>`;
  const deskDrop = imgCol.querySelector('.img-drop:not(.mobile)');
  if (deskDrop) colD.appendChild(deskDrop);
  const posDesk = card.querySelector('.btn-pos-d');
  if (posDesk) colD.appendChild(posDesk);
  while (imgCol.firstChild) colM.appendChild(imgCol.firstChild);
  fields.classList.add('col-fields');
  body.append(colD, colM, fields);
  grid.replaceWith(body);

  // the row title follows what's typed, before it's even saved
  const refreshSum = () => {
    const val = c => (card.querySelector('.f-' + c) || {}).value;
    const live = Object.assign({}, b, {
      heading: val('heading-pl') ?? b.heading, heading_en: val('heading-en') ?? b.heading_en, heading_uk: val('heading-uk') ?? b.heading_uk,
      button_text: val('button-text-pl') ?? b.button_text, button_link: val('button-link-pl') ?? b.button_link,
    });
    sum.querySelector('.sum-title').textContent = bannerTitle(live);
    sum.querySelector('.sum-meta').textContent = bannerMeta(live);
    sched.innerHTML = scheduleChips(SCHED_LANGS.map(([lang, sfx, label]) => ({
      lang, label,
      start: val('starts-' + lang) ?? (b['starts_at' + sfx] ? isoToZonedInput(b['starts_at' + sfx], SITE_TZ[lang]) : ''),
      end: val('ends-' + lang) ?? (b['ends_at' + sfx] ? isoToZonedInput(b['ends_at' + sfx], SITE_TZ[lang]) : ''),
    })));
  };
  refreshSum();
  fields.addEventListener('input', refreshSum);
  fields.addEventListener('change', refreshSum);
  // "очистити" under a date empties it without an input event
  fields.addEventListener('click', e => { if (e.target.closest('.clear-date')) setTimeout(refreshSum, 0); });

  const toggle = actions.querySelector('.btn-toggle');
  const setOpen = open => {
    card.classList.toggle('open', open);
    toggle.textContent = open ? 'Згорнути' : 'Редагувати';
    if (open) openCards.add(b.id); else openCards.delete(b.id);
  };
  // a fresh, still-empty slide opens straight away so it can be filled in
  setOpen(openCards.has(b.id) || !b.image_url);
  toggle.addEventListener('click', () => setOpen(!card.classList.contains('open')));
  sum.addEventListener('click', () => setOpen(!card.classList.contains('open')));
  actions.querySelector('.act-archive').addEventListener('click', () => archiveBanner(placement, b.id));
  sched.addEventListener('click', e => { e.stopPropagation(); openSchedPopover(card, b, sched, refreshSum); });
}

// Dates straight from the row: a small popover with "from / until" for each
// site, saved on its own — no need to open the banner.
let schedPop = null;
function closeSchedPopover(){
  if (!schedPop) return;
  schedPop.remove();
  schedPop = null;
  document.removeEventListener('mousedown', schedOutside, true);
  document.removeEventListener('keydown', schedEsc, true);
}
function schedOutside(e){ if (schedPop && !schedPop.contains(e.target) && !e.target.closest('.sum-sched')) closeSchedPopover(); }
function schedEsc(e){ if (e.key === 'Escape') closeSchedPopover(); }

function openSchedPopover(card, b, anchor, refresh){
  const reopen = schedPop && schedPop.dataset.id === b.id;
  closeSchedPopover();
  if (reopen) return;
  const editorVal = c => (card.querySelector('.f-' + c) || {}).value;
  const current = (lang, sfx, key) => editorVal(key + '-' + lang) ??
    (b[key + '_at' + sfx] ? isoToZonedInput(b[key + '_at' + sfx], SITE_TZ[lang]) : '');
  const pop = document.createElement('div');
  pop.className = 'sched-pop';
  pop.dataset.id = b.id;
  pop.innerHTML = `
    <div class="sp-head"><b>Розклад показу</b><button type="button" class="sp-x" aria-label="Закрити">×</button></div>
    ${SCHED_LANGS.map(([lang, sfx, label]) => `
      <div class="sp-row" data-lang="${lang}">
        <span class="sp-lang${b['active' + sfx] ? '' : ' off'}" title="${b['active' + sfx] ? 'Показується на сайті' : 'Вимкнено на цьому сайті'}">${label}</span>
        <label>з<input type="datetime-local" class="sp-start" value="${escapeAttr(current(lang, sfx, 'starts'))}"></label>
        <label>до<input type="datetime-local" class="sp-end" value="${escapeAttr(current(lang, sfx, 'ends'))}"></label>
        <button type="button" class="sp-clear" title="Без обмежень за часом">очистити</button>
      </div>`).join('')}
    <div class="sp-note">Час — за часом сайту: PL і EN — Варшава, UK — Київ. Порожньо — без обмежень. Працює лише на сайтах, де стоїть галочка «Показувати на сайті».</div>
    <div class="sp-actions">
      <button type="button" class="btn-ghost sp-copy">Як у PL — для всіх</button>
      <button type="button" class="btn-toggle sp-save">Зберегти</button>
    </div>`;
  document.body.appendChild(pop);
  schedPop = pop;

  // under the dates in the row; a bottom sheet on phones
  if (innerWidth > 760) {
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth;
    pop.style.top = (r.bottom + scrollY + 8) + 'px';
    pop.style.left = Math.max(12, Math.min(r.right + scrollX - w, scrollX + innerWidth - w - 12)) + 'px';
  } else {
    pop.classList.add('sheet');
  }
  setTimeout(() => {
    document.addEventListener('mousedown', schedOutside, true);
    document.addEventListener('keydown', schedEsc, true);
  }, 0);

  pop.querySelector('.sp-x').addEventListener('click', closeSchedPopover);
  pop.querySelectorAll('.sp-clear').forEach(btn => btn.addEventListener('click', () => {
    const row = btn.closest('.sp-row');
    row.querySelector('.sp-start').value = '';
    row.querySelector('.sp-end').value = '';
  }));
  pop.querySelector('.sp-copy').addEventListener('click', () => {
    const pl = pop.querySelector('.sp-row[data-lang="pl"]');
    pop.querySelectorAll('.sp-row').forEach(row => {
      row.querySelector('.sp-start').value = pl.querySelector('.sp-start').value;
      row.querySelector('.sp-end').value = pl.querySelector('.sp-end').value;
    });
  });

  pop.querySelector('.sp-save').addEventListener('click', async () => {
    const payload = {};
    for (const [lang, sfx, label] of SCHED_LANGS) {
      const row = pop.querySelector(`.sp-row[data-lang="${lang}"]`);
      const start = row.querySelector('.sp-start').value;
      const end = row.querySelector('.sp-end').value;
      if (start && end && end <= start) { toast(label + ': дата «до» має бути пізніше за «з»'); return; }
      payload['starts_at' + sfx] = start ? zonedInputToIso(start, SITE_TZ[lang]) : null;
      payload['ends_at' + sfx] = end ? zonedInputToIso(end, SITE_TZ[lang]) : null;
    }
    const btn = pop.querySelector('.sp-save');
    btn.disabled = true; btn.textContent = 'Збереження…';
    const { error } = await sb.from('banners').update(payload).eq('id', b.id);
    btn.disabled = false; btn.textContent = 'Зберегти';
    if (error) { toast('Помилка: ' + error.message); return; }
    Object.assign(b, payload);
    // keep the banner's own editor in step, so a later "Зберегти" there doesn't undo this
    for (const [lang, sfx] of SCHED_LANGS) {
      const s = card.querySelector('.f-starts-' + lang), e = card.querySelector('.f-ends-' + lang);
      if (s) s.value = b['starts_at' + sfx] ? isoToZonedInput(b['starts_at' + sfx], SITE_TZ[lang]) : '';
      if (e) e.value = b['ends_at' + sfx] ? isoToZonedInput(b['ends_at' + sfx], SITE_TZ[lang]) : '';
    }
    refresh();
    closeSchedPopover();
    toast('Розклад збережено');
  });
}

function renderArchive(placement){
  const group = groups[placement];
  let box = document.getElementById('archive-' + placement);
  if (!box) {
    box = document.createElement('details');
    box.className = 'archive';
    box.id = 'archive-' + placement;
    group.el.after(box);
  }
  const wasOpen = box.open;
  const items = group.archived;
  box.innerHTML = `<summary>Архів (${items.length})</summary>` + (items.length
    ? items.map(b => `
      <div class="archive-row" data-id="${escapeAttr(b.id)}">
        ${thumbHtml(b)}
        <div class="sum-text"><div class="sum-title">${escapeHtml(bannerTitle(b))}</div><div class="sum-meta">${escapeHtml(bannerMeta(b))}</div></div>
        <button type="button" class="btn-ghost act-restore">Повернути</button>
        <button type="button" class="btn-ghost danger act-delete">Видалити назавжди</button>
      </div>`).join('')
    : `<div class="archive-empty">Тут з'являться банери, які ви перенесете в архів. На сайтах вони не показуються, але їх можна повернути.</div>`);
  box.open = wasOpen;
  box.querySelectorAll('.archive-row').forEach(row => {
    row.querySelector('.act-restore').addEventListener('click', () => restoreBanner(placement, row.dataset.id));
    row.querySelector('.act-delete').addEventListener('click', () => deleteArchived(placement, row.dataset.id));
  });
}

async function archiveBanner(placement, id){
  const group = groups[placement];
  const b = group.list.find(x => x.id === id);
  if (!b) return;
  if (!confirm('Перенести банер в архів?\n\nНа всіх сайтах він зникне, але всі налаштування збережуться — його можна буде повернути.')) return;
  const { error } = await sb.from('banners').update({ archived: true }).eq('id', id);
  if (error) { toast('Помилка: ' + error.message); return; }
  b.archived = true;
  group.list = group.list.filter(x => x.id !== id);
  group.archived.unshift(b);
  openCards.delete(id);
  render(placement);
  toast('Банер у архіві — на сайтах його вже немає');
}

async function restoreBanner(placement, id){
  const group = groups[placement];
  const b = group.archived.find(x => x.id === id);
  if (!b) return;
  // back at the end of the slider; the per-site "show" ticks stay as they were
  const position = group.list.length ? Math.max(...group.list.map(x => x.position)) + 1 : 0;
  const { error } = await sb.from('banners').update({ archived: false, position }).eq('id', id);
  if (error) { toast('Помилка: ' + error.message); return; }
  Object.assign(b, { archived: false, position });
  group.archived = group.archived.filter(x => x.id !== id);
  group.list.push(b);
  render(placement);
  toast('Банер повернуто в кінець списку');
}

async function deleteArchived(placement, id){
  const group = groups[placement];
  const b = group.archived.find(x => x.id === id);
  if (!b) return;
  if (!confirm('Видалити банер назавжди? Повернути його вже не вийде.')) return;
  const { error } = await sb.from('banners').delete().eq('id', id);
  if (error) { toast('Помилка: ' + error.message); return; }
  for (const url of [b.image_url, b.image_url_mobile]) {
    const path = url && extractStoragePath(url);
    if (path) sb.storage.from('banner-images').remove([path]).catch(() => {});
  }
  group.archived = group.archived.filter(x => x.id !== id);
  render(placement);
  toast('Банер видалено');
}
