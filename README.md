# MCS — Military Crime System (prototipe front-end)

Prototipe sistem monitoring perkara pidana militer. Konsep lengkap: [docs/KONSEP-MCS.md](docs/KONSEP-MCS.md).

## Menjalankan

Buka lewat XAMPP: `http://localhost/mcs/` (Command Center) dan `http://localhost/mcs/admin.html` (Workspace).
Tidak perlu build. Tambahkan `?nointro` di URL Command Center untuk melewati animasi globe.
Data contoh dibangkitkan relatif terhadap tanggal hari ini; perubahan dari Workspace disimpan di `localStorage` browser
(hapus data situs untuk kembali ke kondisi awal).

## Struktur

| Berkas | Isi |
|---|---|
| `index.html`, `css/mcs.css` | Command Center |
| `admin.html`, `css/admin.css`, `js/admin.js` | Workspace (input & pembaruan perkara, verifikasi, laporan, pengguna) |
| `css/tokens.css`, `js/ui.js` | Token desain & komponen bersama |
| `js/data.js` | Model domain peradilan militer + data contoh deterministik |
| `js/map.js` | Peta D3/TopoJSON: nasional → provinsi → kab/kota, lapisan pengadilan militer |
| `js/app.js`, `js/case.js`, `js/panels.js`, `js/ai.js`, `js/boot.js` | Dashboard, berkas perkara, agenda/pustaka/pencarian, asisten, intro globe |
| `data/geo-id.js` | Batas 514 kab/kota (BPS/OCHA via geoBoundaries, CC BY 3.0 IGO), 38 provinsi |
| `tools/build-geo.js` | Pembangun `data/geo-id.js` dari GeoJSON geoBoundaries ADM2 |
| `_arsip-v1/` | Berkas versi mockup sebelumnya yang tidak dipakai lagi |

## Membangun ulang data peta

```
npm i topojson-server topojson-simplify topojson-client   # di folder kerja terpisah
NODE_PATH=<folder>/node_modules node tools/build-geo.js <geoBoundaries-IDN-ADM2_simplified.geojson>
```
