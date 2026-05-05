import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertOctagon,
  CheckCircle2,
  Send,
  Calendar as CalendarIcon,
  Loader2,
  Upload,
  X,
  FileText,
  FileImage,
  File as FileIcon,
} from "lucide-react";
import { useT, useLang } from "@/lib/i18n";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "docx"];

function fileIcon(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["jpg", "jpeg", "png"].includes(ext)) return FileImage;
  if (ext === "pdf") return FileText;
  return FileIcon;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default function ReportForm() {
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useLang();
  const fileInputRef = useRef(null);
  const [meta, setMeta] = useState({ event_types: [], roles: [] });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({
    email: "",
    event_type: "",
    description: "",
    incident_date: new Date().toISOString().slice(0, 10),
    role: "polzovatel",
    device_name: "",
    organization: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    axios.get(`${API}/meta`).then((r) => setMeta(r.data)).catch(() => {});
  }, []);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const addFiles = (incoming) => {
    const arr = Array.from(incoming || []);
    const next = [...files];
    for (const f of arr) {
      if (next.length >= MAX_FILES) {
        toast.error(t("form.error.too_many_files"));
        break;
      }
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        toast.error(`${t("form.error.file_type")}: ${f.name}`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${t("form.error.file_size")}: ${f.name}`);
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const removeFile = (idx) => {
    setFiles((f) => f.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const e = {};
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      e.email = t("form.error.email");
    if (!form.event_type) e.event_type = t("form.error.event_type");
    if (!form.description || form.description.trim().length < 10)
      e.description = t("form.error.description");
    if (!form.incident_date) e.incident_date = t("form.error.date");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error(t("form.error.invalid"));
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("payload", JSON.stringify(form));
      for (const f of files) fd.append("files", f);
      const res = await axios.post(`${API}/incidents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(res.data);
      toast.success(t("form.success.toast"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Не удалось отправить отчёт. Попробуйте снова.";
      toast.error(typeof msg === "string" ? msg : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-16 lg:py-24" data-testid="report-success">
        <div className="border border-[#E2E8F0] rounded-2xl bg-white p-8 lg:p-12">
          <span className="w-14 h-14 rounded-xl bg-[#DCFCE7] text-[#059669] flex items-center justify-center">
            <CheckCircle2 size={28} />
          </span>
          <h1 className="mt-5 text-3xl font-semibold text-[#0F172A] font-heading tracking-tight">
            {t("form.success.title")}
          </h1>
          <p className="mt-3 text-[15px] text-[#475569] leading-relaxed">
            {t("form.success.lead")}
          </p>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="border border-[#E2E8F0] rounded-lg p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold">
                {t("form.success.id")}
              </p>
              <p className="mt-1 text-sm font-mono text-[#0F172A] break-all" data-testid="success-report-id">
                {success.id}
              </p>
            </div>
            <div className="border border-[#E2E8F0] rounded-lg p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold">
                {t("form.success.cat")}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                {success.event_type_label}
              </p>
              <p className="text-xs text-[#475569] mt-1">
                {t("form.success.level")}: {t(`sev.${success.severity}`)}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setSuccess(null);
                setFiles([]);
                setForm((f) => ({
                  ...f,
                  description: "",
                  event_type: "",
                  device_name: "",
                  organization: "",
                }));
              }}
              className="bg-[#0050A0] hover:bg-[#003D7A] text-white px-5 py-2.5 rounded-lg font-medium text-sm"
              data-testid="success-new-report"
            >
              {t("form.success.new")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-5 py-2.5 rounded-lg font-medium text-sm"
              data-testid="success-home"
            >
              {t("form.success.home")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 lg:px-8 py-12 lg:py-16" data-testid="report-page">
      <div className="flex items-start gap-4 mb-10">
        <span className="w-12 h-12 rounded-xl bg-[#E8F0FB] text-[#0050A0] flex items-center justify-center flex-shrink-0">
          <AlertOctagon size={22} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#0050A0] font-semibold">
            {t("form.kicker")}
          </p>
          <h1 className="mt-1 text-3xl lg:text-4xl font-semibold text-[#0F172A] font-heading tracking-tight">
            {t("form.title")}
          </h1>
          <p className="mt-3 text-[15px] text-[#475569] leading-relaxed max-w-2xl">
            {t("form.lead")}
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="border border-[#E2E8F0] rounded-2xl bg-white p-6 lg:p-10 space-y-6"
        data-testid="report-form"
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
              {t("form.email")} <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t("form.email.ph")}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="mt-1.5"
              data-testid="input-email"
            />
            {errors.email && (
              <p className="text-xs text-[#DC2626] mt-1" data-testid="error-email">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium text-[#0F172A]">{t("form.role")}</Label>
            <Select value={form.role} onValueChange={(v) => update("role", v)}>
              <SelectTrigger className="mt-1.5" data-testid="select-role">
                <SelectValue placeholder={t("form.role.ph")} />
              </SelectTrigger>
              <SelectContent>
                {meta.roles.map((r) => (
                  <SelectItem key={r.value} value={r.value} data-testid={`select-role-${r.value}`}>
                    {lang === "ky" ? r.label_ky || r.label : r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label className="text-sm font-medium text-[#0F172A]">
              {t("form.event_type")} <span className="text-[#DC2626]">*</span>
            </Label>
            <Select value={form.event_type} onValueChange={(v) => update("event_type", v)}>
              <SelectTrigger className="mt-1.5" data-testid="select-event-type">
                <SelectValue placeholder={t("form.event_type.ph")} />
              </SelectTrigger>
              <SelectContent>
                {meta.event_types.map((tp) => (
                  <SelectItem key={tp.value} value={tp.value} data-testid={`select-event-${tp.value}`}>
                    {lang === "ky" ? tp.label_ky || tp.label : tp.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.event_type && (
              <p className="text-xs text-[#DC2626] mt-1" data-testid="error-event-type">
                {errors.event_type}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="incident_date" className="text-sm font-medium text-[#0F172A]">
              {t("form.date")} <span className="text-[#DC2626]">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="incident_date"
                type="date"
                value={form.incident_date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update("incident_date", e.target.value)}
                className="pr-10"
                data-testid="input-incident-date"
              />
              <CalendarIcon
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none"
              />
            </div>
            {errors.incident_date && (
              <p className="text-xs text-[#DC2626] mt-1" data-testid="error-date">
                {errors.incident_date}
              </p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="device_name" className="text-sm font-medium text-[#0F172A]">
              {t("form.device")}
            </Label>
            <Input
              id="device_name"
              placeholder={t("form.device.ph")}
              value={form.device_name}
              onChange={(e) => update("device_name", e.target.value)}
              className="mt-1.5"
              data-testid="input-device-name"
            />
          </div>
          <div>
            <Label htmlFor="organization" className="text-sm font-medium text-[#0F172A]">
              {t("form.org")}
            </Label>
            <Input
              id="organization"
              placeholder={t("form.org.ph")}
              value={form.organization}
              onChange={(e) => update("organization", e.target.value)}
              className="mt-1.5"
              data-testid="input-organization"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium text-[#0F172A]">
            {t("form.description")} <span className="text-[#DC2626]">*</span>
          </Label>
          <Textarea
            id="description"
            rows={6}
            placeholder={t("form.description.ph")}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1.5"
            data-testid="input-description"
          />
          <div className="mt-1 flex items-center justify-between">
            {errors.description ? (
              <p className="text-xs text-[#DC2626]" data-testid="error-description">
                {errors.description}
              </p>
            ) : (
              <span className="text-xs text-[#64748B]">{t("form.description.min")}</span>
            )}
            <span className="text-xs text-[#64748B]">{form.description.length} / 5000</span>
          </div>
        </div>

        {/* File upload */}
        <div>
          <Label className="text-sm font-medium text-[#0F172A]">{t("form.files")}</Label>
          <p className="text-xs text-[#64748B] mt-1">{t("form.files.hint")}</p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-[#0050A0] bg-[#E8F0FB]/40"
                : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#94A3B8]"
            }`}
            onClick={() => fileInputRef.current?.click()}
            data-testid="file-dropzone"
          >
            <Upload size={20} className="text-[#0050A0] mx-auto mb-2" />
            <p className="text-sm text-[#475569]">
              {t("form.files.drop")}{" "}
              <span className="text-[#0050A0] font-semibold">{t("form.files.browse")}</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
              data-testid="file-input"
            />
          </div>

          {files.length > 0 && (
            <ul className="mt-3 space-y-2" data-testid="file-list">
              {files.map((f, idx) => {
                const Icon = fileIcon(f.name);
                return (
                  <li
                    key={idx}
                    className="flex items-center gap-3 border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white"
                    data-testid={`file-item-${idx}`}
                  >
                    <span className="w-9 h-9 rounded-md bg-[#E8F0FB] text-[#0050A0] flex items-center justify-center flex-shrink-0">
                      <Icon size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{f.name}</p>
                      <p className="text-xs text-[#64748B]">{formatSize(f.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1.5 rounded-md hover:bg-[#FEF2F2] text-[#DC2626]"
                      title={t("form.files.remove")}
                      data-testid={`file-remove-${idx}`}
                    >
                      <X size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-[#E2E8F0] pt-5 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[#475569] max-w-md">{t("form.disclaimer")}</p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#0050A0] hover:bg-[#003D7A] text-white px-6 py-3 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="submit-report"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {t("form.submitting")}
              </>
            ) : (
              <>
                <Send size={16} /> {t("form.submit")}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
