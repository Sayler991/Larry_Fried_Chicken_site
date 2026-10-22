/* Contenu en direct : Supabase (schéma larryfc) → sinon contenu intégré. Applique aussi l’état « ouvert maintenant ». */
(function () {
  'use strict';
  var C = window.SNACK_CONFIG || {}, R = window.SNACK_RENDER, $ = function (s) { return document.querySelector(s); };
  function setText(sel, v) { var e = $(sel); if (e && v != null && v !== '') e.textContent = v; }
  function apply(d) {
    if (!d || !R) return;
    var i = d.info || {};
    $('#menu-list').innerHTML = R.menu(d); $('#hours-box').innerHTML = R.hours(d);
    if (d.gallery && d.gallery.length) $('#gallery-grid').innerHTML = R.gallery(d);
    if (d.reviews && d.reviews.length) $('#reviews-grid').innerHTML = R.reviews(d);
    $('#services').innerHTML = R.services(d);
    setText('#tagline', i.tagline); setText('#about-text', i.about); setText('#price-note', i.price_note);
    var n = $('#notice'); if (i.notice) { n.textContent = i.notice; n.hidden = false; } else n.hidden = true;
    if (i.phone) document.querySelectorAll('a[data-tel]').forEach(function (a) { a.href = 'tel:' + i.phone.replace(/[^0-9+]/g, ''); });
    var wa = String(i.whatsapp || '').replace(/[^0-9]/g, '');
    document.querySelectorAll('[data-wa]').forEach(function (a) { a.hidden = !wa; if (wa) a.href = 'https://wa.me/' + wa; });
    window.__SNACK = d; status(); tabs(); if (window.SNACK_ORDER) window.SNACK_ORDER.refresh();
  }
  function status() {
    var d = window.__SNACK; if (!d) return;
    var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Algiers' }));
    var names = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'], today = names[now.getDay()];
    var row = (d.hours || []).filter(function (h) { return h.day === today; })[0], m = now.getHours() * 60 + now.getMinutes(), open = false, next = '';
    String(row && row.slots || '').split(',').forEach(function (s) {
      var p = s.trim().match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/); if (!p) return;
      var a = +p[1] * 60 + +p[2], b = +p[3] * 60 + +p[4]; if (b <= a) b += 1440;
      if (m >= a && m < b) { open = true; next = 'jusqu’à ' + p[3] + 'h' + p[4]; } else if (!open && !next && m < a) next = 'ouvre à ' + p[1] + 'h' + p[2];
    });
    if ((d.info || {}).open === false) { open = false; next = 'fermeture exceptionnelle'; }
    document.querySelectorAll('.live-status').forEach(function (e) { e.className = 'live-status ' + (open ? 'is-open' : 'is-closed'); e.textContent = (open ? 'Ouvert maintenant' : 'Fermé') + (next ? ' · ' + next : ''); });
    document.querySelectorAll('.hours tr').forEach(function (tr) { tr.classList.toggle('today', tr.getAttribute('data-day') === today); });
  }
  function tabs() {
    var links = [].slice.call(document.querySelectorAll('.tabs a'));
    if (!('IntersectionObserver' in window) || !links.length) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { links.forEach(function (l) { var on = l.getAttribute('href') === '#' + e.target.id; l.classList.toggle('on', on); if (on && l.scrollIntoView) l.parentNode.scrollTo({ left: l.offsetLeft - 16, behavior: 'smooth' }); }); } }); }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.cat').forEach(function (c) { io.observe(c); });
  }
  try { window.__SNACK = JSON.parse(document.getElementById('seed').textContent); } catch (e) {}
  status(); tabs();
  if (C.SUPABASE_URL && window.fetch) {
    fetch(C.SUPABASE_URL + '/rest/v1/site_content?select=data&id=eq.1', { headers: { apikey: C.SUPABASE_ANON_KEY, 'Accept-Profile': C.SCHEMA } })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j[0] && j[0].data) apply(j[0].data); }).catch(function () {});
  }
  setInterval(status, 60000);
  var io2 = 'IntersectionObserver' in window && new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); } }); }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(function (e) { io2 ? io2.observe(e) : e.classList.add('in'); });
})();
