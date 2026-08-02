import Dexie, { type EntityTable } from "dexie";
import type {
  ProductRecord,
  StoreRecord,
  TransactionItemRecord,
  TransactionRecord,
} from "./types";

class KasirSavyDB extends Dexie {
  stores!: EntityTable<StoreRecord, "id">;
  products!: EntityTable<ProductRecord, "id">;
  transactions!: EntityTable<TransactionRecord, "id">;
  transactionItems!: EntityTable<TransactionItemRecord, "id">;

  constructor() {
    super("kasir-savy");

    this.version(1).stores({
      stores: "++id, name",
      products: "++id, store_id, name",
      transactions: "++id, store_id, created_at, voided_at",
      transactionItems: "++id, transaction_id, product_id",
    });
  }
}

export const db = new KasirSavyDB();
