# SubTopo-GNSS

Application web de relevé GNSS de précision — développée par **Nasraoui Fathi**.

## 🚀 Lancer l'application

L'application est 100% statique. Deux options :

### Option 1 — Ouvrir directement
Double-clic sur `index.html` → s'ouvre dans ton navigateur par défaut.

> ⚠️ La géolocalisation W3C (`navigator.geolocation`) nécessite **`https://`** ou **`http://localhost`**. Si tu ouvres le fichier via `file://`, le bouton de géoloc ne marchera pas. C'est une limitation des navigateurs, pas du code.

### Option 2 — Servir en local (recommandé pour la géoloc)

```bash
# Python 3
python3 -m http.server 8080

# Ou Node.js (avec npx)
npx serve .

# Ou PHP
php -S localhost:8080
```

Puis ouvre http://localhost:8080 dans ton navigateur.

## 📂 Structure

```
subtopo-gnss-web/
├── index.html          # Page principale (5 onglets + drawer + bottom nav)
├── styles.css          # Thème vert Material (#1E7D34), responsive
├── app.js              # Logique : simulation GNSS, moyenne pondérée, UTM, exports
├── assets/
│   └── logo.svg        # Logo SubTopo-GNSS
└── README.md           # Ce fichier
```

## ✨ Fonctionnalités

- 🛰 **Multi-constellation** : GPS, Galileo, GLONASS, BeiDou
- 🎯 **Deux modes** : Navigation (temps réel) / Levé de précision (moyennage)
- ⏱ **Moyennage configurable** : 1, 5 ou 10 minutes (ou manuel)
- 📐 **Coordonnées UTM** (X, Y, Z) ou **géographiques** (Lat, Lon, Alt) — toggle dans la barre d'app
- 🗺 **Zone UTM** : auto-calculée depuis la longitude, ou forcée (1N à 60N) via Paramètres
- 📊 **Calcul de qualité** : moyenne pondérée (poids = 1/σ²), RMS 2D/3D, précision 95%
- 🗺️ **Carte interactive** OpenStreetMap (Leaflet) avec waypoint + position W3C
- 📤 **Exports** : GPX, KML, CSV (compatibles AlpineQuest / QGIS / Google Earth)
- 💾 **Persistance** : paramètres et waypoints en `localStorage`
- 📱 **Responsive** : optimisé mobile (Android-first), fonctionne aussi sur desktop

## 🔧 Stack technique

- HTML5 + CSS3 (variables CSS, grid, flexbox)
- JavaScript vanilla (zéro framework, zéro build)
- [Leaflet 1.9.4](https://leafletjs.com/) via CDN (carte OpenStreetMap)
- `navigator.geolocation` (W3C Geolocation API)

## 📐 Algorithme

- **Moyenne pondérée** : `position = Σ(p_i × w_i) / Σ(w_i)` avec `w_i = 1/σ_i²`
- **RMS 2D/3D** : projection locale en mètres (1° lat ≈ 111 320 m, 1° lon ≈ 111 320 × cos(lat))
- **Conversion WGS84 → UTM** : Transverse Mercator sur ellipsoïde WGS84 (formule complète avec e², e'², N, T, C, M)
- **Qualité** : < 0.5 m Excellente · < 1 m Bonne · < 2 m Moyenne · < 5 m Faible · sinon Insuffisante

## ⚠️ Limites

Cette app simule les mesures GNSS (un navigateur web n'a pas accès à `GnssMeasurement` API d'Android). Toute la logique métier est réelle, mais les chiffres sont aléatoires pour démonstration. Pour utiliser la version Android (avec vraies mesures du chipset), voir le projet `subtopo-gnss-android` (Kotlin/Compose).

## 📜 Licence

© 2026 Nasraoui Fathi — Tous droits réservés.
