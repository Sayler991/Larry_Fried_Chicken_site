# Larry Fried Chicken — Tlemcen (site vitrine + commande en ligne)

Site one-page statique (GitHub Pages) + CMS `/admin/` (Supabase, schéma `larryfc`), sur le modèle de Sayler991/Snack_111_site.

- Contenu : `content.json` (graine) → pré-rendu par `node dev/build.js` (ajoute aussi le cache-busting `?v=`) ; en ligne, `assets/js/live.js` lit `larryfc.site_content`.
- Commande : `assets/js/order.js` → table `larryfc.orders` (statut « en attente d'appel »), le restaurant rappelle le client pour confirmer.
- SQL : `dev/supabase/schema.sql`, `dev/supabase/orders.sql`.

## Sources
- Google (via exa.ai/library/place/wx3vb07snn4) : note 3,9/5 (138 avis), téléphone, horaires, avis.
- winrouh.com/restaurant/larry-fried-chicken-1 : téléphone, horaires, Instagram.
- dnalgerie.com (4 mars 2025) : enseigne, catégories de la carte.
- Yassir Food (page Larry Oran) : logo et photo de plats de l'enseigne.

## À confirmer
Tous les prix et compositions ; adresse postale exacte ; WhatsApp ; conditions de livraison ; photo = visuel de l'enseigne (page Yassir d'Oran), pas spécifiquement Tlemcen.
La Statue de la Liberté (`assets/img/liberty.svg`) est une illustration décorative originale, pas une photo du restaurant.
