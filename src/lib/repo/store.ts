import bcrypt from "bcryptjs";
import { db } from "../db";
import type { StoreRecord } from "../types";

const SESSION_KEY = "kasir_savy_logged_in";

/**
 * Satu device = satu toko (disederhanakan dari versi Laravel yang
 * mendukung banyak toko per session/device).
 */
export async function getStore(): Promise<StoreRecord | undefined> {
  return db.stores.toCollection().first();
}

export async function hasStore(): Promise<boolean> {
  return (await db.stores.count()) > 0;
}

export async function createStore(input: {
  name: string;
  owner_name: string;
  pin: string;
}): Promise<StoreRecord> {
  const now = new Date().toISOString();
  const pin_hash = await bcrypt.hash(input.pin, 10);

  const id = await db.stores.add({
    name: input.name,
    owner_name: input.owner_name,
    pin_hash,
    created_at: now,
    updated_at: now,
  });

  return (await db.stores.get(id))!;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const store = await getStore();
  if (!store) return false;
  return bcrypt.compare(pin, store.pin_hash);
}

export async function changePin(newPin: string): Promise<void> {
  const store = await getStore();
  if (!store?.id) throw new Error("Toko belum diatur.");

  const pin_hash = await bcrypt.hash(newPin, 10);
  await db.stores.update(store.id, {
    pin_hash,
    updated_at: new Date().toISOString(),
  });
}

export function setLoggedIn(loggedIn: boolean): void {
  if (loggedIn) {
    localStorage.setItem(SESSION_KEY, "1");
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_KEY) === "1";
}
