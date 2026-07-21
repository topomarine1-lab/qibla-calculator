# SubTopo Qibla — Application Android

Application Android native embarquant le calculateur Qibla avec implantation UTM.

## 📱 Structure du projet

```
SubTopoQibla/
├── app/
│   ├── src/main/
│   │   ├── java/com/subtopo/qibla/
│   │   │   └── MainActivity.java       ← Activité principale (WebView)
│   │   ├── assets/
│   │   │   └── index.html              ← Votre application HTML complète
│   │   ├── res/
│   │   │   ├── layout/activity_main.xml
│   │   │   ├── values/themes.xml
│   │   │   └── xml/file_paths.xml
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── build.gradle
├── settings.gradle
└── gradle.properties
```

---

## 🔨 Comment compiler l'APK

### Option 1 — Android Studio (recommandé)

1. Installer **Android Studio** : https://developer.android.com/studio
2. Ouvrir Android Studio → **Open Project** → sélectionner le dossier `SubTopoQibla`
3. Attendre la synchronisation Gradle (quelques minutes)
4. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. L'APK sera dans : `app/build/outputs/apk/debug/app-debug.apk`

### Option 2 — Ligne de commande

```bash
# Installer Android SDK + JDK 17 d'abord
cd SubTopoQibla
chmod +x gradlew
./gradlew assembleDebug
# APK : app/build/outputs/apk/debug/app-debug.apk
```

### Option 3 — APK de release (signé)

```bash
./gradlew assembleRelease
# Puis signer avec: jarsigner ou Android Studio Build → Generate Signed APK
```

---

## 📲 Installer l'APK sur Android

### Méthode directe (USB)
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Via fichier
1. Copier l'APK sur le téléphone (USB ou cloud)
2. Ouvrir le fichier sur le téléphone
3. Activer **"Sources inconnues"** si demandé :
   Paramètres → Sécurité → Installer des apps inconnues

---

## ✅ Fonctionnalités Android

| Fonctionnalité | Status |
|---|---|
| Calcul direction Qibla | ✅ |
| Capture GPS automatique | ✅ (permission demandée) |
| Carte interactive (Leaflet) | ✅ (nécessite internet) |
| Implantation stakeout | ✅ |
| Offset parallèle | ✅ |
| Boussole temps réel | ✅ |
| Export CSV / DXF / KML / TXT | ✅ (sauvegardé dans Téléchargements) |
| Export PDF | ✅ |
| Partage via WhatsApp / Email | ✅ |
| Mode hors-ligne | ✅ (HTML embarqué) |
| Langue FR / EN | ✅ |

---

## ⚙️ Configuration

- **Package ID** : `com.subtopo.qibla`
- **SDK minimum** : Android 5.0 (API 21)
- **SDK cible** : Android 14 (API 34)
- **Orientations** : Portrait uniquement

---

## 🔧 Modifier l'application

Pour mettre à jour le contenu :
1. Remplacer `app/src/main/assets/index.html` par la nouvelle version
2. Recompiler avec Android Studio

---

## 📞 Contact

**NASRAOUI FATHI** — SubTopo Engineering
