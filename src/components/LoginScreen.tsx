"use client";

import { useState } from "react";
import Image from "next/image";
import PinPad from "./PinPad";
import { setLoggedIn, verifyPin } from "@/lib/repo/store";
import type { StoreRecord } from "@/lib/types";

interface LoginScreenProps {
  store: StoreRecord;
  onSuccess: () => void;
}

export default function LoginScreen({ store, onSuccess }: LoginScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleChange(value: string) {
    setPin(value);
    setError(null);
    if (value.length === 4) {
      setChecking(true);
      const ok = await verifyPin(value);
      setChecking(false);
      if (ok) {
        setLoggedIn(true);
        onSuccess();
      } else {
        setError("PIN salah. Coba lagi.");
        setPin("");
      }
    }
  }

  return (
    <div className="animate-fade-up flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cream-soft shadow-card ring-1 ring-border">
          <Image src="/brand/logogram.png" alt="Logo Kasir Savy" width={52} height={49} priority />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">{store.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">Masukkan PIN untuk masuk</p>
        </div>
      </div>
      <PinPad value={pin} onChange={handleChange} error={error} />
      <p className={`text-sm text-ink-soft ${checking ? "" : "invisible"}`}>Memeriksa...</p>
    </div>
  );
}
