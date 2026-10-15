# MCS — Military Crime System
## Sistem Monitoring Perkara Pidana Militer Terpadu

*Dokumen konsep · bahan paparan untuk pemangku kepentingan · versi 1.0, Oktober 2026*

---

## 1. Ringkasan eksekutif

Perkara pidana yang melibatkan prajurit TNI melewati banyak instansi: Polisi Militer menyidik, Ankum dan Papera mengambil keputusan, Oditurat menuntut, Pengadilan Militer mengadili, lalu Oditurat kembali mengeksekusi putusan. Saat ini, setiap instansi mencatat perkaranya sendiri. Akibatnya pimpinan sulit mendapat jawaban cepat atas pertanyaan dasar:

- Berapa perkara yang sedang berjalan, dan di tahap mana?
- Kapan sidang berikutnya, dan siapa yang bersidang hari ini?
- Masa penahanan siapa yang segera berakhir?
- Berapa kerugian negara, dan berapa yang sudah dipulihkan?
- Perkara mana yang lama tidak bergerak?

**MCS menyatukan seluruh perjalanan perkara pidana militer dalam satu sistem.** Setiap instansi memperbarui bagiannya sendiri. Pimpinan melihat gambaran nasional secara langsung: dari peta Indonesia sampai ke berkas satu perkara.

MCS terdiri dari dua aplikasi yang memakai satu basis data:

| Aplikasi | Pengguna | Fungsi utama |
|---|---|---|
| **Command Center** | Pimpinan, analis, Jampidmil, Itjen | Memantau: peta sebaran, statistik, agenda sidang, peringatan, berkas perkara |
| **Workspace** | Oditurat, Kepaniteraan Pengadilan Militer, Penyidik POM, Admin Otmilti, Admin Pusat | Mengelola: input perkara, pembaruan tahap, jadwal & hasil sidang, putusan, verifikasi, laporan |

---

## 2. Latar belakang & permasalahan

| Kondisi saat ini | Dampak |
|---|---|
| Data perkara tersebar di Puspom, Oditurat, Pengadilan Militer, dan satuan | Tidak ada satu angka resmi; rekap manual memakan waktu berhari-hari |
| Status perkara diperbarui lewat surat atau laporan berkala | Pimpinan terlambat mengetahui perkara yang macet |
| Batas masa penahanan dipantau manual | Risiko penahanan melewati batas waktu |
| Kerugian negara dan pemulihannya dicatat terpisah | Sulit mengukur efektivitas pemulihan aset |
| Jadwal sidang hanya diketahui pengadilan setempat | Koordinasi Oditur, saksi, dan satuan kurang optimal |
| Peralihan KUHP lama ke KUHP 2023 (UU 1/2023, berlaku 2 Januari 2026) | Butuh rujukan pasal lama ↔ baru yang konsisten |

---

## 3. Tujuan

1. **Satu sumber data** perkara pidana militer nasional yang dapat dipertanggungjawabkan.
2. **Transparansi internal**: setiap perkara dapat dilacak dari laporan sampai eksekusi putusan.
3. **Peringatan dini**: masa penahanan, perkara macet, penundaan sidang berulang, eksekusi tertunda.
4. **Akuntabilitas**: setiap perubahan tercatat, terverifikasi, dan dapat diaudit.
5. **Bahan kebijakan**: tren jenis pidana, sebaran wilayah, matra, golongan pangkat, dan kerugian negara.

---

## 4. Ruang lingkup & dasar hukum

**Ruang lingkup:** tindak pidana yang dilakukan prajurit TNI (AD, AL, AU) dan diproses di lingkungan peradilan militer, termasuk perkara koneksitas yang dikoordinasikan dengan Jampidmil Kejaksaan Agung.

**Rujukan utama:**
- UU No. 31 Tahun 1997 tentang Peradilan Militer (hukum acara, kewenangan pengadilan, penahanan)
- Kitab Undang-Undang Hukum Pidana Militer (KUHPM)
- KUHP lama dan KUHP 2023 (UU No. 1 Tahun 2023, berlaku 2 Januari 2026)
- UU sektoral: Narkotika (35/2009), Tipikor (31/1999 jo. 20/2001), PKDRT (23/2004), TPKS (12/2022), UU Darurat 12/1951, LLAJ (22/2009), ITE
- UU No. 25 Tahun 2014 tentang Hukum Disiplin Militer (untuk perkara yang diselesaikan secara disiplin)
- PP No. 22 Tahun 2025 (pembentukan Dilmilti IV Balikpapan dan Dilmilti V Makassar)
- PP No. 23 Tahun 2025 (susunan 22 Pengadilan Militer)

