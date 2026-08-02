import { db } from "../db";
import type { ProductRecord } from "../types";

export interface ProductWithFlags extends ProductRecord {
  is_low: boolean;
  is_empty: boolean;
}

export function isLowStock(p: ProductRecord): boolean {
  return p.stock <= p.min_stock;
}

export function isOutOfStock(p: ProductRecord): boolean {
  return p.stock <= 0;
}

function withFlags(p: ProductRecord): ProductWithFlags {
  return { ...p, is_low: isLowStock(p), is_empty: isOutOfStock(p) };
}

export async function listProducts(storeId: number): Promise<ProductWithFlags[]> {
  const products = await db.products.where("store_id").equals(storeId).sortBy("name");
  return products.map(withFlags);
}

export async function getProduct(id: number): Promise<ProductRecord | undefined> {
  return db.products.get(id);
}

export interface ProductInput {
  name: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  unit: string;
}

export async function createProduct(
  storeId: number,
  input: ProductInput,
): Promise<ProductRecord> {
  const now = new Date().toISOString();
  const id = await db.products.add({
    store_id: storeId,
    ...input,
    created_at: now,
    updated_at: now,
  });
  return (await db.products.get(id))!;
}

export async function updateProduct(
  id: number,
  input: Partial<ProductInput>,
): Promise<ProductRecord> {
  await db.products.update(id, { ...input, updated_at: new Date().toISOString() });
  return (await db.products.get(id))!;
}

export async function deleteProduct(id: number): Promise<void> {
  await db.products.delete(id);
}

export async function updateStock(id: number, stock: number): Promise<ProductRecord> {
  await db.products.update(id, { stock, updated_at: new Date().toISOString() });
  return (await db.products.get(id))!;
}
