/* Nicholas A. Wahlman portfolio: navigation, case studies, photo viewer */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('.menu-btn'), nav = $('#site-nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', function (e) { if (nav.classList.contains('open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false); });

  /* ---------- Current section in the menu + reading progress ---------- */
  var links = $$('a[href^="#"]', nav);
  var sections = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  var bar = $('.progress span');
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    // active = last section whose top has passed 40% of the screen; bottom of page = last section
    var marker = y + vh * 0.4, current = null;
    sections.forEach(function (s) { if (s.offsetTop <= marker) current = s; });
    if (y >= max - 4) current = sections[sections.length - 1];
    links.forEach(function (a) {
      var on = current && a.getAttribute('href') === '#' + current.id;
      a.classList.toggle('is-active', !!on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();

  /* ---------- Back to top ---------- */
  $$('[data-top]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    });
  });

  /* ---------- Toast + copy email ---------- */
  var toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  var toastTimer;
  function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2000); }
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var done = function () { showToast('Email copied'); b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1800); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { fallback(text); done(); });
      else { fallback(text); done(); }
    });
  });
  function fallback(text) { var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); }

  /* ---------- Case study panels (with shareable links like #case-synchro) ---------- */
  var openCase = null, caseOpener = null;
  function lock() { root.classList.add('no-scroll'); }
  function unlockIfIdle() { if (!openCase && !lb.open) root.classList.remove('no-scroll'); }
  function showCase(id, fromHash) {
    var dlg = document.getElementById(id);
    if (!dlg || dlg.tagName !== 'DIALOG') return;
    if (openCase && openCase !== dlg) { var prev = openCase; openCase = null; prev.close(); }
    if (!caseOpener) caseOpener = document.activeElement;
    openCase = dlg;
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    lock();
    if (!fromHash && location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    $('h2', dlg).focus({ preventScroll: true });
  }
  $$('dialog.case').forEach(function (dlg) {
    $('.case-close', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); // click on the dimmed area
    dlg.addEventListener('close', function () {
      if (openCase === dlg) {
        openCase = null;
        if (/^#case-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
        if (caseOpener && caseOpener.focus) caseOpener.focus({ preventScroll: true });
        caseOpener = null;
      }
      unlockIfIdle();
    });
  });
  $$('[data-case]').forEach(function (b) { b.addEventListener('click', function () { showCase(b.getAttribute('data-case')); }); });
  if (/^#case-/.test(location.hash)) showCase(location.hash.slice(1), true);
  window.addEventListener('hashchange', function () { if (/^#case-/.test(location.hash)) showCase(location.hash.slice(1), true); });

  /* ---------- Photo viewer ---------- */
  var lb = document.createElement('dialog');
  lb.className = 'lightbox';
  lb.setAttribute('aria-label', 'Photo viewer');
  lb.innerHTML =
    '<figure class="lb-figure"><img class="lb-img" alt=""><figcaption class="lb-cap"><span class="lb-text"></span><span class="lb-count"></span></figcaption></figure>' +
    '<button class="lb-btn lb-close" type="button" aria-label="Close photo">&times;</button>' +
    '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo">&#8249;</button>' +
    '<button class="lb-btn lb-next" type="button" aria-label="Next photo">&#8250;</button>';
  document.body.appendChild(lb);
  var lbImg = $('.lb-img', lb), lbText = $('.lb-text', lb), lbCount = $('.lb-count', lb);
  var group = [], idx = 0, lbOpener = null;

  function caption(img) {
    if (img.dataset.caption) return img.dataset.caption;
    var fig = img.closest('figure'), fc = fig && fig.querySelector('figcaption');
    var alt = img.getAttribute('alt') || '';
    return fc && fc.textContent.trim().length > alt.length ? fc.textContent.trim() : alt;
  }
  function show(i) {
    idx = (i + group.length) % group.length;
    var img = group[idx];
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbText.textContent = caption(img);
    lbCount.textContent = (idx + 1) + ' / ' + group.length;
    lb.classList.toggle('single', group.length < 2);
  }
  function openLb(img) {
    var scope = img.closest('dialog') || img.closest('section') || document;
    group = $$('img[data-zoom]', scope).filter(function (el) { return el.offsetParent !== null; });
    if (group.indexOf(img) < 0) group = [img];
    lbOpener = img;
    show(group.indexOf(img));
    lb.showModal();
    lock();
  }
  $$('img[data-zoom]').forEach(function (img) {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'View larger: ' + (img.alt || 'photo'));
    img.addEventListener('click', function () { openLb(img); });
    img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(img); } });
  });
  $('.lb-close', lb).addEventListener('click', function () { lb.close(); });
  $('.lb-prev', lb).addEventListener('click', function () { show(idx - 1); });
  $('.lb-next', lb).addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });
  lb.addEventListener('close', function () { unlockIfIdle(); if (lbOpener) lbOpener.focus({ preventScroll: true }); });
  // swipe on phones
  var sx = null;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50 && group.length > 1) show(idx + (dx < 0 ? 1 : -1));
  });
})();