---

## 5. Para pihak & peran dalam sistem

| Pihak | Peran di MCS | Yang diperbarui |
|---|---|---|
| **Babinkum TNI / Orjen TNI** | Admin Pusat | Data induk (pasal, satuan), pengguna, konfigurasi, verifikasi akhir |
| **Puspom TNI / Pomdam / Pomal / Pomau** | Penyidik POM | Laporan polisi militer, perkembangan penyidikan, pelimpahan berkas |
| **Oditurat Militer (Otmil)** | Operator Oditurat | Pemberkasan, Skeppera, dakwaan, tuntutan, kerugian negara, eksekusi |
| **Oditurat Militer Tinggi (Otmilti)** | Admin Otmilti | Verifikasi pembaruan dari Otmil di daerah hukumnya |
| **Pengadilan Militer / Pengadilan Militer Tinggi** | Operator Pengadilan (Kepaniteraan) | Nomor register, majelis, jadwal sidang, hasil sidang, putusan |
| **Mabes TNI, Jampidmil Kejagung** | Pimpinan | Membaca dashboard, laporan, notifikasi prioritas |
| **Itjen TNI** | Auditor | Membaca seluruh data dan log audit |

> Catatan penamaan: dalam peradilan militer, fungsi penuntutan dijalankan **Oditurat**, bukan Kejaksaan Negeri. Kejaksaan Agung terlibat melalui **Jampidmil** untuk koordinasi teknis dan perkara koneksitas.

---

## 6. Alur perkara di dalam sistem (8 tahap)

| # | Tahap | Penanggung jawab pembaruan | Data minimum yang wajib diisi |
|---|---|---|---|
| 1 | **Laporan** | POM / Ankum | Nomor LP, tanggal, locus & tempus delicti, terdakwa, uraian |
| 2 | **Penyidikan** | Penyidik POM | Tanggal mulai, penyidik, BAP |
| 3 | **Pemberkasan** | Oditurat | Nomor berkas, tanggal pelimpahan, pendapat hukum |
| 4 | **Penyerahan Perkara** | Papera / Oditurat | Nomor & tanggal Skeppera, surat dakwaan |
| 5 | **Persidangan** | Pengadilan Militer | Nomor register, majelis, jadwal & hasil tiap sidang |
| 6 | **Putusan** | Pengadilan Militer | Tanggal, amar, pidana pokok & tambahan (mis. pemecatan) |
| 7 | **Upaya Hukum** | Dilmilti / MA | Jenis (banding/kasasi), pemohon, tanggal |
| 8 | **Inkracht & Eksekusi** | Oditurat | Tanggal BHT, status eksekusi |

Ketentuan khusus yang didukung:
- **Kompetensi pengadilan otomatis**: terdakwa berpangkat Mayor ke atas diadili tingkat pertama di Pengadilan Militer Tinggi; selain itu di Pengadilan Militer sesuai daerah hukum locus delicti.
- **Desersi in absentia**: perkara desersi yang terdakwanya tidak ditemukan ditandai khusus.
- **Koneksitas**: perkara yang melibatkan warga sipil ditandai dan dapat dibuka oleh Jampidmil.
- **Masa transisi KUHP**: sistem menandai apakah tempus delicti sebelum atau sesudah 2 Januari 2026 dan menampilkan padanan pasal KUHP 2023.

---

## 7. Fitur

### 7.1 Command Center (pemantauan)

