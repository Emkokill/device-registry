import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
} from "recharts";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Activity,
  Loader2,
  Inbox,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SEVERITY_LABELS = {
  critical: "Критические",
  serious: "Серьёзные",
  standard: "Стандартные",
};

const SEVERITY_COLORS = {
  critical: "#DC2626",
  serious: "#D97706",
  standard: "#0050A0",
};

const ROLE_LABELS = {
  polzovatel: "Пользователь",
  med_organizaciya: "Мед. организация",
  proizvoditel: "Производитель",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [s, i] = await Promise.all([
        axios.get(`${API}/incidents/stats`),
        axios.get(`${API}/incidents`),
      ]);
      setStats(s.data);
      setItems(i.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-20 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#0050A0]" />
      </div>
    );
  }

  const total = stats?.total || 0;
  const sev = stats?.by_severity || {};

  const filtered = items.filter((i) => filter === "all" || i.severity === filter);

  const bySeverityData = Object.entries(sev).map(([k, v]) => ({
    name: SEVERITY_LABELS[k],
    value: v,
    severity: k,
  }));

  const timelineData = (stats?.timeline || []).map((t) => ({
    date: t.date.slice(5),
    count: t.count,
  }));

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12 lg:py-16" data-testid="admin-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#0050A0] font-semibold">
            Аналитика и отчётность
          </p>
          <h1 className="mt-1 text-3xl lg:text-4xl font-semibold text-[#0F172A] font-heading tracking-tight">
            Панель уполномоченного органа
          </h1>
          <p className="mt-3 text-[15px] text-[#475569] max-w-2xl">
            Мониторинг поступающих сообщений о неблагоприятных событиях, статистика по тяжести и динамика обращений.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-4 py-2 rounded-lg font-medium text-sm"
          data-testid="admin-refresh"
        >
          <Activity size={15} /> Обновить
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="kpi-grid">
        <KPI
          icon={Inbox}
          label="Всего сообщений"
          value={total}
          color="#0050A0"
          testid="kpi-total"
        />
        <KPI
          icon={AlertOctagon}
          label="Критические (2 дня)"
          value={sev.critical || 0}
          color="#DC2626"
          testid="kpi-critical"
          accent
        />
        <KPI
          icon={AlertTriangle}
          label="Серьёзные (10 дней)"
          value={sev.serious || 0}
          color="#D97706"
          testid="kpi-serious"
        />
        <KPI
          icon={Info}
          label="Стандартные (30 дней)"
          value={sev.standard || 0}
          color="#0050A0"
          testid="kpi-standard"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <div
          className="lg:col-span-2 border border-[#E2E8F0] rounded-xl bg-white p-6"
          data-testid="chart-timeline"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#0F172A] font-heading">
              Динамика обращений
            </p>
            <p className="text-xs text-[#64748B]">по дням</p>
          </div>
          <div className="h-[260px]">
            {timelineData.length === 0 ? (
              <Empty msg="Пока нет данных" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748B", fontSize: 12 }}
                    stroke="#CBD5E1"
                  />
                  <YAxis
                    tick={{ fill: "#64748B", fontSize: 12 }}
                    stroke="#CBD5E1"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      fontSize: 13,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#0050A0"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#0050A0" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div
          className="border border-[#E2E8F0] rounded-xl bg-white p-6"
          data-testid="chart-severity"
        >
          <p className="text-sm font-semibold text-[#0F172A] font-heading mb-4">
            По тяжести
          </p>
          <div className="h-[260px]">
            {total === 0 ? (
              <Empty msg="Пока нет данных" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySeverityData} layout="vertical">
                  <CartesianGrid stroke="#F1F5F9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#64748B", fontSize: 12 }}
                    stroke="#CBD5E1"
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#0F172A", fontSize: 12 }}
                    stroke="#CBD5E1"
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {bySeverityData.map((d) => (
                      <Cell key={d.severity} fill={SEVERITY_COLORS[d.severity]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Reports table */}
      <div
        className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden"
        data-testid="reports-table"
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F8FAFC]">
          <p className="text-sm font-semibold text-[#0F172A] font-heading">
            Журнал сообщений
          </p>
          <div className="flex items-center gap-1.5" data-testid="severity-filters">
            {[
              { v: "all", l: "Все" },
              { v: "critical", l: "Критические" },
              { v: "serious", l: "Серьёзные" },
              { v: "standard", l: "Стандартные" },
            ].map((f) => (
              <button
                key={f.v}
                onClick={() => setFilter(f.v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  filter === f.v
                    ? "bg-[#0050A0] text-white border-[#0050A0]"
                    : "bg-white text-[#0F172A] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                }`}
                data-testid={`filter-${f.v}`}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-[#E2E8F0]">
              <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-[#64748B] font-semibold">
                <th className="px-6 py-3">Дата</th>
                <th className="px-6 py-3">Тип события</th>
                <th className="px-6 py-3">Уровень</th>
                <th className="px-6 py-3">Роль</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Описание</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Empty msg="Сообщений не найдено" />
                  </td>
                </tr>
              )}
              {filtered.map((it) => (
                <tr
                  key={it.id}
                  className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]"
                  data-testid={`report-row-${it.id}`}
                >
                  <td className="px-6 py-3 text-[#475569] whitespace-nowrap">
                    {formatDate(it.created_at)}
                  </td>
                  <td className="px-6 py-3 text-[#0F172A] font-medium">
                    {it.event_type_label}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold"
                      style={{
                        background: `${SEVERITY_COLORS[it.severity]}15`,
                        color: SEVERITY_COLORS[it.severity],
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: SEVERITY_COLORS[it.severity] }}
                      />
                      {SEVERITY_LABELS[it.severity]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[#475569]">
                    {ROLE_LABELS[it.role] || it.role}
                  </td>
                  <td className="px-6 py-3 text-[#475569] text-xs font-mono">
                    {it.email}
                  </td>
                  <td className="px-6 py-3 text-[#475569] max-w-md">
                    <div className="line-clamp-2">{it.description}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color, testid, accent }) {
  return (
    <div
      className={`border rounded-xl p-5 transition-colors ${
        accent ? "bg-white border-[#FECACA]" : "bg-white border-[#E2E8F0]"
      }`}
      data-testid={testid}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          <Icon size={18} />
        </span>
      </div>
      <p className="text-3xl font-bold text-[#0F172A] font-heading leading-none">
        {value}
      </p>
      <p className="text-xs text-[#475569] mt-2 leading-snug">{label}</p>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-[#64748B] py-6">
      <Inbox size={28} className="mb-2 opacity-60" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}
