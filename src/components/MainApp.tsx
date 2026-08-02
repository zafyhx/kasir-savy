"use client";

import { useState } from "react";
import Image from "next/image";
import { Receipt, Package, History, BarChart3, LogOut } from "lucide-react";
import type { StoreRecord } from "@/lib/types";
import KasirScreen from "./screens/KasirScreen";
import ProdukScreen from "./screens/ProdukScreen";
import LaporanScreen from "./screens/LaporanScreen";
import RiwayatScreen from "./screens/RiwayatScreen";

type Tab = "kasir" | "produk" | "riwayat" | "laporan";

const TABS: { key: Tab; label: string; icon: typeof Receipt }[] = [
  { key: "kasir", label: "Kasir", icon: Receipt },
  { key: "produk", label: "Produk", icon: Package },
  { key: "riwayat", label: "Riwayat", icon: History },
  { key: "laporan", label: "Laporan", icon: BarChart3 },
];

interface MainAppProps {
  store: StoreRecord;
  onLogout: () => void;
}

export default function MainApp({ store, onLogout }: MainAppProps) {
  const [tab, setTab] = useState<Tab>("kasir");

  return (
    <div className="flex flex-1 flex-col">
      {/* Header navy bermerek — logo KKN selalu terlihat di badge krem */}
      <header className="sticky top-0 z-10 bg-navy px-4 pb-3.5 pt-4 text-cream-soft shadow-card">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream-soft shadow-card">
              <Image src="/brand/logogram.png" alt="Logo Kasir Savy" width={36} height={34} priority />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight">{store.name}</h1>
              <p className="truncate text-xs text-cream-soft/70">{store.owner_name}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            aria-label="Keluar"
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-cream-soft/80 transition-colors active:bg-navy-dark"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 pb-28">
        {tab === "kasir" && <KasirScreen storeId={store.id} />}
        {tab === "produk" && <ProdukScreen storeId={store.id} />}
        {tab === "riwayat" && <RiwayatScreen storeId={store.id} />}
        {tab === "laporan" && <LaporanScreen storeId={store.id} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-cream-soft pb-[env(safe-area-inset-bottom)] shadow-float">
        <div className="mx-auto flex w-full max-w-2xl">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors ${
                  active ? "text-navy" : "text-ink-soft/70"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-tan-soft" : ""
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
