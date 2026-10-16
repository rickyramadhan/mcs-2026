# MCS — Military Crime System
## Sistem Pemantauan Perkara Pidana Militer · Bidang Pidana Militer Kejaksaan RI

*Dokumen konsep · bahan paparan untuk pemangku kepentingan · versi 2.0, Oktober 2026*

---

## 1. Ringkasan eksekutif

Sejak **Perpres No. 15 Tahun 2021**, Kejaksaan RI memiliki **Jaksa Agung Muda Bidang Pidana Militer (Jampidmil)** dengan dua tugas utama:

1. **Koordinasi teknis penuntutan yang dilakukan Oditurat**, dan
2. **Penanganan perkara koneksitas**, yaitu perkara pidana yang dilakukan bersama-sama oleh prajurit TNI dan warga sipil.

Di daerah, tugas ini dijalankan oleh **Asisten Pidana Militer (Aspidmil) pada Kejaksaan Tinggi**.

Agar tugas pemantauan, evaluasi, dan pelaporan (Pasal 25C huruf f Perpres 15/2021) berjalan efektif, Jampidmil membutuhkan satu sistem yang:
- diisi langsung oleh **bidang Pidana Militer di setiap Kejati**,
- diverifikasi oleh **Aspidmil**, dan
- dipantau secara nasional oleh **Jampidmil** dalam satu layar.

**MCS menjawab kebutuhan itu.** Setiap Kejati menginput dan memperbarui perkaranya, mulai dari penyidikan sampai eksekusi putusan. Pimpinan di Kejaksaan Agung melihat gambaran nasional secara langsung: peta sebaran, tahapan, jadwal sidang, kerugian negara, dan peringatan dini.

| Aplikasi | Pengguna | Fungsi utama |
|---|---|---|
| **Command Center** (pemantauan) | Jaksa Agung, Jampidmil, Direktur pada Jampidmil, Aspidmil | Peta sebaran perkara, statistik nasional, agenda sidang, peringatan dini, berkas perkara |
| **Workspace Kejaksaan** (pengelolaan) | Operator bidang Pidana Militer Kejati, Aspidmil, Sekretariat Jampidmil | Input & pembaruan perkara, verifikasi, eksaminasi, laporan, pengguna |

---

## 2. Dasar hukum & fakta kelembagaan

| Rujukan | Isi yang relevan |
|---|---|
| **Perpres 15/2021**, perubahan kedua Perpres 38/2010 tentang Organisasi dan Tata Kerja Kejaksaan | Membentuk Jampidmil sebagai unsur pembantu pimpinan, bertanggung jawab kepada Jaksa Agung |
| **Pasal 25A–25B Perpres 15/2021** | Tugas: koordinasi teknis penuntutan oleh Oditurat dan penanganan perkara koneksitas |
| **Pasal 25B ayat (2)** | Lingkup: penyidikan perkara koneksitas, penelitian hasil penyidikan, pemeriksaan tambahan, pendapat hukum kepada Papera, penyerahan perkara, penutupan perkara, penghentian penuntutan, penuntutan, perlawanan, upaya hukum, pelaksanaan putusan, **eksaminasi**, pengawasan putusan bersyarat |
| **Pasal 25C huruf f** | Fungsi **pemantauan, analisis, evaluasi, dan pelaporan**. Ini dasar langsung kebutuhan MCS. |
| **Pasal 36 Perpres 15/2021** | Jampidmil terdiri atas Sekretariat dan paling banyak 5 Direktorat |
| **KUHAP Pasal 89–94** | Perkara koneksitas: tim tetap penyidik, penelitian bersama untuk menentukan peradilan umum atau militer, majelis hakim gabungan |
| **UU 31/1997 tentang Peradilan Militer** | Hukum acara perkara yang dituntut Oditurat |
| **UU Tipikor Pasal 39** | Jaksa Agung mengoordinasikan dan mengendalikan penyidikan korupsi yang dilakukan bersama oleh pelaku sipil dan militer |
| **KUHP 2023 (UU 1/2023)**, berlaku 2 Januari 2026 | Dasar padanan pasal untuk perkara dengan tempus delicti sesudahnya |

