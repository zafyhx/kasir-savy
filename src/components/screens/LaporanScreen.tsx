"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trophy, Share2, KeyRound, TrendingUp, AlertTriangle, CalendarCheck } from "lucide-react";
import { periodReport } from "@/lib/repo/reports";
import { changePin, verifyPin } from "@/lib/repo/store";
import { isLowStock, isOutOfStock, listProducts } from "@/lib/repo/products";
import PinPad from "../PinPad";
import BackupSection from "../BackupSection";
import PeriodFilter, { usePeriodFilter } from "../PeriodFilter";

interface LaporanScreenProps {
  storeId: number;
}

function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

type PinStep = "closed" | "old" | "new" | "confirm";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-cream-soft p-4 shadow-card">{children}</section>
  );
}

function CardTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-tan-soft text-navy">
        {icon}
      </span>
      {children}
    </h3>
  );
}

export default function LaporanScreen({ storeId }: LaporanScreenProps) {
  const filter = usePeriodFilter();
  const { startDate, endDate } = filter;

  const report = useLiveQuery(
    () => periodReport(storeId, startDate, endDate),
    [storeId, startDate, endDate],
  );
  const products = useLiveQuery(() => listProducts(storeId), [storeId]);
  const perluRestock = (products ?? []).filter((p) => isLowStock(p) || isOutOfStock(p));

  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const [pinStep, setPinStep] = useState<PinStep>("closed");
  const [pinValue, setPinValue] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // Skala bar tren: relatif terhadap hari dengan omzet tertinggi di periode ini.
  const maxOmzet = Math.max(1, ...(report?.per_hari ?? []).map((d) => d.omzet));
  const hariTerbaik = (report?.per_hari ?? []).reduce<{ tanggal_format: string; omzet: number } | null>(
    (best, d) => (best === null || d.omzet > best.omzet ? d : best),
    null,
  );

  async function handleShare() {
    if (!report) return;
    setShareStatus(null);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: report.share_text });
        return;
      } catch {
        // dibatalkan user, tidak masalah
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(report.share_text);
      setShareStatus("Teks laporan disalin ke clipboard.");
    } catch {
      setShareStatus("Gagal menyalin teks laporan.");
    }
  }

  function openChangePin() {
    setPinStep("old");
    setPinValue("");
    setNewPin("");
    setPinError(null);
    setPinSuccess(null);
  }

  async function handleOldPinChange(value: string) {
    setPinValue(value);
    if (value.length === 4) {
      const ok = await verifyPin(value);
      if (!ok) {
        setPinError("PIN saat ini salah.");
        setPinValue("");
        return;
      }
      setPinError(null);
      setPinStep("new");
      setPinValue("");
    }
  }

  function handleNewPinChange(value: string) {
    setPinValue(value);
    if (value.length === 4) {
      setNewPin(value);
      setPinStep("confirm");
      setPinValue("");
    }
  }

  async function handleConfirmPinChange(value: string) {
    setPinValue(value);
    if (value.length === 4) {
      if (value !== newPin) {
        setPinError("PIN baru tidak cocok. Ulangi.");
        setPinValue("");
        setPinStep("new");
        return;
      }
      await changePin(newPin);
      setPinSuccess("PIN berhasil diubah.");
      setPinStep("closed");
    }
  }

  return (
    <div className="animate-fade-up flex flex-col gap-4 p-4">
      <PeriodFilter filter={filter} />

      {report === undefined && <p className="text-sm text-ink-soft">Memuat laporan...</p>}

      {report && (
        <>
          {/* Ringkasan utama — omzet jadi angka pahlawan, sisanya pendukung */}
          <section className="rounded-2xl bg-navy p-4 text-cream-soft shadow-card">
            <p className="text-xs text-cream-soft/70">{report.label}</p>
            <p className="mt-0.5 text-3xl font-extrabold tracking-tight">
              {formatRupiah(report.total_omzet)}
            </p>
            <p className="text-sm text-cream-soft/70">Total omzet</p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-cream-soft/15 pt-3 text-center">
              <div>
                <p className="text-xs text-cream-soft/70">Untung</p>
                <p className="mt-0.5 text-sm font-bold">{formatRupiah(report.total_keuntungan)}</p>
                <p className="text-xs text-cream-soft/60">{report.margin_persen}% margin</p>
              </div>
              <div className="border-x border-cream-soft/15">
                <p className="text-xs text-cream-soft/70">Transaksi</p>
                <p className="mt-0.5 text-sm font-bold">{report.jumlah_transaksi}x</p>
              </div>
              <div>
                <p className="text-xs text-cream-soft/70">Rata-rata</p>
                <p className="mt-0.5 text-sm font-bold">{formatRupiah(report.rata_rata_transaksi)}</p>
                <p className="text-xs text-cream-soft/60">per transaksi</p>
              </div>
            </div>
          </section>

          {report.jumlah_transaksi === 0 && (
            <p className="rounded-2xl border border-dashed border-tan bg-cream-soft/60 px-4 py-6 text-center text-sm text-ink-soft">
              Belum ada penjualan pada periode ini.
            </p>
          )}

          {report.produk_terlaris_qty.length > 0 && (
            <Card>
              <CardTitle icon={<Trophy size={17} />}>Top 5 Produk Terlaris</CardTitle>
              <ul className="flex flex-col gap-2.5">
                {report.produk_terlaris_qty.map((p, i) => (
                  <li key={p.product_name} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tan-soft text-xs font-bold text-navy">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{p.product_name}</p>
                      <p className="text-xs text-ink-soft">
                        {p.total_terjual} terjual · untung {formatRupiah(p.total_keuntungan)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-navy">
                      {formatRupiah(p.total_penjualan)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {report.produk_terlaris_omzet.length > 1 && (
            <Card>
              <CardTitle icon={<TrendingUp size={17} />}>Penyumbang Omzet Terbesar</CardTitle>
              <ul className="flex flex-col gap-2">
                {report.produk_terlaris_omzet.map((p, i) => (
                  <li key={p.product_name} className="flex justify-between gap-3 text-sm">
                    <span className="truncate text-ink">
                      {i + 1}. {p.product_name}
                    </span>
                    <span className="shrink-0 font-semibold text-navy">
                      {formatRupiah(p.total_penjualan)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Tren harian: satu seri (omzet), bar satu warna + label langsung,
              jadi tidak perlu sumbu maupun legenda. */}
          {report.per_hari.length > 1 && (
            <Card>
              <CardTitle icon={<CalendarCheck size={17} />}>Tren Omzet Harian</CardTitle>
              {hariTerbaik && (
                <p className="mb-3 rounded-xl bg-tan-soft px-3 py-2 text-xs font-semibold text-navy">
                  Hari terbaik: {hariTerbaik.tanggal_format} — {formatRupiah(hariTerbaik.omzet)}
                </p>
              )}
              <ul className="flex flex-col gap-3">
                {report.per_hari.map((d) => (
                  <li key={d.tanggal}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-ink">{d.tanggal_format}</span>
                      <span className="font-semibold text-navy">{formatRupiah(d.omzet)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-cream">
                      <div
                        className="h-full rounded-full bg-navy"
                        style={{ width: `${Math.max(3, (d.omzet / maxOmzet) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      Untung {formatRupiah(d.keuntungan)} · {d.jumlah_transaksi} transaksi
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {perluRestock.length > 0 && (
            <Card>
              <CardTitle icon={<AlertTriangle size={17} />}>Produk Perlu Diperhatikan</CardTitle>
              <ul className="flex flex-col gap-2">
                {perluRestock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-ink">{p.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.is_empty ? "bg-red-100 text-red-700" : "bg-tan-soft text-navy"
                      }`}
                    >
                      {p.is_empty ? "Stok habis" : `Sisa ${p.stock} ${p.unit}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-base font-bold text-cream-soft shadow-card transition-colors active:bg-navy-dark"
          >
            <Share2 size={18} />
            Bagikan ke WhatsApp
          </button>
          {shareStatus && <p className="text-sm text-ink-soft">{shareStatus}</p>}
        </>
      )}

      <div className="mt-2 border-t border-border pt-4">
        <h3 className="mb-2 font-semibold text-ink">Pengaturan</h3>
        <button
          onClick={openChangePin}
          className="flex w-full items-center gap-2.5 rounded-2xl bg-tan-soft px-4 py-3.5 text-left font-semibold text-navy transition-transform duration-75 active:scale-[0.99]"
        >
          <KeyRound size={18} />
          Ubah PIN
        </button>
        {pinSuccess && <p className="mt-2 text-sm font-medium text-navy">{pinSuccess}</p>}
      </div>

      <BackupSection />

      {pinStep !== "closed" && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]">
          <div className="animate-fade-up w-full max-w-sm rounded-3xl bg-cream-soft p-6 shadow-card">
            <h2 className="mb-4 text-center text-lg font-semibold text-ink">
              {pinStep === "old" && "Masukkan PIN Saat Ini"}
              {pinStep === "new" && "Masukkan PIN Baru"}
              {pinStep === "confirm" && "Ulangi PIN Baru"}
            </h2>
            {pinStep === "old" && <PinPad value={pinValue} onChange={handleOldPinChange} error={pinError} />}
            {pinStep === "new" && <PinPad value={pinValue} onChange={handleNewPinChange} error={pinError} />}
            {pinStep === "confirm" && (
              <PinPad value={pinValue} onChange={handleConfirmPinChange} error={pinError} />
            )}
            <button
              onClick={() => setPinStep("closed")}
              className="mt-5 w-full rounded-2xl bg-tan-soft py-3.5 font-semibold text-navy transition-transform duration-75 active:scale-[0.98]"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
