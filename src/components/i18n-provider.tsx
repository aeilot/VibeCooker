"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LOCALE_COOKIE, translate, type Locale } from "@/lib/i18n";

const I18nContext = createContext({
  locale: "zh-CN" as Locale,
  setLocale: (_value: Locale) => {},
  t: (text: string) => text,
});
export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  const setLocale = useCallback((value: Locale) => {
    updateLocale(value);
    document.cookie = `${LOCALE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }, []);
  const t = useCallback((text: string) => translate(locale, text), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === "en"
        ? "VibeCooker · A little love in every meal"
        : "VibeCooker · 今天，也好好吃饭";
  }, [locale]);
  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  return useContext(I18nContext);
}