**Struktur di daerah:** bidang pidana militer resmi ada di tingkat **Kejaksaan Tinggi** (jabatan Aspidmil, umumnya diisi perwira TNI). Di tingkat Kejaksaan Negeri belum ada seksi pidana militer. Karena itu, **penginput di MCS adalah Kejati**.

---

## 3. Permasalahan yang dijawab

| Kondisi saat ini | Dampak | Jawaban MCS |
|---|---|---|
| Data perkara koneksitas dan perkara Oditurat dilaporkan berkala lewat surat/rekap manual dari tiap Kejati | Jampidmil tidak punya angka nasional yang langsung tersedia | Input langsung oleh Kejati, dashboard nasional seketika |
| Perkembangan perkara di Oditurat & Pengadilan Militer tidak terpantau rutin | Perkara macet terlambat diketahui | Peringatan otomatis: perkara tanpa pembaruan > 90 hari |
| Batas masa penahanan dipantau manual | Risiko penahanan melewati batas | Peringatan 5 hari dan 2 hari sebelum berakhir |
| Kerugian negara & pemulihannya tidak terkonsolidasi | Kinerja pemulihan aset sulit diukur | Nilai kerugian, pemulihan, uang pengganti per perkara & nasional |
| Eksaminasi tuntutan sulit dilakukan tanpa akses berkas | Mutu penuntutan tidak terpantau | Catatan eksaminasi langsung pada berkas, terkirim ke Kejati |
| Peralihan KUHP lama → KUHP 2023 | Rujukan pasal tidak seragam | Pustaka pasal dengan padanan KUHP 2023 |

---

## 4. Dua jenis perkara di MCS

| | **Perkara koneksitas** | **Perkara Oditurat** |
|---|---|---|
| Pelaku | Prajurit TNI **bersama** warga sipil | Prajurit TNI |
| Peran Kejaksaan | **Menangani langsung**: penyidikan (tim tetap bersama POM & Oditur), penelitian bersama, penuntutan, eksekusi | **Koordinasi teknis** penuntutan yang dilakukan Oditurat, pemantauan, eksaminasi |
| Peradilan | Peradilan umum (mis. Pengadilan Tipikor) **atau** peradilan militer, ditetapkan lewat penelitian bersama Jaksa & Oditur | Pengadilan Militer / Pengadilan Militer Tinggi |
| Penuntut | Tim penuntut koneksitas: Jaksa & Oditur | Oditur, dikoordinasikan Jaksa |
| Contoh umum | Korupsi pengadaan bersama rekanan, narkotika bersama warga sipil, penipuan | Desersi, narkotika, penganiayaan, asusila, dll. |

---

## 5. Pengguna & hak akses

| Peran | Satuan kerja | Cakupan data | Yang dilakukan |
|---|---|---|---|
| **Operator Kejati** | Staf/Jaksa bidang Pidana Militer, Kejati | Wilayah Kejati sendiri | Input perkara baru, memperbarui tahapan, jadwal & hasil sidang, kerugian, penahanan, dokumen |
| **Aspidmil** | Asisten Pidana Militer, Kejati | Wilayah Kejati sendiri | Memverifikasi input operator sebelum terbit, mengelola pengguna Kejati, eksaminasi |
| **Analis Direktorat** | Direktorat pada Jampidmil | Nasional | Memantau, menganalisis, eksaminasi perkara seluruh Kejati |
| **Pimpinan** | Jaksa Agung, Jampidmil, Direktur | Nasional | Dashboard, laporan, peringatan prioritas (baca saja) |
| **Admin Pusat** | Sekretariat Jampidmil | Nasional | Data induk, pengguna, konfigurasi, verifikasi akhir |
| **Pengawas** | Jaksa Agung Muda Bidang Pengawasan | Nasional (baca) | Membaca data & log audit |

Oditurat, Pengadilan Militer, dan Polisi Militer **bukan pengguna** MCS. Mereka dicatat sebagai **pihak/instansi mitra** dalam setiap perkara. Integrasi data dengan instansi tersebut menjadi pengembangan lanjutan (bagian 9).

