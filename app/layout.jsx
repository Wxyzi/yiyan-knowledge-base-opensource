import "./globals.css";
import "./journal.css";
import "./notes.css";
import localFont from "next/font/local";
import Header from "@/components/Header";
import MotionEnhancer from "@/components/MotionEnhancer";
import { isDemoRequestAllowed } from "@/lib/demoAccess";

const journalFont = localFont({
  src: "../public/fonts/source-serif-4-semibold.ttf",
  variable: "--font-journal-serif",
  weight: "600",
  display: "swap",
  preload: false
});

export const metadata = {
  title: "译研知识库 | Translation Research Knowledge Base",
  description: "语言学基础、应用语言学、翻译技术、语料库语言学、话语分析、统计学与人工智能基础的双语科研知识库。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" className={journalFont.variable} data-scroll-behavior="smooth">
      <body>
        <MotionEnhancer />
        <Header readOnlyDemo={isDemoRequestAllowed("/", "GET")} />
        <main className="container" id="main-content" tabIndex={-1}>{children}</main>
        <footer className="footer journal-footer">
          <div className="container journal-footer-inner">
            <div>
            <strong>译研知识库</strong>
            <p>语言、知识与研究 / Language, Knowledge & Research</p>
            </div>
            <nav aria-label="页脚导航 / Footer navigation">
              <a href="/articles">文章 / Articles</a>
              <a href="/paths">路径 / Paths</a>
              <a href="/discussions">讨论 / Discussions</a>
              <a href="/help">帮助 / Help</a>
              <a href="/privacy">隐私 / Privacy</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
