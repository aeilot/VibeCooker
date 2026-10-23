"use client";

import { useI18n } from "@/components/i18n-provider";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, t: tr } = useI18n();
  return (
    <main
      style={{
        maxWidth: 500,
        margin: "15vh auto",
        padding: 25,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 25 }}>{tr("厨房里出了点小状况")}</h1>
      <p style={{ margin: "20px 0", lineHeight: 2 }}>
        {tr("请重试一次。本机保存的料理记录仍可在重新加载后恢复。")}
      </p>
      <button
        className="primary-button"
        style={{ margin: "auto" }}
        onClick={reset}
      >
        {tr("重新打开厨房")}
      </button>
    </main>
  );
}
