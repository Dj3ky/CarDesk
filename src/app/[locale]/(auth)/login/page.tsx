import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/modules/auth/components/login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Gauge } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#1e3a5f]">

        {/* Decorative speedometer */}
        <svg
          viewBox="0 0 520 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Outer track arc — 150° to 30° clockwise, 240° sweep */}
          <path d="M 23 660 A 320 320 0 1 1 577 660" stroke="white" strokeOpacity="0.06" strokeWidth="2.5" strokeLinecap="round" />
          {/* Progress arc — 70%, ending at 318° */}
          <path d="M 23 660 A 320 320 0 0 1 537.8 285.9" stroke="#60a5fa" strokeOpacity="0.15" strokeWidth="4" strokeLinecap="round" />
          {/* Inner concentric ring */}
          <path d="M 109.5 610 A 220 220 0 1 1 490.5 610" stroke="white" strokeOpacity="0.03" strokeWidth="1.5" strokeLinecap="round" />
          {/* Needle */}
          <line x1="300" y1="500" x2="448.6" y2="366.2" stroke="white" strokeOpacity="0.22" strokeWidth="2.5" strokeLinecap="round" />
          {/* Center pivot */}
          <circle cx="300" cy="500" r="8" fill="white" fillOpacity="0.3" />
          <circle cx="300" cy="500" r="20" stroke="white" strokeOpacity="0.07" strokeWidth="1.5" fill="none" />
        </svg>

        {/* Panel content */}
        <div className="relative z-10 flex flex-col h-full p-12">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 border border-white/10">
              <Gauge className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-xl tracking-tight text-white">
              <span className="font-light opacity-60">Car</span>
              <span className="font-bold">Desk</span>
            </span>
          </div>

          {/* Headline */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Drive your<br />business forward.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-blue-200/60">
              Automotive dealership management,<br />simplified.
            </p>
          </div>

          {/* Footer */}
          <p className="text-sm text-white/25">© 2026 CarDesk</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col bg-background">

        {/* Top bar */}
        <div className="flex items-center justify-end gap-1 p-4">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>

        {/* Form area */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16">

          {/* Mobile-only logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Gauge className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl tracking-tight">
              <span className="font-light text-foreground/60">Car</span>
              <span className="font-bold text-primary">Desk</span>
            </span>
          </div>

          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold tracking-tight">{t("loginTitle")}</h2>
            <p className="mt-1.5 mb-8 text-muted-foreground">{t("loginSubtitle")}</p>
            <LoginForm />
          </div>
        </div>
      </div>

    </div>
  );
}
