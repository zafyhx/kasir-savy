"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { Ban, ReceiptText } from "lucide-react";
import { listTransactions, localDateKey, SaleError, voidTransaction } from "@/lib/repo/transactions";
import { periodLabel } from "@/lib/repo/reports";
import { verifyPin } from "@/lib/repo/store";
import type { TransactionWithItems } from "@/lib/types";
import PinPad from "../PinPad";
import PeriodFilter, { usePeriodFilter } from "../PeriodFilter";

interface RiwayatScreenProps {
  storeId: number;
}

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function RiwayatScreen({ storeId }: RiwayatScreenProps) {
  const filter = usePeriodFilter();
  const { startDate, endDate } = filter;
  const transactions = useLiveQuery(
    () => listTransactions(storeId, { startDate, endDate }),
    [storeId, startDate, endDate],
  );

  const [voidTarget, setVoidTarget] = useState<TransactionWithItems | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  function openVoid(t: TransactionWithItems) {
    setVoidTarget(t);
    setPin("");
    setPinError(null);
  }

  async function handlePinChange(value: string) {
    setPin(value);
    if (value.length === 4 && voidTarget) {
      setProcessing(true);
      const ok = await verifyPin(value);
      if (!ok) {
        setPinError("PIN salah. Pembatalan transaksi gagal.");
        setPin("");
        setProcessing(false);
        return;
      }
      try {
        await voidTransaction(storeId, voidTarget.id);
        setVoidTarget(null);
      } catch (err) {
        setPinError(err instanceof SaleError ? err.message : "Gagal membatalkan transaksi.");
        setPin("");
      } finally {
        setProcessing(false);
      }
    }
  }

  const aktif = (transactions ?? []).filter((t) => !t.voided_at);
  const totalPeriode = aktif.reduce((sum, t) => sum + t.total_amount, 0);
  const multiHari = startDate !== endDate;

  // Rentang lebih dari 1 hari: kelompokkan per tanggal supaya jam transaksi
  // tetap punya konteks hari. listTransactions sudah urut terbaru dulu.
  const perHari = useMemo(() => {
    const byDay = new Map<string, TransactionWithItems[]>();
    for (const t of transactions ?? []) {
      const tanggal = localDateKey(t.created_at);
      const rows = byDay.get(tanggal) ?? [];
      rows.push(t);
      byDay.set(tanggal, rows);
    }
    return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  return (
    <div className="animate-fade-up flex flex-col gap-4 p-4">
      <PeriodFilter filter={filter} />

      {transactions && transactions.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-navy px-4 py-3 text-cream-soft shadow-card">
          <div className="min-w-0">
            <p className="text-xs text-cream-soft/70">
              {multiHari ? periodLabel(startDate, endDate) : dayjs(startDate).locale("id").format("dddd, D MMMM YYYY")}
            </p>
            <p className="text-sm font-medium">{aktif.length} transaksi berhasil</p>
          </div>
          <p className="shrink-0 text-lg font-bold">{formatRupiah(totalPeriode)}</p>
        </div>
      )}

      {transactions === undefined && <p className="text-sm text-ink-soft">Memuat riwayat...</p>}
      {transactions && transactions.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-tan bg-cream-soft/60 py-10 text-center">
          <ReceiptText size={30} className="text-tan" />
          <p className="text-sm text-ink-soft">
            Belum ada transaksi pada {multiHari ? "periode" : "tanggal"} ini.
          </p>
        </div>
      )}

      {perHari.map(([tanggal, rows]) => (
        <div key={tanggal} className="flex flex-col gap-3">
          {multiHari && (
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">
                {dayjs(tanggal).locale("id").format("dddd, D MMMM YYYY")}
              </h3>
              <span className="shrink-0 text-sm font-semibold text-navy">
                {formatRupiah(
                  rows.filter((t) => !t.voided_at).reduce((sum, t) => sum + t.total_amount, 0),
                )}
              </span>
            </div>
          )}
          <ul className="flex flex-col gap-3">
            {rows.map((t) => (
              <li
                key={t.id}
                className={`rounded-2xl border border-border p-3.5 shadow-card ${
                  t.voided_at ? "bg-cream opacity-60" : "bg-cream-soft"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      #{t.id} · {dayjs(t.created_at).format("HH:mm")}
                      {t.voided_at && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Dibatalkan
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm capitalize text-ink-soft">{t.payment_method}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-navy">{formatRupiah(t.total_amount)}</p>
                    {!t.voided_at && (
                      <button
                        onClick={() => openVoid(t)}
                        className="mt-1 flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-transform duration-75 active:scale-95"
                      >
                        <Ban size={14} />
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
                <ul className="mt-2.5 flex flex-col gap-1 border-t border-border pt-2.5 text-sm text-ink-soft">
                  {t.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="truncate">
                        {item.product_name} × {item.quantity}
                      </span>
                      <span className="shrink-0">
                        {formatRupiah(item.price_at_time * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {voidTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]">
          <div className="animate-fade-up w-full max-w-sm rounded-3xl bg-cream-soft p-6 shadow-card">
            <h2 className="mb-1 text-center text-lg font-semibold text-ink">
              Batalkan Transaksi #{voidTarget.id}
            </h2>
            <p className="mb-4 text-center text-sm text-ink-soft">
              Masukkan PIN untuk konfirmasi. Stok akan dikembalikan.
            </p>
            <PinPad value={pin} onChange={handlePinChange} error={pinError} />
            <p className={`mt-3 text-center text-sm text-ink-soft ${processing ? "" : "invisible"}`}>
              Memproses...
            </p>
            <button
              onClick={() => setVoidTarget(null)}
              className="mt-3 w-full rounded-2xl bg-tan-soft py-3.5 font-semibold text-navy transition-transform duration-75 active:scale-[0.98]"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
