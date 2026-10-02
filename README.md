# Simulator CF Risiko Stunting Balita

Prototipe sistem pakar berbasis *certainty factor* (CF) berjenjang untuk uji coba
sebelum validasi dengan data lapangan. Semua perhitungan berjalan di peramban;
tidak ada server, basis data, atau koneksi keluar selain Google Fonts.

## Struktur

```
simulator-cf-stunting/
├── index.html          Halaman utama
├── css/style.css       Tampilan (tema terang/gelap otomatis)
├── js/cf-engine.js     Mesin CF murni: faktor, klaster, parameter, rumus
├── js/app.js           Antarmuka: kuesioner, papan ukur, jejak hitung, log uji
└── tests/test-engine.js  Uji regresi mesin CF (Node.js)
```

## Menjalankan

Cara paling cepat: buka `index.html` langsung di peramban (klik ganda).

Lewat server lokal (disarankan, misalnya untuk diakses dari perangkat lain di jaringan yang sama):

```bash
# Python 3
cd simulator-cf-stunting
python -m http.server 8000
# buka http://localhost:8000

# atau Node.js
npx serve .
```

Menjalankan uji mesin CF:

```bash
node tests/test-engine.js
```

## Model perhitungan

1. CF bukti: `CF_e = CF_pakar × CF_pengguna`
   (Ya, pasti = 1,0; Hampir pasti = 0,8; Kemungkinan = 0,6; Tidak / Tidak tahu = 0).
2. Dalam klaster (diurutkan menurun): `S₁ = c₁; Sⱼ = Sⱼ₋₁ + β·cⱼ·(1 − Sⱼ₋₁)`.
3. Mediasi: CF klaster dikali α bila faktor perantara sudah diketahui
   (K2 gizi ibu × 0,5 bila F01/F02 diketahui; K5 air & sanitasi × 0,6 bila F05 diketahui).
4. Antarklaster: `CF = CF₁ + CF₂(1 − CF₁)` berurutan.
5. Kategori: < 0,40 rendah; 0,40–0,69 sedang; ≥ 0,70 tinggi.

Parameter default ada di `DEFAULT_PARAMS` dalam `js/cf-engine.js`. Parameter juga bisa
diubah lewat halaman; perubahan disimpan di `localStorage` peramban.

## Log uji dan validasi

Menu "Catat ke log uji" menyimpan jawaban, CF tiap klaster, CF total, kategori, dan status
aktual (stunted / tidak stunted). Tombol "Unduh log (CSV)" menghasilkan berkas untuk analisis
ROC/AUC dan penentuan ambang optimal (indeks Youden).

Log dan parameter tersimpan di `localStorage`, sehingga terikat pada satu peramban di satu
perangkat. Unduh CSV secara berkala bila uji dilakukan di beberapa perangkat.

## Catatan

- Nilai CF pakar, β, α, dan ambang adalah nilai awal berbasis literatur dan belum divalidasi.
- Lima kasus contoh berasal dari data Dinkes (Kel. Bakalan Krajan) dan sudah dianonimkan.
- Bila komputer tidak terhubung internet, huruf Plus Jakarta Sans tidak termuat dan halaman
  memakai huruf sistem; fungsi lain tetap berjalan normal.