/* =====================================================================
   Signal vs. all-way stop: interactive intersection
   LOS / delay values are from the example Synchro 12 model.
   The vehicle animation is a simplified illustration only.
   ===================================================================== */
(function () {
  'use strict';
  var root = document.getElementById('signal-demo');
  if (!root) return;
  var canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- model results (example Synchro 12 model, Franklin Ave at Maple Ln) ----
  var DATA = {
    awsc:   { NB: ['F', 102.3], SB: ['F', 67.0], EB: ['C', 16.3], WB: ['B', 14.0] },
    signal: { NB: ['B', 14.1],  SB: ['B', 14.7], EB: ['A', 9.1],  WB: ['A', 8.4] }
  };
  var MAXD = 102.3, mode = 'awsc';
  var rows = {};
  Array.prototype.forEach.call(root.querySelectorAll('tr[data-app]'), function (tr) {
    rows[tr.getAttribute('data-app')] = { los: tr.querySelector('.los'), bar: tr.querySelector('.bar span'), dly: tr.querySelector('.dly'), val: 0 };
  });
  var critNum = root.querySelector('.crit-num'), critDelta = root.querySelector('.crit-delta');
  var losClass = function (l) { return l <= 'B' ? 'ok' : l <= 'D' ? 'mid' : 'bad'; };

  function tween(from, to, cb) {
    if (reduce) { cb(to); return; }
    var t0 = performance.now(), D = 500;
    (function f(now) {
      var k = Math.min(1, (now - t0) / D); k = 1 - Math.pow(1 - k, 3);
      cb(from + (to - from) * k);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }
  function renderPanel() {
    Object.keys(rows).forEach(function (a) {
      var r = rows[a], d = DATA[mode][a];
      r.los.textContent = d[0];
      r.los.className = 'los ' + losClass(d[0]);
      r.bar.style.width = (d[1] / MAXD * 100) + '%';
      r.bar.className = losClass(d[0]);
      tween(r.val, d[1], function (v) { r.dly.textContent = v.toFixed(1) + ' s'; });
      r.val = d[1];
    });
    var from = parseFloat(critNum.textContent), to = DATA[mode].NB[1];
    tween(from, to, function (v) { critNum.textContent = v.toFixed(1) + ' s'; });
    critNum.className = 'crit-num ' + losClass(DATA[mode].NB[0]);
    critDelta.textContent = mode === 'signal' ? '86% lower than all-way stop (LOS F to B)' : 'LOS F under all-way stop control';
  }

  // ---- simplified vehicle animation ----
  var W = 600, C = 300, HALF = 26, OFF = 13, L = 18, CW = 10;
  var STOP = 299, BOX_END = STOP + 5 + HALF * 2 + L, END = W + 60 + L;
  var VMAX = 78, ACC = 70, B = 110, GAP = 6;
  var APPS = {
    NB: { ax: 'NS', opp: 'SB', mean: 2.7, pos: function (s) { return [C + OFF, W + 30 - s]; }, rot: 0 },
    SB: { ax: 'NS', opp: 'NB', mean: 3.3, pos: function (s) { return [C - OFF, -30 + s]; }, rot: 0 },
    EB: { ax: 'EW', opp: 'WB', mean: 9.5, pos: function (s) { return [-30 + s, C + OFF]; }, rot: 1 },
    WB: { ax: 'EW', opp: 'EB', mean: 11,  pos: function (s) { return [W + 30 - s, C - OFF]; }, rot: 1 }
  };
  var KEYS = ['NB', 'SB', 'EB', 'WB'];
  var seed = 20260724;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  var lanes = {}, T = 0, lastClear = -9;
  KEYS.forEach(function (k) { lanes[k] = { cars: [], next: rnd() * APPS[k].mean, pending: 0 }; });
  // two-phase signal: Franklin Ave (NS) then Maple Ln (EW)
  var PH = [['NS', 'g', 19], ['NS', 'y', 3], ['', 'r', 1.3], ['EW', 'g', 6], ['EW', 'y', 3], ['', 'r', 1.3]], ph = 2, pt = 0;
  function light(ax) { var p = PH[ph]; return p[0] === ax ? p[1] : 'r'; }

  function boxBusy() {
    for (var i = 0; i < 4; i++) { var cs = lanes[KEYS[i]].cars; for (var j = 0; j < cs.length; j++) if (cs[j].s > STOP + 1 && cs[j].s < BOX_END) return true; }
    return false;
  }
  function lead(k) { var cs = lanes[k].cars; for (var j = 0; j < cs.length; j++) if (cs[j].s <= STOP + 0.5 && !cs[j].go) return cs[j]; return null; }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    KEYS.forEach(function (k) {
      lanes[k].cars.forEach(function (c) {
        if (c.s <= STOP) { c.stopT = 0; c.go = (STOP - c.s) < c.v * c.v / (2 * B) + 4 && c.v > 25; }
      });
    });
    if (m === 'signal') { ph = 2; pt = 0; }
    lastClear = T;
    Array.prototype.forEach.call(root.querySelectorAll('.seg button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
    renderPanel();
    if (reduce) { for (var i = 0; i < 1500; i++) step(0.04); draw(); }
  }

  function step(dt) {
    T += dt;
    if (mode === 'signal') { pt += dt; if (pt >= PH[ph][2]) { pt = 0; ph = (ph + 1) % PH.length; } }
    // arrivals
    KEYS.forEach(function (k) {
      var ln = lanes[k];
      ln.next -= dt;
      if (ln.next <= 0) { ln.pending = Math.min(ln.pending + 1, 10); ln.next += APPS[k].mean * (0.45 + rnd() * 1.1); }
      var last = ln.cars[ln.cars.length - 1];
      if (ln.pending > 0 && (!last || last.s - L > GAP + 10)) { ln.cars.push({ s: 0, v: last ? Math.min(VMAX, last.v + 20) : VMAX, go: false, stopT: 0, wait: 0 }); ln.pending--; }
    });
    // all-way stop dispatcher: first to stop goes first; the opposing through vehicle may go with it
    if (mode === 'awsc') {
      var busy = boxBusy();
      if (busy) lastClear = T;
      else if (T - lastClear > 0.7) {
        var best = null, bk = null;
        KEYS.forEach(function (k) { var c = lead(k); if (c && c.stopT && T - c.stopT > 0.6 && (!best || c.stopT < best.stopT)) { best = c; bk = k; } });
        if (best) { best.go = true; var o = lead(APPS[bk].opp); if (o && o.stopT && T - o.stopT > 0.6) o.go = true; lastClear = T; }
      }
    }
    // car following
    KEYS.forEach(function (k) {
      var cs = lanes[k].cars, ax = APPS[k].ax;
      for (var j = 0; j < cs.length; j++) {
        var c = cs[j], gap = Infinity;
        if (j > 0) gap = cs[j - 1].s - L - GAP - c.s;
        if (c.s <= STOP + 0.5 && !c.go) {
          var must;
          if (mode === 'awsc') must = true;
          else { var lt = light(ax); must = lt === 'r' || (lt === 'y' && (STOP - c.s) > c.v * c.v / (2 * B) + 4); if (lt === 'y' && !must) c.go = true; }
          if (must) gap = Math.min(gap, STOP - c.s);
        }
        var vt = gap <= 0.2 ? 0 : Math.min(VMAX, Math.sqrt(2 * B * gap));
        c.v = c.v < vt ? Math.min(vt, c.v + ACC * dt) : Math.max(vt, c.v - B * 1.6 * dt);
        c.s += c.v * dt;
        if (j > 0) c.s = Math.min(c.s, cs[j - 1].s - L - 2);
        if (mode === 'awsc' && !c.go && !c.stopT && c.v < 3 && STOP - c.s < 4 && (j === 0 || cs[j - 1].s > STOP + 0.5)) c.stopT = T;
        c.wait = c.s <= STOP + 0.5 ? Math.min(30, c.wait + (1 - c.v / VMAX) * dt) : Math.max(0, c.wait - dt * 12);
      }
      while (cs.length && cs[0].s > END) cs.shift();
    });
  }

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function mix(a, b, k) { return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')'; }

  var Z = 1.2, V0 = W / 2 - W / 2 / Z, V1 = W - V0;
  var CTRL = { NB: [C + HALF + 15, C + HALF + 16], SB: [C - HALF - 15, C - HALF - 16], EB: [C - HALF - 16, C + HALF + 15], WB: [C + HALF + 16, C - HALF - 15] };
  function draw() {
    var cw = canvas.width, k = cw / W;
    ctx.setTransform(k * Z, 0, 0, k * Z, -(Z - 1) * W / 2 * k, -(Z - 1) * W / 2 * k);
    ctx.clearRect(0, 0, W, W);
    // pavement
    ctx.fillStyle = '#1B3450';
    ctx.fillRect(C - HALF, 0, HALF * 2, W); ctx.fillRect(0, C - HALF, W, HALF * 2);
    // edge lines
    ctx.strokeStyle = 'rgba(173,196,222,.28)'; ctx.lineWidth = 1;
    ctx.beginPath();
    [[C - HALF, 0, C - HALF, C - HALF], [C + HALF, 0, C + HALF, C - HALF], [C - HALF, C + HALF, C - HALF, W], [C + HALF, C + HALF, C + HALF, W],
     [0, C - HALF, C - HALF, C - HALF], [0, C + HALF, C - HALF, C + HALF], [C + HALF, C - HALF, W, C - HALF], [C + HALF, C + HALF, W, C + HALF]]
      .forEach(function (l) { ctx.moveTo(l[0], l[1] + .5 * (l[1] === l[3])); ctx.lineTo(l[2], l[3] + .5 * (l[1] === l[3])); });
    ctx.stroke();
    // centerlines
    ctx.strokeStyle = 'rgba(224,176,82,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(C, 0); ctx.lineTo(C, C - HALF - 6); ctx.moveTo(C, C + HALF + 6); ctx.lineTo(C, W);
    ctx.moveTo(0, C); ctx.lineTo(C - HALF - 6, C); ctx.moveTo(C + HALF + 6, C); ctx.lineTo(W, C);
    ctx.stroke();
    // stop bars
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(C + 1, C + HALF + 3); ctx.lineTo(C + HALF, C + HALF + 3);
    ctx.moveTo(C - HALF, C - HALF - 3); ctx.lineTo(C - 1, C - HALF - 3);
    ctx.moveTo(C - HALF - 3, C + 1); ctx.lineTo(C - HALF - 3, C + HALF);
    ctx.moveTo(C + HALF + 3, C - HALF); ctx.lineTo(C + HALF + 3, C - 1);
    ctx.stroke();
    // labels
    ctx.fillStyle = 'rgba(201,214,228,.62)'; ctx.font = '600 12px Montserrat, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillText('Maple Ln', V0 + 14, C - HALF - 14);
    ctx.save(); ctx.translate(C + HALF + 14, V0 + 14); ctx.rotate(Math.PI / 2); ctx.fillText('Franklin Ave', 0, 0); ctx.restore();
    ctx.fillStyle = 'rgba(201,214,228,.9)'; ctx.font = '700 11px Montserrat, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('NB', C + HALF + 18, V1 - 16); ctx.fillText('SB', C - HALF - 18, V0 + 16);
    ctx.fillText('EB', V0 + 20, C + HALF + 16); ctx.fillText('WB', V1 - 20, C - HALF - 16);
    // traffic control
    KEYS.forEach(function (a) {
      var p = CTRL[a];
      if (mode === 'awsc') {
        ctx.fillStyle = '#C8323F'; ctx.beginPath();
        for (var i = 0; i < 8; i++) { var an = Math.PI / 8 + i * Math.PI / 4; ctx[i ? 'lineTo' : 'moveTo'](p[0] + Math.cos(an) * 8.5, p[1] + Math.sin(an) * 8.5); }
        ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
      } else {
        var lt = light(APPS[a].ax), horiz = APPS[a].rot === 1;
        var w = horiz ? 30 : 12, h = horiz ? 12 : 30;
        ctx.fillStyle = '#0A1626'; rr(p[0] - w / 2, p[1] - h / 2, w, h, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(173,196,222,.35)'; ctx.lineWidth = 1; ctx.stroke();
        [['r', '#E5484D'], ['y', '#F2C14E'], ['g', '#3DBE7B']].forEach(function (d, i) {
          var dx = horiz ? (i - 1) * 9 : 0, dy = horiz ? 0 : (i - 1) * 9;
          ctx.beginPath(); ctx.arc(p[0] + dx, p[1] + dy, 3.2, 0, 7);
          ctx.fillStyle = lt === d[0] ? d[1] : 'rgba(173,196,222,.16)';
          if (lt === d[0]) { ctx.shadowColor = d[1]; ctx.shadowBlur = 8; }
          ctx.fill(); ctx.shadowBlur = 0;
        });
      }
    });
    // vehicles
    KEYS.forEach(function (a) {
      var ap = APPS[a];
      lanes[a].cars.forEach(function (c) {
        var p = ap.pos(c.s - L / 2), w = ap.rot ? L : CW, h = ap.rot ? CW : L;
        ctx.fillStyle = mix([226, 233, 241], [224, 106, 124], Math.max(0, Math.min(1, (c.wait - 5) / 14)));
        rr(p[0] - w / 2, p[1] - h / 2, w, h, 3); ctx.fill();
      });
    });
  }

  function fit() {
    var cssW = canvas.clientWidth || 600, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var px = Math.round(cssW * dpr);
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    draw();
  }

  var running = false, visible = false, lastT = 0;
  function loop(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || !visible || document.hidden) return; running = true; lastT = performance.now(); requestAnimationFrame(loop); }
  function stop() { running = false; }

  Array.prototype.forEach.call(root.querySelectorAll('.seg button'), function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
  for (var i = 0; i < 1100; i++) step(0.04);   // start with traffic already on the road
  renderPanel(); fit();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.15 }).observe(root);
  else { visible = true; start(); }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
})();

/* ---------- Automation: one-case race + time-saved calculator ---------- */
(function () {
  'use strict';
  var calc = document.querySelector('.calc');
  if (!calc) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fills = calc.querySelectorAll('.race-fill'), times = calc.querySelectorAll('.race-time'), btn = calc.querySelector('.race-btn');
  var SPEED = 12, TOTAL = 72, raf = 0;
  function setRace(t) {
    for (var i = 0; i < fills.length; i++) {
      var secs = +fills[i].getAttribute('data-secs'), cur = Math.min(secs, t);
      fills[i].style.width = (cur / TOTAL * 100) + '%';
      times[i].textContent = cur.toFixed(1) + ' s';
      fills[i].parentNode.parentNode.classList.toggle('done', cur >= secs);
    }
  }
  setRace(TOTAL);
  btn.addEventListener('click', function () {
    cancelAnimationFrame(raf);
    if (reduce) { setRace(TOTAL); return; }
    var t0 = performance.now(); btn.disabled = true; btn.textContent = 'Running…';
    (function f(now) {
      var t = (now - t0) / 1000 * SPEED; setRace(t);
      if (t < TOTAL) raf = requestAnimationFrame(f); else { btn.disabled = false; btn.textContent = 'Run it again'; }
    })(t0);
  });
  var input = document.getElementById('cases'), out = document.getElementById('cases-out');
  var fmt = function (sec) { var h = sec / 3600; return h >= 1 ? h.toFixed(1) + ' hr' : Math.round(sec / 60) + ' min'; };
  function update() {
    var n = +input.value;
    out.textContent = n.toLocaleString('en-US');
    document.getElementById('calc-manual').textContent = fmt(n * 72);
    document.getElementById('calc-auto').textContent = fmt(n * 2);
    document.getElementById('calc-saved').textContent = fmt(n * 70);
    input.style.setProperty('--p', ((n - input.min) / (input.max - input.min) * 100) + '%');
  }
  input.addEventListener('input', update); update();
})();

/* ---------- "Try the interactive comparison" link inside a case panel ---------- */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-goto]'), function (b) {
    b.addEventListener('click', function () {
      var d = b.closest('dialog'); if (d) d.close();
      var el = document.getElementById(b.getAttribute('data-goto'));
      if (el) setTimeout(function () { el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); }, 60);
    });
  });
})();

