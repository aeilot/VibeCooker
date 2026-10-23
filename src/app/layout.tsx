import type { Metadata } from "next";
import { cookies } from "next/headers";
import { I18nProvider } from "@/components/i18n-provider";
import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return locale === "en"
    ? {
        title: "VibeCooker · A little love in every meal",
        description:
          "Cook with what you have and an AI buddy that learns your taste. Photo ingredients, original recipes and human feedback.",
      }
    : {
        title: "VibeCooker · 今天，也好好吃饭",
        description:
          "从冰箱里的食材出发，和懂你口味的 AI 料理搭子一起做饭。支持拍照识材、原创菜谱和烹饪反馈。",
      };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return (
    <html lang={locale}>
      <body>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
