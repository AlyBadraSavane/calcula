// Copie la version Web dans www/ et la rend 100 % autonome (polices locales, aucune ressource distante).
// index.html de la branche main n'est jamais modifié : seule la copie dans www/ l'est.
import {cpSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync,copyFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const www=join(root,'www');
rmSync(www,{recursive:true,force:true});
mkdirSync(join(www,'fonts'),{recursive:true});

// Polices utilisées par l'application (mêmes graisses que le lien Google Fonts d'origine)
const FAMILIES=[
  {name:'Sora',slug:'sora',weights:[200,300,400,500]},
  {name:'Manrope',slug:'manrope',weights:[400,500,600,700]},
];
const RANGES={
  'latin':'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext':'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
};
let css='/* Polices embarquées (Sora, Manrope) — licence SIL OFL */\n';
let count=0;
for(const f of FAMILIES){
  for(const w of f.weights){
    for(const subset of ['latin','latin-ext']){
      const file=`${f.slug}-${subset}-${w}-normal.woff2`;
      const src=join(root,'node_modules','@fontsource',f.slug,'files',file);
      if(!existsSync(src)){
        if(subset==='latin')throw new Error('Police introuvable : '+src);
        continue;
      }
      copyFileSync(src,join(www,'fonts',file));count++;
      css+=`@font-face{font-family:'${f.name}';font-style:normal;font-weight:${w};font-display:swap;src:url(${file}) format('woff2');unicode-range:${RANGES[subset]};}\n`;
    }
  }
}
writeFileSync(join(www,'fonts','fonts.css'),css);

// index.html : remplace le lien Google Fonts par la feuille locale
let html=readFileSync(join(root,'index.html'),'utf8');
const link=/<link[^>]*href="https:\/\/fonts\.googleapis\.com[^>]*>/;
if(!link.test(html))throw new Error('Lien Google Fonts introuvable dans index.html');
html=html.replace(link,'<link rel="stylesheet" href="fonts/fonts.css">');
// Marges de sécurité (barre d'état / navigation) : Capacitor 8 fournit --safe-area-inset-* ; on les combine avec env()
const SAFE='<style>:root{padding-top:max(env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px));padding-bottom:max(env(safe-area-inset-bottom,0px),var(--safe-area-inset-bottom,0px))}</style>';
if(!html.includes('</head>'))throw new Error('</head> introuvable');
html=html.replace('</head>',SAFE+'\n</head>');
// Avertissement de mise à jour : uniquement pour l'APK téléchargé à la main (CALCULA_UPDATER=1).
// Google Play interdit à une application distribuée sur le Play Store de se mettre à jour autrement que par le Play Store.
if(process.env.CALCULA_UPDATER==='1'){
  const code=parseInt(process.env.VERSION_CODE||'',10);
  if(!code)throw new Error('VERSION_CODE requis quand CALCULA_UPDATER=1');
  const build={code,name:process.env.VERSION_NAME||String(code),repo:process.env.GITHUB_REPOSITORY||'AlyBadraSavane/calcula'};
  copyFileSync(join(root,'scripts','updater.js'),join(www,'update.js'));
  html=html.replace('</head>','<script>window.CALCULA_BUILD='+JSON.stringify(build)+';</script>\n<script src="update.js" defer></script>\n</head>');
  console.log('Mise à jour par APK activée (version '+build.name+', code '+code+').');
}
writeFileSync(join(www,'index.html'),html);

copyFileSync(join(root,'manifest.webmanifest'),join(www,'manifest.webmanifest'));
cpSync(join(root,'icons'),join(www,'icons'),{recursive:true});

// Contrôle : aucune ressource distante ne doit rester (hors espaces de noms XML)
const remote=[...html.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)/g)].map(m=>m[1]).filter(u=>!u.includes('w3.org'));
if(remote.length)throw new Error('Ressources distantes restantes : '+remote.join(', '));
console.log(`www/ prêt : ${count} fichiers de police, index.html autonome.`);
