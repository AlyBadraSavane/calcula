// À lancer juste après « npx cap add android » : personnalise le projet Android généré
// (icônes, orientation portrait, écran de démarrage sombre, numéro de version).
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

// 3b) Widget d'écran d'accueil : un raccourci qui ouvre Calcula (aucune donnée, aucune permission)
{
  const pkgDir=join(app,'java','com','alybadra','calcula');
  mkdirSync(pkgDir,{recursive:true});mkdirSync(join(res,'xml'),{recursive:true});mkdirSync(join(res,'layout'),{recursive:true});mkdirSync(join(res,'drawable'),{recursive:true});
  writeFileSync(join(pkgDir,'CalculaWidget.java'),`package com.alybadra.calcula;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class CalculaWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.calcula_widget);
            views.setOnClickPendingIntent(R.id.widget_root, pending);
            manager.updateAppWidget(id, views);
        }
    }
}
`);
  writeFileSync(join(res,'xml','calcula_widget_info.xml'),`<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="110dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:initialLayout="@layout/calcula_widget"
    android:previewLayout="@layout/calcula_widget" />
`);
  writeFileSync(join(res,'layout','calcula_widget.xml'),`<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="12dp"
    android:background="@drawable/calcula_widget_bg">
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="="
        android:textColor="#E8C46C"
        android:textSize="44sp"
        android:textStyle="bold" />
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Calcula"
        android:textColor="#EEF1F7"
        android:textSize="15sp" />
</LinearLayout>
`);
  writeFileSync(join(res,'drawable','calcula_widget_bg.xml'),`<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#141926" />
    <stroke android:width="1dp" android:color="#59E8C46C" />
    <corners android:radius="24dp" />
</shape>
`);
  let mm=readFileSync(mf,'utf8');
  if(!mm.includes('CalculaWidget')){
    const recv=`<receiver android:name=".CalculaWidget" android:exported="true" android:label="Calcula">
            <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE" /></intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/calcula_widget_info" />
        </receiver>
    </application>`;
    const n=mm.replace('</application>',recv);
    if(n===mm)warn('Balise </application> introuvable : widget non déclaré.');else writeFileSync(mf,n);
  }
  console.log('Widget Calcula ajouté.');
}

// 4) Numéro de version (Google Play exige un versionCode qui augmente à chaque envoi)
const code=process.env.VERSION_CODE,name=process.env.VERSION_NAME;
if(code){
  const g=join(root,'android','app','build.gradle');
  let b=readFileSync(g,'utf8');
  const b2=b.replace(/versionCode\s+\d+/,'versionCode '+parseInt(code,10)).replace(/versionName\s+"[^"]*"/,'versionName "'+(name||'1.0')+'"');
  if(b2===b)warn('versionCode/versionName introuvables dans build.gradle.');
  writeFileSync(g,b2);
  console.log('Version : '+(name||'1.0')+' (code '+code+')');
}
console.log('Personnalisation Android terminée.');