/* ---------- v12: count-up numbers and map reveal (once, on scroll) ---------- */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var map = document.querySelector('.inmap');
  var nums = [];
  Array.prototype.forEach.call(document.querySelectorAll('.stat-grid b, .metrics b, .tdi-stats dd'), function (el) {
    var m = /^(\d+)(.*)$/.exec(el.textContent);
    if (m && el.children.length === 0) { el.dataset.final = el.textContent; nums.push({ el: el, n: +m[1], rest: m[2] }); }
  });
  if (reduce || !('IntersectionObserver' in window)) { if (map) map.classList.add('in'); return; }
  nums.forEach(function (o) { o.el.textContent = '0' + o.rest; });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (e.target === map) { map.classList.add('in'); return; }
      var o = nums.filter(function (x) { return x.el === e.target; })[0], t0 = performance.now(), D = 900 + Math.min(700, o.n * 3);
      (function f(now) {
        var k = Math.min(1, (now - t0) / D); k = 1 - Math.pow(1 - k, 3);
        o.el.textContent = Math.round(o.n * k) + o.rest;
        if (k < 1) requestAnimationFrame(f);
      })(t0);
    });
  }, { threshold: 0.4 });
  nums.forEach(function (o) { io.observe(o.el); });
  if (map) io.observe(map);
})();
window.addEventListener('beforeprint', function () {
  Array.prototype.forEach.call(document.querySelectorAll('.stat-grid b, .metrics b, .tdi-stats dd'), function (el) { if (el.dataset.final) el.textContent = el.dataset.final; });
});
