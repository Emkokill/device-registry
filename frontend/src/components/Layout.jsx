import { Link, NavLink } from "react-router-dom";
import { ShieldCheck, Menu, X, Download, LogOut } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const { user, logout } = useAuth();

  const NAV = [
    { to: "/", label: t("nav.home"), end: true, key: "home" },
    { to: "/document", label: t("nav.document"), key: "document" },
    { to: "/report", label: t("nav.report"), key: "report" },
    { to: "/admin", label: t("nav.admin"), key: "admin" },
  ];

  return (
    <div className="min-h-screen flex flex-col" data-testid="app-layout">
      <div className="gov-stripe" />
      <header
        className="glass-header sticky top-0 z-40 border-b border-[#E2E8F0]"
        data-testid="site-header"
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand-link">
            <span className="w-9 h-9 rounded-md bg-[#0050A0] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] uppercase tracking-[0.18em] text-[#475569] font-semibold">
                {t("brand.subtitle")}
              </span>
              <span className="block text-[15px] font-semibold text-[#0F172A] font-heading">
                {t("brand.title")}
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" data-testid="primary-nav">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `px-3.5 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? "bg-[#0050A0] text-white"
                      : "text-[#0F172A] hover:bg-[#F1F5F9]"
                  }`
                }
                data-testid={`nav-${n.key}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <a
              href={`${BACKEND_URL}/api/document/pdf`}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-md border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]"
              data-testid="header-pdf-download"
            >
              <Download size={15} />
              {t("common.pdf")}
            </a>
            {user && (
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#DC2626]"
                data-testid="header-logout"
                title={t("admin.logout")}
              >
                <LogOut size={15} />
                <span className="hidden lg:inline">{t("admin.logout")}</span>
              </button>
            )}
          </div>

          <div className="flex md:hidden items-center gap-1">
            <LanguageSwitcher compact />
            <button
              className="p-2 rounded-md hover:bg-[#F1F5F9]"
              onClick={() => setOpen((v) => !v)}
              aria-label={t("common.menu")}
              data-testid="mobile-menu-toggle"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-[#E2E8F0] bg-white">
            <div className="px-5 py-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2.5 text-sm rounded-md ${
                      isActive
                        ? "bg-[#0050A0] text-white"
                        : "text-[#0F172A] hover:bg-[#F1F5F9]"
                    }`
                  }
                  data-testid={`mobile-nav-${n.key}`}
                >
                  {n.label}
                </NavLink>
              ))}
              <a
                href={`${BACKEND_URL}/api/document/pdf`}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-md border border-[#E2E8F0] mt-1"
                data-testid="mobile-header-pdf"
              >
                <Download size={15} /> {t("common.download_pdf")}
              </a>
              {user && (
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-md border border-[#FECACA] text-[#DC2626] mt-1"
                  data-testid="mobile-logout"
                >
                  <LogOut size={15} /> {t("admin.logout")}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#E2E8F0] bg-[#F8FAFC] mt-16" data-testid="site-footer">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12 grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded bg-[#0050A0] text-white flex items-center justify-center">
                <ShieldCheck size={18} />
              </span>
              <span className="text-sm font-semibold text-[#0F172A] font-heading">
                {t("brand.title")}
              </span>
            </div>
            <p className="text-sm text-[#475569] leading-relaxed">{t("common.about")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold mb-3">
              {t("common.sections")}
            </p>
            <ul className="space-y-2">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="text-sm text-[#0F172A] hover:text-[#0050A0]">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold mb-3">
              {t("common.contacts")}
            </p>
            <ul className="space-y-2 text-sm text-[#475569]">
              <li>{t("common.hotline")}: 8 800 000-00-00</li>
              <li>info@medsafety.gov</li>
              <li>{t("common.workhours")}</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <p className="text-xs text-[#64748B]">
              © {new Date().getFullYear()} {t("common.copyright")}
            </p>
            <p className="text-xs text-[#64748B]">{t("common.disclaimer")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
