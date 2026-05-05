import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROLES } from "@/lib/content";
import { Hospital, Factory, User, Check } from "lucide-react";

const ICONS = { Hospital, Factory, User };

export default function RoleTabs() {
  return (
    <Tabs defaultValue="med" className="w-full" data-testid="role-tabs">
      <TabsList
        className="grid grid-cols-3 w-full bg-[#F1F5F9] p-1 h-auto rounded-lg"
        data-testid="role-tabs-list"
      >
        {ROLES.map((r) => {
          const Icon = ICONS[r.icon];
          return (
            <TabsTrigger
              key={r.key}
              value={r.key}
              className="data-[state=active]:bg-white data-[state=active]:text-[#0050A0] data-[state=active]:shadow-sm py-2.5 text-sm font-medium gap-2"
              data-testid={`role-tab-${r.key}`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{r.title}</span>
              <span className="sm:hidden">{r.title.split(" ")[0]}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {ROLES.map((r) => {
        const Icon = ICONS[r.icon];
        return (
          <TabsContent
            key={r.key}
            value={r.key}
            className="mt-6"
            data-testid={`role-content-${r.key}`}
          >
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 border border-[#E2E8F0] rounded-xl bg-white p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-lg bg-[#E8F0FB] text-[#0050A0] flex items-center justify-center">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold">
                      Обязанности
                    </p>
                    <h4 className="text-lg font-semibold font-heading text-[#0F172A]">
                      {r.title}
                    </h4>
                  </div>
                </div>
                <ul className="space-y-3 mt-4">
                  {r.duties.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-[15px] text-[#0F172A]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#E8F0FB] text-[#0050A0] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold mb-3">
                  Сроки
                </p>
                <ul className="space-y-2.5">
                  {r.deadlines.map((d, i) => (
                    <li
                      key={i}
                      className="text-sm text-[#0F172A] border-l-2 border-[#0050A0] pl-3 leading-relaxed"
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
