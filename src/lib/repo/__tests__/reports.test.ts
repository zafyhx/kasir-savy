import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db";
import { createProduct } from "../products";
import { listTransactions, localDateKey } from "../transactions";
import { periodReport } from "../reports";

const STORE_ID = 1;

beforeEach(async () => {
  await db.stores.clear();
  await db.products.clear();
  await db.transactions.clear();
  await db.transactionItems.clear();
});

describe("localDateKey — tanggal lokal, bukan tanggal UTC", () => {
  it("mengonversi instant UTC ke tanggal kalender WIB (UTC+7)", () => {
    // 2026-08-02 19:00 UTC == 2026-08-03 02:00 WIB — beda tanggal kalender.
    expect(localDateKey("2026-08-02T19:00:00.000Z")).toBe("2026-08-03");
  });

  it("tidak berubah untuk jam-jam yang tanggal UTC & lokalnya sama", () => {
    // 2026-08-02 06:00 UTC == 2026-08-02 13:00 WIB — tanggal sama.
    expect(localDateKey("2026-08-02T06:00:00.000Z")).toBe("2026-08-02");
  });
});

describe("listTransactions — filter tanggal dini hari lintas zona waktu", () => {
  it("transaksi dini hari WIB tetap muncul di riwayat tanggal lokalnya, bukan tanggal UTC-nya", async () => {
    // Ini reproduksi persis bug yang dilaporkan: transaksi dibuat jam 02:00
    // WIB tanggal 3 Agustus, tapi created_at (UTC) masih tanggal 2 Agustus.
    // Sebelum fix, listTransactions membandingkan tanggal UTC vs tanggal
    // lokal ("hari ini") sehingga transaksi ini "hilang" dari Riwayat.
    await db.transactions.add({
      id: 1,
      store_id: STORE_ID,
      total_amount: 10000,
      total_profit: 2000,
      payment_amount: 10000,
      change_amount: 0,
      payment_method: "tunai",
      voided_at: null,
      created_at: "2026-08-02T19:00:00.000Z", // = 2026-08-03T02:00 WIB
      updated_at: "2026-08-02T19:00:00.000Z",
    });

    const onLocalDate = await listTransactions(STORE_ID, { date: "2026-08-03" });
    expect(onLocalDate).toHaveLength(1);

    const onUtcDate = await listTransactions(STORE_ID, { date: "2026-08-02" });
    expect(onUtcDate).toHaveLength(0);
  });

  it("filter rentang tanggal (startDate/endDate) juga memakai tanggal lokal", async () => {
    await db.transactions.add({
      id: 1,
      store_id: STORE_ID,
      total_amount: 5000,
      total_profit: 1000,
      payment_amount: 5000,
      change_amount: 0,
      payment_method: "tunai",
      voided_at: null,
      created_at: "2026-08-02T19:30:00.000Z", // = 2026-08-03T02:30 WIB
      updated_at: "2026-08-02T19:30:00.000Z",
    });

    const withinRange = await listTransactions(STORE_ID, {
      startDate: "2026-08-03",
      endDate: "2026-08-03",
    });
    expect(withinRange).toHaveLength(1);

    const outsideRange = await listTransactions(STORE_ID, {
      startDate: "2026-08-01",
      endDate: "2026-08-02",
    });
    expect(outsideRange).toHaveLength(0);
  });
});

