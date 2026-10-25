import Link from "next/link";

export default function LanguageToggle({ currentLanguage = "zh", links = {} }) {
  return (
    <div className="language-toggle" aria-label="Language">
      <Link
        className={currentLanguage === "zh" ? "primary-button" : "secondary-button"}
        href={links.zh || "?lang=zh"}
      >
        中文
      </Link>
      <Link
        className={currentLanguage === "en" ? "primary-button" : "secondary-button"}
        href={links.en || "?lang=en"}
      >
        English
      </Link>
    </div>
  );
}
