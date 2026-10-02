/* ============================================================
   ANTARMUKA
   ============================================================ */
const fmt = (x,d=2)=> x.toFixed(d).replace('.',',');
const CAT_LABEL = {kosong:'Belum ada bukti', rendah:'Risiko rendah', sedang:'Risiko sedang', tinggi:'Risiko tinggi'};
const store = {
  get(k,d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
let P = mergeParams(store.get('cf-params', null));
let answers = Object.fromEntries(FACTORS.map(f=>[f.id,'tt']));
let log = store.get('cf-log', []);
if (!Array.isArray(log)) log = [];

function mergeParams(saved){
  const d = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
  if (!saved || typeof saved!=='object') return d;
  for (const id in d.cf) if (typeof saved.cf?.[id]==='number') d.cf[id]=saved.cf[id];
  for (const id in d.beta) if (typeof saved.beta?.[id]==='number') d.beta[id]=saved.beta[id];
  for (const k of ['alphaK2','alphaK5','tLow','tHigh']) if (typeof saved[k]==='number') d[k]=saved[k];
  return d;
}

/* Kasus lapangan (Kel. Bakalan Krajan, data Dinkes, nama dianonimkan). Faktor tercantum = "Ya, pasti"; lainnya = "Tidak". */
const PRESETS = [
  {name:'Kasus 1', yes:['F01','F02','F05','F10','F11','F15']},
  {name:'Kasus 2', yes:['F06','F10','F11','F15']},
  {name:'Kasus 3', yes:['F06','F13','F04','F10','F05','F11','F15']},
  {name:'Kasus 4', yes:['F06','F04','F10','F05','F11']},
  {name:'Kasus 5', yes:['F08','F13','F06','F04','F10','F05','F11','F15']}
];

function buildPresets(){
  const box = document.getElementById('presets');
  PRESETS.forEach(p=>{
    const b = document.createElement('button');
    b.className='btn'; b.type='button'; b.textContent=p.name;
    b.addEventListener('click',()=>{
      FACTORS.forEach(f=>answers[f.id] = p.yes.includes(f.id)?'pasti':'tidak');
      document.getElementById('logLabel').value = p.name+' (lapangan)';
      document.getElementById('logActual').value = 'stunted';
      syncForm(); render();
    });
    box.appendChild(b);
  });
  const clr = document.createElement('button');
  clr.className='btn'; clr.type='button'; clr.textContent='Kosongkan';
  clr.addEventListener('click',()=>{
    FACTORS.forEach(f=>answers[f.id]='tt');
    document.getElementById('logLabel').value=''; document.getElementById('logActual').value='';
    syncForm(); render();
  });
  box.appendChild(clr);
}

function buildForm(){
  const form = document.getElementById('form');
  CLUSTERS.forEach(c=>{
    const sec = document.createElement('section'); sec.className='cluster';
    const head = document.createElement('div'); head.className='cluster-head';
    head.innerHTML = `<h2>${c.id} · ${c.name}</h2><small id="hint-${c.id}"></small>`;
    sec.appendChild(head);
    FACTORS.filter(f=>f.k===c.id).forEach(f=>{
      const row = document.createElement('div'); row.className='factor';
      const lab = document.createElement('div'); lab.className='factor-label';
      lab.innerHTML = `<span class="code">${f.id}</span><span class="txt"></span><span class="w" id="w-${f.id}"></span>`;
      lab.querySelector('.txt').textContent = f.label;
      const fs = document.createElement('fieldset'); fs.className='seg';
      const lg = document.createElement('legend'); lg.textContent = f.label; fs.appendChild(lg);
      ANSWERS.forEach(a=>{
        const l = document.createElement('label');
        l.innerHTML = `<input type="radio" name="${f.id}" value="${a.v}"><span>${a.label}</span>`;
        l.querySelector('input').addEventListener('change',e=>{ answers[f.id]=e.target.value; render(); });
        fs.appendChild(l);
      });
      row.append(lab, fs); sec.appendChild(row);
    });
    form.appendChild(sec);
  });
}
function syncForm(){
  FACTORS.forEach(f=>{
    const el = document.querySelector(`input[name="${f.id}"][value="${answers[f.id]}"]`);
    if (el) el.checked = true;
    document.getElementById('w-'+f.id).textContent = 'CF pakar '+fmt(P.cf[f.id]);
  });
  CLUSTERS.forEach(c=>{
    const m = MEDIATIONS.find(x=>x.target===c.id);
    document.getElementById('hint-'+c.id).textContent =
      `β ${fmt(P.beta[c.id])}` + (m ? ` · α ${fmt(P[m.alphaKey])} bila ${m.via.join('/')} diketahui` : '');
  });
}

function buildParams(){
  const g = document.getElementById('params'); g.innerHTML='';
  const add = (label, get, set)=>{
    const d = document.createElement('label'); d.className='param';
    d.innerHTML = `<span></span><input type="number" min="0" max="1" step="0.05">`;
    d.querySelector('span').textContent = label;
    const inp = d.querySelector('input'); inp.value = get();
    inp.addEventListener('input',()=>{
      const v = parseFloat(inp.value);
      if (!isNaN(v) && v>=0 && v<=1){ set(v); store.set('cf-params',P); syncForm(); render(); }
    });
    g.appendChild(d);
  };
  FACTORS.forEach(f=>add(`${f.id} CF pakar`, ()=>P.cf[f.id], v=>P.cf[f.id]=v));
  CLUSTERS.forEach(c=>add(`${c.id} β (${c.name})`, ()=>P.beta[c.id], v=>P.beta[c.id]=v));
  add('α K2 (gizi ibu → ukuran lahir)', ()=>P.alphaK2, v=>P.alphaK2=v);
  add('α K5 (air & sanitasi → diare)', ()=>P.alphaK5, v=>P.alphaK5=v);
  add('Ambang risiko sedang', ()=>P.tLow, v=>P.tLow=v);
  add('Ambang risiko tinggi', ()=>P.tHigh, v=>P.tHigh=v);
}

function drawGauge(v){
  const svg = document.getElementById('gauge');
  const top=10, h=280, x=34, w=22;
  const y = val => top + (1-val)*h;
  let s = '';
  s += `<rect x="${x}" y="${y(1)}" width="${w}" height="${y(P.tHigh)-y(1)}" fill="var(--red-soft)"/>`;
  s += `<rect x="${x}" y="${y(P.tHigh)}" width="${w}" height="${y(P.tLow)-y(P.tHigh)}" fill="var(--amber-soft)"/>`;
  s += `<rect x="${x}" y="${y(P.tLow)}" width="${w}" height="${y(0)-y(P.tLow)}" fill="var(--green-soft)"/>`;
  s += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="none" stroke="var(--line)"/>`;
  for (let i=0;i<=20;i++){
    const val=i/20, major=i%2===0;
    s += `<line x1="${x+w}" x2="${x+w+(major?9:5)}" y1="${y(val)}" y2="${y(val)}" stroke="var(--muted)" stroke-width="1"/>`;
    if (major) s += `<text x="${x+w+12}" y="${y(val)+3.5}" font-size="9" fill="var(--muted)">${fmt(val,1)}</text>`;
  }
  const col = v>=P.tHigh?'var(--red)':v>=P.tLow?'var(--amber)':'var(--green)';
  s += `<g style="transition:transform .45s cubic-bezier(.2,.8,.2,1);transform:translateY(${y(v)}px)">
          <line x1="${x-8}" x2="${x+w}" y1="0" y2="0" stroke="${col}" stroke-width="3"/>
          <path d="M${x-16},-7 L${x-6},0 L${x-16},7 Z" fill="${col}"/></g>`;
  s += `<text x="${x+w/2}" y="${y(0)+0}" font-size="0"> </text>`;
  svg.innerHTML = s;
}

let lastResult = null;
function render(){
  const R = hitungCF(answers, P); lastResult = R;
  document.getElementById('num').textContent = fmt(R.total);
  const cat = document.getElementById('cat'); cat.className = 'cat '+R.category; cat.textContent = CAT_LABEL[R.category];
  document.getElementById('naive').textContent = fmt(R.naive);
  drawGauge(R.total);

  document.getElementById('bars').innerHTML = R.clusters.map(c=>`
    <div class="bar"><span>${c.id} ${c.name}</span>
    <span class="track"><span class="fill" style="width:${(c.final*100).toFixed(1)}%;display:block"></span></span>
    <span class="v">${fmt(c.final)}</span></div>`).join('');

  const K = kontribusi(answers, P, R.total);
  document.getElementById('contrib').innerHTML = K.length
    ? '<ol>'+K.map(k=>`<li>${k.id} ${escapeHtml(k.label)}: <b>+${fmt(k.delta,3)}</b></li>`).join('')+'</ol>'
    : '<p class="empty">Pilih jawaban pada kuesioner atau muat salah satu kasus untuk melihat kontribusi.</p>';

  document.getElementById('trace').innerHTML = traceHtml(R);
}

function traceHtml(R){
  const active = R.clusters.filter(c=>c.raw>0);
  if (!active.length) return '<p class="empty">Belum ada faktor yang dijawab dengan keyakinan > 0.</p>';
  let h = '<h4>Langkah 1 · CF bukti = CF pakar × CF pengguna</h4>';
  active.forEach(c=>c.items.filter(i=>i.e>0).forEach(i=>{
    h += `<span class="eq">${i.id}: ${fmt(i.rule)} × ${fmt(i.w)} = ${fmt(i.e,3)}</span>`;
  }));
  h += '<h4>Langkah 2 · Kombinasi dalam klaster (β) dan atenuasi (α)</h4>';
  active.forEach(c=>{
    h += `<div><b>${c.id} ${c.name}</b> (β = ${fmt(c.beta)})</div>`;
    c.steps.forEach(s=>{
      h += s.first ? `<span class="eq">S = ${fmt(s.c,3)}</span>`
        : `<span class="eq">S = ${fmt(s.prev,3)} + ${fmt(c.beta)} × ${fmt(s.c,3)} × (1 − ${fmt(s.prev,3)}) = ${fmt(s.next,3)}</span>`;
    });
    if (c.alpha<1) h += `<span class="eq">× α ${fmt(c.alpha)} karena ${c.alphaReason} → ${fmt(c.final,3)}</span>`;
  });
  h += '<h4>Langkah 3 · Kombinasi antarklaster (independen)</h4>';
  R.totalSteps.forEach(s=>{
    h += s.first ? `<span class="eq">CF = ${fmt(s.c,3)}</span>`
      : `<span class="eq">CF = ${fmt(s.prev,3)} + ${fmt(s.c,3)} × (1 − ${fmt(s.prev,3)}) = ${fmt(s.next,3)}</span>`;
  });
  h += `<h4>Langkah 4 · Kategori</h4><span class="eq">${fmt(R.total,3)} → ${CAT_LABEL[R.category]} (sedang ≥ ${fmt(P.tLow)}, tinggi ≥ ${fmt(P.tHigh)})</span>`;
  return h;
}
function escapeHtml(s){ return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ---------- log uji ---------- */
function renderLog(){
  const t = document.getElementById('logTable');
  if (!log.length){ t.innerHTML = '<tr><td class="empty">Belum ada catatan. Isi kuesioner, lalu pilih “Catat” di panel hasil.</td></tr>'; return; }
  t.innerHTML = '<thead><tr><th>Label</th><th>Status aktual</th><th>CF total</th><th>CF standar</th><th>Kategori</th><th>Faktor “ya”</th></tr></thead><tbody>' +
    log.map(r=>`<tr><td>${escapeHtml(r.label)}</td><td>${r.actual||'–'}</td><td>${fmt(r.total,3)}</td><td>${fmt(r.naive,3)}</td><td>${CAT_LABEL[r.category]}</td>
      <td>${FACTORS.filter(f=>r.w[f.id]>0).map(f=>f.id).join(', ')||'–'}</td></tr>`).join('') + '</tbody>';
}
document.getElementById('logAdd').addEventListener('click',()=>{
  const R = lastResult;
  log.push({
    label: document.getElementById('logLabel').value.trim() || `Uji ${log.length+1}`,
    actual: document.getElementById('logActual').value,
    w: Object.fromEntries(FACTORS.map(f=>[f.id, W[answers[f.id]]])),
    k: Object.fromEntries(R.clusters.map(c=>[c.id, c.final])),
    total: R.total, naive: R.naive, category: R.category,
    params: JSON.parse(JSON.stringify(P)), time: new Date().toISOString()
  });
  store.set('cf-log', log); renderLog();
});
document.getElementById('clearLog').addEventListener('click',()=>{ log=[]; store.set('cf-log',log); renderLog(); });
document.getElementById('resetParams').addEventListener('click',()=>{
  P = JSON.parse(JSON.stringify(DEFAULT_PARAMS)); store.set('cf-params',P); buildParams(); syncForm(); render();
});

function toCsv(){
  const head = ['label','status_aktual','waktu',...FACTORS.map(f=>f.id),...CLUSTERS.map(c=>c.id),'cf_total','cf_standar','kategori'];
  const q = v => { const s = v===null||v===undefined ? '' : String(v); return /[",;\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
  const rows = log.map(r=>[r.label,r.actual,r.time,...FACTORS.map(f=>r.w[f.id]),...CLUSTERS.map(c=>r.k[c.id].toFixed(4)),
    r.total.toFixed(4), r.naive.toFixed(4), r.category].map(q).join(','));
  return [head.join(','), ...rows].join('\n');
}
/* Unduh log sebagai CSV (BOM agar terbaca benar di Excel) */
document.getElementById('dlCsv').addEventListener('click',()=>{
  const msg = document.getElementById('dlMsg');
  if (!log.length){ msg.textContent = 'Log masih kosong.'; return; }
  const blob = new Blob(['\ufeff'+toCsv()], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'log-uji-cf-stunting.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  msg.textContent = 'Log diunduh.';
});

buildPresets(); buildForm(); buildParams(); syncForm(); render(); renderLog();
