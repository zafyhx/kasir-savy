"use client";

import { useRef, useState } from "react";
import { DatabaseBackup, Upload } from "lucide-react";
import { daysSinceLastBackup, exportBackup, restoreBackup, RestoreError } from "@/lib/repo/backup";

export default function BackupSection() {
  const [days, setDays] = useState<number | null>(() => daysSinceLastBackup());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setBusy(true);
    setMessage(null);
    try {
      await exportBackup();
      setDays(daysSinceLastBackup());
      setMessage({ type: "success", text: "Backup berhasil dibuat." });
    } catch {
      setMessage({ type: "error", text: "Gagal membuat backup." });
    } finally {
      setBusy(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const confirmed = confirm(
      "Memulihkan backup akan MENGGANTI SEMUA data yang ada saat ini (produk, transaksi, riwayat). Lanjutkan?",
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    try {
      await restoreBackup(file);
      setMessage({ type: "success", text: "Data berhasil dipulihkan. Memuat ulang..." });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof RestoreError ? err.message : "Gagal memulihkan backup.",
      });
      setBusy(false);
    }
  }

  const reminder =
    days === null
      ? "Kamu belum pernah backup data. Sebaiknya backup sekarang."
      : days === 0
        ? "Backup terakhir: hari ini."
        : `Backup terakhir: ${days} hari lalu.`;

  const isOverdue = days === null || days >= 7;

  return (
    <div className="rounded-2xl border border-border bg-cream-soft p-4 shadow-card">
      <h3 className="mb-2 font-semibold text-ink">Backup &amp; Pulihkan Data</h3>
      <p
        className={`mb-3 rounded-xl px-3 py-2 text-sm font-medium ${
          isOverdue ? "bg-amber-50 text-amber-800" : "bg-cream text-ink-soft"
        }`}
      >
        {reminder}
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleExport}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-2xl bg-navy py-3.5 font-bold text-cream-soft shadow-card transition-colors active:bg-navy-dark disabled:opacity-50"
        >
          <DatabaseBackup size={18} />
          Backup / Cadangkan Data
        </button>
        <button
          onClick={handleImportClick}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-2xl bg-tan-soft py-3.5 font-semibold text-navy transition-transform duration-75 active:scale-[0.99] disabled:opacity-50"
        >
          <Upload size={18} />
          Pulihkan dari File Backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {message && (
        <p className={`mt-3 text-sm font-medium ${message.type === "success" ? "text-navy" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
