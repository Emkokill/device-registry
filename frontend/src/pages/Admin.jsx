import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Cell,
} from "recharts";
import {
  AlertOctagon, AlertTriangle, Info, Activity, Loader2, Inbox, Paperclip,
  Download, X,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useT, useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SEVERITY_COLORS = {
  critical: "#DC2626",
  serious: "#D97706",
  standard: "#0050A0",
};

const STATUS_STYLES = {
  received:  { bg: "#E0F2FE", color: "#0369A1" },
  in_review: { bg: "#FEF3C7", color: "#B45309" },
  resolved:  { bg: "#DCFCE7", color: "#15803D" },
  rejected:  { bg: "#FEE2E2", color: "#B91C1C" },
};

const STATUSES = ["received", "in_review", "resolved", "rejected"];

function formatDate(iso, locale) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale === "ky" ? "ky-KG" : "ru-RU", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

export default function Admin() {
  const t = useT();
  const { lang } = useLang();
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [rejectModal, setRejectModal] = useState(null); // {incident}
  const [rejectReason, setRejectReason] = useState("");
  const [savingId, setSavingId] = useState(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const [s, i] = await Promise.all([
        axios.get(`${API}/incidents/stats`, { headers: authHeaders }),
        axios.get(`${API}/incidents`, { headers: authHeaders }),
      ]);
      setStats(s.data);
      setItems(i.data);
    } catch (e) {
      toast.error("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateStatus = async (incident, newStatus, reason) => {
    if (newStatus === "rejected" && !reason) {
      setRejectModal({ incident });
      return;
    }
    setSavingId(incident.id);
    try {
      const r = await axios.patch(
        `${API}/incidents/${incident.id}`,
        { status: newStatus, rejection_reason: reason },
        { headers: authHeaders }
      );
      setItems((arr) => arr.map((it) => (it.id === incident.id ? r.data : it)));
      // Refresh stats
      const s = await axios.get(`${API}/incidents/stats`, { headers: authHeaders });
      setStats(s.data);
      toast.success(`${t("status.change")} → ${t(`status.${newStatus}`)}`);
      setRejectModal(null);
      setRejectReason("");
    } catch (e) {
      toast.error("Не удалось обновить статус");
    } finally {
      setSavingId(null);
    }
  };

  const downloadFile = (att) => {
    const url = `${API}/files/${att.id}?auth=${encodeURIComponent(token)}`;
    window.open(url, "_blank");
  };

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
    name: t(`admin.severity.${k}`), value: v, severity: k,
  }));
  const timelineData = (stats?.timeline || []).map((tr) => ({
    date: tr.date.slice(5),
    count: tr.count,
  }));

  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-8 py-12 lg:py-16" data-testid="admin-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#0050A0] font-semibold">
            {t("admin.kicker")}
          </p>
          <h1 className="mt-1 text-3xl lg:text-4xl font-semibold text-[#0F172A] font-heading tracking-tight">
            {t("admin.title")}
          </h1>
          <p className="mt-3 text-[15px] text-[#475569] max-w-2xl">{t("admin.lead")}</p>
          {user && (
            <p className="mt-3 text-xs text-[#64748B]" data-testid="admin-logged-as">
              {t("admin.logged_as")}: <span className="font-medium text-[#0F172A]">{user.email}</span>
            </p>
          )}
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-4 py-2 rounded-lg font-medium text-sm"
          data-testid="admin-refresh"
        >
          <Activity size={15} /> {t("common.refresh")}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="kpi-grid">
        <KPI icon={Inbox} label={t("admin.kpi.total")} value={total} color="#0050A0" testid="kpi-total" />
        <KPI icon={AlertOctagon} label={t("admin.kpi.critical")} value={sev.critical || 0} color="#DC2626" testid="kpi-critical" accent />
        <KPI icon={AlertTriangle} label={t("admin.kpi.serious")} value={sev.serious || 0} color="#D97706" testid="kpi-serious" />
        <KPI icon={Info} label={t("admin.kpi.standard")} value={sev.standard || 0} color="#0050A0" testid="kpi-standard" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 border border-[#E2E8F0] rounded-xl bg-white p-6" data-testid="chart-timeline">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[#0F172A] font-heading">
              {t("admin.chart.timeline")}
            </p>
            <p className="text-xs text-[#64748B]">{t("admin.chart.timeline.sub")}</p>
          </div>
          <div className="h-[260px] min-h-[260px]">
            {timelineData.length === 0 ? (
              <Empty msg={t("admin.no_data")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <LineChart data={timelineData}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 12 }} stroke="#CBD5E1" />
                  <YAxis tick={{ fill: "#64748B", fontSize: 12 }} stroke="#CBD5E1" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
                  <Line type="monotone" dataKey="count" stroke="#0050A0" strokeWidth={2.5} dot={{ r: 4, fill: "#0050A0" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="border border-[#E2E8F0] rounded-xl bg-white p-6" data-testid="chart-severity">
          <p className="text-sm font-semibold text-[#0F172A] font-heading mb-4">
            {t("admin.chart.severity")}
          </p>
          <div className="h-[260px] min-h-[260px]">
            {total === 0 ? (
              <Empty msg={t("admin.no_data")} />
            ) : (
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <BarChart data={bySeverityData} layout="vertical">
                  <CartesianGrid stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#64748B", fontSize: 12 }} stroke="#CBD5E1" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#0F172A", fontSize: 12 }} stroke="#CBD5E1" width={110} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13 }} />
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
      <div className="border border-[#E2E8F0] rounded-xl bg-white overflow-hidden" data-testid="reports-table">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F8FAFC]">
          <p className="text-sm font-semibold text-[#0F172A] font-heading">{t("admin.table.title")}</p>
          <div className="flex items-center gap-1.5 flex-wrap" data-testid="severity-filters">
            {[
              { v: "all", l: t("admin.filter.all") },
              { v: "critical", l: t("admin.severity.critical") },
              { v: "serious", l: t("admin.severity.serious") },
              { v: "standard", l: t("admin.severity.standard") },
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
                <th className="px-4 py-3">{t("admin.col.date")}</th>
                <th className="px-4 py-3">{t("admin.col.event")}</th>
                <th className="px-4 py-3">{t("admin.col.severity")}</th>
                <th className="px-4 py-3">{t("admin.col.status")}</th>
                <th className="px-4 py-3">{t("admin.col.email")}</th>
                <th className="px-4 py-3">{t("admin.col.description")}</th>
                <th className="px-4 py-3">{t("admin.col.files")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Empty msg={t("admin.empty")} />
                  </td>
                </tr>
              )}
              {filtered.map((it) => {
                const stStyle = STATUS_STYLES[it.status] || STATUS_STYLES.received;
                return (
                  <tr
                    key={it.id}
                    className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] align-top"
                    data-testid={`report-row-${it.id}`}
                  >
                    <td className="px-4 py-3 text-[#475569] whitespace-nowrap">
                      {formatDate(it.created_at, lang)}
                    </td>
                    <td className="px-4 py-3 text-[#0F172A] font-medium">
                      {it.event_type_label}
                    </td>
                    <td className="px-4 py-3">
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
                        {t(`admin.severity.${it.severity}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <Select
                        value={it.status}
                        onValueChange={(v) => updateStatus(it, v)}
                        disabled={savingId === it.id}
                      >
                        <SelectTrigger
                          className="h-8 text-xs"
                          style={{ borderColor: stStyle.color, color: stStyle.color, background: stStyle.bg }}
                          data-testid={`status-select-${it.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem
                              key={s}
                              value={s}
                              data-testid={`status-option-${it.id}-${s}`}
                            >
                              {t(`status.${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {it.status === "rejected" && it.rejection_reason && (
                        <p className="text-xs text-[#B91C1C] mt-1.5 italic max-w-[200px]" data-testid={`reject-reason-${it.id}`}>
                          “{it.rejection_reason}”
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#475569] text-xs font-mono">{it.email}</td>
                    <td className="px-4 py-3 text-[#475569] max-w-md">
                      <div className="line-clamp-2">{it.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      {(!it.attachments || it.attachments.length === 0) ? (
                        <span className="text-xs text-[#94A3B8]">{t("files.no_files")}</span>
                      ) : (
                        <div className="space-y-1" data-testid={`files-${it.id}`}>
                          {it.attachments.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => downloadFile(a)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-xs text-[#0050A0] max-w-[200px]"
                              title={a.filename}
                              data-testid={`file-link-${a.id}`}
                            >
                              <Paperclip size={12} />
                              <span className="truncate">{a.filename}</span>
                              <Download size={11} className="flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject reason modal */}
      <Dialog
        open={!!rejectModal}
        onOpenChange={(o) => {
          if (!o) {
            setRejectModal(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent data-testid="reject-modal">
          <DialogHeader>
            <DialogTitle>{t("status.reject_reason")}</DialogTitle>
            <DialogDescription>
              {rejectModal?.incident?.event_type_label}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t("status.reject_reason.ph")}
            rows={4}
            data-testid="reject-reason-input"
          />
          <DialogFooter>
            <button
              onClick={() => {
                setRejectModal(null);
                setRejectReason("");
              }}
              className="px-4 py-2 text-sm rounded-md border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
              data-testid="reject-cancel"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() =>
                rejectModal &&
                updateStatus(rejectModal.incident, "rejected", rejectReason || "Без указания причины")
              }
              className="px-4 py-2 text-sm rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white inline-flex items-center gap-1.5"
              data-testid="reject-confirm"
            >
              <X size={14} /> {t("status.rejected")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <p className="text-3xl font-bold text-[#0F172A] font-heading leading-none">{value}</p>
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
