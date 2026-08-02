import { z } from "zod";
import { db } from "../db";

export const LAST_BACKUP_KEY = "kasir_savy_last_backup_at";

const backupSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  stores: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      owner_name: z.string(),
      pin_hash: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
  ),
  products: z.array(
    z.object({
      id: z.number(),
      store_id: z.number(),
      name: z.string(),
      price: z.number(),
      cost_price: z.number(),
      stock: z.number(),
      min_stock: z.number(),
      unit: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
  ),
  transactions: z.array(
    z.object({
      id: z.number(),
      store_id: z.number(),
      total_amount: z.number(),
      total_profit: z.number(),
      payment_amount: z.number(),
      change_amount: z.number(),
      payment_method: z.enum(["tunai", "transfer"]),
      voided_at: z.string().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
  ),
  transactionItems: z.array(
    z.object({
      id: z.number(),
      transaction_id: z.number(),
      product_id: z.number(),
      product_name: z.string(),
      quantity: z.number(),
      price_at_time: z.number(),
      cost_at_time: z.number(),
    }),
  ),
});

export type BackupData = z.infer<typeof backupSchema>;

export async function buildBackup(): Promise<BackupData> {
  const [stores, products, transactions, transactionItems] = await Promise.all([
    db.stores.toArray(),
    db.products.toArray(),
    db.transactions.toArray(),
    db.transactionItems.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    stores,
    products,
    transactions,
    transactionItems,
  };
}

function backupFileName(): string {
  return `kasir-savy-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

/**
 * Ekspor seluruh data ke file JSON. Coba share langsung (WhatsApp/Drive/dll)
 * lewat Web Share API kalau didukung, kalau tidak fallback ke download biasa.
 */
export async function exportBackup(): Promise<void> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup, null, 2);
  const fileName = backupFileName();
  const blob = new Blob([json], { type: "application/json" });

  if (typeof navigator !== "undefined" && navigator.canShare) {
    const file = new File([blob], fileName, { type: "application/json" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Backup Kasir Savy",
          text: "Simpan file ini baik-baik untuk pemulihan data jika HP hilang/rusak.",
        });
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
        return;
      } catch {
        // dibatalkan user, lanjut ke fallback download
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
}

export class RestoreError extends Error {}

/**
 * Pulihkan data dari file backup JSON. Mengganti seluruh data yang ada
 * (skenario utama: HP baru/reset, restore backup terakhir).
 */
export async function restoreBackup(file: File): Promise<void> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new RestoreError("File bukan JSON yang valid.");
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new RestoreError("Format file backup tidak dikenali.");
  }

  const data = parsed.data;

  await db.transaction(
    "rw",
    [db.stores, db.products, db.transactions, db.transactionItems],
    async () => {
      await Promise.all([
        db.stores.clear(),
        db.products.clear(),
        db.transactions.clear(),
        db.transactionItems.clear(),
      ]);

      await db.stores.bulkAdd(data.stores);
      await db.products.bulkAdd(data.products);
      await db.transactions.bulkAdd(data.transactions);
      await db.transactionItems.bulkAdd(data.transactionItems);
    },
  );
}

export function getLastBackupAt(): Date | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(LAST_BACKUP_KEY);
  return value ? new Date(value) : null;
}

export function daysSinceLastBackup(): number | null {
  const last = getLastBackupAt();
  if (!last) return null;
  return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
}

/** Minta browser jangan hapus IndexedDB otomatis saat storage penuh (best-effort, tidak didukung Safari iOS). */
export async function requestPersistentStorage(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    try {
      await navigator.storage.persist();
    } catch {
      // abaikan, ini best-effort
    }
  }
}
