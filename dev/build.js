// Pré-rendu de index.html depuis content.json (+ cache-busting ?v=). Usage : cd dev && node build.js
const fs = require('fs'), path = require('path'), R = require('../assets/js/render.js');
const root = path.join(__dirname, '..'), d = JSON.parse(fs.readFileSync(path.join(root, 'content.json'), 'utf8')), i = d.info, V = Date.now().toString(36);
const ld = { '@context': 'https://schema.org', '@type': 'Restaurant', name: 'Larry Fried Chicken (Tlemcen)', servesCuisine: 'Fried chicken', telephone: i.phone, address: { '@type': 'PostalAddress', addressLocality: 'Mansourah, Tlemcen', addressCountry: 'DZ' }, geo: { '@type': 'GeoCoordinates', latitude: i.lat, longitude: i.lng }, sameAs: [i.instagram], aggregateRating: { '@type': 'AggregateRating', ratingValue: '3.9', reviewCount: i.reviews_count } };
let t = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const rep = { V, LD: JSON.stringify(ld), TAGLINE: R.esc(i.tagline), RATING: R.esc(i.rating), COUNT: R.esc(i.reviews_count), MENU: R.menu(d), PRICENOTE: R.esc(i.price_note), ABOUT: R.esc(i.about), SERVICES: R.services(d), GALLERY: R.gallery(d), REVIEWS: R.reviews(d), HOURS: R.hours(d), ADDRESS: R.esc(i.address), SEED: JSON.stringify(d).replace(/</g, '\\u003c') };
t = t.replace(/__([A-Z]+)__/g, (m, k) => rep[k] != null ? rep[k] : m);
fs.writeFileSync(path.join(root, 'index.html'), t);
for (const f of ['admin/index.html']) { const p = path.join(root, f); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/(admin\.(?:css|js)|config\.js)(\?v=[a-z0-9]+)?"/g, '$1?v=' + V + '"')); }
console.log('index.html v=' + V);