---

## 6. Alur perkara di MCS (8 tahap)

Tahapan disusun mengikuti lingkup Pasal 25B ayat (2) Perpres 15/2021.

| # | Tahap | Perkara koneksitas | Perkara Oditurat | Data minimum yang diisi Kejati |
|---|---|---|---|---|
| 1 | **Penyidikan** | Tim tetap koneksitas (Jaksa, POM, Oditur) | POM menyidik; Kejati menerima pemberitahuan | Nomor sprindik/LP, tersangka militer & sipil, locus, tempus |
| 2 | **Penelitian Berkas** | Penelitian hasil penyidikan & pemeriksaan tambahan | Penelitian oleh Oditur, dikoordinasikan Jaksa | Tanggal berkas, hasil penelitian |
| 3 | **Pendapat Hukum** | **Penelitian bersama** untuk menetapkan peradilan umum/militer | Pendapat hukum kepada Papera, Skeppera | Peradilan yang berwenang / nomor pendapat hukum & Skeppera |
| 4 | **Penuntutan** | Pelimpahan & dakwaan oleh tim penuntut | Pelimpahan & dakwaan oleh Oditur | Nomor dakwaan, tanggal pelimpahan |
| 5 | **Persidangan** | Majelis gabungan hakim umum & militer | Pengadilan Militer | Nomor register, jadwal & hasil tiap sidang |
| 6 | **Putusan** | | | Amar, pidana pokok & tambahan, uang pengganti |
| 7 | **Upaya Hukum** | Banding/kasasi | Banding ke Dilmilti / kasasi ke MA | Jenis, pemohon, tanggal |
| 8 | **Eksekusi** | Pelaksanaan putusan oleh Jaksa, pengawasan putusan bersyarat | Pelaksanaan oleh Oditur, dipantau Kejati | Tanggal inkracht, status eksekusi |

Setiap pembaruan tahap oleh Operator Kejati **diverifikasi Aspidmil** sebelum tampil di dashboard nasional (prinsip empat mata).

---

## 7. Fitur

### 7.1 Command Center — pemantauan Jampidmil

| Fitur | Penjelasan |
|---|---|
| **Peta sebaran perkara** | Batas wilayah asli 38 provinsi & 514 kabupaten/kota. Bisa diperbesar Nasional → Provinsi → Kabupaten/Kota sampai titik perkara. |
| **Lapisan Kejaksaan Tinggi** | Lokasi 33 Kejati. Klik untuk melihat wilayahnya dan menyaring seluruh dashboard. |
| **Saringan cepat** | Jenis perkara (koneksitas/Oditurat), periode, klasifikasi, matra, Kejati |
| **Ringkasan** | Total perkara, perkara koneksitas & jumlah tersangka sipil, perkara dalam proses, kerugian negara & persentase pemulihan |
| **Tahapan perkara** | Jumlah perkara di tiap tahap dari 8 tahap |
| **Klasifikasi tindak pidana** | 13 klasifikasi (korupsi, narkotika, desersi, penganiayaan, asusila, dll.) |
| **Profil tersangka** | Komposisi matra, golongan pangkat, jumlah tersangka sipil |
| **Agenda sidang** | Sidang hari ini & 7 hari ke depan; tampilan mingguan per Kejati |
| **Perlu perhatian** | Penahanan berakhir ≤ 5 hari, perkara tanpa pembaruan > 90 hari, sidang ditunda berulang, putusan menunggu eksekusi |
| **Peringkat** | Provinsi dan Kejati dengan beban perkara terbesar |
| **Tren 12 bulan** | Perkara masuk vs diputus |
| **Berkas perkara** | Identitas, jenis perkara, tersangka militer & sipil, penanganan Kejaksaan (Kejati, jaksa, Oditurat mitra, peradilan), pasal & ancaman, majelis & jalannya sidang, kerugian, penahanan, dokumen, riwayat |
| **Pustaka hukum** | Pasal, ancaman pidana, padanan KUHP 2023, statistik pemakaian per Kejati |
| **Pencarian cepat (Ctrl+K)** | Nomor perkara, nama tersangka (militer/sipil), NRP, pasal, Kejati, wilayah |
| **Asisten analisis** | Pertanyaan bahasa sehari-hari, mis. “Berapa perkara koneksitas di Kejati Jawa Timur?” |

