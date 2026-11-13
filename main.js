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
