import { Link } from "react-router-dom";
import {
  ArrowRight,
  AlertOctagon,
  BookOpen,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Stethoscope,
} from "lucide-react";
import DeadlinesTable from "@/components/DeadlinesTable";
import { useT } from "@/lib/i18n";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1758691461888-b74515208d7a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MTN8MHwxfHNlYXJjaHwyfHxoZWFsdGhjYXJlJTIwcHJvZmVzc2lvbmFsJTIwZG9jdG9yJTIwbW9kZXJufGVufDB8fHx8MTc3ODAxMTcyOXww&ixlib=rb-4.1.0&q=85";

export default function Home() {
  const t = useT();
  return (
    <div data-testid="home-page">
      <section className="relative overflow-hidden border-b border-[#E2E8F0]">
        <div className="absolute inset-0 dotted-bg opacity-50 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-12 gap-10 relative">
          <div className="lg:col-span-7 flex flex-col">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-white text-xs font-medium text-[#0050A0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0050A0]" />
              {t("home.badge")}
            </div>
            <h1
              className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0F172A] font-heading leading-[1.05]"
              data-testid="hero-title"
            >
              {t("home.title.a")}{" "}
              <span className="text-[#0050A0]">{t("home.title.b")}</span>
            </h1>
            <p className="mt-5 text-base lg:text-lg text-[#475569] leading-relaxed max-w-xl">
              {t("home.lead")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3" data-testid="hero-cta">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 bg-[#0050A0] hover:bg-[#003D7A] text-white px-5 py-3 rounded-lg font-medium transition-colors text-sm"
                data-testid="cta-report"
              >
                <AlertOctagon size={17} />
                {t("home.cta.report")}
                <ArrowRight size={15} />
              </Link>
              <Link
                to="/document"
                className="inline-flex items-center gap-2 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-5 py-3 rounded-lg font-medium transition-colors text-sm"
                data-testid="cta-document"
              >
                <BookOpen size={17} />
                {t("home.cta.document")}
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-5 py-3 rounded-lg font-medium transition-colors text-sm"
                data-testid="cta-reports"
              >
                <BarChart3 size={17} />
                {t("home.cta.reports")}
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-6 max-w-lg">
              {[
                { v: "2", l: t("home.stat.2") },
                { v: "10", l: t("home.stat.10") },
                { v: "30", l: t("home.stat.30") },
              ].map((s, i) => (
                <div key={i} data-testid={`hero-stat-${i}`}>
                  <dt className="text-2xl lg:text-3xl font-bold text-[#0050A0] font-heading">
                    {s.v}
                  </dt>
                  <dd className="text-xs text-[#475569] mt-1 leading-snug">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-white">
              <img
                src={HERO_IMAGE}
                alt="Healthcare professional"
                className="w-full h-[420px] object-cover"
                data-testid="hero-image"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/40 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-md">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-md bg-[#0050A0] text-white flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {t("home.hero.card.title")}
                    </p>
                    <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">
                      {t("home.hero.card.desc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-16 lg:py-20">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold">
              {t("home.pillars.kicker")}
            </p>
            <h2 className="mt-3 text-3xl lg:text-4xl font-semibold tracking-tight text-[#0F172A] font-heading">
              {t("home.pillars.title")}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#475569]">
              {t("home.pillars.lead")}
            </p>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
            {[
              { icon: Stethoscope, n: 1 },
              { icon: ShieldCheck, n: 2 },
              { icon: Clock, n: 3 },
              { icon: CheckCircle2, n: 4 },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={i}
                  className="border border-[#E2E8F0] rounded-xl p-6 bg-white hover:border-[#0050A0]/40 transition-colors"
                  data-testid={`pillar-${i}`}
                >
                  <span className="w-10 h-10 rounded-lg bg-[#E8F0FB] text-[#0050A0] flex items-center justify-center mb-4">
                    <Icon size={20} />
                  </span>
                  <p className="text-[15px] font-semibold text-[#0F172A] font-heading">
                    {t(`home.pillar.${p.n}.t`)}
                  </p>
                  <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">
                    {t(`home.pillar.${p.n}.d`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16 lg:py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold">
                {t("home.deadlines.kicker")}
              </p>
              <h2 className="mt-2 text-3xl lg:text-4xl font-semibold tracking-tight text-[#0F172A] font-heading">
                {t("home.deadlines.title")}
              </h2>
            </div>
            <Link
              to="/document#otchetnost"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0050A0] hover:text-[#003D7A]"
              data-testid="link-deadlines-detail"
            >
              {t("home.deadlines.more")} <ArrowRight size={15} />
            </Link>
          </div>
          <DeadlinesTable />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-16 lg:py-20">
        <div className="rounded-2xl border border-[#E2E8F0] bg-gradient-to-br from-[#0050A0] to-[#003D7A] text-white p-8 lg:p-12 grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70 font-semibold">
              {t("home.bottom.kicker")}
            </p>
            <h3 className="mt-2 text-2xl lg:text-3xl font-semibold font-heading leading-tight">
              {t("home.bottom.title")}
            </h3>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Link
              to="/report"
              className="inline-flex items-center gap-2 bg-white text-[#0050A0] hover:bg-[#F8FAFC] px-5 py-3 rounded-lg font-medium text-sm"
              data-testid="cta-bottom-report"
            >
              <AlertOctagon size={17} /> {t("home.cta.report")} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
