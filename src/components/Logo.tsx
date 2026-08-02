import Image from "next/image";

// logogram.png intrinsic size is 1039x974 (not square) — height must scale with it.
const LOGO_ASPECT = 974 / 1039;

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/**
 * Logo KKN (logogram) di dalam badge krem membulat + wordmark.
 * Dipakai di onboarding, login, dan loading screen supaya identitas
 * program terlihat konsisten di semua pintu masuk aplikasi.
 */
export default function Logo({ size = 56, withWordmark = true, className = "" }: LogoProps) {
  const badge = Math.round(size * 1.55);
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        className="flex items-center justify-center rounded-3xl bg-cream-soft shadow-card ring-1 ring-border"
        style={{ width: badge, height: badge }}
      >
        <Image
          src="/brand/logogram.png"
          alt="Logo Kasir Savy"
          width={size}
          height={Math.round(size * LOGO_ASPECT)}
          priority
          className="select-none"
        />
      </div>
      {withWordmark && (
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">Kasir Savy</h1>
          <p className="mt-0.5 text-sm text-ink-soft">Kasir digital untuk UMKM</p>
        </div>
      )}
    </div>
  );
}
