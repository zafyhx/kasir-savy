"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, Plus, Pencil, Trash2, PackageOpen } from "lucide-react";
import {
  createProduct,
  deleteProduct,
  isLowStock,
  isOutOfStock,
  listProducts,
  updateProduct,
  type ProductInput,
} from "@/lib/repo/products";
import type { ProductRecord } from "@/lib/types";

interface ProdukScreenProps {
  storeId: number;
}

const emptyForm: ProductInput = {
  name: "",
  price: 0,
  cost_price: 0,
  stock: 0,
  min_stock: 0,
  unit: "pcs",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-cream px-3.5 py-2.5 text-base text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20";

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function ProdukScreen({ storeId }: ProdukScreenProps) {
  const products = useLiveQuery(() => listProducts(storeId), [storeId]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: ProductRecord) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: p.price,
      cost_price: p.cost_price,
      stock: p.stock,
      min_stock: p.min_stock,
      unit: p.unit,
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama produk wajib diisi.");
      return;
    }
    if (!form.unit.trim()) {
      setError("Satuan wajib diisi.");
      return;
    }
    if (editingId) {
      await updateProduct(editingId, form);
    } else {
      await createProduct(storeId, form);
    }
    setShowForm(false);
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Hapus produk "${name}"?`)) return;
    await deleteProduct(id);
  }

  const filtered = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const margin = form.price - form.cost_price;
  const marginPct = form.price > 0 ? Math.round((margin / form.price) * 100) : 0;

  return (
    <div className="animate-fade-up flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            className="w-full rounded-2xl border border-border bg-cream-soft py-3 pl-11 pr-4 text-base text-ink shadow-card placeholder:text-ink-soft/60 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={openCreate}
          aria-label="Tambah produk"
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-navy px-4 py-3 text-sm font-bold text-cream-soft shadow-card transition-transform duration-75 active:scale-95 active:bg-navy-dark"
        >
          <Plus size={18} />
          Tambah
        </button>
      </div>

      {products === undefined && <p className="text-sm text-ink-soft">Memuat produk...</p>}
      {products && products.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-tan bg-cream-soft/60 py-10 text-center">
          <PackageOpen size={30} className="text-tan" />
          <p className="text-sm text-ink-soft">
            Belum ada produk.
            <br />
            Tekan tombol Tambah untuk memasukkan barang jualanmu.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2.5">
        {filtered.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-cream-soft p-3.5 shadow-card"
          >
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                {p.name}{" "}
                {isOutOfStock(p) && (
                  <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Habis
                  </span>
                )}
                {!isOutOfStock(p) && isLowStock(p) && (
                  <span className="ml-1 rounded-full bg-tan-soft px-2 py-0.5 text-xs font-medium text-navy">
                    Menipis
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">
                <span className="font-semibold text-navy">{formatRupiah(p.price)}</span> · Stok {p.stock}{" "}
                {p.unit}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => openEdit(p)}
                aria-label="Edit"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-tan-soft text-navy transition-transform duration-75 active:scale-95"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                aria-label="Hapus"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-transform duration-75 active:scale-95"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center">
          <form
            onSubmit={handleSubmit}
            className="animate-fade-up max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-cream-soft p-5 shadow-card sm:rounded-3xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-tan sm:hidden" />
            <h2 className="mb-4 text-lg font-semibold text-ink">
              {editingId ? "Edit Produk" : "Tambah Produk"}
            </h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-ink-soft">Nama Produk</label>
                <input
                  className={inputClass}
                  value={form.name}
                  maxLength={100}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink-soft">Harga Jual</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-soft">Harga Modal</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
                  />
                </div>
              </div>
              <p
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                  margin < 0 ? "bg-red-50 text-red-700" : "bg-tan-soft text-navy"
                }`}
              >
                Untung per {form.unit || "item"}: {formatRupiah(margin)} ({marginPct}%)
                {margin < 0 && <span className="ml-1">— harga jual di bawah modal!</span>}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink-soft">Stok</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-soft">Stok Min.</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-soft">Satuan</label>
                  <input
                    className={inputClass}
                    value={form.unit}
                    maxLength={20}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-2xl bg-tan-soft py-3.5 font-semibold text-navy transition-transform duration-75 active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-navy py-3.5 font-bold text-cream-soft shadow-card transition-colors active:bg-navy-dark"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
