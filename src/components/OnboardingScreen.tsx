"use client";

import { useState } from "react";
import PinPad from "./PinPad";
import Logo from "./Logo";
import { createStore, setLoggedIn } from "@/lib/repo/store";
import { createProduct } from "@/lib/repo/products";
import { demoProducts } from "@/lib/seed-data";

type Step = "profile" | "pin" | "pin-confirm";

interface OnboardingScreenProps {
  onDone: () => void;
}

const inputClass =
  "w-full rounded-xl border border-border bg-cream px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20";

const STEP_ORDER: Step[] = ["profile", "pin", "pin-confirm"];

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>("profile");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadDemo, setLoadDemo] = useState(false);

  function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !ownerName.trim()) {
      setError("Nama toko dan nama pemilik wajib diisi.");
      return;
    }
    setError(null);
    setStep("pin");
  }

  function handlePinChange(value: string) {
    setPin(value);
    if (value.length === 4) {
      setTimeout(() => setStep("pin-confirm"), 150);
    }
  }

  async function handlePinConfirmChange(value: string) {
    setPinConfirm(value);
    if (value.length === 4) {
      if (value !== pin) {
        setError("PIN tidak cocok. Silakan ulangi.");
        setPin("");
        setPinConfirm("");
        setStep("pin");
        return;
      }
      setSaving(true);
      try {
        const store = await createStore({ name, owner_name: ownerName, pin });
        if (loadDemo) {
          for (const product of demoProducts) {
            await createProduct(store.id, product);
          }
        }
        setLoggedIn(true);
        onDone();
      } catch {
        setError("Gagal menyimpan data toko. Coba lagi.");
        setSaving(false);
      }
    }
  }

  return (
    <div className="animate-fade-up flex flex-1 flex-col items-center justify-center gap-7 px-6 py-12">
      <Logo />

      {/* Indikator langkah — biar pemilik toko tahu tinggal berapa tahap lagi */}
      <div className="flex items-center gap-2">
        {STEP_ORDER.map((s) => (
          <span
            key={s}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              s === step ? "w-7 bg-navy" : "w-4 bg-tan"
            }`}
          />
        ))}
      </div>

      {step === "profile" && (
        <form
          onSubmit={submitProfile}
          className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-cream-soft p-5 shadow-card"
        >
          <h2 className="text-lg font-semibold text-ink">Data Toko</h2>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-soft">Nama Toko</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Warung Bu Sari"
              maxLength={100}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-soft">Nama Pemilik</label>
            <input
              className={inputClass}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Contoh: Bu Sari"
              maxLength={100}
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={loadDemo}
              onChange={(e) => setLoadDemo(e.target.checked)}
              className="h-5 w-5 rounded border-border accent-navy"
            />
            Muat 10 produk contoh (untuk coba-coba)
          </label>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-2 rounded-2xl bg-navy py-3.5 text-base font-bold text-cream-soft shadow-card transition-colors active:bg-navy-dark"
          >
            Lanjut Buat PIN
          </button>
        </form>
      )}

      {step === "pin" && (
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold text-ink">Buat PIN (4 digit)</h2>
          <p className="max-w-xs text-center text-sm text-ink-soft">
            PIN ini dipakai untuk login &amp; konfirmasi pembatalan transaksi.
          </p>
          <PinPad value={pin} onChange={handlePinChange} error={error} />
        </div>
      )}

      {step === "pin-confirm" && (
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold text-ink">Ulangi PIN</h2>
          <PinPad value={pinConfirm} onChange={handlePinConfirmChange} error={error} />
          <p className={`text-sm text-ink-soft ${saving ? "" : "invisible"}`}>Menyimpan...</p>
        </div>
      )}
    </div>
  );
}
