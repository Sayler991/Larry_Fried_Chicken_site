/* Rendu des sections à partir du contenu (utilisé au build par Node et en direct dans le navigateur). */
(function (root) {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function slug(s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function price(p) { p = String(p == null ? '' : p).trim(); return p ? esc(p.replace('.', ',')) + '&nbsp;DA' : '<span class="pb">Prix à confirmer</span>'; }
  function menu(d) {
    var cats = (d.menu || []).filter(function (c) { return c.items && c.items.length; });
    var tabs = '<nav class="tabs" aria-label="Rubriques de la carte">' + cats.map(function (c, i) { return '<a href="#cat-' + slug(c.name) + '"' + (i ? '' : ' class="on"') + '>' + esc(c.name) + '</a>'; }).join('') + '</nav>';
    var body = cats.map(function (c) {
      return '<section class="cat" id="cat-' + slug(c.name) + '" data-ci="' + (d.menu || []).indexOf(c) + '"><h3>' + esc(c.name) + (c.note ? ' <small>' + esc(c.note) + '</small>' : '') + '</h3><ul class="items">' +
        c.items.map(function (it, ii) { if (it.hidden === true) return '';
          return '<li data-ii="' + ii + '" class="item' + (it.img ? ' has-img' : '') + '">' + (it.img ? '<img src="' + esc(it.img) + '" alt="' + esc(it.name) + '" loading="lazy" width="120" height="120">' : '') +
            '<div class="it-t"><div class="it-h"><b>' + esc(it.name) + '</b><span class="dots"></span><span class="pr">' + price(it.price) + '</span></div>' +
            (it.tag ? '<span class="tag">' + esc(it.tag) + '</span>' : '') + (it.desc ? '<p>' + esc(it.desc) + '</p>' : '') + '</div></li>';
        }).join('') + '</ul></section>';
    }).join('');
    return tabs + body;
  }
  function hours(d) {
    var js = new Date().getDay(), map = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return '<table class="hours">' + (d.hours || []).map(function (h) {
      var s = String(h.slots || '').trim();
      var txt = s ? s.split(',').map(function (x) { return esc(x.trim().replace(/:/g, 'h').replace('-', ' – ')); }).join('<br>') : 'Fermé';
      return '<tr data-day="' + esc(h.day) + '"><th>' + esc(h.day) + '</th><td>' + txt + '</td></tr>';
    }).join('') + '</table>';
  }
  function gallery(d) {
    return (d.gallery || []).map(function (g) { return '<figure><img src="' + esc(g.src) + '" alt="' + esc(g.alt) + '" loading="lazy"><figcaption>' + esc(g.alt) + '</figcaption></figure>'; }).join('');
  }
  function reviews(d) {
    return (d.reviews || []).map(function (r) {
      return '<blockquote class="rev"><div class="stars" aria-label="' + (r.rating || 5) + ' sur 5">' + '★★★★★'.slice(0, r.rating || 5) + '</div><p>« ' + esc(r.text) + ' »</p><footer><b>' + esc(r.author) + '</b> · ' + esc(r.date || '') + '<br><small>' + esc(r.source || '') + '</small></footer></blockquote>';
    }).join('');
  }
  function services(d) { return ((d.info || {}).services || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join(''); }
  var R = { esc: esc, menu: menu, hours: hours, gallery: gallery, reviews: reviews, services: services };
  if (typeof module !== 'undefined') module.exports = R; else root.SNACK_RENDER = R;
})(this);
