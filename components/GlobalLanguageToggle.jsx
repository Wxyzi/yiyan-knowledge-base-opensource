"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const languageStorageKey = "yiyan.language";

export default function GlobalLanguageToggle({ onChange }) {
  const router = useRouter();
  const pathname = usePathname();
  const [language, setLanguage] = useState("zh");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLanguage = params.get("lang");
    const storedLanguage = window.localStorage.getItem(languageStorageKey);
    const nextLanguage = urlLanguage === "en" || urlLanguage === "zh"
      ? urlLanguage
      : storedLanguage === "en" || storedLanguage === "zh"
        ? storedLanguage
        : "zh";

    setLanguage(nextLanguage);
    window.localStorage.setItem(languageStorageKey, nextLanguage);
    onChange?.(nextLanguage);
  }, [pathname, onChange]);

  function switchLanguage(nextLanguage) {
    const params = new URLSearchParams(window.location.search);
    params.set("lang", nextLanguage);
    window.localStorage.setItem(languageStorageKey, nextLanguage);
    setLanguage(nextLanguage);
    onChange?.(nextLanguage);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="global-language-toggle" aria-label="Language">
      <button
        className={language === "zh" ? "active" : ""}
        type="button"
        onClick={() => switchLanguage("zh")}
      >
        中
      </button>
      <button
        className={language === "en" ? "active" : ""}
        type="button"
        onClick={() => switchLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}
