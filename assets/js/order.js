/* Commande en ligne de Larry Fried Chicken — panier construit depuis la carte (même source que le menu : content.json / Supabase site_content).
   La commande n’est définitive qu’après l’appel du restaurant : statut « en attente d’appel » dans larryfc.orders, repli WhatsApp/SMS. */
(function () {
  'use strict';
  var C = window.SNACK_CONFIG || {}, MOBILE = '213556311764', KEY = 'larryfc_cart_v1';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function D() { return window.__SNACK || {}; }
  function opts() { return D().order_options || {}; }
  function cents(p) { p = String(p == null ? '' : p).trim().replace(',', '.'); return p && !isNaN(+p) ? Math.round(+p * 100) : null; }
  function eur(c) { return Math.round(c / 100).toLocaleString('fr-FR') + '\u00a0DA'; }
  function find(ci, ii) { var c = (D().menu || [])[ci]; return c && c.items && c.items[ii] ? { cat: c, it: c.items[ii] } : null; }
  function byName(n) { var r = null; (D().menu || []).forEach(function (c) { (c.items || []).forEach(function (it) { if (!r && it.name === n && it.hidden !== true) r = { cat: c, it: it }; }); }); return r; }
  var cart = []; try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }

  /* ---- options d’un article, déduites de sa description (rien d’inventé) ---- */
  var NO_RM = /\d|au choix|servie?s?|frites|boisson|pour deux|viande marinée|pièces|galette|pain|roulée|pressée|garni|nappée|verrine|imbibés|beignet|glaçage|muffin|éclats|tarte/i;
  function removals(x) {
    if (/dessert|boisson/i.test(x.cat.name)) return [];
    var seen = {};
    return String(x.it.desc || '').replace(/\.$/, '').split(/,|\s+et\s+|\s\+\s/).map(function (t) { return t.trim().replace(/\.$/, ''); })
      .filter(function (t) { var k = t.toLowerCase(); if (!t || t.length > 32 || NO_RM.test(t) || seen[k]) return false; seen[k] = 1; return true; })
      .map(function (t) { return t.charAt(0).toUpperCase() + t.slice(1); });
  }
  function choices(x) { var m = (String(x.it.desc || '') + ' ' + String(x.cat.note || '')).match(/[^.,+]*au choix/gi); return m ? m.map(function (s) { return s.trim(); }) : []; }
  function drinks() {
    var can = byName('Canette'); if (!can) return [];
    var s = String(can.it.desc || '').replace(/…|\.\.\./g, ''), out = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) { var ch = s[i]; if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur);
    var res = [];
    out.forEach(function (t) { t = t.trim(); var m = t.match(/^(.*?)\s*\((.*)\)$/); if (m) m[2].split(',').forEach(function (v) { res.push(m[1] + ' ' + v.trim()); }); else if (t) res.push(t); });
    return res;
  }
  function needsDrink(x) { return /boisson/i.test(String(x.it.desc || '') + ' ' + String(x.cat.note || '')); }
  function sauceable(x) { return (opts().sauces || []).length && /sauce|tacos|burger|sandwich|panini|kebab|bowl|salade/i.test(x.it.name + ' ' + (x.it.desc || '')); }
  function extrasFor(x) { return (opts().extras || []).filter(function (e) { return e && e.name && !/dessert|boisson/i.test(x.cat.name); }); }
  function unit(l) { var x = byName(l.name), p = x ? cents(x.it.price) : null; if (p == null) return null; (l.extras || []).forEach(function (n) { var e = (opts().extras || []).filter(function (e) { return e.name === n; })[0]; if (e && cents(e.price)) p += cents(e.price); }); return p; }
  function details(l) {
    var d = [];
    if (l.remove && l.remove.length) d.push('Sans ' + l.remove.join(', ').toLowerCase());
    if (l.sauce) d.push('Sauce : ' + l.sauce);
    if (l.drink) d.push('Boisson : ' + l.drink);
    if (l.choice) d.push('Choix : ' + l.choice);
    if (l.extras && l.extras.length) d.push('+ ' + l.extras.join(', '));
    if (l.note) d.push('« ' + l.note + ' »');
    return d;
  }

  /* ---- interface ---- */
  function ui() {
    if ($('#od-root')) return;
    var root = document.createElement('div'); root.id = 'od-root';
    root.innerHTML =
      '<button class="od-bar" id="od-bar" type="button" hidden><span class="od-count" id="od-count">0</span><span>Voir ma commande</span><b id="od-bar-total"></b></button>' +
      '<div class="od-ov" id="od-ov" hidden></div>' +
      '<div class="od-sheet" id="od-item" role="dialog" aria-modal="true" aria-labelledby="od-item-t" hidden></div>' +
      '<aside class="od-drawer" id="od-cart" role="dialog" aria-modal="true" aria-label="Ma commande" hidden></aside>';
    document.body.appendChild(root);
    $('#od-bar').onclick = openCart; $('#od-ov').onclick = closeAll;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  }
  function closeAll() { ['#od-item', '#od-cart', '#od-ov'].forEach(function (s) { $(s).hidden = true; }); document.body.classList.remove('od-lock'); }
  function show(s) { $('#od-ov').hidden = false; $(s).hidden = false; document.body.classList.add('od-lock'); var f = $(s + ' [data-focus]') || $(s + ' button'); if (f) f.focus(); }
  function bar() {
    var n = cart.reduce(function (a, l) { return a + l.qty; }, 0), b = $('#od-bar'); if (!b) return;
    b.hidden = !n; $('#od-count').textContent = n; $('#od-bar-total').textContent = eur(total().c) + (total().unknown ? ' +' : '');
  }
  function total() { var c = 0, unknown = false; cart.forEach(function (l) { var u = unit(l); if (u == null) unknown = true; else c += u * l.qty; }); return { c: c, unknown: unknown }; }

  function openItem(x, editIdx) {
    var l = editIdx != null ? cart[editIdx] : { name: x.it.name, qty: 1, remove: [], extras: [] };
    var rm = removals(x), ch = choices(x), dr = needsDrink(x) ? drinks() : [], sa = sauceable(x) ? opts().sauces : [], ex = extrasFor(x), p = cents(x.it.price);
    var h = '<button class="od-x" type="button" aria-label="Fermer" data-close>×</button>' +
      (x.it.img ? '<img class="od-hero" src="' + esc(x.it.img) + '" alt="">' : '') +
      '<div class="od-pad"><h3 id="od-item-t">' + esc(x.it.name) + '</h3><p class="mut">' + esc(x.it.desc || '') + '</p>' +
      '<p class="od-price">' + (p == null ? 'Prix en boutique (annoncé à l’appel)' : eur(p)) + '</p>';
    if (rm.length) h += '<fieldset><legend>Retirer un ingrédient <small>gratuit</small></legend><div class="od-chips">' + rm.map(function (r) { return '<label class="od-chip"><input type="checkbox" name="rm" value="' + esc(r) + '"' + (l.remove.indexOf(r) > -1 ? ' checked' : '') + '><span>Sans ' + esc(r.toLowerCase()) + '</span></label>'; }).join('') + '</div></fieldset>';
    if (sa.length) h += '<fieldset><legend>Sauce</legend><select name="sauce"><option value="">— Au choix du restaurant —</option>' + sa.map(function (s) { return '<option' + (l.sauce === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></fieldset>';
    if (dr.length) h += '<fieldset><legend>Boisson</legend><select name="drink"><option value="">— Choisir —</option>' + dr.map(function (s) { return '<option' + (l.drink === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></fieldset>';
    if (ch.length) h += '<fieldset><legend>À préciser</legend><input name="choice" maxlength="120" placeholder="' + esc(ch.join(' · ')) + '" value="' + esc(l.choice || '') + '"><small class="mut">' + esc(ch.join(' · ')) + (sa.length ? '' : ' — sauce, viande… : écrivez-le, Larry confirme à l’appel.') + '</small></fieldset>';
    else if (!sa.length && /sauce/i.test(x.it.desc || '')) h += '<fieldset><legend>Votre sauce <small>facultatif</small></legend><input name="choice" maxlength="120" placeholder="Ex. : la sauce que vous préférez" value="' + esc(l.choice || '') + '"></fieldset>';
    if (ex.length) h += '<fieldset><legend>Suppléments</legend><div class="od-chips">' + ex.map(function (e) { var ep = cents(e.price); return '<label class="od-chip"><input type="checkbox" name="ex" value="' + esc(e.name) + '"' + (l.extras.indexOf(e.name) > -1 ? ' checked' : '') + '><span>' + esc(e.name) + (ep ? ' +' + eur(ep) : '') + '</span></label>'; }).join('') + '</div></fieldset>';
    h += '<fieldset><legend>Remarque pour cet article <small>facultatif</small></legend><input name="note" maxlength="120" value="' + esc(l.note || '') + '" placeholder="Ex. : bien cuit, coupé en deux…"></fieldset>' +
      '<div class="od-foot"><div class="od-qty"><button type="button" data-q="-1" aria-label="Moins">−</button><output id="od-q">' + l.qty + '</output><button type="button" data-q="1" aria-label="Plus">+</button></div>' +
      '<button class="btn btn-green od-add" type="button" data-focus>' + (editIdx != null ? 'Mettre à jour' : 'Ajouter') + ' <span id="od-sum"></span></button></div></div>';
    var s = $('#od-item'); s.innerHTML = h; var q = l.qty;
    function sum() { var tmp = { name: l.name, extras: $$('input[name=ex]:checked', s).map(function (i) { return i.value; }) }, u = unit(tmp); $('#od-sum').textContent = u == null ? '' : '· ' + eur(u * q); $('#od-q').textContent = q; }
    $$('[data-q]', s).forEach(function (b) { b.onclick = function () { q = Math.max(1, Math.min(20, q + +b.getAttribute('data-q'))); sum(); }; });
    $$('input[name=ex]', s).forEach(function (i) { i.onchange = sum; });
    $('[data-close]', s).onclick = closeAll;
    $('.od-add', s).onclick = function () {
      var v = function (n) { var e = $('[name=' + n + ']', s); return e ? e.value.trim() : ''; };
      var nl = { name: x.it.name, qty: q, remove: $$('input[name=rm]:checked', s).map(function (i) { return i.value; }), extras: $$('input[name=ex]:checked', s).map(function (i) { return i.value; }), sauce: v('sauce'), drink: v('drink'), choice: v('choice'), note: v('note') };
      if (editIdx != null) cart[editIdx] = nl; else {
        var same = cart.filter(function (o) { return JSON.stringify(Object.assign({}, o, { qty: 0 })) === JSON.stringify(Object.assign({}, nl, { qty: 0 })); })[0];
        if (same) same.qty = Math.min(20, same.qty + q); else cart.push(nl);
      }
      save(); bar(); closeAll(); if (editIdx != null) openCart(); else toast(x.it.name + ' ajouté au panier');
    };
    sum(); closeAll(); show('#od-item');
  }
  function toast(t) { var e = document.createElement('div'); e.className = 'od-toast'; e.setAttribute('role', 'status'); e.textContent = t; document.body.appendChild(e); setTimeout(function () { e.remove(); }, 2200); }

  /* ---- créneaux (heure de Tlemcen, d’après les horaires du site) ---- */
  function slots() {
    var names = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'], now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Algiers' }));
    var out = [], openNow = false, mNow = now.getHours() * 60 + now.getMinutes();
    for (var dd = 0; dd < 3 && out.length < 1; dd++) {
      var day = new Date(now); day.setDate(now.getDate() + dd);
      var row = (D().hours || []).filter(function (h) { return h.day === names[day.getDay()]; })[0];
      if (dd === 0 && D().info && D().info.open === false) continue;
      String(row && row.slots || '').split(',').forEach(function (s) {
        var p = s.trim().match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/); if (!p) return;
        var a = +p[1] * 60 + +p[2], b = +p[3] * 60 + +p[4]; if (b <= a) b += 24 * 60;
        if (dd === 0 && mNow >= a && mNow < b) openNow = true;
        var start = dd === 0 ? Math.max(a, Math.ceil((mNow + 20) / 15) * 15) : a;
        for (var m = start; m <= b - 15; m += 15) { var hh = Math.floor(m / 60) % 24, mm = m % 60, lab = (hh < 10 ? '0' : '') + hh + 'h' + (mm < 10 ? '0' : '') + mm; out.push((dd === 0 ? 'Aujourd’hui ' : dd === 1 ? 'Demain ' : names[day.getDay()] + ' ') + lab); }
      });
    }
    if (openNow) out.unshift('Dès que possible');
    return out;
  }
  function phoneOk(v) { var d = String(v).replace(/[\s.\-()]/g, '').replace(/^(\+213|00213)/, '0'); return /^0[1-9]\d{8}$/.test(d) ? d : null; }
  function fmtPhone(d) { return d.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4'); }

  function openCart() {
    var s = $('#od-cart'), t = total(), sl = slots(), pref = {}; try { pref = JSON.parse(localStorage.getItem(KEY + '_me')) || {}; } catch (e) {}
    if (!cart.length) { s.innerHTML = '<div class="od-pad"><button class="od-x" type="button" data-close aria-label="Fermer">×</button><h3>Ma commande</h3><p class="mut">Votre panier est vide. Touchez « + Ajouter » sur un plat de la carte.</p></div>'; $('[data-close]', s).onclick = closeAll; closeAll(); show('#od-cart'); return; }
    s.innerHTML = '<div class="od-head"><h3>Ma commande</h3><button class="od-x" type="button" data-close aria-label="Fermer">×</button></div><div class="od-scroll"><ul class="od-lines">' + cart.map(function (l, i) {
        var u = unit(l);
        return '<li><div><b>' + esc(l.name) + '</b>' + details(l).map(function (d) { return '<small>' + esc(d) + '</small>'; }).join('') + '<button type="button" class="od-link" data-edit="' + i + '">Modifier</button></div>' +
          '<div class="od-lr"><span>' + (u == null ? 'Prix boutique' : eur(u * l.qty)) + '</span><div class="od-qty sm"><button type="button" data-l="' + i + '" data-d="-1" aria-label="Moins">' + (l.qty === 1 ? '🗑' : '−') + '</button><output>' + l.qty + '</output><button type="button" data-l="' + i + '" data-d="1" aria-label="Plus">+</button></div></div></li>';
      }).join('') + '</ul><p class="od-total"><span>Total estimé</span><b>' + eur(t.c) + '</b></p>' + (t.unknown ? '<p class="mut sm">Un article est « prix en boutique » : son prix vous sera annoncé à l’appel.</p>' : '') +
      '<form id="od-form" novalidate><fieldset><legend>Retrait ou livraison</legend><div class="od-seg"><label><input type="radio" name="mode" value="emporter" checked><span>🥡 À emporter</span></label><label><input type="radio" name="mode" value="livraison"><span>🛵 Livraison</span></label></div>' +
      '<label class="od-f" id="od-addr" hidden>Adresse de livraison<input name="address" maxlength="300" autocomplete="street-address" value="' + esc(pref.address || '') + '" placeholder="N°, rue, Léguevin"><small class="mut">Zone et frais éventuels confirmés par téléphone.</small></label></fieldset>' +
      '<label class="od-f">Créneau souhaité<select name="slot" required>' + (sl.length ? sl.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') : '<option value="">Aucun créneau disponible</option>') + '</select></label>' +
      '<label class="od-f">Prénom et nom<input name="name" required maxlength="80" autocomplete="name" value="' + esc(pref.name || '') + '"></label>' +
      '<label class="od-f">Téléphone<input name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="0556 12 34 56" value="' + esc(pref.phone || '') + '"><small class="mut">Numéro algérien (05, 06, 07…). Larry vous appelle sur ce numéro.</small></label>' +
      '<label class="od-f">Remarque <small class="mut">facultatif</small><textarea name="note" rows="2" maxlength="500" placeholder="Allergie, code d’accès, sonnette…"></textarea></label>' +
      '<div class="od-call" role="note"><span>📞</span><p><b>Larry Fried Chicken vous rappelle pour confirmer votre commande avant de la préparer.</b><br><small>Rien n’est payé en ligne : vous réglez au retrait ou à la livraison.</small></p></div>' +
      '<p class="od-err" id="od-err" role="alert" hidden></p><button class="btn btn-green od-send" type="submit">Envoyer ma demande · ' + eur(t.c) + (t.unknown ? ' +' : '') + '</button></form></div>';
    $('[data-close]', s).onclick = closeAll;
    $$('[data-l]', s).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-l'); cart[i].qty += +b.getAttribute('data-d'); if (cart[i].qty < 1) cart.splice(i, 1); if (cart[i] && cart[i].qty > 20) cart[i].qty = 20; save(); bar(); openCart(); }; });
    $$('[data-edit]', s).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-edit'), x = byName(cart[i].name); if (x) openItem(x, i); }; });
    var f = $('#od-form', s);
    $$('input[name=mode]', f).forEach(function (r) { r.onchange = function () { $('#od-addr', s).hidden = f.mode.value !== 'livraison'; }; });
    f.addEventListener('input', function (e) { e.target.removeAttribute('aria-invalid'); });
    f.onsubmit = function (e) { e.preventDefault(); submit(f); };
    closeAll(); show('#od-cart');
  }
  function err(m, field) { var e = $('#od-err'); e.textContent = m; e.hidden = false; if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); } }
  function ref() { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = ''; for (var i = 0; i < 5; i++) r += a[Math.floor(Math.random() * a.length)]; return r; }
  function text(o) {
    return 'Bonjour Larry Fried Chicken, demande de commande n° ' + o.ref + ' :\n' + o.items.map(function (l) { return '• ' + l.qty + ' × ' + l.name + (details(l).length ? ' (' + details(l).join(' ; ') + ')' : ''); }).join('\n') +
      '\nTotal estimé : ' + eur(o.total) + '\n' + (o.fulfillment === 'livraison' ? 'Livraison : ' + o.address : 'À emporter') + ' — ' + o.slot + '\nNom : ' + o.customer_name + ' — Tél : ' + fmtPhone(o.phone) + (o.note ? '\nRemarque : ' + o.note : '') + '\nMerci de me rappeler pour confirmer.';
  }
  function submit(f) {
    $$('[aria-invalid]', f).forEach(function (x) { x.removeAttribute('aria-invalid'); }); $('#od-err').hidden = true;
    var mode = f.mode.value, ph = phoneOk(f.phone.value), name = f.name.value.trim(), addr = f.address.value.trim();
    if (!cart.length) return err('Votre panier est vide.');
    if (mode === 'livraison' && addr.length < 5) return err('Indiquez votre adresse de livraison.', f.address);
    if (!f.slot.value) return err('Aucun créneau disponible pour le moment : appelez le 0556 31 17 64.');
    if (name.length < 2) return err('Indiquez votre nom.', f.name);
    if (!ph) return err('Numéro invalide : 10 chiffres, ex. 0555 12 34 56 (ou +213 5…).', f.phone);
    try { localStorage.setItem(KEY + '_me', JSON.stringify({ name: name, phone: fmtPhone(ph), address: addr })); } catch (e) {}
    var o = { ref: ref(), customer_name: name, phone: ph, fulfillment: mode, address: mode === 'livraison' ? addr : null, slot: f.slot.value, note: f.note.value.trim() || null,
      items: cart.map(function (l) { var r = { name: l.name, qty: l.qty }; ['remove', 'extras'].forEach(function (k) { if (l[k] && l[k].length) r[k] = l[k]; }); ['sauce', 'drink', 'choice', 'note'].forEach(function (k) { if (l[k]) r[k] = l[k]; }); return r; }) };
    var btn = $('.od-send', f); btn.disabled = true; btn.textContent = 'Envoi…';
    var shown = Object.assign({}, o, { items: cart.slice(), total: total().c });
    var p = C.SUPABASE_URL && window.fetch && opts().db !== false ? fetch(C.SUPABASE_URL + '/rest/v1/orders', { method: 'POST', headers: { apikey: C.SUPABASE_ANON_KEY, 'Content-Profile': C.SCHEMA, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(o) })
      .then(function (r) { if (r.ok) return true; return r.json().then(function (j) { throw new Error(j && j.code === 'P0001' ? j.message : 'serveur'); }, function () { throw new Error('serveur'); }); }) : Promise.reject(new Error('hors ligne'));
    p.then(function () { done(shown, true); }, function (e) { done(shown, false, e.message); });
  }
  function done(o, ok, why) {
    var msg = text(o), wa = 'https://wa.me/' + MOBILE + '?text=' + encodeURIComponent(msg), sms = 'sms:+' + MOBILE + '?&body=' + encodeURIComponent(msg);
    if (ok) { cart = []; save(); bar(); }
    var s = $('#od-cart');
    s.innerHTML = '<div class="od-head"><h3>' + (ok ? 'Demande envoyée ✅' : 'Envoi impossible') + '</h3><button class="od-x" type="button" data-close aria-label="Fermer">×</button></div><div class="od-scroll od-pad">' +
      '<div class="od-call big" role="status"><span>📞</span><p><b>Larry Fried Chicken vous rappelle pour confirmer votre commande avant de la préparer.</b><br><small>Gardez votre téléphone à portée : appel au ' + esc(fmtPhone(o.phone)) + '.</small></p></div>' +
      (ok ? '<p>Demande n° <b class="od-ref">' + esc(o.ref) + '</b> · ' + esc(o.slot) + ' · ' + (o.fulfillment === 'livraison' ? 'livraison' : 'à emporter') + '</p><p class="mut sm">Votre commande n’est pas encore validée : elle le sera pendant l’appel. Pas d’appel d’ici 10 minutes ? Appelez le <a href="tel:+213556311764">0556 31 17 64</a>.</p>'
        : '<p>' + esc(why && why !== 'serveur' && why !== 'hors ligne' && why !== 'Failed to fetch' ? why : 'La demande n’a pas pu être enregistrée.') + ' Envoyez-la directement à Larry, le message est déjà rédigé :</p>') +
      '<div class="od-alt"><a class="btn btn-green" target="_blank" rel="noopener" href="' + esc(wa) + '">WhatsApp au 0556 31 17 64 (à confirmer)</a><a class="btn btn-ghost" href="' + esc(sms) + '">SMS au 0556 31 17 64</a><a class="btn btn-ghost" href="tel:+213556311764">Appeler le 0556 31 17 64</a></div>' +
      (ok ? '<p class="mut sm">WhatsApp et SMS ci-dessus : facultatifs, seulement si vous préférez écrire.</p>' : '') + '</div>';
    $('[data-close]', s).onclick = closeAll; window.__lastOrder = { ok: ok, ref: o.ref };
  }

  function refresh() {
    ui();
    var on = opts().enabled !== false;
    $$('.cta-order').forEach(function (a) { a.hidden = !on; });
    $$('#menu-list .cat[data-ci] .item[data-ii]').forEach(function (li) {
      var ci = +li.parentNode.parentNode.getAttribute('data-ci'), ii = +li.getAttribute('data-ii'), x = find(ci, ii), b = $('.od-plus', li);
      if (!on || !x) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'od-plus'; b.innerHTML = '+ Ajouter'; b.setAttribute('aria-label', 'Ajouter ' + x.it.name + ' à ma commande'); $('.it-t', li).appendChild(b); }
      b.onclick = function () { var y = find(ci, ii); if (y) openItem(y); };
    });
    cart = cart.filter(function (l) { return byName(l.name); }); save(); bar();
    $('#od-root').hidden = !on;
  }
  window.SNACK_ORDER = { refresh: refresh, open: openCart };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh); else refresh();
})();