### 7.2 Workspace Kejaksaan — pengelolaan oleh Kejati

| Fitur | Penjelasan |
|---|---|
| **Beranda tugas** | Daftar tugas menurut urgensi: penahanan yang perlu diperpanjang, hasil sidang yang belum dicatat, perkara tanpa pembaruan |
| **Daftar perkara** | Tampilan: Aktif, Sidang 7 hari, Penahanan kritis, Perlu pembaruan, Belum diverifikasi, Inkracht |
| **Input perkara baru (5 langkah)** | Jenis perkara → tersangka militer & sipil → pasal → kerugian → tinjau. Kejati ditentukan otomatis dari locus; operator hanya bisa memilih wilayah Kejati-nya. |
| **Pembaruan tahap** | Isian wajib berbeda per tahap dan per jenis perkara, termasuk penetapan peradilan pada perkara koneksitas |
| **Jadwal & hasil sidang** | Penjadwalan, pencatatan hasil (terlaksana/ditunda + alasan) |
| **Verifikasi Aspidmil** | Antrean persetujuan dengan perbandingan data lama & baru; tolak dengan alasan |
| **Eksaminasi** | Catatan evaluasi Jampidmil/Aspidmil pada berkas, terkirim ke Kejati yang menangani |
| **Laporan baku** | Rekap per Kejati, kerugian & pemulihan, penahanan, putusan. Ekspor PDF/Excel dengan watermark. |
| **Data induk** | Pasal & undang-undang; daftar Kejati & wilayahnya; instansi mitra (Oditurat & Pengadilan Militer) |
| **Pengguna & hak akses** | 6 peran, matriks izin, cakupan per Kejati |
| **Log audit** | Semua akses & perubahan tercatat permanen untuk Jamwas |

### 7.3 Pengembangan lanjutan

| Fitur | Manfaat |
|---|---|
| **Tingkat Kejari** | Bila seksi pidana militer di Kejari dibentuk, peran operator Kejari dapat diaktifkan tanpa mengubah struktur sistem |
| **Integrasi SIPP & Direktori Putusan MA** | Jadwal sidang, nomor register, dan putusan masuk otomatis |
| **Pertukaran data dengan Oditurat Jenderal TNI & Puspom TNI** | Perkembangan perkara Oditurat tanpa input ulang |
| **Integrasi CMS/aplikasi internal Kejaksaan** | Satu identitas pengguna & satu basis data penuntutan |
| **Notifikasi** WhatsApp/email dinas | Pengingat sidang, penahanan, verifikasi |
| **Aplikasi seluler pimpinan** | Ringkasan harian & persetujuan dari ponsel |
| **Tanda tangan elektronik** | Laporan berkala & berita acara |
| **Pemantauan pemulihan aset** | Jadwal pembayaran uang pengganti, lelang barang rampasan, setoran PNBP |

---

## 8. Keamanan & tata kelola data

| Aspek | Pengamanan |
|---|---|
| Infrastruktur | Pusat data Kejaksaan Agung, jaringan internal/VPN |
| Autentikasi | Akun per orang, autentikasi dua faktor |
| Otorisasi | Berbasis peran **dan** wilayah: Kejati hanya mengakses perkara di wilayahnya |
| Kerahasiaan | Penyamaran NRP & NIK; dokumen dibuka dengan watermark nama pengguna |
| Integritas | Verifikasi Aspidmil (maker–checker); log audit tidak dapat diubah |
| Enkripsi | TLS saat transit; enkripsi basis data & dokumen |
| Pengawasan | Akses baca penuh untuk Jamwas |

---

## 9. Indikator keberhasilan

