# Calcula — version Android (branche `android`)

L'application Web (`index.html`) est embarquée telle quelle dans une application Android via **Capacitor**.
Le dossier `android/` n'est pas versionné : il est généré à chaque compilation.

Compilation automatique : `.github/workflows/android.yml` (GitHub Actions) → artefact **Calcula-APK** (`Calcula-debug.apk`).

Étapes : `npm install` → `scripts/prepare-www.mjs` (copie dans `www/`, polices Sora/Manrope locales) →
`npx cap add android` → `scripts/android-setup.mjs` (icônes, portrait, écran de démarrage sombre) → `gradlew assembleDebug`.

APK de test signé avec la clé de débogage Android. Aucune clé de publication Google Play n'est créée ici.
