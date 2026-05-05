import { Clock, AlertOctagon, AlertTriangle, Info } from "lucide-react";

const ROWS = [
  {
    days: "2 дня",
    severity: "Критический",
    label: "Угроза жизни/здоровью",
    desc: "Событие, представляющее серьёзную угрозу жизни или здоровью пациента или пользователя.",
    color: "#DC2626",
    icon: AlertOctagon,
    bg: "#FEF2F2",
    testid: "deadline-2-days",
  },
  {
    days: "10 дней",
    severity: "Серьёзный",
    label: "Смерть или серьёзный вред",
    desc: "Событие, повлёкшее смерть либо тяжкое расстройство здоровья.",
    color: "#D97706",
    icon: AlertTriangle,
    bg: "#FFFBEB",
    testid: "deadline-10-days",
  },
  {
    days: "30 дней",
    severity: "Стандартный",
    label: "Прочие неблагоприятные события",
    desc: "Иные нежелательные события, не относящиеся к двум критическим категориям.",
    color: "#0050A0",
    icon: Info,
    bg: "#F1F5F9",
    testid: "deadline-30-days",
  },
];

export default function DeadlinesTable() {
  return (
    <div
      className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white"
      data-testid="deadlines-table"
    >
      <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-2.5">
        <Clock size={18} className="text-[#0050A0]" />
        <p className="text-sm font-semibold text-[#0F172A] font-heading">
          Сроки направления отчётов
        </p>
      </div>
      <div className="divide-y divide-[#E2E8F0]">
        {ROWS.map((r) => {
          const Icon = r.icon;
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
                  <p
                    className="text-xl font-bold font-heading leading-none"
                    style={{ color: r.color }}
                  >
                    {r.days}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#64748B] font-semibold mt-1">
                    {r.severity}
                  </p>
                </div>
              </div>
              <div className="col-span-12 md:col-span-9">
                <p className="text-[15px] font-semibold text-[#0F172A]">
                  {r.label}
                </p>
                <p className="text-sm text-[#475569] mt-0.5 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
