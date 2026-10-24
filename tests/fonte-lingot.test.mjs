// Tests des formules « Fonte / Lingot ». Le code testé est extrait tel quel de index.html (aucune copie).
// Lancer : node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const html=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'..','index.html'),'utf8');
const a=html.indexOf('/*FL-START'),b=html.indexOf('/*FL-END*/');
assert.ok(a>0&&b>a,'Bloc FL-START / FL-END introuvable dans index.html');
const ctx={};vm.createContext(ctx);
vm.runInContext(html.slice(a,b)+'\nthis.flParse=flParse;this.fonteLingot=fonteLingot;',ctx);
// Les objets créés dans le contexte vm sont normalisés (JSON) pour pouvoir être comparés avec deepEqual.
const flParse=x=>JSON.parse(JSON.stringify(ctx.flParse(x)));
const fonteLingot=x=>JSON.parse(JSON.stringify(ctx.fonteLingot(x)));
const near=(x,y,eps=1e-6)=>assert.ok(Math.abs(x-y)<=eps,`attendu ${y}, obtenu ${x}`);
const base={pf:'100',tit:'21.5',p22:'1000000',pb:'105',pt:'850000',fr:'2000000'};

test('A. valeur du lingot = poids × titrage × prix22 ÷ 22',()=>{
  near(fonteLingot(base).r.valeur,97727272.7272727,1e-4);
  near(fonteLingot({pf:'48.69',tit:'22',p22:'1200000'}).r.valeur,48.69*1200000,1e-4);      // titrage 22 => poids × prix
  near(fonteLingot({pf:'10',tit:'24',p22:'1100000'}).r.valeur,10*24*1100000/22,1e-4);      // dénominateur fixe 22 (jamais 24)
  assert.notEqual(Math.round(fonteLingot({pf:'10',tit:'24',p22:'1100000'}).r.valeur),11000000);
});
test('B. prix équivalent au titrage',()=>{
  near(fonteLingot(base).r.prixEq,977272.727272727,1e-6);
  near(fonteLingot({tit:'18',p22:'1150000'}).r.prixEq,1150000*18/22,1e-6);
});
test('C. coût terrain = poids brut × prix terrain',()=>{
  assert.equal(fonteLingot(base).r.cout,89250000);
  assert.equal(fonteLingot({pb:'41,19',pt:'850000'}).r.cout,41.19*850000);
});
test('D. bénéfice positif, nul, négatif et frais facultatifs',()=>{
  near(fonteLingot(base).r.benefice,6477272.7272727,1e-4);                                  // positif
  near(fonteLingot({...base,fr:''}).r.benefice,8477272.7272727,1e-4);                        // frais vides = 0
  assert.equal(fonteLingot({...base,fr:''}).fraisParDefaut,true);
  const zero=fonteLingot({pf:'100',tit:'22',p22:'1000000',pb:'100',pt:'1000000',fr:'0'});    // 100M − 100M − 0
  assert.equal(zero.r.benefice,0);
  const neg=fonteLingot({pf:'100',tit:'22',p22:'1000000',pb:'100',pt:'1100000',fr:'500000'});
  assert.equal(neg.r.benefice,-10500000);                                                   // jamais forcé à 0
  assert.ok(neg.r.benefice<0);
});
test('E. perte au feu : positive, nulle, négative, pourcentage',()=>{
  const e=fonteLingot(base);near(e.r.perte,5);near(e.r.pertePct,4.761904761904762,1e-9);
  const z=fonteLingot({pb:'100',pf:'100'});assert.equal(z.r.perte,0);assert.equal(z.r.pertePct,0);assert.deepEqual(z.warn,[]);
  const n=fonteLingot({pb:'100',pf:'101.5'});near(n.r.perte,-1.5);near(n.r.pertePct,-1.5);assert.deepEqual(n.warn,['perteNegative']);   // non masquée
  const zb=fonteLingot({pb:'0',pf:'10'});assert.equal(zb.r.perte,-10);assert.equal(zb.r.pertePct,undefined);                                // % seulement si brut > 0
});
test('F. or fin estimé et pureté théorique',()=>{
  near(fonteLingot(base).r.orFin,89.58333333333333,1e-9);
  near(fonteLingot(base).r.purete,89.58333333333333,1e-9);
  near(fonteLingot({tit:'24'}).r.purete,100);
  near(fonteLingot({tit:'18'}).r.purete,75);
  assert.equal(fonteLingot({tit:'18'}).r.orFin,undefined);        // sans poids : pas d'or fin
});
test('Champs vides : aucun résultat trompeur',()=>{
  const r=fonteLingot({});assert.deepEqual(r.r,{});assert.deepEqual(r.err,{});
  const p=fonteLingot({pf:'100',tit:'22'});assert.equal(p.r.valeur,undefined);assert.deepEqual(p.need.valeur,['p22']);
  assert.equal(p.r.orFin,100*22/24);assert.equal(p.r.benefice,undefined);
  assert.equal(fonteLingot({pb:'10',pt:'1000'}).r.benefice,undefined);                    // coût seul : pas de bénéfice
  assert.equal(fonteLingot({pf:'10',tit:'22',p22:'1000'}).r.benefice,undefined);           // valeur seule : pas de bénéfice
});
test('Saisies invalides et négatives refusées',()=>{
  assert.equal(fonteLingot({pf:'abc',tit:'22',p22:'1000'}).err.pf,'invalid');
  assert.equal(fonteLingot({pf:'abc',tit:'22',p22:'1000'}).r.valeur,undefined);
  assert.equal(fonteLingot({pf:'-5',tit:'22',p22:'1000'}).err.pf,'negative');
  assert.equal(fonteLingot({pf:'5',tit:'22',p22:'-1000'}).err.p22,'negative');
  assert.equal(fonteLingot({pb:'-1',pt:'10'}).err.pb,'negative');
  assert.equal(fonteLingot({pb:'1',pt:'-10'}).err.pt,'negative');
  assert.equal(fonteLingot({...base,fr:'-1'}).err.fr,'negative');
  assert.equal(fonteLingot({...base,fr:'-1'}).r.benefice,undefined);                      // frais invalides : pas de bénéfice trompeur
  assert.equal(fonteLingot({...base,fr:'x'}).err.fr,'invalid');
  assert.equal(fonteLingot({pf:'1.2.3',tit:'22',p22:'1'}).err.pf,'invalid');
});
test('Titrage : 0 et > 24 refusés, 24 accepté',()=>{
  assert.equal(fonteLingot({tit:'0'}).err.tit,'range');
  assert.equal(fonteLingot({tit:'24.1'}).err.tit,'range');
  assert.equal(fonteLingot({tit:'25'}).err.tit,'range');
  assert.equal(fonteLingot({tit:'-1'}).err.tit,'negative');
  assert.equal(fonteLingot({tit:'24'}).err.tit,undefined);
  assert.equal(fonteLingot({tit:'0.01'}).err.tit,undefined);
  assert.equal(fonteLingot({tit:'0',pf:'10',p22:'1000'}).r.valeur,undefined);
});
test('Décimales : virgule, point, espaces et séparateurs de milliers',()=>{
  assert.equal(flParse('23,10').v,23.1);assert.equal(flParse('23.10').v,23.1);
  assert.equal(flParse('41,19').v,41.19);assert.equal(flParse(' 48.69 ').v,48.69);
  assert.equal(flParse('1 200 000').v,1200000);assert.equal(flParse('1 200 000').v,1200000);
  assert.equal(flParse('1,200,000').v,1200000);assert.equal(flParse('1.200.000').v,1200000);
  assert.equal(flParse('1,200,000.5').v,1200000.5);assert.equal(flParse('.5').v,0.5);assert.equal(flParse('5.').v,5);
  assert.equal(flParse('').empty,true);assert.equal(flParse('   ').empty,true);assert.equal(flParse(null).empty,true);
  assert.equal(flParse('--5').err,'invalid');assert.equal(flParse('1e5').err,'invalid');
  near(fonteLingot({pf:'41,19',tit:'23,10',p22:'1 200 000'}).r.valeur,41.19*23.1*1200000/22,1e-4);
  assert.equal(fonteLingot({pf:'41,19',tit:'23,10',p22:'1200000'}).r.valeur,fonteLingot({pf:'41.19',tit:'23.10',p22:'1,200,000'}).r.valeur);
});
test('Valeurs rapides GOLDOS : toutes acceptées',()=>{
  ['10','25','41.19','48.69','50','100','250','500'].forEach(w=>assert.equal(fonteLingot({pf:w}).err.pf,undefined));
  ['24','23.10','23','22.5','22','18'].forEach(t=>assert.equal(fonteLingot({tit:t}).err.tit,undefined));
  ['1200000','1150000','1100000'].forEach(x=>assert.equal(fonteLingot({p22:x}).err.p22,undefined));
});