| Fitur | Penjelasan |
|---|---|
| **Peta sebaran perkara** | Batas wilayah asli 38 provinsi dan 514 kabupaten/kota. Tiga tingkat: Nasional → Provinsi → Kabupaten/Kota (titik perkara). Kepadatan ditampilkan dalam 5 kelas warna. |
| **Lapisan Pengadilan Militer** | 22 Pengadilan Militer dan 5 Pengadilan Militer Tinggi di lokasi sebenarnya. Klik pengadilan untuk melihat wilayah hukum dan menyaring seluruh dashboard. |
| **Ringkasan perkara** | Total, dalam proses, inkracht (dengan persentase pemecatan), kerugian negara beserta persentase pemulihan. |
| **Tahapan perkara** | Jumlah perkara di tiap tahap dari 8 tahap; klik untuk menyaring. |
| **Klasifikasi tindak pidana** | 13 klasifikasi khas militer: desersi, narkotika, penganiayaan, asusila, KDRT, korupsi, senjata api, dan lainnya. |
| **Profil terdakwa** | Komposisi matra (AD/AL/AU) dan golongan pangkat (Tamtama, Bintara, Pama, Pamen). |
| **Agenda sidang** | Sidang 7 hari ke depan; tampilan mingguan per pengadilan. |
| **Perlu perhatian** | Masa penahanan berakhir ≤ 5 hari (kritis ≤ 2 hari), perkara tanpa pembaruan > 90 hari, sidang ditunda ≥ 2 kali, putusan menunggu eksekusi. |
| **Peringkat** | Wilayah dengan perkara terbanyak, beban perkara per pengadilan. |
| **Tren 12 bulan** | Perkara masuk vs diputus per bulan. |
| **Berkas perkara** | Identitas, terdakwa, pasal & ancaman, jalannya sidang, majelis, kerugian & pemulihan, penahanan, dokumen, riwayat, peta lokasi, pembanding rata-rata putusan untuk pasal yang sama. |
| **Pustaka hukum** | Pasal yang dipakai, ancaman pidana, padanan KUHP 2023, statistik penggunaan dan rata-rata pidana. |
| **Pencarian cepat (Ctrl+K)** | Cari nomor register, nama terdakwa, NRP, pasal, wilayah, atau pengadilan dari mana saja. |
| **Asisten analisis** | Pertanyaan dalam bahasa sehari-hari, contoh: “Penahanan mana yang segera berakhir?”. Jawaban selalu disertai sumber dan dibatasi hak akses. |
| **Pembaruan terkini** | Aliran pembaruan dari seluruh instansi secara langsung. |

### 7.2 Workspace (pengelolaan)

| Fitur | Penjelasan |
|---|---|
| **Beranda tugas** | Daftar tugas yang diurutkan menurut urgensi: penahanan yang perlu diperpanjang, berita acara sidang yang belum dicatat, verifikasi tertunda, perkara yang perlu diperbarui. |
| **Daftar perkara** | Tampilan tersimpan: Aktif, Sidang 7 hari, Penahanan kritis, Perlu pembaruan, Belum diverifikasi, Inkracht. Pencarian dan saringan per tahap, klasifikasi, matra. |
| **Input perkara baru (5 langkah)** | Laporan & lokasi → Terdakwa → Pasal → Kerugian & penahanan → Tinjau & kirim. Pengadilan dan Oditurat yang berwenang ditentukan otomatis dari locus dan pangkat. |
| **Editor perkara** | Pembaruan tahap dengan isian wajib per tahap, jadwal sidang, pencatatan hasil sidang (terlaksana/ditunda beserta alasannya), putusan, kerugian, perpanjangan penahanan, unggah dokumen. |
| **Persetujuan (maker–checker)** | Pembaruan dari Oditurat dan Penyidik diverifikasi Admin Otmilti sebelum diterbitkan. Perbedaan data lama dan baru ditampilkan berdampingan. |
| **Agenda sidang** | Kalender bulanan dan daftar sidang harian. |
| **Laporan baku** | Rekap per pengadilan, kerugian & pemulihan, status penahanan, putusan & pidana tambahan. Ekspor PDF/Excel dengan watermark. |
| **Data induk** | Pasal & undang-undang (dengan padanan KUHP 2023); pengadilan & oditurat beserta daerah hukumnya. |
| **Pengguna & hak akses** | 7 peran, matriks izin, cakupan wilayah per pengguna. |
| **Log audit** | Setiap akses dan perubahan tercatat permanen. |

### 7.3 Fitur lanjutan (tahap pengembangan berikutnya)

