import { Clock, AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { useT } from "@/lib/i18n";

const ROWS = [
  {
    days: 2,
    severityKey: "deadlines.cat.critical",
    labelKey: "deadlines.row.2.label",
    descKey: "deadlines.row.2.desc",
    color: "#DC2626",
    icon: AlertOctagon,
    bg: "#FEF2F2",
    testid: "deadline-2-days",
  },
  {
    days: 10,
    severityKey: "deadlines.cat.serious",
    labelKey: "deadlines.row.10.label",
    descKey: "deadlines.row.10.desc",
    color: "#D97706",
    icon: AlertTriangle,
    bg: "#FFFBEB",
    testid: "deadline-10-days",
  },
  {
    days: 30,
    severityKey: "deadlines.cat.standard",
    labelKey: "deadlines.row.30.label",
    descKey: "deadlines.row.30.desc",
    color: "#0050A0",
    icon: Info,
    bg: "#F1F5F9",
    testid: "deadline-30-days",
  },
];

export default function DeadlinesTable() {
  const t = useT();
  const dayWord = t("home.stat.2").includes("күн") ? "күн" : "дня"; // simple plural fallback
  const dayWord10 = dayWord === "күн" ? "күн" : "дней";
  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white" data-testid="deadlines-table">
      <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-2.5">
        <Clock size={18} className="text-[#0050A0]" />
        <p className="text-sm font-semibold text-[#0F172A] font-heading">{t("deadlines.title")}</p>
      </div>
      <div className="divide-y divide-[#E2E8F0]">
        {ROWS.map((r) => {
          const Icon = r.icon;
          const word = r.days === 2 ? dayWord : dayWord10;
          return (
            <div
              key={r.days}
              className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-[#F8FAFC] transition-colors"
              data-testid={r.testid}
            >
              <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                <span
                  className="w-11 h-11 rounded-lg flex items-center justify-center"
                  style={{ background: r.bg, color: r.color }}
                >
                  <Icon size={20} />
                </span>
                <div>
                  <p className="text-xl font-bold font-heading leading-none" style={{ color: r.color }}>
                    {r.days} {word}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#64748B] font-semibold mt-1">
                    {t(r.severityKey)}
                  </p>
                </div>
              </div>
              <div className="col-span-12 md:col-span-9">
                <p className="text-[15px] font-semibold text-[#0F172A]">{t(r.labelKey)}</p>
                <p className="text-sm text-[#475569] mt-0.5 leading-relaxed">{t(r.descKey)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
