import dayjs from "dayjs";
import { db } from "../db";
import type {
  PaymentMethod,
  SaleInput,
  TransactionItemRecord,
  TransactionWithItems,
} from "../types";

export class SaleError extends Error {}

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

/**
 * Buat transaksi baru (bayar). Semua baca-cek-tulis stok terjadi di
 * dalam SATU Dexie transaction callback, supaya double-tap "Bayar"
 * tidak bisa oversell stok — ini menggantikan lockForUpdate() di versi
 * Laravel yang tidak punya padanan di sisi client.
 */
export async function createSale(
  storeId: number,
  input: SaleInput,
): Promise<TransactionWithItems> {
  if (!input.items.length) {
    throw new SaleError("Keranjang masih kosong.");
  }

  return db.transaction(
    "rw",
    [db.products, db.transactions, db.transactionItems],
    async () => {
      let totalAmount = 0;
      let totalProfit = 0;
      const lines: { product_id: number; product_name: string; quantity: number; price_at_time: number; cost_at_time: number }[] = [];

      for (const line of input.items) {
        const product = await db.products.get(line.product_id);
        if (!product || product.store_id !== storeId) {
          throw new SaleError("Produk tidak ditemukan.");
        }
        if (product.stock < line.quantity) {
          throw new SaleError(
            `Stok "${product.name}" tidak cukup. Stok tersisa: ${product.stock} ${product.unit}.`,
          );
        }

        const subtotal = product.price * line.quantity;
        const profit = (product.price - product.cost_price) * line.quantity;
        totalAmount += subtotal;
        totalProfit += profit;

        lines.push({
          product_id: product.id!,
          product_name: product.name,
          quantity: line.quantity,
          price_at_time: product.price,
          cost_at_time: product.cost_price,
        });
      }

      if (input.payment_amount < totalAmount) {
        throw new SaleError(
          `Uang bayar kurang. Total belanja: ${formatRupiah(totalAmount)}`,
        );
      }

      const now = new Date().toISOString();
      const payment_method: PaymentMethod = input.payment_method ?? "tunai";

      const transactionId = await db.transactions.add({
        store_id: storeId,
        total_amount: totalAmount,
        total_profit: totalProfit,
        payment_amount: input.payment_amount,
        change_amount: input.payment_amount - totalAmount,
        payment_method,
        voided_at: null,
        created_at: now,
        updated_at: now,
      });

      const items: TransactionItemRecord[] = [];
      for (const line of lines) {
        const itemId = await db.transactionItems.add({
          transaction_id: transactionId,
          product_id: line.product_id,
          product_name: line.product_name,
          quantity: line.quantity,
          price_at_time: line.price_at_time,
          cost_at_time: line.cost_at_time,
        });
        items.push({ ...line, id: itemId, transaction_id: transactionId });

        const product = await db.products.get(line.product_id);
        await db.products.update(line.product_id, {
          stock: product!.stock - line.quantity,
          updated_at: now,
        });
      }

      const transaction = await db.transactions.get(transactionId);
      return { ...transaction!, items };
    },
  );
}

export interface TransactionFilter {
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
}

// `created_at` disimpan sebagai ISO string UTC (new Date().toISOString()),
// tapi filter tanggal dari UI ("hari ini", date picker) selalu memakai
// kalender LOKAL toko. dayjs(iso).format(...) tanpa plugin UTC otomatis
// mengonversi ke zona waktu lokal, jadi perbandingan ini konsisten.
// (Bug sebelumnya: bandingkan iso.slice(0,10) — tanggal UTC — langsung
// dengan tanggal lokal, jadi transaksi "menghilang" tiap jam-jam awal hari
// di WIB/WITA/WIT karena tanggal UTC & lokal berbeda.)
export function localDateKey(iso: string): string {
  return dayjs(iso).format("YYYY-MM-DD");
}

function isSameDay(iso: string, dateStr: string): boolean {
  return localDateKey(iso) === dateStr;
}

export async function listTransactions(
  storeId: number,
  filter: TransactionFilter = {},
): Promise<TransactionWithItems[]> {
  const all = await db.transactions.where("store_id").equals(storeId).toArray();

  const today = dayjs().format("YYYY-MM-DD");

  const filtered = all.filter((t) => {
    if (filter.date) return isSameDay(t.created_at, filter.date);
    if (filter.startDate && filter.endDate) {
      const key = localDateKey(t.created_at);
      return key >= filter.startDate && key <= filter.endDate;
    }
    return isSameDay(t.created_at, today);
  });

  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const withItems: TransactionWithItems[] = [];
  for (const t of filtered) {
    const items = await db.transactionItems.where("transaction_id").equals(t.id!).toArray();
    withItems.push({ ...t, items });
  }
  return withItems;
}

/**
 * Void/batalkan transaksi. Stok item dikembalikan dan transaksi ditandai
 * voided_at, semuanya dalam satu Dexie transaction (setara dengan
 * DB::transaction() di versi Laravel).
 */
export async function voidTransaction(
  storeId: number,
  transactionId: number,
): Promise<void> {
  await db.transaction("rw", [db.products, db.transactions, db.transactionItems], async () => {
    const transaction = await db.transactions.get(transactionId);
    if (!transaction || transaction.store_id !== storeId) {
      throw new SaleError("Transaksi tidak ditemukan.");
    }
    if (transaction.voided_at) {
      throw new SaleError("Transaksi ini sudah dibatalkan sebelumnya.");
    }

    const items = await db.transactionItems.where("transaction_id").equals(transactionId).toArray();
    for (const item of items) {
      const product = await db.products.get(item.product_id);
      if (product) {
        await db.products.update(item.product_id, {
          stock: product.stock + item.quantity,
          updated_at: new Date().toISOString(),
        });
      }
    }

    await db.transactions.update(transactionId, {
      voided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
}
