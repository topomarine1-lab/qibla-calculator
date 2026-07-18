# SubTopo-GNSS — Guide déploiement GitHub Pages + WebIntoApp

## 🎯 Vue d'ensemble

```
Code source (ce ZIP)
    ↓
Push sur GitHub
    ↓
Activer GitHub Pages
    ↓
URL publique HTTPS (ex: https://username.github.io/subtopo-gnss)
    ↓
Coller dans WebIntoApp
    ↓
APK Android prêt à installer
```

## 📦 Préparation du repo GitHub

### Option A — Via l'interface web GitHub (le plus simple)

1. **Va sur https://github.com/new**
2. **Crée un nouveau repo** :
   - **Repository name** : `subtopo-gnss` (ou autre nom)
   - **Description** : "SubTopo-GNSS — Application de relevé GNSS de précision"
   - **Public** (obligatoire pour GitHub Pages gratuit)
   - ✅ Add a README file
3. **Upload les fichiers** :
   - Sur la page du repo, clique **"uploading an existing file"** ou **Add file → Upload files**
   - **Drag & drop** TOUT le contenu du ZIP **décompressé** (le dossier `subtopo-gnss-web/`)
   - ⚠️ **Important** : uploade le CONTENU du dossier, pas le dossier lui-même
   - Structure attendue à la racine du repo :
     ```
     index.html
     styles.css
     app.js
     sw.js
     manifest.json
     README.md
     WEBINTOAPP-GUIDE.md
     GITHUB-PAGES-GUIDE.md (ce fichier)
     .nojekyll
     assets/
       ├── logo.svg
       ├── icon-192.png
       ├── icon-512.png
       ├── icon-1024.png
       ├── icon-maskable.png
       └── apple-touch-icon.png
     ```
   - **Commit changes**

### Option B — Via Git CLI (plus pro)

```bash
# Décompresse le ZIP
unzip subtopo-gnss-web.zip
cd subtopo-gnss-web

# Initialise git
git init
git add .
git commit -m "Initial commit — SubTopo-GNSS v3.2"

# Crée le repo sur GitHub (via l'interface), puis :
git remote add origin https://github.com/TON-USERNAME/subtopo-gnss.git
git branch -M main
git push -u origin main
```

## 🌐 Activer GitHub Pages

1. **Va dans ton repo** sur GitHub
2. **Settings** → **Pages** (menu gauche)
3. **Source** : `Deploy from a branch`
4. **Branch** : `main` / `/ (root)`
5. **Save**
6. Attends 1-2 min que GitHub build
7. Ton URL sera : **`https://TON-USERNAME.github.io/subtopo-gnss/`**

Une bannière en haut du repo confirme le déploiement.

## ✅ Vérification

Ouvre l'URL dans ton navigateur :
- ✅ Splash avec logo + spinner
- ✅ App se charge en moins de 2s
- ✅ Localisation demandée et accordée
- ✅ Mini-carte topo s'affiche
- ✅ Tracking GPS fonctionne (bouton "DÉMARRER TRACKING")
- ✅ Test du PWA : menu "Ajouter à l'écran d'accueil" disponible

## 📱 WebIntoApp — Étapes finales

1. **Va sur https://webintoapp.com** (ou ton service préféré)
2. **Colle l'URL** : `https://TON-USERNAME.github.io/subtopo-gnss/`
3. **Configure** :

| Champ | Valeur |
|---|---|
| App Name | `SubTopo-GNSS` |
| Package Name | `com.nasraoui.subtopognss` |
| Version | `1.0.0` |
| Theme Color | `#0D9488` |
| Background Color | `#F5F7F5` |
| Orientation | Portrait |
| Icon | Upload `icon-1024.png` du ZIP |

4. **Active** :
   - ✅ Location
   - ✅ Camera (pour photo waypoints)
   - ✅ Internet
   - ✅ Storage
   - ✅ Vibration
   - ✅ Fullscreen
   - ✅ Cache enabled
   - ✅ Pull-to-refresh off

5. **Generate APK** (5 min)
6. **Download** l'APK
7. **Installe** sur ton téléphone (active "Sources inconnues")

## 🔄 Mise à jour

Quand tu modifies le code :

```bash
# Via CLI
git add .
git commit -m "Update"
git push

# Via interface web : Edit / Upload / Commit
```

GitHub Pages redéploie automatiquement en 1-2 min. Pour mettre à jour l'APK, regénère-le dans WebIntoApp avec la même URL.

## 🆚 Alternatives à WebIntoApp

- **PWABuilder** (https://www.pwabuilder.com) — par Microsoft, génère des APK/AAB plus proprement
- **Median.co** (https://median.co) — plus pro, mais payant
- **GoNative** (https://gonative.io) — payant, plus de features natives
- **Capacitor** (https://capacitorjs.com) — open source, build natif via XCode/Android Studio, plus de contrôle

**Recommandation** : PWABuilder est gratuit, open source, et produit un vrai AAB Android Studio-ready.

## 🐛 Troubleshooting

**GitHub Pages ne build pas** :
- Settings → Pages → vérifie que la branche est bien `main` et `/ (root)`
- Settings → Actions → regarde les logs du workflow

**404 sur les tuiles de la carte** :
- Le Service Worker doit avoir le bon chemin : déjà géré via `./` dans `sw.js`

**L'app ne s'ouvre pas correctement** :
- Ouvre la console (F12) sur l'URL GitHub Pages
- Cherche les erreurs 404 (chemin incorrect)

**HTTPS obligatoire** : GitHub Pages fournit HTTPS par défaut ✅

## 📞 Notes

- Le dossier `subtopo-gnss-android/` est le projet Kotlin natif (optionnel, pour aller plus loin)
- Le dossier `subtopo-gnss-web/` est ce qu'il faut push sur GitHub
- Le fichier `WEBINTOAPP-GUIDE.md` est aussi dans le ZIP pour référence

Bon déploiement ! 🚀
