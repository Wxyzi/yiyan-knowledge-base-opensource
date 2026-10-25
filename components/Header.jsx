"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Clock,
  ChevronDown,
  Compass,
  LibraryBig,
  Route,
  Search,
  Heart,
  LifeBuoy,
  Info,
  Menu,
  MessageCircleMore,
  Sparkles,
  Settings,
  Tags,
  Wrench,
  X
} from "lucide-react";
import AuthButton from "@/components/AuthButton";
import GlobalLanguageToggle from "@/components/GlobalLanguageToggle";
import { createClient, getBrowserSupabaseConfig, hasSupabaseConfig } from "@/lib/supabase/client";

export default function Header({ readOnlyDemo = false }) {
  const pathname = usePathname();
  const headerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState("zh");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isZh = language !== "en";
  const canBrowse = isLoggedIn || readOnlyDemo;

  useEffect(() => {
    const closeMenus = (event) => {
      const header = headerRef.current;
      if (!header) return;
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && header.contains(event.target)) return;
      const focusedGroup = document.activeElement?.closest("details[open]");
      header.querySelectorAll("details[open]").forEach((element) => element.removeAttribute("open"));
      if (event.type === "keydown") focusedGroup?.querySelector("summary")?.focus();
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeMenus);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    headerRef.current?.querySelectorAll("details[open]").forEach((element) => element.removeAttribute("open"));
  }, [pathname, language]);

  useEffect(() => {
    let active = true;
    const config = getBrowserSupabaseConfig();

    if (!hasSupabaseConfig() || config.source !== "env") {
      setIsLoggedIn(false);
      setIsAdmin(false);
      return () => {
        active = false;
      };
    }

    const supabase = createClient();

    async function loadAdmin(user) {
      if (!active) return;
      if (!user) {
        setIsLoggedIn(false);
        setIsAdmin(false);
        return;
      }

      setIsLoggedIn(true);

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (active) setIsAdmin(profile?.role === "admin");
      } catch {
        if (active) setIsAdmin(false);
      }
    }

    supabase.auth.getUser().then(({ data }) => loadAdmin(data.user || null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadAdmin(session?.user || null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  function withLanguage(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}lang=${language}`;
  }

  function closeNavigation() {
    setMenuOpen(false);
    headerRef.current?.querySelectorAll("details[open]").forEach((element) => element.removeAttribute("open"));
  }

  function navLink(path, label, Icon) {
    const active = path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
    return <Link key={path} href={withLanguage(path)} aria-current={active ? "page" : undefined} onClick={closeNavigation}>{Icon ? <Icon size={15} /> : null}{label}</Link>;
  }

  return (
    <header className={`header journal-header notes-header ${canBrowse ? "has-account" : ""}`} ref={headerRef}>
      <a className="skip-link" href="#main-content">{isZh ? "跳至正文" : "Skip to content"}</a>
      <div className="container header-inner">
        <Link href={withLanguage("/")} className="brand">
          <div className="logo"><BookOpen size={22} /></div>
          <div>
          <p className="brand-title">{isZh ? "译研知识库" : "Yiyan Knowledge Base"}</p>
          <p className="brand-subtitle">{isZh ? "让知识，连接起来" : "Ideas connect here"}</p>
          </div>
        </Link>

        {canBrowse ? <form className="notes-header-search" action="/search" role="search" aria-label={isZh ? "快捷检索" : "Quick search"}>
          <input type="hidden" name="lang" value={language} />
          <input type="search" name="q" aria-label={isZh ? "搜索知识" : "Search knowledge"} placeholder={isZh ? "搜索感兴趣的知识" : "Find something to explore"} maxLength={600} />
          <button type="submit" aria-label={isZh ? "搜索" : "Search"} title={isZh ? "搜索" : "Search"}><Search size={20} /></button>
        </form> : null}

        <button
          className="menu-button"
          type="button"
          aria-label={isZh ? (menuOpen ? "关闭菜单" : "打开菜单") : (menuOpen ? "Close menu" : "Open menu")}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav id="primary-navigation" className={`nav journal-nav ${menuOpen ? "open" : ""}`} aria-label={isZh ? "主导航" : "Main navigation"}>
          {canBrowse ? (
            <>
              {navLink("/", isZh ? "发现" : "Discover", Compass)}
              {navLink("/articles", isZh ? "知识文章" : "Articles", BookOpen)}
              {navLink("/paths", isZh ? "学习路径" : "Paths", Route)}
              <details className="journal-nav-group">
                <summary><LibraryBig size={18} />{isZh ? "研究资源" : "Resources"}<ChevronDown size={14} /></summary>
                <div className="journal-nav-dropdown">
                  {navLink("/terms", isZh ? "术语表" : "Terminology", Tags)}
                  {navLink("/methods", isZh ? "研究方法" : "Methods", BarChart3)}
                  {navLink("/tools", isZh ? "工具教程" : "Tools", Wrench)}
                  {navLink("/search", isZh ? "智能检索" : "AI Search", Sparkles)}
                  {navLink("/help", isZh ? "使用帮助" : "Help", LifeBuoy)}
                </div>
              </details>
              {isLoggedIn ? navLink("/discussions", isZh ? "讨论" : "Discussions", MessageCircleMore) : null}
              {isLoggedIn ? <details className="journal-nav-group">
                <summary><Heart size={18} />{isZh ? "我的研究" : "My research"}<ChevronDown size={14} /></summary>
                <div className="journal-nav-dropdown">
                  {navLink("/favorites", isZh ? "我的收藏" : "Favorites", Heart)}
                  {navLink("/ai-history", isZh ? "问答记录" : "AI History", Clock)}
                </div>
              </details> : null}
            </>
          ) : null}
          {isAdmin ? (
            <details className="journal-nav-group">
              <summary>{isZh ? "管理" : "Admin"}<ChevronDown size={14} /></summary>
              <div className="journal-nav-dropdown">
                {navLink("/about", isZh ? "关于" : "About", Info)}
                {navLink("/admin", isZh ? "后台说明" : "Admin guide", Settings)}
                {navLink("/admin/analytics", isZh ? "学习数据" : "Analytics", BarChart3)}
                {navLink("/admin/ai-history", isZh ? "问答审阅" : "AI Review", MessageCircleMore)}
                {navLink("/changelog", isZh ? "更新记录" : "Updates", Clock)}
                {navLink("/settings", isZh ? "设置" : "Settings", Settings)}
              </div>
            </details>
          ) : null}
        </nav>
        <div className="nav journal-account-actions">
          <GlobalLanguageToggle onChange={setLanguage} />
          <AuthButton />
        </div>
      </div>
      {canBrowse ? <nav className="notes-mobile-nav" aria-label={isZh ? "快捷导航" : "Quick navigation"}>
        {navLink("/", isZh ? "发现" : "Discover", Compass)}
        {navLink("/articles", isZh ? "知识" : "Articles", BookOpen)}
        {isLoggedIn ? navLink("/discussions", isZh ? "讨论" : "Discuss", MessageCircleMore) : navLink("/paths", isZh ? "路径" : "Paths", Route)}
        {isLoggedIn ? navLink("/favorites", isZh ? "收藏" : "Saved", Heart) : navLink("/terms", isZh ? "术语" : "Terms", Tags)}
      </nav> : null}
    </header>
  );
}
