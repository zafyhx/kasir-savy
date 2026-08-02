"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";

export type Preset = "today" | "7d" | "month" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "7d", label: "7 Hari" },
  { key: "month", label: "Bulan Ini" },
  { key: "custom", label: "Kustom" },
];

export interface PeriodFilterState {
  preset: Preset;
  setPreset: (p: Preset) => void;
  customStart: string;
  setCustomStart: (d: string) => void;
  customEnd: string;
  setCustomEnd: (d: string) => void;
  startDate: string;
  endDate: string;
}

/**
 * State filter periode (Hari Ini / 7 Hari / Bulan Ini / Kustom) yang dipakai
 * bareng oleh layar Laporan dan Riwayat, supaya rentang tanggalnya dihitung
 * dengan aturan yang sama persis di kedua layar.
 */
export function usePeriodFilter(initial: Preset = "today"): PeriodFilterState {
  const [preset, setPreset] = useState<Preset>(initial);
  const [customStart, setCustomStart] = useState(dayjs().format("YYYY-MM-DD"));
  const [customEnd, setCustomEnd] = useState(dayjs().format("YYYY-MM-DD"));

  const { startDate, endDate } = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    switch (preset) {
      case "today":
        return { startDate: today, endDate: today };
      case "7d":
        return { startDate: dayjs().subtract(6, "day").format("YYYY-MM-DD"), endDate: today };
      case "month":
        return { startDate: dayjs().startOf("month").format("YYYY-MM-DD"), endDate: today };
      case "custom":
        return { startDate: customStart, endDate: customEnd };
    }
  }, [preset, customStart, customEnd]);

  return {
    preset,
    setPreset,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    startDate,
    endDate,
  };
}

export default function PeriodFilter({ filter }: { filter: PeriodFilterState }) {
  const { preset, setPreset, customStart, setCustomStart, customEnd, setCustomEnd } = filter;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              preset === p.key ? "bg-navy text-cream-soft shadow-card" : "bg-tan-soft text-navy"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(e) => setCustomStart(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-border bg-cream-soft px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
          <span className="text-ink-soft">—</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            max={dayjs().format("YYYY-MM-DD")}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-border bg-cream-soft px-3 py-2.5 text-sm text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
      )}
    </>
  );
}
