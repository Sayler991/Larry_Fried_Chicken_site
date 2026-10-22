/* Espace patron Larry Fried Chicken — contenu stocké dans Supabase (schéma larryfc, table site_content). */
(function () {
  'use strict';
  var C = window.SNACK_CONFIG, sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { db: { schema: C.SCHEMA } });
  var $ = function (s) { return document.querySelector(s); }, D = null, DIRTY = false, TAB = 'infos', BASE = new URL('../', location.href).href;
  function h(tag, a) { var e = document.createElement(tag); a = a || {}; for (var k in a) { var v = a[k]; if (v == null || v === false) continue; if (k === 'text') e.textContent = v; else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v); else if (k === 'value') e.value = v; else e.setAttribute(k, v); }
    for (var i = 2; i < arguments.length; i++) { [].concat(arguments[i]).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); } return e; }
  function toast(t, err) { var x = h('div', { class: 'toast' + (err ? ' e' : ''), text: t }); $('#toasts').appendChild(x); setTimeout(function () { x.remove(); }, 4000); }
  function dirty() { DIRTY = true; var b = $('#save'); if (b) b.hidden = false; }
  function f(label, obj, key, o) { o = o || {}; var i = o.area ? h('textarea', { rows: o.rows || 3 }) : h('input', { type: 'text', placeholder: o.ph });
    i.value = obj[key] == null ? '' : obj[key]; i.oninput = function () { obj[key] = i.value; dirty(); }; return h('label', null, label, i, o.hint ? h('small', { class: 'mut', text: o.hint }) : null); }
  function src(p) { return /^https?:/.test(p || '') ? p : BASE + (p || ''); }
  function showLogin(m) { $('#boot').hidden = true; $('#app').hidden = true; $('#login').hidden = false; if (m) { $('#login-err').textContent = m; $('#login-err').hidden = false; } }
  $('#login-form').onsubmit = function (e) { e.preventDefault(); $('#login-err').hidden = true;
    sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value }).then(function (r) { if (r.error) showLogin('E-mail ou mot de passe incorrect.'); else start(); }); };
  function start() {
    sb.auth.getSession().then(function (s) { if (!s.data.session) return showLogin();
      sb.rpc('is_admin').then(function (r) { if (!r.data) { sb.auth.signOut(); return showLogin('Ce compte n’a pas accès à l’espace patron de Larry Fried Chicken.'); }
        sb.from('site_content').select('data,updated_at').eq('id', 1).single().then(function (r2) { if (r2.error) return toast('Lecture impossible : ' + r2.error.message, true); D = r2.data.data; D.info = D.info || {}; D.menu = D.menu || []; D.hours = D.hours || []; D.gallery = D.gallery || []; D.reviews = D.reviews || []; shell(s.data.session); }); }); }); }
  var TABS = [['infos', 'ℹ️ Infos & statut'], ['carte', '🍔 Carte & prix'], ['horaires', '🕘 Horaires'], ['photos', '🖼️ Photos'], ['avis', '⭐ Avis'], ['commandes', '🛒 Commandes'], ['historique', '↺ Historique']];
  function shell(s) { $('#boot').hidden = true; $('#login').hidden = true; var app = $('#app'); app.hidden = false; app.innerHTML = '';
    app.appendChild(h('header', { class: 'top' }, h('img', { src: '../assets/img/logo.webp', alt: '' }), h('b', { text: 'Espace patron' }), h('span', { class: 'sp' }), h('a', { class: 'btn ghost sm', href: '../', target: '_blank', text: 'Voir le site' }), h('button', { class: 'btn ghost sm', text: 'Déconnexion', onclick: function () { sb.auth.signOut().then(function () { location.reload(); }); } })));
    var t = h('nav', { class: 'tabs' }); TABS.forEach(function (x) { t.appendChild(h('button', { 'data-t': x[0], text: x[1], onclick: function () { go(x[0]); } })); }); app.appendChild(t);
    app.appendChild(h('main', { id: 'main' })); app.appendChild(h('button', { id: 'save', class: 'btn save', hidden: 'hidden', text: '💾 Enregistrer et publier', onclick: save })); go(TAB); }
  function go(t) { TAB = t; document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === t); }); var m = $('#main'); m.innerHTML = ''; ({ infos: infos, carte: carte, horaires: horaires, photos: photos, avis: avis, commandes: commandes, historique: hist })[t](m); }
  function save() { var b = $('#save'); b.disabled = true; b.textContent = 'Enregistrement…';
    sb.from('site_content').update({ data: D }).eq('id', 1).select('updated_at').then(function (r) { b.disabled = false; b.textContent = '💾 Enregistrer et publier';
      if (r.error || !r.data || !r.data.length) return toast('Échec : ' + (r.error ? r.error.message : 'droits insuffisants'), true); DIRTY = false; b.hidden = true; toast('Publié ✔ Le site est à jour.'); }); }
  window.addEventListener('beforeunload', function (e) { if (DIRTY) { e.preventDefault(); e.returnValue = ''; } });
  function infos(m) { var i = D.info, sw = h('input', { type: 'checkbox' }); sw.checked = i.open !== false; sw.onchange = function () { i.open = sw.checked; dirty(); };
    m.appendChild(h('div', { class: 'card' }, h('h2', { text: 'Statut' }), h('label', { class: 'switch' }, sw, 'Ouvert (décochez pour une fermeture exceptionnelle)'), f('Bandeau d’annonce (vide = masqué)', i, 'notice', { ph: 'Ex. : Fermé exceptionnellement ce lundi' })));
    m.appendChild(h('div', { class: 'card' }, h('h2', { text: 'Textes & contacts' }), f('Phrase d’accroche', i, 'tagline', { area: 1, rows: 2 }), f('Présentation « Larry »', i, 'about', { area: 1, rows: 5 }), f('Note sous la carte (prix)', i, 'price_note', { area: 1, rows: 2 }),
      h('div', { class: 'row' }, f('Téléphone (format +213…)', i, 'phone'), f('WhatsApp (format 213…, vide = bouton masqué)', i, 'whatsapp', { ph: '2135…' })),
      f('Services (un par ligne)', { v: (i.services || []).join('\n') }, 'v', { area: 1 }))); var ta = m.querySelectorAll('textarea'); ta[ta.length - 1].oninput = function () { i.services = this.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); dirty(); }; }
  function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var x = arr[i]; arr[i] = arr[j]; arr[j] = x; dirty(); go(TAB); }
  function carte(m) {
    m.appendChild(h('p', { class: 'mut', text: 'Prix : laissez vide pour afficher « Prix en boutique ». Cochez « masquer » pour retirer temporairement un article (rupture).' }));
    D.menu.forEach(function (c, ci) { var box = h('div', { class: 'card' });
      box.appendChild(h('div', { class: 'row' }, f('Rubrique', c, 'name'), f('Note de rubrique', c, 'note'), h('div', { class: 'acts' }, h('button', { class: 'btn ghost sm', text: '↑', onclick: function () { move(D.menu, ci, -1); } }), h('button', { class: 'btn ghost sm', text: '↓', onclick: function () { move(D.menu, ci, 1); } }), h('button', { class: 'btn red sm', text: 'Supprimer', onclick: function () { if (confirm('Supprimer la rubrique « ' + c.name + ' » et ses articles ?')) { D.menu.splice(ci, 1); dirty(); go(TAB); } } }))));
      c.items.forEach(function (it, ii) { var hid = h('input', { type: 'checkbox' }); hid.checked = it.hidden === true; hid.onchange = function () { it.hidden = hid.checked; dirty(); };
        box.appendChild(h('div', { class: 'item' }, it.img ? h('img', { src: src(it.img), alt: '' }) : h('div', { class: 'ph' }),
          h('div', null, h('div', { class: 'row' }, f('Article', it, 'name'), f('Prix (DA)', it, 'price', { ph: 'ex. 650' }), f('Badge', it, 'tag', { ph: 'ex. Nouveau' })), f('Description', it, 'desc'),
            h('div', { class: 'acts' }, h('label', { class: 'switch' }, hid, 'masquer'), h('button', { class: 'btn ghost sm', text: '↑', onclick: function () { move(c.items, ii, -1); } }), h('button', { class: 'btn ghost sm', text: '↓', onclick: function () { move(c.items, ii, 1); } }),
              upBtn('📷 Photo', function (url) { it.img = url; go(TAB); }), it.img ? h('button', { class: 'btn ghost sm', text: 'Retirer photo', onclick: function () { delete it.img; dirty(); go(TAB); } }) : null,
              h('button', { class: 'btn red sm', text: 'Supprimer', onclick: function () { c.items.splice(ii, 1); dirty(); go(TAB); } })))));
      });
      box.appendChild(h('button', { class: 'btn ghost sm', text: '+ Ajouter un article', onclick: function () { c.items.push({ name: 'Nouvel article', price: '', desc: '' }); dirty(); go(TAB); } })); m.appendChild(box); });
    m.appendChild(h('button', { class: 'btn', text: '+ Ajouter une rubrique', onclick: function () { D.menu.push({ name: 'Nouvelle rubrique', items: [] }); dirty(); go(TAB); } })); }
  function horaires(m) { var b = h('div', { class: 'card' }, h('h2', { text: 'Horaires' }), h('p', { class: 'mut', text: 'Format : 11:00-14:30, 18:00-23:00 — laissez vide pour « Fermé ».' }));
    D.hours.forEach(function (d) { b.appendChild(f(d.day, d, 'slots')); }); m.appendChild(b); }
  function upBtn(label, cb) { var inp = h('input', { type: 'file', accept: 'image/*', hidden: 'hidden' });
    inp.onchange = function () { var file = inp.files[0]; if (!file) return; toast('Envoi de la photo…'); resize(file).then(function (blob) {
      var name = 'up-larryfc_' + Math.random().toString(36).slice(2, 8) + '-' + Date.now() + '.webp';
      return sb.storage.from('images').upload(name, blob, { contentType: 'image/webp' }).then(function (r) { if (r.error) throw r.error; cb(sb.storage.from('images').getPublicUrl(name).data.publicUrl); dirty(); toast('Photo ajoutée — pensez à enregistrer.'); });
    }).catch(function (e) { toast('Échec de l’envoi : ' + (e.message || e), true); }); };
    return h('span', null, inp, h('button', { class: 'btn ghost sm', type: 'button', text: label, onclick: function () { inp.click(); } })); }
  function resize(file) { return new Promise(function (ok, ko) { var img = new Image(); img.onload = function () { var s = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(function (b) { b ? ok(b) : ko('conversion'); }, 'image/webp', .82); }; img.onerror = function () { ko('image illisible'); }; img.src = URL.createObjectURL(file); }); }
  function photos(m) { var g = h('div', { class: 'gal' });
    D.gallery.forEach(function (p, i) { g.appendChild(h('div', { class: 'card' }, h('img', { src: src(p.src), alt: '' }), f('Légende', p, 'alt'), h('div', { class: 'acts' }, h('button', { class: 'btn ghost sm', text: '←', onclick: function () { move(D.gallery, i, -1); } }), h('button', { class: 'btn ghost sm', text: '→', onclick: function () { move(D.gallery, i, 1); } }), h('button', { class: 'btn red sm', text: 'Retirer', onclick: function () { D.gallery.splice(i, 1); dirty(); go(TAB); } })))); });
    m.appendChild(h('div', { class: 'card' }, h('h2', { text: 'Galerie' }), h('p', { class: 'mut', text: 'La première photo s’affiche en grand.' }), upBtn('+ Ajouter une photo', function (url) { D.gallery.push({ src: url, alt: 'Photo Larry Fried Chicken' }); go(TAB); }))); m.appendChild(g); }
  function avis(m) { m.appendChild(h('p', { class: 'mut', text: 'Ne publiez que de vrais avis clients (initiale de l’auteur + source).' }));
    D.reviews.forEach(function (r, i) { m.appendChild(h('div', { class: 'card' }, f('Avis', r, 'text', { area: 1 }), h('div', { class: 'row' }, f('Auteur (initiale)', r, 'author'), f('Date', r, 'date'), f('Source', r, 'source')), h('button', { class: 'btn red sm', text: 'Retirer', onclick: function () { D.reviews.splice(i, 1); dirty(); go(TAB); } }))); });
    m.appendChild(h('button', { class: 'btn', text: '+ Ajouter un avis', onclick: function () { D.reviews.push({ text: '', author: '', date: '', source: 'Avis Google', rating: 5 }); dirty(); go(TAB); } })); }

  /* ---- Commandes en ligne (larryfc.orders) ---- */
  var OTIMER = null, OFILTER = "en attente d'appel";
  function eur(c) { return Math.round((c || 0) / 100).toLocaleString('fr-FR') + ' DA'; }
  function tel(p) { return String(p || '').replace(/(\d{2})(?=\d)/g, '$1 '); }
  function commandes(m) {
    if (OTIMER) clearInterval(OTIMER);
    var O = D.order_options = D.order_options || {}; O.sauces = O.sauces || []; O.extras = O.extras || [];
    var en = h('input', { type: 'checkbox' }); en.checked = O.enabled !== false; en.onchange = function () { O.enabled = en.checked; dirty(); };
    var sau = h('textarea', { rows: 2, placeholder: 'Une sauce par ligne (laisser vide : le client l’écrit librement)' }); sau.value = O.sauces.join('\n'); sau.oninput = function () { O.sauces = sau.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); dirty(); };
    var ex = h('textarea', { rows: 2, placeholder: 'Un supplément par ligne, prix facultatif : Cheddar ; 1,00' }); ex.value = O.extras.map(function (e) { return e.name + (e.price ? ' ; ' + e.price : ''); }).join('\n');
    ex.oninput = function () { O.extras = ex.value.split('\n').map(function (x) { var p = x.split(';'); return { name: p[0].trim(), price: (p[1] || '').trim() }; }).filter(function (e) { return e.name; }); dirty(); };
    m.appendChild(h('details', { class: 'card' }, h('summary', { text: '⚙️ Réglages de la commande en ligne' }),
      h('label', { class: 'switch' }, en, 'Commande en ligne activée sur le site'),
      h('label', null, 'Sauces proposées', sau), h('label', null, 'Suppléments', ex, h('small', { class: 'mut', text: 'Sans prix = affiché sans prix (gratuit). Les retraits d’ingrédients sont déduits des descriptions de la carte.' }))));
    var bar = h('div', { class: 'tabs' }), list = h('div');
    [["en attente d'appel", '📞 À appeler'], ['confirmée', '✅ Confirmées'], ['annulée', '✖ Annulées'], ['', 'Toutes']].forEach(function (x) {
      bar.appendChild(h('button', { class: OFILTER === x[0] ? 'on' : null, text: x[1], onclick: function () { OFILTER = x[0]; go('commandes'); } })); });
    bar.appendChild(h('button', { text: '↻ Actualiser', onclick: function () { load(); } }));
    m.appendChild(bar); m.appendChild(list);
    function load() {
      var q = sb.from('orders').select('*').order('created_at', { ascending: false }).limit(100); if (OFILTER) q = q.eq('status', OFILTER);
      q.then(function (r) { if (TAB !== 'commandes') return; list.innerHTML = '';
        if (r.error) return list.appendChild(h('p', { class: 'err', text: 'Lecture impossible : ' + r.error.message }));
        if (!r.data.length) return list.appendChild(h('p', { class: 'mut', text: 'Aucune commande ici pour le moment (actualisation automatique toutes les 30 s).' }));
        r.data.forEach(function (o) { list.appendChild(card(o)); }); });
    }
    function card(o) {
      var lines = h('ul', { class: 'olines' }); (o.items || []).forEach(function (l) {
        var d = []; if (l.remove && l.remove.length) d.push('sans ' + l.remove.join(', ').toLowerCase()); if (l.sauce) d.push('sauce ' + l.sauce); if (l.drink) d.push('boisson ' + l.drink); if (l.choice) d.push('choix : ' + l.choice);
        if (l.extras && l.extras.length) d.push('+ ' + l.extras.map(function (e) { return e.name || e; }).join(', ')); if (l.note) d.push('« ' + l.note + ' »');
        lines.appendChild(h('li', null, h('b', { text: l.qty + ' × ' + l.name }), d.length ? h('small', { text: ' — ' + d.join(' · ') }) : null)); });
      function set(st) { sb.from('orders').update({ status: st }).eq('id', o.id).then(function (r) { if (r.error) return toast(r.error.message, true); toast('Commande ' + o.ref + ' : ' + st); load(); }); }
      var cls = o.status === 'confirmée' ? 'ok' : o.status === 'annulée' ? 'ko' : 'wait';
      return h('div', { class: 'card order ' + cls },
        h('div', { class: 'row ohead' }, h('b', { text: 'N° ' + o.ref }), h('span', { class: 'badge ' + cls, text: o.status }), h('span', { class: 'mut', text: new Date(o.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Algiers', dateStyle: 'short', timeStyle: 'short' }) })),
        h('p', null, h('b', { text: o.customer_name }), ' · ', h('a', { href: 'tel:' + o.phone, text: tel(o.phone) })),
        h('p', null, (o.fulfillment === 'livraison' ? '🛵 Livraison : ' + (o.address || '') : '🥡 À emporter') + ' · ⏰ ' + o.slot),
        lines, o.note ? h('p', { class: 'mut', text: 'Remarque : ' + o.note }) : null,
        h('p', null, h('b', { text: 'Total estimé : ' + eur(o.total_cents) })),
        h('div', { class: 'acts' }, h('a', { class: 'btn', href: 'tel:' + o.phone, text: '📞 Appeler ' + tel(o.phone) }),
          o.status !== 'confirmée' ? h('button', { class: 'btn ghost sm', text: '✅ Confirmée', onclick: function () { set('confirmée'); } }) : null,
          o.status !== 'annulée' ? h('button', { class: 'btn red sm', text: '✖ Annulée', onclick: function () { if (confirm('Annuler la commande ' + o.ref + ' ?')) set('annulée'); } }) : null,
          o.status !== "en attente d'appel" ? h('button', { class: 'btn ghost sm', text: '↺ Remettre à appeler', onclick: function () { set("en attente d'appel"); } }) : null));
    }
    load(); OTIMER = setInterval(function () { if (TAB === 'commandes') load(); else clearInterval(OTIMER); }, 30000);
  }
  function hist(m) { m.appendChild(h('p', { class: 'mut', text: 'Les 50 dernières versions. Restaurer remplace le contenu actuel (puis « Enregistrer »).' }));
    sb.from('site_content_history').select('id,saved_at,data').order('id', { ascending: false }).limit(50).then(function (r) { if (r.error) return toast(r.error.message, true); if (!r.data.length) m.appendChild(h('p', { text: 'Aucune version précédente.' }));
      r.data.forEach(function (v) { m.appendChild(h('div', { class: 'card row' }, h('span', { text: new Date(v.saved_at).toLocaleString('fr-FR', { timeZone: 'Africa/Algiers' }) }), h('button', { class: 'btn ghost sm', text: 'Restaurer cette version', onclick: function () { if (confirm('Restaurer cette version ?')) { D = v.data; dirty(); toast('Version chargée — cliquez sur Enregistrer.'); } } }))); }); }); }
  sb.auth.getSession().then(function (s) { s.data.session ? start() : showLogin(); });
})();
