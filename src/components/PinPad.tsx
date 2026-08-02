"use client";

import { Delete } from "lucide-react";

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  error?: string | null;
}

const keyClass =
  "flex h-16 w-16 items-center justify-center rounded-full bg-cream-soft text-2xl font-semibold text-ink shadow-card ring-1 ring-border transition-transform duration-75 active:scale-95 active:bg-tan-soft";

export default function PinPad({ value, onChange, maxLength = 4, error }: PinPadProps) {
  function press(digit: string) {
    if (value.length >= maxLength) return;
    onChange(value + digit);
  }

  function backspace() {
    onChange(value.slice(0, -1));
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3.5">
        {Array.from({ length: maxLength }).map((_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full transition-all duration-150 ${
              i < value.length ? "scale-110 bg-navy" : "bg-transparent ring-2 ring-inset ring-tan"
            }`}
          />
        ))}
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className={keyClass}>
            {d}
          </button>
        ))}
        <div />
        <button type="button" onClick={() => press("0")} className={keyClass}>
          0
        </button>
        <button type="button" onClick={backspace} aria-label="Hapus" className={keyClass}>
          <Delete size={24} />
        </button>
      </div>
    </div>
  );
}
