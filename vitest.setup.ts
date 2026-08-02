import "fake-indexeddb/auto";

// WIB (UTC+7), tanpa DST — deterministik buat test zona waktu lokal.
// Kasir Savy ditujukan untuk UMKM Indonesia, jadi ini merepresentasikan
// kondisi nyata pengguna, bukan cuma nilai default acak.
process.env.TZ = "Asia/Jakarta";
