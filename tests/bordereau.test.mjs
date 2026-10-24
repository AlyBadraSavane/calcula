import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const grab=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);return html.slice(i,j+b.length);};
const eng=grab('/*FL-START','/*FL-END*/'),fd=grab('/*FD-START','/*FD-END*/');
const ctx={};vm.createContext(ctx);
vm.runInContext(eng+'\n'+fd+'\nthis.api={fonteLingot,flDocModel,flToText,flBuildOps,flToPdfBytes,fdNum,fdW};',ctx);
const A=ctx.api,J=x=>JSON.parse(JSON.stringify(x));
const NOW=new Date(2026,9,24,8,5);
const full={pf:'85,5',tit:'23,1',p22:'1 200 000',pb:'88,25',pt:'1 180 000',fr:'1 200 000'};
const model=i=>A.flDocModel(i,A.fonteLingot(i),{now:NOW,number:'20261024-001'});
const pdfText=b=>Buffer.from(b).toString('latin1');
test('moteur financier inchangé (empreinte du bloc FL)',()=>{
  const h=crypto.createHash('sha256').update(eng).digest('hex');
  assert.equal(h,fs.readFileSync(new URL('./fl-engine.sha256',import.meta.url),'utf8').trim());
});
test('champs vides : aucun résultat chiffré, aucun gabarit exemple',()=>{
  const m=model({pf:'',tit:'',p22:'',pb:'',pt:'',fr:''});
  assert.equal(m.complete,false);
  m.results.forEach(r=>assert.equal(r.value,null));
  const t=A.flToText(m);assert.ok(!/85,5|23,1|1 200 000|88,25|1 180 000/.test(t));assert.ok(t.includes('Non renseigné'));
});
test('modèle complet : montants arrondis au franc, espaces pour les milliers',()=>{
  const m=model(full);const r=A.fonteLingot(full).r;
  assert.equal(m.results[0].value,A.fdNum(Math.round(r.valeur),0));
  assert.match(m.results[0].value,/^\d{1,3}( \d{3})+$/);
  assert.equal(m.complete,true);
});
test('bénéfice positif / nul / négatif',()=>{
  assert.equal(model(full).results[3].state,'pos');
  assert.equal(model({pf:'50',tit:'22',p22:'1000000',pb:'50',pt:'1100000',fr:''}).results[3].state,'neg');
  const pos=model({pf:'100',tit:'24',p22:'1200000',pb:'100',pt:'1000000',fr:''});assert.equal(pos.results[3].state,'pos');
  const z=model({pf:'22',tit:'22',p22:'1000',pb:'10',pt:'2200',fr:''});assert.equal(z.results[3].state,'zero');
});
test('perte négative : avertissement conservé dans texte et PDF',()=>{
  const m=model({pf:'100',tit:'23',p22:'1000000',pb:'90',pt:'900000',fr:''});
  assert.equal(m.warnings.length,1);assert.ok(A.flToText(m).includes('Perte au feu négative'));
  assert.ok(pdfText(A.flToPdfBytes(A.flBuildOps(m))).includes('Perte au feu n'));
});
test('disposition : aucun texte hors page ni tronqué (montants très longs)',()=>{
  const m=model({pf:'99999999,999',tit:'24',p22:'99999999999',pb:'99999999,999',pt:'99999999999',fr:'99999999999'});
  const pg=A.flBuildOps(m);
  pg.ops.filter(o=>o.t==='text').forEach(o=>{assert.ok(o.x>=0&&o.x+o.w<=pg.W+0.5,o.s);assert.ok(o.y>0&&o.y<pg.H);assert.ok(o.sc>0.6,'compression excessive : '+o.s);});
});
test('PDF valide, une page A4, sans marques interdites',()=>{
  const s=pdfText(A.flToPdfBytes(A.flBuildOps(model(full))));
  assert.ok(s.startsWith('%PDF-1.4')&&s.trimEnd().endsWith('%%EOF'));assert.ok(s.includes('/MediaBox [0 0 595 842]'));
  assert.ok(!/GOLDOS|QR/i.test(s));assert.ok(s.includes('BORDEREAU'));
  const xr=+s.match(/startxref\n(\d+)/)[1];assert.equal(s.slice(xr,xr+4),'xref');
});
test('texte, PDF et modèle portent les mêmes montants',()=>{
  const m=model(full),t=A.flToText(m),s=pdfText(A.flToPdfBytes(A.flBuildOps(m)));
  m.results.forEach(r=>{assert.ok(t.includes(r.value));assert.ok(s.includes('('+r.value.replace(/ /g,' ')));});
});
test('mêmes résultats qu\'avant la refonte (valeurs de référence)',()=>{
  const r=J(A.fonteLingot(full).r);
  assert.ok(Math.abs(r.valeur-85.5*23.1*1200000/22)<1e-6);assert.ok(Math.abs(r.cout-88.25*1180000)<1e-6);
});
test('image HD : cible 2480×3508, repli 1654×2341, redessinée à l\'échelle (pas d\'agrandissement)',()=>{
  const i=html.indexOf('const FL_PNG_SIZES'),src=html.slice(i,html.indexOf('const flPdf=',i));
  assert.match(src,/FL_PNG_SIZES=\[\[2480,3508\],\[1654,2341\]\]/);
  assert.ok(src.includes('c.setTransform(sx,0,0,sy,0,0)'));assert.ok(!/drawImage/.test(src));
  assert.ok(/for\(const \[PW,PH\] of FL_PNG_SIZES\)\{try\{/.test(src),'repli par boucle try/catch');
});