describe("periodReport", () => {
  it("menjumlahkan omzet/untung hanya dari transaksi dalam rentang lokal, dan menyusun produk terlaris", async () => {
    const kopi = await createProduct(STORE_ID, {
      name: "Kopi Sachet",
      price: 2500,
      cost_price: 1800,
      stock: 100,
      min_stock: 10,
      unit: "pcs",
    });
    const teh = await createProduct(STORE_ID, {
      name: "Teh Botol",
      price: 5000,
      cost_price: 3000,
      stock: 50,
      min_stock: 5,
      unit: "botol",
    });

    // Transaksi 1: dalam rentang, 3 Agustus WIB pagi (jam UTC-nya masih 2 Agustus)
    await db.transactions.add({
      id: 1,
      store_id: STORE_ID,
      total_amount: 10 * kopi.price,
      total_profit: 10 * (kopi.price - kopi.cost_price),
      payment_amount: 10 * kopi.price,
      change_amount: 0,
      payment_method: "tunai",
      voided_at: null,
      created_at: "2026-08-02T19:00:00.000Z",
      updated_at: "2026-08-02T19:00:00.000Z",
    });
    await db.transactionItems.add({
      id: 1,
      transaction_id: 1,
      product_id: kopi.id,
      product_name: kopi.name,
      quantity: 10,
      price_at_time: kopi.price,
      cost_at_time: kopi.cost_price,
    });

    // Transaksi 2: dalam rentang, 3 Agustus siang, produk beda (omzet lebih besar tapi qty lebih sedikit)
    await db.transactions.add({
      id: 2,
      store_id: STORE_ID,
      total_amount: 3 * teh.price,
      total_profit: 3 * (teh.price - teh.cost_price),
      payment_amount: 3 * teh.price,
      change_amount: 0,
      payment_method: "tunai",
      voided_at: null,
      created_at: "2026-08-03T06:00:00.000Z",
      updated_at: "2026-08-03T06:00:00.000Z",
    });
    await db.transactionItems.add({
      id: 2,
      transaction_id: 2,
      product_id: teh.id,
      product_name: teh.name,
      quantity: 3,
      price_at_time: teh.price,
      cost_at_time: teh.cost_price,
    });

    // Transaksi 3: di luar rentang (1 Agustus) — tidak boleh ikut terhitung
    await db.transactions.add({
      id: 3,
      store_id: STORE_ID,
      total_amount: 1000 * kopi.price,
      total_profit: 1000 * (kopi.price - kopi.cost_price),
      payment_amount: 1000 * kopi.price,
      change_amount: 0,
      payment_method: "tunai",
      voided_at: null,
      created_at: "2026-07-31T19:00:00.000Z", // = 2026-08-01T02:00 WIB
      updated_at: "2026-07-31T19:00:00.000Z",
    });

    // Transaksi 4: dalam rentang tanggal tapi sudah di-void — tidak boleh ikut terhitung
    await db.transactions.add({
      id: 4,
      store_id: STORE_ID,
      total_amount: 999 * teh.price,
      total_profit: 999 * (teh.price - teh.cost_price),
      payment_amount: 999 * teh.price,
      change_amount: 0,
      payment_method: "tunai",
      voided_at: "2026-08-03T07:00:00.000Z",
      created_at: "2026-08-03T06:30:00.000Z",
      updated_at: "2026-08-03T07:00:00.000Z",
    });

    const report = await periodReport(STORE_ID, "2026-08-02", "2026-08-03");

    expect(report.jumlah_transaksi).toBe(2);
    expect(report.total_omzet).toBe(10 * kopi.price + 3 * teh.price);
    expect(report.total_keuntungan).toBe(
      10 * (kopi.price - kopi.cost_price) + 3 * (teh.price - teh.cost_price),
    );
    expect(report.rata_rata_transaksi).toBe(Math.round(report.total_omzet / 2));

    // Terlaris by qty: Kopi (10 unit) harus di atas Teh (3 unit).
    expect(report.produk_terlaris_qty[0].product_name).toBe("Kopi Sachet");
    // Terlaris by omzet: Teh (Rp 15.000) harus di atas Kopi (Rp 25.000)? cek nilai sebenarnya:
    // Kopi: 10 * 2500 = 25000, Teh: 3 * 5000 = 15000 -> Kopi tetap lebih besar omzetnya.
    expect(report.produk_terlaris_omzet[0].product_name).toBe("Kopi Sachet");

    // Kedua produk (hanya 2 yang ada) harus tetap muncul di teks share karena top-5.
    expect(report.share_text).toContain("Kopi Sachet");
    expect(report.share_text).toContain("Teh Botol");
    // Transaksi yang di-void atau di luar rentang tidak boleh mempengaruhi angka apa pun.
    expect(report.share_text).not.toMatch(/999/);
  });
});
