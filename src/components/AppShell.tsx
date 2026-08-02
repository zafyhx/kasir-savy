"use client";

import { useEffect, useState } from "react";
import { getStore, isLoggedIn, setLoggedIn } from "@/lib/repo/store";
import { requestPersistentStorage } from "@/lib/repo/backup";
import type { StoreRecord } from "@/lib/types";
import OnboardingScreen from "./OnboardingScreen";
import LoginScreen from "./LoginScreen";
import MainApp from "./MainApp";
import Logo from "./Logo";

type Screen = "loading" | "onboarding" | "login" | "app";

export default function AppShell() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [store, setStore] = useState<StoreRecord | null>(null);

  async function refresh() {
    const s = await getStore();
    if (!s) {
      setStore(null);
      setScreen("onboarding");
      return;
    }
    setStore(s);
    setScreen(isLoggedIn() ? "app" : "login");
  }

  useEffect(() => {
    // Membaca store dari IndexedDB (sistem eksternal) saat mount — bukan
    // derived state, jadi pola effect ini sesuai.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    requestPersistentStorage();
  }, []);

  function handleLogout() {
    setLoggedIn(false);
    setScreen("login");
  }

  if (screen === "loading") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="animate-pulse-soft">
          <Logo withWordmark={false} />
        </div>
        <p className="text-sm text-ink-soft">Memuat...</p>
      </div>
    );
  }

  if (screen === "onboarding") {
    return <OnboardingScreen onDone={refresh} />;
  }

  if (screen === "login" && store) {
    return <LoginScreen store={store} onSuccess={refresh} />;
  }

  if (screen === "app" && store) {
    return <MainApp store={store} onLogout={handleLogout} />;
  }

  return null;
}
