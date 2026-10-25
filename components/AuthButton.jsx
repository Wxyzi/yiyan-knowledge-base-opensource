"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, ChevronDown, KeyRound, LogIn, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

export default function AuthButton() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [language, setLanguage] = useState("zh");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const pathname = usePathname();
  const redirectTo = pathname || "/";
  const isZh = language !== "en";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLanguage = params.get("lang");
    const storedLanguage = window.localStorage.getItem("yiyan.language");
    setLanguage(urlLanguage === "en" || urlLanguage === "zh" ? urlLanguage : storedLanguage || "zh");

    if (!hasSupabaseConfig()) {
      setReady(true);
      return undefined;
    }

    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user || null);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user || null);
      setReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !hasSupabaseConfig()) {
      setProfile(null);
      return undefined;
    }

    let active = true;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("username, role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile(data || null);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const displayName = useMemo(() => {
    return profile?.username
      || user?.user_metadata?.username
      || user?.email?.split("@")[0]
      || (isZh ? "用户" : "User");
  }, [isZh, profile?.username, user]);

  async function signOut() {
    if (!hasSupabaseConfig()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
    window.location.href = `/?lang=${language}`;
  }

  if (!ready) return <span className="account-loading" aria-hidden="true" />;

  if (!user) {
    return (
      <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}&lang=${language}`} className="primary-button nav-login-button">
        <LogIn size={16} /> {isZh ? "登录" : "Log In"}
      </Link>
    );
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="small-button account-trigger"
        onClick={() => setMenuOpen((value) => !value)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title={isZh ? "查看账号信息" : "View account information"}
      >
        <span className="account-avatar" aria-hidden="true">{displayName.trim().slice(0, 1).toUpperCase() || "U"}</span>
        <span className="account-trigger-name">{displayName}</span>
        <ChevronDown size={14} className={menuOpen ? "account-chevron open" : "account-chevron"} />
      </button>

      {menuOpen ? (
        <div className="account-popover" role="menu">
          <div className="account-popover-head">
            <span className="account-avatar large" aria-hidden="true">{displayName.trim().slice(0, 1).toUpperCase() || "U"}</span>
            <div>
              <strong>{displayName}</strong>
              <span>{isAdmin ? (isZh ? "管理员账号" : "Administrator") : (isZh ? "普通用户" : "Member")}</span>
            </div>
            {isAdmin ? <ShieldCheck size={17} aria-label={isZh ? "管理员" : "Administrator"} /> : <BadgeCheck size={17} aria-hidden="true" />}
          </div>

          <div className="account-detail-list">
            <div>
              <UserRound size={16} />
              <span><small>{isZh ? "用户名（公开显示）" : "Username (public)"}</small><strong>{displayName}</strong></span>
            </div>
            <div>
              <Mail size={16} />
              <span><small>{isZh ? "登录邮箱（仅自己可见）" : "Login email (private)"}</small><strong>{user.email || "-"}</strong></span>
            </div>
          </div>

          <Link className="account-security-link" href={`/account?lang=${language}`} onClick={() => setMenuOpen(false)} role="menuitem">
            <KeyRound size={16} /> {isZh ? "账号与安全" : "Account and security"}
          </Link>

          <button type="button" className="account-logout" onClick={signOut} role="menuitem">
            <LogOut size={16} /> {isZh ? "退出登录" : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
