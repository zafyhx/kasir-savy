import dayjs from "dayjs";
import "dayjs/locale/id";
import { db } from "../db";
import { getStore } from "./store";
import { localDateKey } from "./transactions";

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export interface TopProduct {
  product_name: string;
  total_terjual: number;
  total_penjualan: number;
  total_keuntungan: number;
}

export interface DailyBreakdownRow {
  tanggal: string;
  tanggal_format: string;
  omzet: number;
  keuntungan: number;
  jumlah_transaksi: number;
}

export interface PeriodReport {
  start_date: string;
  end_date: string;
  label: string;
  total_omzet: number;
  total_keuntungan: number;
  margin_persen: number;
  jumlah_transaksi: number;
  rata_rata_transaksi: number;
  produk_terlaris_qty: TopProduct[];
  produk_terlaris_omzet: TopProduct[];
  per_hari: DailyBreakdownRow[];
  share_text: string;
}

export function periodLabel(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return dayjs(startDate).locale("id").format("D MMMM YYYY");
  }
  return `${dayjs(startDate).locale("id").format("D MMM YYYY")} - ${dayjs(endDate)
    .locale("id")
    .format("D MMM YYYY")}`;
}

/**
 * Laporan untuk satu rentang tanggal (bisa 1 hari atau beberapa hari
 * sekaligus). Dipakai untuk filter "Hari Ini" / "Minggu Ini" / "Bulan Ini" /
 * rentang custom di layar Laporan.
 */
export async function periodReport(
  storeId: number,
  startDate: string,
  endDate: string,
): Promise<PeriodReport> {
  const all = await db.transactions.where("store_id").equals(storeId).toArray();

  const transaksi = all.filter((t) => {
    if (t.voided_at) return false;
    const key = localDateKey(t.created_at);
    return key >= startDate && key <= endDate;
  });

  const totalOmzet = transaksi.reduce((sum, t) => sum + t.total_amount, 0);
  const totalKeuntungan = transaksi.reduce((sum, t) => sum + t.total_profit, 0);
  const jumlahTransaksi = transaksi.length;
  const rataRataTransaksi = jumlahTransaksi > 0 ? Math.round(totalOmzet / jumlahTransaksi) : 0;
  const marginPersen = totalOmzet > 0 ? Math.round((totalKeuntungan / totalOmzet) * 1000) / 10 : 0;

  const transactionIds = new Set(transaksi.map((t) => t.id));
  const allItems = await db.transactionItems
    .where("transaction_id")
    .anyOf([...transactionIds] as number[])
    .toArray();

  const byProduct = new Map<string, TopProduct>();
  for (const item of allItems) {
    const entry = byProduct.get(item.product_name) ?? {
      product_name: item.product_name,
      total_terjual: 0,
      total_penjualan: 0,
      total_keuntungan: 0,
    };
    entry.total_terjual += item.quantity;
    entry.total_penjualan += item.quantity * item.price_at_time;
    entry.total_keuntungan += item.quantity * (item.price_at_time - item.cost_at_time);
    byProduct.set(item.product_name, entry);
  }

  const allProducts = [...byProduct.values()];
  const produkTerlarisQty = [...allProducts].sort((a, b) => b.total_terjual - a.total_terjual).slice(0, 5);
  const produkTerlarisOmzet = [...allProducts]
    .sort((a, b) => b.total_penjualan - a.total_penjualan)
    .slice(0, 5);

  // Rincian per hari — berguna saat rentang lebih dari 1 hari, buat lihat tren.
  const byDay = new Map<string, DailyBreakdownRow>();
  for (const t of transaksi) {
    const tanggal = localDateKey(t.created_at);
    const entry = byDay.get(tanggal) ?? {
      tanggal,
      tanggal_format: dayjs(tanggal).locale("id").format("D MMM"),
      omzet: 0,
      keuntungan: 0,
      jumlah_transaksi: 0,
    };
    entry.omzet += t.total_amount;
    entry.keuntungan += t.total_profit;
    entry.jumlah_transaksi += 1;
    byDay.set(tanggal, entry);
  }
  const perHari = [...byDay.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const store = await getStore();
  const label = periodLabel(startDate, endDate);

  let shareText = `Rekap *${store?.name ?? "Toko"}*\n${label}\n\n`;
  shareText += `Omzet: ${formatRupiah(totalOmzet)}\n`;
  shareText += `Untung: ${formatRupiah(totalKeuntungan)} (${marginPersen}%)\n`;
  shareText += `Transaksi: ${jumlahTransaksi}x\n`;
  if (jumlahTransaksi > 0) {
    shareText += `Rata-rata/transaksi: ${formatRupiah(rataRataTransaksi)}\n`;
  }
  shareText += "\n";

  if (produkTerlarisQty.length) {
    shareText += "Produk Terlaris:\n";
    produkTerlarisQty.forEach((p, i) => {
      shareText += `${i + 1}. ${p.product_name} (${p.total_terjual} terjual, ${formatRupiah(p.total_penjualan)})\n`;
    });
  }

  shareText += "\n_Dikirim via Kasir Savy_";

  return {
    start_date: startDate,
    end_date: endDate,
    label,
    total_omzet: totalOmzet,
    total_keuntungan: totalKeuntungan,
    margin_persen: marginPersen,
    jumlah_transaksi: jumlahTransaksi,
    rata_rata_transaksi: rataRataTransaksi,
    produk_terlaris_qty: produkTerlarisQty,
    produk_terlaris_omzet: produkTerlarisOmzet,
    per_hari: perHari,
    share_text: shareText,
  };
}
