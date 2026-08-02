# Kasir Savy 🧾

Aplikasi kasir digital (Point of Sale) untuk pelaku UMKM, dibangun sebagai **program kerja Tim KKN 160 UNS** di Desa Borobudur, Kabupaten Magelang. Kasir Savy membantu pedagang mencatat penjualan, mengelola stok produk, dan melihat laporan omzet — semuanya berjalan langsung dari browser tanpa perlu koneksi internet setelah dimuat pertama kali.

## Fitur Utama

- **Kasir** — pencatatan transaksi cepat: pilih produk, hitung kembalian otomatis, dukung pembayaran tunai maupun non-tunai.
- **Produk** — kelola daftar produk, harga jual, harga modal, dan stok; peringatan otomatis untuk stok menipis/habis.
- **Riwayat** — daftar transaksi dengan filter periode (Hari Ini, 7 Hari, Bulan Ini, atau rentang tanggal kustom), termasuk pembatalan transaksi (void) dengan pengembalian stok otomatis.
- **Laporan** — ringkasan omzet, keuntungan, margin, produk terlaris, dan tren harian untuk periode yang dipilih, siap dibagikan ke WhatsApp.
- **Keamanan PIN** — setiap toko dilindungi PIN 4 digit (di-hash dengan bcrypt) untuk login dan konfirmasi aksi sensitif seperti pembatalan transaksi.
- **Backup & Restore** — ekspor/impor seluruh data toko dalam satu file, sebagai jaring pengaman karena semua data tersimpan lokal di perangkat.
- **PWA & Offline-first** — dapat di-install ke home screen (Android/iOS/Desktop) dan tetap berfungsi penuh tanpa internet karena seluruh data disimpan di **IndexedDB** milik browser (tidak ada server/database eksternal).

## Teknologi

| Bagian | Teknologi |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Penyimpanan data | [Dexie.js](https://dexie.org/) (wrapper IndexedDB) — 100% client-side, tanpa backend |
| Validasi | Zod |
| Keamanan PIN | bcryptjs |
| PWA / Offline | `@ducanh2912/next-pwa` (Workbox) |
| Testing | Vitest + fake-indexeddb |

## Menjalankan Secara Lokal

Prasyarat: Node.js 20+ dan npm.

```bash
# 1. Install dependencies
npm install

# 2. Jalankan server development
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Skrip yang Tersedia

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Menjalankan mode development |
| `npm run build` | Build produksi |
| `npm start` | Menjalankan hasil build produksi |
| `npm run lint` | Menjalankan ESLint |
| `npm test` | Menjalankan test suite (Vitest) |

## Struktur Proyek

```
src/
├─ app/                 # Routing & entry point (Next.js App Router)
├─ components/
│  ├─ screens/          # Layar utama: Kasir, Produk, Riwayat, Laporan
│  └─ ...               # Komponen bersama (AppShell, Logo, PinPad, dll.)
└─ lib/
   ├─ db.ts             # Skema database Dexie (IndexedDB)
   ├─ repo/             # Logika bisnis & akses data (transaksi, produk, laporan, backup)
   └─ types.ts          # Tipe data bersama
scripts/                # Skrip utilitas (generate ikon, dsb.)
public/                 # Aset statis, ikon PWA, manifest
```

## Catatan Penyimpanan Data

Seluruh data (produk, transaksi, PIN toko) disimpan **lokal di perangkat** melalui IndexedDB browser — tidak dikirim ke server manapun. Konsekuensinya:

- Data bersifat per-perangkat/per-browser; menghapus cache/data situs akan menghapus data toko.
- Gunakan fitur **Backup** secara berkala (menu Laporan) untuk mengamankan data ke file eksternal.
- Cocok untuk kebutuhan UMKM skala kecil dengan satu perangkat kasir.

## Kredit

Dibuat oleh **Bagus Satyo Nugroho** — Tim KKN 160 Universitas Sebelas Maret (UNS), sebagai bagian dari program kerja pemberdayaan UMKM Desa Borobudur, Magelang.

## Lisensi

Proyek ini dibuat untuk keperluan program KKN dan pemberdayaan UMKM mitra. Hubungi penulis untuk penggunaan di luar konteks tersebut.
