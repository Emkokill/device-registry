import { Link, NavLink, useLocation } from "react-router-dom";
import { ShieldCheck, Menu, X, Download } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Главная", end: true },
  { to: "/document", label: "Регламент" },
  { to: "/report", label: "Сообщить об инциденте" },
  { to: "/admin", label: "Аналитика" },
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col" data-testid="app-layout">
      <div className="gov-stripe" />
      <header
        className="glass-header sticky top-0 z-40 border-b border-[#E2E8F0]"
        data-testid="site-header"
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            data-testid="brand-link"
          >
            <span className="w-9 h-9 rounded-md bg-[#0050A0] text-white flex items-center justify-center shadow-sm">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] uppercase tracking-[0.18em] text-[#475569] font-semibold">
                Минздрав · Регламент
              </span>
              <span className="block text-[15px] font-semibold text-[#0F172A] font-heading">
                Мониторинг медизделий
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
                data-testid={`nav-${n.to.replace("/", "") || "home"}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a
              href={`${BACKEND_URL}/api/document/pdf`}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-md border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]"
              data-testid="header-pdf-download"
            >
              <Download size={15} />
              PDF
            </a>
          </div>

          <button
            className="md:hidden p-2 rounded-md hover:bg-[#F1F5F9]"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
            data-testid="mobile-menu-toggle"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
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
                  data-testid={`mobile-nav-${n.to.replace("/", "") || "home"}`}
                >
                  {n.label}
                </NavLink>
              ))}
              <a
                href={`${BACKEND_URL}/api/document/pdf`}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-md border border-[#E2E8F0] mt-1"
                data-testid="mobile-header-pdf"
              >
                <Download size={15} /> Скачать PDF
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1" key={location.pathname}>
        {children}
      </main>

      <footer
        className="border-t border-[#E2E8F0] bg-[#F8FAFC] mt-16"
        data-testid="site-footer"
      >
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12 grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded bg-[#0050A0] text-white flex items-center justify-center">
                <ShieldCheck size={18} />
              </span>
              <span className="text-sm font-semibold text-[#0F172A] font-heading">
                Мониторинг безопасности
              </span>
            </div>
            <p className="text-sm text-[#475569] leading-relaxed">
              Информационный портал для участников обращения медицинских
              изделий. Регламент мониторинга безопасности, качества и
              эффективности.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold mb-3">
              Разделы
            </p>
            <ul className="space-y-2">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className="text-sm text-[#0F172A] hover:text-[#0050A0]"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold mb-3">
              Контакты
            </p>
            <ul className="space-y-2 text-sm text-[#475569]">
              <li>Горячая линия: 8 800 000-00-00</li>
              <li>info@medsafety.gov</li>
              <li>Пн–Пт, 09:00–18:00</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <p className="text-xs text-[#64748B]">
              © {new Date().getFullYear()} Уполномоченный орган в сфере здравоохранения
            </p>
            <p className="text-xs text-[#64748B]">
              Версия 1.0 · Информация носит ознакомительный характер
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