| Indikator | Target tahun pertama |
|---|---|
| Kejati yang aktif menginput | 33 dari 33 |
| Perkara koneksitas & Oditurat yang tercatat | 100% perkara berjalan |
| Waktu penyusunan laporan nasional Jampidmil | dari hitungan hari menjadi **seketika** |
| Penahanan melewati batas waktu | **0** |
| Perkara tanpa pembaruan > 90 hari | turun 80% |
| Persentase pemulihan kerugian negara | terukur & dilaporkan per triwulan |

---

## 10. Tahapan implementasi

| Fase | Durasi indikatif | Keluaran |
|---|---|---|
| **0. Validasi** | 1 bulan | Konfirmasi alur, peran, data induk bersama Sekretariat & Direktorat Jampidmil, perwakilan Aspidmil |
| **1. Pilot** | 3 bulan | 3–5 Kejati (mis. DKI Jakarta, Jawa Barat, Jawa Timur, Sulawesi Selatan, Sumatera Utara) |
| **2. Migrasi data** | 2 bulan | Perkara berjalan & 3 tahun terakhir dari Kejati pilot |
| **3. Perluasan nasional** | 6 bulan | Seluruh Kejati |
| **4. Integrasi** | berkelanjutan | SIPP/Direktori Putusan MA, Orjen TNI, Puspom, aplikasi internal Kejaksaan |

---

## 11. Hal yang perlu divalidasi

1. **Daftar Kejati dan wilayahnya** untuk provinsi pemekaran (Kalimantan Utara, Papua Selatan, Papua Tengah, Papua Pegunungan, Papua Barat Daya). Di prototipe masih bersifat indikatif.
2. **Nama dan pembagian Direktorat** pada Jampidmil yang akan menjadi pengguna.
3. **Format nomor**: surat perintah penyidikan koneksitas, berita acara penelitian bersama, dan nomor perkara internal.
4. **Batas waktu penahanan** per kewenangan sebagai dasar peringatan.
5. **Rencana tingkat Kejari**: apakah Kejari tertentu ikut menginput pada fase awal.
6. **Kesepakatan berbagi data** dengan Orjen TNI, Puspom TNI, dan Mahkamah Agung.
7. **Padanan pasal KUHP 2023** oleh tim hukum.

---

## Lampiran A — Usulan alur slide paparan

1. MCS — Pemantauan perkara pidana militer untuk Jampidmil
2. Dasar hukum: Perpres 15/2021 & tugas Jampidmil
3. Masalah hari ini & jawaban MCS
4. Dua jenis perkara: koneksitas & perkara Oditurat
5. Siapa mengisi, siapa memverifikasi, siapa memantau
6. Alur 8 tahap
7. Demo Command Center: peta nasional → Kejati → kabupaten
8. Demo berkas perkara koneksitas (tersangka militer & sipil)
9. Peringatan dini & agenda sidang
10. Demo Workspace: input perkara → verifikasi Aspidmil
11. Keamanan & tata kelola
12. Indikator, pilot, dan hal yang perlu diputuskan

## Lampiran B — Glosarium

| Istilah | Arti |
|---|---|
| Jampidmil | Jaksa Agung Muda Bidang Pidana Militer, Kejaksaan Agung |
| Aspidmil | Asisten Pidana Militer pada Kejaksaan Tinggi |
| Koneksitas | Tindak pidana yang dilakukan bersama-sama oleh orang yang tunduk pada peradilan umum dan peradilan militer |
| Penelitian bersama | Penelitian Jaksa & Oditur untuk menentukan perkara koneksitas diadili di peradilan umum atau militer |
| Oditur / Oditurat | Penuntut umum di lingkungan peradilan militer / instansinya |
| Papera / Skeppera | Perwira Penyerah Perkara / Surat Keputusan Penyerahan Perkara |
| Eksaminasi | Penilaian atas mutu penanganan perkara (dakwaan, tuntutan) |
| Jamwas | Jaksa Agung Muda Bidang Pengawasan |
| Inkracht | Putusan berkekuatan hukum tetap |

---

*Seluruh angka perkara pada prototipe adalah data contoh (dummy) untuk keperluan desain.*
