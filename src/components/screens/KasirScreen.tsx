"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, Minus, Plus, ShoppingCart, CheckCircle2, AlertCircle, PackageOpen } from "lucide-react";
import { isOutOfStock, listProducts } from "@/lib/repo/products";
import { createSale, SaleError } from "@/lib/repo/transactions";
import type { PaymentMethod } from "@/lib/types";

interface KasirScreenProps {
  storeId: number;
}

interface CartLine {
  productId: number;
  name: string;
  price: number;
  unit: string;
  stock: number;
  quantity: number;
}

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const QUICK_CASH = [5000, 10000, 20000, 50000, 100000];

export default function KasirScreen({ storeId }: KasirScreenProps) {
  const products = useLiveQuery(() => listProducts(storeId), [storeId]);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tunai");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [cart],
  );
  const change = paymentAmount - total;

  const filtered = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  function addToCart(product: { id: number; name: string; price: number; unit: string; stock: number }) {
    if (product.stock <= 0) return;
    setMessage(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
  }

  function changeQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.min(l.stock, Math.max(0, l.quantity + delta)) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  function clearCart() {
    setCart([]);
    setPaymentAmount(0);
  }

  async function handleBayar() {
    if (!cart.length) return;
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await createSale(storeId, {
        items: cart.map((l) => ({ product_id: l.productId, quantity: l.quantity })),
        payment_amount: paymentAmount,
        payment_method: paymentMethod,
      });
      setMessage({
        type: "success",
        text: `Transaksi berhasil! Kembalian: ${formatRupiah(result.change_amount)}`,
      });
      clearCart();
    } catch (err) {
      const text = err instanceof SaleError ? err.message : "Transaksi gagal, coba lagi.";
      setMessage({ type: "error", text });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-up flex flex-col gap-4 p-4">
      {message && (
        <div
          className={`flex items-start gap-2.5 rounded-2xl p-3.5 text-sm font-medium shadow-card ${
            message.type === "success"
              ? "bg-navy text-cream-soft"
              : "bg-red-50 text-red-700 ring-1 ring-red-100"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={19} className="mt-px shrink-0" />
          ) : (
            <AlertCircle size={19} className="mt-px shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input
          className="w-full rounded-2xl border border-border bg-cream-soft py-3 pl-11 pr-4 text-base text-ink shadow-card placeholder:text-ink-soft/60 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {products === undefined && <p className="col-span-full text-sm text-ink-soft">Memuat produk...</p>}
        {products && products.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 rounded-2xl border border-dashed border-tan bg-cream-soft/60 py-8 text-center">
            <PackageOpen size={28} className="text-tan" />
            <p className="text-sm text-ink-soft">
              Belum ada produk.
              <br />
              Tambahkan dulu lewat menu Produk.
            </p>
          </div>
        )}
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => addToCart(p)}
            disabled={isOutOfStock(p)}
            className="flex flex-col gap-1 rounded-2xl border border-border bg-cream-soft p-3.5 text-left shadow-card transition-transform duration-75 active:scale-[0.98] active:bg-tan-soft disabled:opacity-40"
          >
            <span className="font-semibold leading-snug text-ink">{p.name}</span>
            <span className="text-base font-bold text-navy">{formatRupiah(p.price)}</span>
            <span
              className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                p.is_empty
                  ? "bg-red-100 text-red-700"
                  : p.is_low
                    ? "bg-tan-soft text-navy"
                    : "bg-cream text-ink-soft"
              }`}
            >
              {p.is_empty ? "Habis" : `Stok ${p.stock} ${p.unit}`}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-cream-soft p-4 shadow-card">
        <h3 className="mb-2.5 flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-tan-soft text-navy">
            <ShoppingCart size={17} />
          </span>
          Keranjang
        </h3>
        {cart.length === 0 && <p className="text-sm text-ink-soft">Keranjang masih kosong.</p>}
        <ul className="flex flex-col gap-3">
          {cart.map((l) => (
            <li key={l.productId} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-ink">{l.name}</p>
                <p className="text-ink-soft">
                  {formatRupiah(l.price)} × {l.quantity} = {formatRupiah(l.price * l.quantity)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeQty(l.productId, -1)}
                  aria-label="Kurangi"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-tan-soft text-navy transition-transform duration-75 active:scale-95"
                >
                  <Minus size={16} />
                </button>
                <span className="w-5 text-center text-base font-semibold text-ink">{l.quantity}</span>
                <button
                  onClick={() => changeQty(l.productId, 1)}
                  aria-label="Tambah"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-tan-soft text-navy transition-transform duration-75 active:scale-95"
                >
                  <Plus size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {cart.length > 0 && (
          <>
            <div className="mt-4 flex justify-between border-t border-border pt-3 text-lg font-bold text-ink">
              <span>Total</span>
              <span className="text-navy">{formatRupiah(total)}</span>
            </div>

            <div className="mt-3 flex gap-2">
              {(["tunai", "transfer"] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition-colors ${
                    paymentMethod === m ? "bg-navy text-cream-soft" : "bg-tan-soft text-navy"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-ink-soft">Uang Bayar</label>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-border bg-cream px-4 py-3 text-lg font-semibold text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
                value={paymentAmount || ""}
                placeholder="0"
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setPaymentAmount(total)}
                  className="rounded-full bg-navy px-3.5 py-1.5 text-xs font-semibold text-cream-soft"
                >
                  Uang Pas
                </button>
                {QUICK_CASH.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setPaymentAmount(amt)}
                    className="rounded-full bg-tan-soft px-3.5 py-1.5 text-xs font-semibold text-navy"
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>
              <p className={`mt-2.5 text-base font-semibold ${change < 0 ? "text-red-600" : "text-ink"}`}>
                Kembalian: {formatRupiah(Math.max(0, change))}
              </p>
            </div>

            <button
              onClick={handleBayar}
              disabled={submitting || paymentAmount < total}
              className="mt-4 w-full rounded-2xl bg-navy py-4 text-lg font-bold text-cream-soft shadow-card transition-colors active:bg-navy-dark disabled:opacity-50"
            >
              {submitting ? "Memproses..." : `Bayar ${formatRupiah(total)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
