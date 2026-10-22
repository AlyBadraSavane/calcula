// À lancer juste après « npx cap add android » : personnalise le projet Android généré
// (icônes, orientation portrait, écran de démarrage sombre, barres système).
import {readFileSync,writeFileSync,existsSync,cpSync,readdirSync,statSync,rmSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const app=join(root,'android','app','src','main');
if(!existsSync(app))throw new Error('Projet Android introuvable : lancez d\'abord « npx cap add android ».');
const res=join(app,'res');
const warn=m=>console.warn('::warning::'+m);

// 1) Icônes
cpSync(join(root,'android-res','res'),res,{recursive:true});
console.log('Icônes copiées.');

// 2) Écran de démarrage : fond uni sombre (remplace les images splash.png blanches du modèle)
const walk=d=>readdirSync(d).flatMap(n=>{const p=join(d,n);return statSync(p).isDirectory()?walk(p):[p];});
let removed=0;
for(const f of walk(res)){
  if(/[\\/]drawable[^\\/]*[\\/]splash\.(png|jpg|webp)$/.test(f)){rmSync(f);removed++;}
}
mkdirSync(join(res,'drawable'),{recursive:true});
writeFileSync(join(res,'drawable','splash.xml'),`<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item><shape android:shape="rectangle"><solid android:color="#090b10"/></shape></item>
</layer-list>
`);
console.log(`Écran de démarrage sombre (${removed} image(s) remplacée(s)).`);

// 3) AndroidManifest : orientation portrait
const mf=join(app,'AndroidManifest.xml');
let m=readFileSync(mf,'utf8');
if(!/screenOrientation=/.test(m)){
  const n=m.replace(/<activity\b/,'<activity android:screenOrientation="portrait"');
  if(n===m)warn('Balise <activity> introuvable : orientation non modifiée.');
  m=n;writeFileSync(mf,m);
}

// 4) Thèmes : barres système sombres et mode non plein-écran forcé (évite que l'interface passe sous la barre d'état)
const st=join(res,'values','styles.xml');
if(existsSync(st)){
  let s=readFileSync(st,'utf8');
  const items='\n        <item name="android:statusBarColor">#090b10</item>\n        <item name="android:navigationBarColor">#090b10</item>\n        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>';
  let touched=0;
  s=s.replace(/(<style\s+name="AppTheme\.NoActionBar(?:Launch)?"[^>]*>)/g,(a)=>{touched++;return a+items;});
  if(!touched)warn('Style AppTheme.NoActionBar introuvable : barres système non personnalisées.');
  writeFileSync(st,s);
}else warn('values/styles.xml introuvable.');
console.log('Personnalisation Android terminée.');