| Fitur | Manfaat |
|---|---|
| **Notifikasi** WhatsApp/SMS/email dinas | Pengingat sidang H-1 untuk Oditur, saksi, dan satuan; peringatan penahanan kepada pejabat yang berwenang memperpanjang |
| **Aplikasi seluler pimpinan** | Ringkasan harian, peringatan kritis, persetujuan dari ponsel |
| **Tanda tangan elektronik** | Skeppera, surat dakwaan, laporan berkala |
| **Pemindaian dokumen (OCR)** | Mengisi otomatis data dari BAP atau putusan yang diunggah |
| **Sinkronisasi dengan SIPP/Direktori Putusan MA** | Nomor register, jadwal, dan putusan langsung dari sistem pengadilan, tanpa input ulang |
| **Integrasi data personel TNI** | Validasi NRP, pangkat, dan satuan secara otomatis |
| **Pelacakan barang bukti** | Rantai penyimpanan dan status barang bukti, termasuk senjata api |
| **Pemantauan pemulihan aset** | Jadwal cicilan uang pengganti, lelang, setoran PNBP |
| **Analitik prediktif** | Perkiraan beban sidang per pengadilan, wilayah dengan tren kenaikan |
| **Mode luring (offline) satuan terpencil** | Input di wilayah dengan koneksi terbatas, sinkron saat tersambung |

---

## 8. Data yang dikelola per perkara

- **Identitas perkara**: nomor internal MCS, nomor LP, nomor register pengadilan (format `45-K/PM.II-06/AD/X/2026`), klasifikasi, uraian, status koneksitas
- **Locus & tempus delicti**: provinsi, kabupaten/kota, lokasi detail, koordinat, tanggal kejadian
- **Terdakwa**: nama, pangkat, golongan, NRP (tersamar di luar instansi penangani), matra, satuan, induk satuan
- **Pasal**: pasal yang didakwakan, ancaman pidana, padanan KUHP 2023
- **Penanganan**: Oditurat, Oditur, pengadilan, majelis hakim, panitera, penasihat hukum
- **Persidangan**: tanggal, jam, ruang, agenda, status (terlaksana/ditunda + alasan)
- **Penahanan**: tempat, kewenangan, batas waktu, riwayat perpanjangan
- **Kerugian**: nilai kerugian negara/korban, pemulihan, uang pengganti
- **Putusan & eksekusi**: amar, pidana pokok, pidana tambahan, upaya hukum, status eksekusi
- **Dokumen**: LP, BAP, berkas, Skeppera, dakwaan, berita acara sidang, tuntutan, putusan, BA eksekusi
- **Jejak audit**: siapa mengubah apa, kapan, dan siapa yang memverifikasi

---

## 9. Keamanan & tata kelola data

| Aspek | Pengamanan |
|---|---|
| Infrastruktur | Dipasang di pusat data milik TNI/Kemhan (on-premise), jaringan tertutup/VPN |
| Autentikasi | Akun per orang, autentikasi dua faktor, sesi berbatas waktu |
| Otorisasi | Akses berbasis peran **dan** wilayah: Otmil hanya melihat daerah hukumnya |
| Kerahasiaan | Penyamaran NRP dan identitas korban; dokumen dibuka dengan watermark nama pengguna |
| Integritas | Prinsip empat mata (maker–checker) untuk perubahan tahap; log audit tidak dapat diubah |
| Enkripsi | Enkripsi saat transit (TLS) dan saat disimpan (database & dokumen) |
| Klasifikasi | Label kerahasiaan per dokumen; ekspor dibatasi per peran |
| Kelangsungan | Cadangan harian, pemulihan bencana di lokasi kedua |

---

## 10. Indikator keberhasilan

| Indikator | Target tahun pertama |
|---|---|
| Perkara aktif yang tercatat di MCS | 100% di seluruh daerah hukum |
| Waktu penyusunan rekap nasional | dari hitungan hari menjadi **seketika** |
| Penahanan melewati batas waktu | **0** kasus |
| Perkara tanpa pembaruan > 90 hari | turun 80% |
| Rata-rata waktu laporan → putusan | terukur per pengadilan, ditargetkan turun bertahap |
| Persentase pemulihan kerugian negara | terukur dan dilaporkan per triwulan |

---

## 11. Tahapan implementasi

| Fase | Durasi indikatif | Keluaran |
|---|---|---|
| **0. Validasi konsep** | 1 bulan | Konfirmasi alur, peran, data induk bersama Babinkum, Orjen, Puspom, Ditjen Badilmiltun MA, Jampidmil |
| **1. Pilot** | 3 bulan | Satu daerah hukum Dilmilti (mis. Dilmilti II Jakarta: Dilmil II-06 s.d. II-09 dan Otmil pasangannya) |
| **2. Migrasi data** | 2 bulan | Perkara berjalan dan perkara 3 tahun terakhir dari pengadilan & oditurat pilot |
| **3. Perluasan nasional** | 6 bulan | Seluruh 22 Dilmil, 5 Dilmilti, Otmil/Otmilti, Puspom |
| **4. Integrasi & lanjutan** | berkelanjutan | SIPP/Direktori Putusan MA, data personel, notifikasi, aplikasi seluler |

