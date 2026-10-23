/* Calcula — avertissement de mise à jour (APK téléchargé à la main uniquement).
   Injecté par scripts/prepare-www.mjs quand CALCULA_UPDATER=1 ; jamais présent dans la version Web ni dans l'AAB Google Play.
   Au démarrage (et au retour sur l'application), si Internet est disponible, on lit la dernière « Release » publique
   du dépôt GitHub. Aucune donnée personnelle n'est envoyée. Hors ligne : rien ne s'affiche, rien ne casse. */
(function(){
  var B=window.CALCULA_BUILD;
  if(!B||!B.code||!B.repo)return;
  var KEY='calc.upd',API='https://api.github.com/repos/'+B.repo+'/releases/latest',HOUR=3600e3;
  function get(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){return {};}}
  function put(o){try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}}

  var css=document.createElement('style');
  css.textContent=
   '#upd{position:fixed;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top,0px));top:calc(10px + max(env(safe-area-inset-top,0px),var(--safe-area-inset-top,0px)));z-index:200;max-width:520px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:22px;'+
   'background:var(--sheet,rgba(24,28,38,.94));color:var(--fg,#e9ecf2);border:1px solid var(--accent,#d9b25f);box-shadow:0 18px 40px rgba(0,0,0,.35);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);'+
   'font-family:var(--f-body,system-ui,sans-serif);transform:translateY(-140%);opacity:0;transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .25s}'+
   '#upd.in{transform:none;opacity:1}'+
   '#upd .u-ic{flex:none;width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,#f2d486,#be8c3a);color:#2e2008}'+
   '#upd .u-ic svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}'+
   '#upd .u-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}'+
   '#upd .u-t b{font-size:.92rem;font-weight:700}'+
   '#upd .u-t span{font-size:.76rem;opacity:.72;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
   '#upd button{font:inherit;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}'+
   '#upd .go{flex:none;padding:10px 14px;border-radius:14px;font-weight:700;font-size:.84rem;color:#2e2008;background:linear-gradient(135deg,#f2d486,#be8c3a)}'+
   '#upd .lt{flex:none;width:34px;height:34px;border-radius:12px;background:transparent;color:inherit;opacity:.65;font-size:1.05rem}';
  document.head.appendChild(css);

  function hide(el){el.classList.remove('in');setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},400);}
  function later(code){var s=get();s.laterCode=code;s.later=Date.now();put(s);}

  function show(info){
    if(document.getElementById('upd'))return;
    var el=document.createElement('div');el.id='upd';el.setAttribute('role','alert');
    el.innerHTML='<div class="u-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg></div>'+
      '<div class="u-t"><b>Mise à jour disponible</b><span></span></div>'+
      '<button type="button" class="go">Télécharger</button><button type="button" class="lt" aria-label="Plus tard">✕</button>';
    el.querySelector('.u-t span').textContent=info.name+(info.notes?' — '+info.notes:'');
    el.querySelector('.go').addEventListener('click',function(){
      later(info.code);hide(el);
      try{if(!window.open(info.url,'_blank'))location.href=info.url;}catch(e){location.href=info.url;}
    });
    el.querySelector('.lt').addEventListener('click',function(){later(info.code);hide(el);});
    document.body.appendChild(el);
    requestAnimationFrame(function(){requestAnimationFrame(function(){el.classList.add('in');});});
  }

  function check(force){
    var st=get();
    if(!force&&st.last&&Date.now()-st.last<10*60e3)return;
    if(navigator.onLine===false||!window.fetch)return;
    var ctrl=window.AbortController?new AbortController():null;
    var timer=setTimeout(function(){if(ctrl)ctrl.abort();},8000);
    fetch(API,{headers:{Accept:'application/vnd.github+json'},cache:'no-store',signal:ctrl?ctrl.signal:undefined})
      .then(function(r){return r.ok?r.json():Promise.reject(new Error('http'));})
      .then(function(rel){
        clearTimeout(timer);
        var s=get();s.last=Date.now();put(s);
        var m=/^apk-(\d+)$/.exec(rel.tag_name||'');
        if(!m)return;
        var code=parseInt(m[1],10);
        if(!(code>B.code))return;
        if(s.laterCode===code&&s.later&&Date.now()-s.later<24*HOUR)return;
        var asset=(rel.assets||[]).filter(function(a){return /\.apk$/i.test(a.name||'');})[0];
        show({code:code,name:rel.name||('Calcula '+code),url:asset?asset.browser_download_url:rel.html_url,
              notes:String(rel.body||'').split('\n')[0].slice(0,80)});
      })
      .catch(function(){clearTimeout(timer);});
  }

  setTimeout(function(){check(false);},2500);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)check(false);});
  window.addEventListener('online',function(){check(true);});
})();
