// Tipe data, mirroring skema Laravel (stores, products, transactions, transaction_items)

export type PaymentMethod = "tunai" | "transfer";

export interface StoreRecord {
  id: number;
  name: string;
  owner_name: string;
  pin_hash: string;
  created_at: string;
  updated_at: string;
}

export interface ProductRecord {
  id: number;
  store_id: number;
  name: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionRecord {
  id: number;
  store_id: number;
  total_amount: number;
  total_profit: number;
  payment_amount: number;
  change_amount: number;
  payment_method: PaymentMethod;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionItemRecord {
  id: number;
  transaction_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price_at_time: number;
  cost_at_time: number;
}

export interface TransactionWithItems extends TransactionRecord {
  items: TransactionItemRecord[];
}

export interface SaleItemInput {
  product_id: number;
  quantity: number;
}

export interface SaleInput {
  items: SaleItemInput[];
  payment_amount: number;
  payment_method?: PaymentMethod;
}
