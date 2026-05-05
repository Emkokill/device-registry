import { useState } from "react";
import {
  Search,
  AlertTriangle,
  Send,
  FileSearch,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { FLOW_STEPS } from "@/lib/content";
import { useT } from "@/lib/i18n";

const ICONS = { Search, AlertTriangle, Send, FileSearch, ShieldCheck };

export default function Flowchart() {
  const t = useT();
  const [active, setActive] = useState(1);
  const current = FLOW_STEPS.find((s) => s.n === active) || FLOW_STEPS[0];

  return (
    <div data-testid="process-flowchart">
      <div className="hidden md:block relative">
        <div className="grid grid-cols-5 gap-3 relative">
          {FLOW_STEPS.map((s) => {
            const Icon = ICONS[s.icon];
            const isActive = active === s.n;
            return (
              <button
                key={s.n}
                onClick={() => setActive(s.n)}
                className={`relative flex flex-col items-start text-left p-4 rounded-xl border transition-all ${
                  isActive
                    ? "bg-[#0050A0] text-white border-[#0050A0] shadow-md"
                    : "bg-white text-[#0F172A] border-[#E2E8F0] hover:border-[#0050A0]/40 hover:bg-[#F8FAFC]"
                }`}
                data-testid={`flow-step-${s.n}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isActive ? "bg-white/15" : "bg-[#E8F0FB] text-[#0050A0]"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span
                    className={`text-[11px] uppercase tracking-[0.16em] font-semibold ${
                      isActive ? "text-white/80" : "text-[#64748B]"
                    }`}
                  >
                    {t("flow.step")} {s.n}
                  </span>
                </div>
                <span className="text-sm font-semibold font-heading leading-tight">
                  {t(`flow.${s.n}.title`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="md:hidden space-y-2">
        {FLOW_STEPS.map((s) => {
          const Icon = ICONS[s.icon];
          const isActive = active === s.n;
          return (
            <button
              key={s.n}
              onClick={() => setActive(s.n)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border ${
                isActive
                  ? "bg-[#0050A0] text-white border-[#0050A0]"
                  : "bg-white border-[#E2E8F0]"
              }`}
              data-testid={`flow-step-mobile-${s.n}`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive ? "bg-white/15" : "bg-[#E8F0FB] text-[#0050A0]"
                }`}
              >
                <Icon size={18} />
              </span>
              <div className="flex-1 text-left">
                <p className="text-[11px] uppercase tracking-wide opacity-70 font-semibold">
                  {t("flow.step")} {s.n}
                </p>
                <p className="text-sm font-semibold">{t(`flow.${s.n}.title`)}</p>
              </div>
              <ChevronRight size={18} className="opacity-60" />
            </button>
          );
        })}
      </div>

      <div
        className="mt-6 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] p-6 md:p-8"
        data-testid="flow-step-detail"
      >
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-xl bg-[#0050A0] text-white flex items-center justify-center flex-shrink-0">
            {(() => {
              const Icon = ICONS[current.icon];
              return <Icon size={22} />;
            })()}
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#0050A0] font-semibold">
              {t("flow.stage")} {current.n} {t("flow.of")} 5
            </p>
            <h4 className="text-xl font-semibold font-heading mt-0.5 mb-2 text-[#0F172A]">
              {t(`flow.${current.n}.title`)}
            </h4>
            <p className="text-[15px] leading-relaxed text-[#475569]">
              {t(`flow.${current.n}.desc`)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