---

## 12. Hal yang perlu divalidasi bersama instansi terkait

1. **Daerah hukum Pengadilan Militer** di luar yang diatur PP 22/2025 & PP 23/2025 (contoh: pembagian Jawa Timur antara Dilmil III-10 Surabaya dan III-11 Madiun; status Jambi, Lampung).
2. **Penomoran dan susunan Oditurat** setelah penataan pengadilan 2025.
3. **Padanan pasal KUHP 2023** dan ringkasan ancaman pidana, oleh tim hukum Babinkum TNI.
4. **Format nomor register dan nomor LP** baku yang dipakai saat ini.
5. **Batas waktu penahanan per kewenangan** (Ankum, Papera, Hakim) sebagai dasar peringatan otomatis.
6. **Klasifikasi tindak pidana** yang akan dibakukan untuk statistik nasional.
7. **Satuan & Kodam terbaru** pasca penambahan Kodam 2025.
8. **Kebijakan berbagi data** dengan Kejaksaan Agung (Jampidmil) dan Mahkamah Agung.

---

## Lampiran A — Susunan peradilan militer yang dimuat di MCS

**Pengadilan Militer Utama** — Jakarta

**Pengadilan Militer Tinggi:** I Medan · II Jakarta · III Surabaya · IV Balikpapan · V Makassar

**Pengadilan Militer (PP 23/2025):**

| Dilmilti | Pengadilan Militer |
|---|---|
| I Medan | I-01 Banda Aceh · I-02 Medan · I-03 Pekanbaru · I-04 Padang · I-05 Palembang |
| II Jakarta | II-06 Jakarta · II-07 Bandung · II-08 Semarang · II-09 Yogyakarta |
| III Surabaya | III-10 Surabaya · III-11 Madiun · III-12 Denpasar · III-13 Kupang |
| IV Balikpapan | IV-14 Pontianak · IV-15 Banjarmasin · IV-16 Balikpapan |
| V Makassar | V-17 Makassar · V-18 Kendari · V-19 Manado · V-20 Ambon · V-21 Manokwari · V-22 Jayapura |

## Lampiran B — Usulan alur slide paparan

1. Judul: MCS — Satu sistem untuk seluruh perjalanan perkara pidana militer
2. Masalah hari ini (tabel bagian 2)
3. Solusi: dua aplikasi, satu data (bagian 1)
4. Siapa melakukan apa (bagian 5) + alur 8 tahap (bagian 6)
5. Demo Command Center: peta nasional → provinsi → kabupaten (tangkapan layar)
6. Demo berkas perkara & agenda sidang
7. Peringatan dini: penahanan & perkara macet
8. Demo Workspace: beranda tugas → input perkara → verifikasi
9. Keamanan & tata kelola (bagian 9)
10. Indikator keberhasilan (bagian 10)
11. Tahapan implementasi & pilot (bagian 11)
12. Hal yang perlu diputuskan bersama (bagian 12)

## Lampiran C — Glosarium

| Istilah | Arti |
|---|---|
| Ankum | Atasan yang Berhak Menghukum |
| Papera | Perwira Penyerah Perkara |
| Skeppera | Surat Keputusan Penyerahan Perkara |
| Oditur / Oditurat | Penuntut umum di lingkungan peradilan militer / instansinya |
| Dilmil / Dilmilti / Dilmiltama | Pengadilan Militer / Pengadilan Militer Tinggi / Pengadilan Militer Utama |
| POM | Polisi Militer (Puspom TNI, Pomdam, Pomal, Pomau) |
| THTI | Tidak hadir tanpa izin |
| Desersi | Tidak hadir tanpa izin lebih dari 30 hari dalam masa damai (Pasal 87 KUHPM) |
| Koneksitas | Perkara yang dilakukan bersama-sama oleh prajurit dan warga sipil |
| Inkracht / BHT | Putusan berkekuatan hukum tetap |
| Jampidmil | Jaksa Agung Muda Bidang Pidana Militer, Kejaksaan Agung |

---

*Seluruh angka perkara pada prototipe adalah data contoh (dummy) untuk keperluan desain dan tidak mencerminkan data sebenarnya.*
