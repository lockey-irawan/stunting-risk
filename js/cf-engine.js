/* ============================================================
   cf-engine.js — MESIN CF (murni, tanpa DOM)
   Dipakai di browser (variabel global) maupun Node.js (require).
   ============================================================ */
const FACTORS = [
  {id:'F01', k:'K1', label:'Panjang badan lahir < 48 cm', cf:0.80},
  {id:'F02', k:'K1', label:'Berat badan lahir < 2.500 g (BBLR)', cf:0.60},
  {id:'F03', k:'K2', label:'Ibu mengalami KEK sebelum/selama hamil', cf:0.50},
  {id:'F06', k:'K2', label:'Ibu minum tablet tambah darah < 90 tablet', cf:0.35},
  {id:'F04', k:'K3', label:'Tidak mendapat ASI eksklusif 6 bulan', cf:0.45},
  {id:'F13', k:'K3', label:'Tidak inisiasi menyusu dini (IMD)', cf:0.10},
  {id:'F05', k:'K4', label:'Pernah menderita diare', cf:0.40},
  {id:'F10', k:'K4', label:'Pernah menderita ISPA atau pneumonia', cf:0.20},
  {id:'F12', k:'K4', label:'Pernah menderita kecacingan', cf:0.10},
  {id:'F07', k:'K5', label:'Sarana air minum rumah tangga tidak layak', cf:0.30},
  {id:'F09', k:'K5', label:'Sanitasi (jamban) tidak layak', cf:0.20},
  {id:'F11', k:'K6', label:'Ada anggota keluarga yang merokok', cf:0.15},
  {id:'F08', k:'K7', label:'Imunisasi dasar tidak lengkap', cf:0.25},
  {id:'F14', k:'K7', label:'Persalinan bukan oleh nakes atau di luar fasyankes', cf:0.10},
  {id:'F15', k:'K7', label:'Tidak memiliki JKN/BPJS', cf:0.05}
];
const CLUSTERS = [
  {id:'K1', name:'Ukuran lahir', beta:0.5},
  {id:'K2', name:'Gizi ibu hamil', beta:0.5},
  {id:'K3', name:'Praktik menyusui', beta:0.5},
  {id:'K4', name:'Penyakit infeksi', beta:0.7},
  {id:'K5', name:'Air & sanitasi', beta:0.7},
  {id:'K6', name:'Asap rokok', beta:1.0},
  {id:'K7', name:'Akses layanan', beta:0.5}
];
/* Mediasi: klaster target dilemahkan α bila status faktor perantara sudah diketahui */
const MEDIATIONS = [
  {target:'K2', alphaKey:'alphaK2', via:['F01','F02'], reason:'status ukuran lahir (F01/F02) sudah diketahui'},
  {target:'K5', alphaKey:'alphaK5', via:['F05'], reason:'status diare (F05) sudah diketahui'}
];
const ANSWERS = [
  {v:'pasti',  label:'Ya, pasti',    w:1.0},
  {v:'hampir', label:'Hampir pasti', w:0.8},
  {v:'mungkin',label:'Kemungkinan',  w:0.6},
  {v:'tt',     label:'Tidak tahu',   w:null},
  {v:'tidak',  label:'Tidak',        w:0}
];
const DEFAULT_PARAMS = {
  cf: Object.fromEntries(FACTORS.map(f=>[f.id,f.cf])),
  beta: Object.fromEntries(CLUSTERS.map(c=>[c.id,c.beta])),
  alphaK2:0.5, alphaK5:0.6, tLow:0.40, tHigh:0.70
};
const W = Object.fromEntries(ANSWERS.map(a=>[a.v,a.w]));

/* Kombinasi berurutan: S1 = c1; Sj = S(j-1) + β·cj·(1 − S(j-1)); diurutkan menurun agar deterministik */
function combine(values, beta){
  const vals = values.filter(v=>v>0).sort((a,b)=>b-a);
  let s = 0; const steps = [];
  vals.forEach((c,i)=>{
    const prev = s;
    s = i===0 ? c : prev + beta*c*(1-prev);
    steps.push({prev,c,next:s,first:i===0});
  });
  return {value:s, steps};
}

function hitungCF(answers, P){
  const known = id => answers[id] && answers[id] !== 'tt';
  const clusters = CLUSTERS.map(c=>{
    const items = FACTORS.filter(f=>f.k===c.id).map(f=>{
      const w = W[answers[f.id]] ?? null;
      return {id:f.id, label:f.label, rule:P.cf[f.id], w, e: w ? P.cf[f.id]*w : 0};
    });
    const beta = P.beta[c.id];
    const r = combine(items.map(i=>i.e), beta);
    let alpha = 1, alphaReason = '';
    const m = MEDIATIONS.find(x=>x.target===c.id);
    if (m && m.via.some(known) && r.value>0){ alpha = P[m.alphaKey]; alphaReason = m.reason; }
    return {id:c.id, name:c.name, beta, items, raw:r.value, steps:r.steps, alpha, alphaReason, final:r.value*alpha};
  });
  const tot = combine(clusters.map(c=>c.final), 1);
  const naive = combine(FACTORS.map(f=>{const w=W[answers[f.id]]; return w? P.cf[f.id]*w : 0;}), 1).value;
  const anyEvidence = FACTORS.some(f=>W[answers[f.id]]);
  let category = 'kosong';
  if (anyEvidence) category = tot.value >= P.tHigh ? 'tinggi' : tot.value >= P.tLow ? 'sedang' : 'rendah';
  return {total:tot.value, totalSteps:tot.steps, clusters, naive, category};
}

/* Kontribusi hapus-satu: CF total − CF total bila faktor itu dijawab "Tidak" */
function kontribusi(answers, P, base){
  return FACTORS.filter(f=>W[answers[f.id]]).map(f=>{
    const a2 = {...answers, [f.id]:'tidak'};
    return {id:f.id, label:f.label, delta: base - hitungCF(a2,P).total};
  }).sort((a,b)=>b.delta-a.delta);
}

/* Ekspor untuk Node.js (pengujian / integrasi backend) */
if (typeof module !== 'undefined' && module.exports){
  module.exports = {FACTORS, CLUSTERS, MEDIATIONS, ANSWERS, DEFAULT_PARAMS, W, combine, hitungCF, kontribusi};
}
