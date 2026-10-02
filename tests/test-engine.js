/* Uji regresi mesin CF dengan Node.js:  node tests/test-engine.js
   Memastikan hasil perhitungan tetap sama dengan perhitungan manual
   setelah kode atau parameter diubah. */
const assert = require('assert');
const {FACTORS, DEFAULT_PARAMS, hitungCF, combine} = require('../js/cf-engine.js');

function jawaban(ya, sisanya = 'tidak'){
  const a = {};
  FACTORS.forEach(f => a[f.id] = ya.includes(f.id) ? 'pasti' : sisanya);
  return a;
}
const dekat = (x, y, msg) => assert.ok(Math.abs(x - y) < 0.0015, `${msg}: ${x.toFixed(4)} ≠ ${y}`);

/* 1. Rumus kombinasi */
dekat(combine([0.6, 0.4], 1).value, 0.76, 'CF paralel klasik (β = 1)');
dekat(combine([0.4, 0.6], 1).value, 0.76, 'tidak bergantung urutan input');
dekat(combine([0.6, 0.4], 0).value, 0.60, 'β = 0 → nilai maksimum');

/* 2. Lima kasus lapangan (nilai dari perhitungan manual) */
const kasus = [
  ['Kasus 1', ['F01','F02','F05','F10','F11','F15'], 0.942, 'tinggi'],
  ['Kasus 2', ['F06','F10','F11','F15'], 0.467, 'sedang'],
  ['Kasus 3', ['F06','F13','F04','F10','F05','F11','F15'], 0.820, 'tinggi'],
  ['Kasus 4', ['F06','F04','F10','F05','F11'], 0.801, 'tinggi'],
  ['Kasus 5', ['F08','F13','F06','F04','F10','F05','F11','F15'], 0.862, 'tinggi']
];
for (const [nama, ya, harap, kat] of kasus){
  const r = hitungCF(jawaban(ya), DEFAULT_PARAMS);
  dekat(r.total, harap, nama);
  assert.strictEqual(r.category, kat, `${nama} kategori`);
  console.log(`✓ ${nama}: CF = ${r.total.toFixed(3)} (${r.category}), CF standar = ${r.naive.toFixed(3)}`);
}

/* 3. Aturan mediasi K2 */
const a = {}; FACTORS.forEach(f => a[f.id] = 'tt'); a.F03 = 'pasti';
dekat(hitungCF(a, DEFAULT_PARAMS).total, 0.50, 'KEK, ukuran lahir tidak diketahui');
a.F02 = 'tidak';
dekat(hitungCF(a, DEFAULT_PARAMS).total, 0.25, 'KEK, BBLR = tidak');
a.F02 = 'pasti';
dekat(hitungCF(a, DEFAULT_PARAMS).total, 0.70, 'KEK + BBLR');
console.log('✓ Aturan mediasi');

/* 4. Tanpa bukti */
assert.strictEqual(hitungCF(jawaban([], 'tt'), DEFAULT_PARAMS).category, 'kosong');
console.log('✓ Semua uji lulus');
