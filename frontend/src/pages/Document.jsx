import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Download, ArrowRight, BookOpen } from "lucide-react";
import { SECTIONS, SECTION_BODIES, DEFINITIONS } from "@/lib/content";
import Flowchart from "@/components/Flowchart";
import DeadlinesTable from "@/components/DeadlinesTable";
import RoleTabs from "@/components/RoleTabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function DefinedTerm({ term }) {
  const def = DEFINITIONS[term.toLowerCase()];
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="text-[#0050A0] underline decoration-dotted decoration-[#0050A0]/50 underline-offset-4 hover:bg-[#E8F0FB] rounded px-0.5 cursor-help"
          data-testid={`definition-term-${term.replace(/\s+/g, "-")}`}
        >
          {term}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 bg-[#0F172A] text-white border-[#0F172A] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold mb-1.5">
          Определение
        </p>
        <p className="text-sm leading-relaxed text-white">{def}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

export default function DocumentPage() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <div data-testid="document-page">
        {/* Header */}
        <section className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12 lg:py-16">
            <p className="text-xs uppercase tracking-[0.2em] text-[#0050A0] font-semibold flex items-center gap-2">
              <BookOpen size={14} /> Регламент · Версия 1.0
            </p>
            <h1
              className="mt-3 text-4xl sm:text-5xl font-bold text-[#0F172A] font-heading tracking-tight max-w-3xl leading-[1.1]"
              data-testid="document-title"
            >
              Порядок мониторинга безопасности, качества и эффективности медицинских изделий
            </h1>
            <p className="mt-5 max-w-2xl text-base lg:text-lg text-[#475569] leading-relaxed">
              Структурированный документ с навигацией по разделам, определениями
              ключевых терминов, интерактивной схемой процесса и таблицей сроков.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={`${BACKEND_URL}/api/document/pdf`}
                className="inline-flex items-center gap-2 bg-[#0050A0] hover:bg-[#003D7A] text-white px-5 py-2.5 rounded-lg font-medium text-sm"
                data-testid="document-pdf-download"
              >
                <Download size={16} /> Скачать PDF
              </a>
              <Link
                to="/report"
                className="inline-flex items-center gap-2 bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] px-5 py-2.5 rounded-lg font-medium text-sm"
                data-testid="document-cta-report"
              >
                Сообщить об инциденте <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* Body with sticky sidebar */}
        <section className="max-w-7xl mx-auto px-5 lg:px-8 py-12 lg:py-16">
          <div className="grid lg:grid-cols-12 gap-10">
            <aside
              className="hidden lg:block lg:col-span-3"
              data-testid="document-sidebar"
            >
              <div className="sticky top-24">
                <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold mb-4">
                  Содержание
                </p>
                <nav className="space-y-1">
                  {SECTIONS.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={`block text-sm py-2 pl-3 border-l-2 transition-colors ${
                        active === s.id
                          ? "border-[#0050A0] text-[#0050A0] font-semibold bg-[#E8F0FB]/40"
                          : "border-transparent text-[#475569] hover:text-[#0F172A] hover:border-[#CBD5E1]"
                      }`}
                      data-testid={`sidebar-link-${s.id}`}
                    >
                      <span className="text-[10px] tracking-widest text-[#94A3B8] mr-2">
                        {s.num}
                      </span>
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <article className="lg:col-span-9 space-y-16" data-testid="document-content">
              {SECTIONS.map((s) => {
                const body = SECTION_BODIES[s.id] || {};
                return (
                  <section
                    key={s.id}
                    id={s.id}
                    className="section-anchor"
                    data-testid={`section-${s.id}`}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[#0050A0] font-semibold">
                      Раздел {s.num}
                    </p>
                    <h2 className="mt-2 text-3xl lg:text-4xl font-semibold text-[#0F172A] font-heading tracking-tight">
                      {s.title}
                    </h2>

                    {body.lead && (
                      <p className="mt-4 text-[17px] leading-relaxed text-[#0F172A] max-w-3xl">
                        {body.lead}
                      </p>
                    )}

                    {/* Section-specific content */}
                    {s.id === "ponyatiya" && (
                      <div className="mt-7 grid sm:grid-cols-2 gap-3">
                        {body.terms.map((term) => (
                          <div
                            key={term}
                            className="border border-[#E2E8F0] rounded-lg p-4 bg-white"
                            data-testid={`term-card-${term.replace(/\s+/g, "-")}`}
                          >
                            <DefinedTerm term={term} />
                            <p className="text-sm text-[#475569] mt-2 leading-relaxed">
                              {DEFINITIONS[term.toLowerCase()]}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {s.id === "uchastniki" && (
                      <div className="mt-7">
                        <RoleTabs />
                      </div>
                    )}

                    {s.id === "process" && (
                      <div className="mt-7">
                        <Flowchart />
                      </div>
                    )}

                    {s.id === "otchetnost" && (
                      <div className="mt-7">
                        <DeadlinesTable />
                      </div>
                    )}

                    {body.points && s.id !== "ponyatiya" && (
                      <ul className="mt-6 space-y-3 max-w-3xl">
                        {body.points.map((p, i) => (
                          <li
                            key={i}
                            className="flex gap-3 text-[15px] text-[#0F172A] leading-relaxed"
                          >
                            <span className="w-6 h-6 rounded-md bg-[#E8F0FB] text-[#0050A0] flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                              {i + 1}
                            </span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {s.id === "otvetstvennost" && (
                      <div
                        className="mt-7 border-l-4 border-[#DC2626] bg-[#FEF2F2] p-5 rounded-r-lg max-w-3xl"
                        data-testid="warning-box"
                      >
                        <p className="text-sm font-semibold text-[#991B1B]">
                          Внимание
                        </p>
                        <p className="text-sm text-[#7F1D1D] leading-relaxed mt-1">
                          Несвоевременное информирование может повлечь приостановку обращения изделия и аннулирование регистрационного удостоверения.
                        </p>
                      </div>
                    )}
                  </section>
                );
              })}

              <div className="border-t border-[#E2E8F0] pt-10">
                <Link
                  to="/report"
                  className="inline-flex items-center gap-2 bg-[#0050A0] hover:bg-[#003D7A] text-white px-5 py-3 rounded-lg font-medium text-sm"
                  data-testid="document-end-cta"
                >
                  Перейти к форме сообщения <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
