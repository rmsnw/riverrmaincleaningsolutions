(function () {
  'use strict';

  /* ---------- Smooth scrolling (Lenis) ---------- */
  var lenis = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (target) { e.preventDefault(); lenis.start(); lenis.scrollTo(target, { offset: -90 }); }
      });
    });
  }

  /* ---------- Header: sticky shrink ---------- */
  var header = document.getElementById('header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 60); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }
  burger.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  var navClose = document.getElementById('navClose');
  if (navClose) navClose.addEventListener('click', function () { setMenu(false); burger.focus(); });
  // close the menu after choosing a normal link
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (!a.parentElement.classList.contains('has-dropdown')) setMenu(false);
    });
  });
  // reset if the window grows to desktop width
  window.addEventListener('resize', function () { if (window.innerWidth > 960) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) setMenu(false);
  });
  document.querySelectorAll('.has-dropdown > a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (window.matchMedia('(max-width: 960px)').matches) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
      }
    });
  });

  /* ---------- Hero slider ---------- */
  var hero = document.getElementById('hero');
  var slides = Array.prototype.slice.call(hero.querySelectorAll('.slide'));
  var dotsWrap = document.getElementById('dots');
  var bar = document.getElementById('progress');
  var DELAY = 6500;
  var current = 0, timer = null, started = 0, remaining = DELAY, paused = false;

  var dots = slides.map(function (_, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    b.addEventListener('click', function () { go(i); });
    dotsWrap.appendChild(b);
    return b;
  });

  var countEl = document.getElementById('count');
  function render() {
    if (countEl) countEl.textContent = '0' + (current + 1);
    slides.forEach(function (s, i) { s.classList.toggle('is-active', i === current); });
    dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === current);
      d.setAttribute('aria-selected', String(i === current));
    });
  }

  function runProgress(ms) {
    bar.style.transition = 'none';
    bar.style.width = ((DELAY - ms) / DELAY * 100) + '%';
    void bar.offsetWidth; // restart transition
    bar.style.transition = 'width ' + ms + 'ms linear';
    bar.style.width = '100%';
  }

  function schedule(ms) {
    clearTimeout(timer);
    remaining = ms;
    started = Date.now();
    runProgress(ms);
    timer = setTimeout(function () { go(current + 1); }, ms);
  }

  function go(i) {
    current = (i + slides.length) % slides.length;
    render();
    if (!paused) schedule(DELAY);
    else { remaining = DELAY; bar.style.transition = 'none'; bar.style.width = '0'; }
  }

  function pause() {
    if (paused) return;
    paused = true;
    clearTimeout(timer);
    remaining = Math.max(300, remaining - (Date.now() - started));
    var w = getComputedStyle(bar).width;
    bar.style.transition = 'none';
    bar.style.width = w;
  }
  function resume() {
    if (!paused) return;
    paused = false;
    schedule(remaining);
  }

  document.getElementById('prev').addEventListener('click', function () { go(current - 1); });
  document.getElementById('next').addEventListener('click', function () { go(current + 1); });
  hero.addEventListener('mouseenter', pause);
  hero.addEventListener('mouseleave', resume);
  hero.addEventListener('focusin', pause);
  hero.addEventListener('focusout', resume);
  document.addEventListener('visibilitychange', function () { document.hidden ? pause() : resume(); });

  hero.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') go(current - 1);
    if (e.key === 'ArrowRight') go(current + 1);
  });

  // Touch swipe
  var sx = 0, sy = 0;
  hero.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  hero.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? current + 1 : current - 1);
  }, { passive: true });

  render();
  schedule(DELAY);

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- FAQ: one open at a time ---------- */
  var faqs = document.querySelectorAll('.faq-list details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------- Quote form (no backend yet: opens the visitor's email app) ---------- */
  var form = document.getElementById('quoteForm');
  var note = document.getElementById('formNote');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, ok = true;
      ['name', 'phone', 'email', 'service'].forEach(function (k) {
        var bad = !f[k].value.trim() || (k === 'email' && !/^\S+@\S+\.\S+$/.test(f[k].value));
        f[k].classList.toggle('invalid', bad);
        if (bad) ok = false;
      });
      note.className = 'form-note';
      if (!ok) { note.textContent = 'Please complete the highlighted fields.'; note.classList.add('error'); return; }
      var body = 'Name: ' + f.name.value + '\nPhone: ' + f.phone.value + '\nEmail: ' + f.email.value +
                 '\nService: ' + f.service.value + '\n\n' + f.message.value;
      window.location.href = 'mailto:test@riverrmaincleaningsolutions.co.uk?subject=' +
        encodeURIComponent('Quote request: ' + f.service.value) + '&body=' + encodeURIComponent(body);
      note.textContent = 'Thank you! Your email app should open to send your enquiry.';
      note.classList.add('ok');
    });
  }

  /* ---------- Footer year ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
