// Admin check against a copy of the data: every write is intercepted, nothing reaches the API.
const { chromium } = require('playwright');
const fs = require('fs');
const banners = JSON.parse(fs.readFileSync('/vercel/banners.mock.json'));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const writes = [], errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route('https://dnka-api.dnka-world.workers.dev/admin/**', r => {
    const q = r.request(), u = new URL(q.url());
    const ok = d => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) });
    if (u.pathname === '/admin/login') return ok({ token: 'x.y', expires_at: Date.now() + 3e6 });
    if (q.method() === 'GET' && u.pathname === '/admin/t/banners') return ok(banners);
    if (q.method() === 'GET') return ok([]);
    writes.push(q.postData()); return ok({});
  });
  await p.goto('https://preview.dnka.pages.dev/?t=' + Date.now());
  await p.fill('input[type=password]', 't'); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  const sel = '#banners-list-hero .card.v2:nth-child(1)';
  console.log('row', await p.$eval(sel + ' .sum-sched', e => e.textContent));
  await p.click(sel + ' .sum-sched'); await p.waitForTimeout(200);
  console.log('note', await p.$eval('.sched-pop .sp-note', e => e.textContent.slice(0, 60)), '| btn', await p.$eval('.sched-pop .sp-copy', e => e.textContent));
  await p.fill('.sched-pop .sp-row[data-lang=pl] .sp-start', '2026-11-03T12:00');
  await p.click('.sched-pop .sp-copy'); await p.click('.sched-pop .sp-save'); await p.waitForTimeout(500);
  console.log('row after', await p.$eval(sel + ' .sum-sched', e => e.textContent));
  console.log('payload', writes[0]);
  await p.click(sel + ' .btn-toggle'); await p.waitForTimeout(300);
  console.log('editor label', await p.$eval(sel, e => (e.innerText.match(/Розклад показу[^\n]*/) || [''])[0]));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
