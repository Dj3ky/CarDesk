import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { ThemeProvider } from "@/components/providers/theme-provider";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "sl")) {
    notFound();
  }

  const messages = await getMessages();
  const session = await auth();

  return (
    <ThemeProvider>
      <SessionProvider session={session}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
