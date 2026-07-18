# SubTopo-GNSS — Guide WebIntoApp (Web → APK)

Convertir la web app SubTopo-GNSS en APK Android via WebIntoApp (ou équivalent : PWABuilder, Median.co, GoNative, etc.).

## 🎯 URL à utiliser

```
https://mbuaskylahp8a.space.minimax.io
```

## 📋 Étapes (WebIntoApp.com)

1. **Va sur https://webintoapp.com** (ou ton service préféré)
2. **Colle l'URL** : `https://mbuaskylahp8a.space.minimax.io`
3. **Configure l'app** :

| Paramètre | Valeur |
|---|---|
| **App Name** | `SubTopo-GNSS` |
| **Package Name** | `com.nasraoui.subtopognss` |
| **Version** | `1.0.0` |
| **Version Code** | `1` |
| **Icon** | Upload `icon-1024.png` (depuis `subtopo-gnss-web/assets/`) |
| **Splash Screen** | Upload `apple-touch-icon.png` ou `icon-512.png` |
| **Theme Color** | `#0D9488` (teal) |
| **Background Color** | `#F5F7F5` |
| **Orientation** | Portrait |
| **Status Bar** | Light icons on primary |
| **Navigation Bar** | Default |
| **Permissions** | Location, Internet, Storage, Camera, Vibration |

4. **Options avancées** (coche si disponibles) :
   - ✅ Fullscreen mode
   - ✅ Pull-to-refresh désactivé
   - ✅ Cache enabled (pour offline)
   - ✅ Allow location access
   - ✅ Allow camera (pour photo waypoints)
   - ✅ Splash screen duration: 2s
   - ✅ Prevent text selection
   - ✅ Disable zoom

5. **Generate APK** — ça prend 2-5 min
6. **Download** le fichier `.apk`
7. **Installe sur ton téléphone** (active "Sources inconnues" dans les paramètres)

## 🛠️ Préparations déjà faites dans la web app

La web app est optimisée pour WebIntoApp :

- ✅ **PWA installable** : `manifest.json` + icônes (192, 512, 1024, maskable)
- ✅ **Service Worker** : app shell + cache tuiles pour offline
- ✅ **Meta tags iOS/Android PWA** : `apple-mobile-web-app-*`, `mobile-web-app-capable`
- ✅ **Viewport optimisé** : `viewport-fit=cover` pour écrans notchés
- ✅ **WebView detection** : la classe `in-webview` est ajoutée sur `<body>` pour adapter le style
- ✅ **Back button Android** : navigation dans les onglets, puis exit
- ✅ **No overscroll** : `overscroll-behavior: none`, pas de bounce iOS
- ✅ **No text selection** : empêche la sélection accidentelle sur l'UI
- ✅ **No tap highlight** : `-webkit-tap-highlight-color: transparent`
- ✅ **Format detection off** : pas de transformation des numéros en tel
- ✅ **Vraies données GPS** : `navigator.geolocation` marche dans WebView
- ✅ **Service Worker offline** : les tuiles sont cachées après premier chargement
- ✅ **Bridge natif** : `window.SubTopoNative.hideSplash()` appelé après chargement

## 🆚 Comparaison avec la version Android Kotlin

| Feature | PWA + WebIntoApp | Android Kotlin natif |
|---|---|---|
| **Installation** | APK généré en 5 min | Compile Gradle 5-10 min |
| **Taille APK** | ~5-10 MB | ~15-25 MB |
| **Performance** | Très bonne | Excellente |
| **GnssMeasurement API** | ❌ (W3C Geolocation) | ✅ Accès complet |
| **Pseudodistances brutes** | ❌ | ✅ |
| **Phase porteuse** | ❌ | ✅ |
| **Multi-constellation** | ✅ via W3C | ✅ Direct |
| **Offline** | ✅ Service Worker | ✅ OSMDroid cache |
| **Background tracking** | ❌ (limité) | ✅ Foreground service |
| **Personnalisation native** | ❌ | ✅ Total |

**Recommandation** : utilise WebIntoApp pour avoir un APK rapide à partager. Pour une version pro avec accès complet au chipset, ouvre le projet `subtopo-gnss-android/` dans Android Studio.

## 🐛 Troubleshooting

**L'app ne charge pas l'URL** :
- Vérifie que l'URL est accessible : `https://mbuaskylahp8a.space.minimax.io`
- Assure-toi que HTTPS est activé dans WebIntoApp

**Géolocalisation ne marche pas** :
- Vérifie que la permission Location est cochée dans WebIntoApp
- L'app doit servir via HTTPS pour la géoloc

**L'écran est zoomé/dézoomé** :
- Ajoute `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no` au viewport (déjà fait)

**Le splash reste bloqué** :
- Augmente la durée du splash à 3000ms dans WebIntoApp
- Le web app appelle `SubTopoNative.hideSplash()` après 500ms si disponible

**Icône floue** :
- Upload `icon-1024.png` (1024×1024) pour la meilleure qualité

## 📞 Support

Pour les problèmes liés à WebIntoApp, consulte leur documentation.
Pour les problèmes liés à l'app elle-même, vérifie la console du navigateur (F12 sur desktop) ou active "USB debugging" sur Android.

## 🔄 Mise à jour de l'APK

Quand tu modifies l'app web et redéploie, regénère un APK depuis WebIntoApp. C'est instantané — pas besoin de toucher au code natif.

## 📜 Licence

© 2026 Nasraoui Fathi — Tous droits réservés.
