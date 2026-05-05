import { useState, useEffect } from "react";
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
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ReportForm() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ event_types: [], roles: [] });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
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
    axios
      .get(`${API}/meta`)
      .then((r) => setMeta(r.data))
      .catch(() => {});
  }, []);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      e.email = "Укажите корректный email";
    if (!form.event_type) e.event_type = "Выберите тип события";
    if (!form.description || form.description.trim().length < 10)
      e.description = "Описание должно содержать минимум 10 символов";
    if (!form.incident_date) e.incident_date = "Укажите дату";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Проверьте заполнение полей формы");
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/incidents`, form);
      setSuccess(res.data);
      toast.success("Отчёт принят. Спасибо за вашу бдительность.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Не удалось отправить отчёт. Попробуйте снова.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        className="max-w-3xl mx-auto px-5 lg:px-8 py-16 lg:py-24"
        data-testid="report-success"
      >
        <div className="border border-[#E2E8F0] rounded-2xl bg-white p-8 lg:p-12">
          <span className="w-14 h-14 rounded-xl bg-[#DCFCE7] text-[#059669] flex items-center justify-center">
            <CheckCircle2 size={28} />
          </span>
          <h1 className="mt-5 text-3xl font-semibold text-[#0F172A] font-heading tracking-tight">
            Отчёт принят
          </h1>
          <p className="mt-3 text-[15px] text-[#475569] leading-relaxed">
            Ваше сообщение зарегистрировано в системе мониторинга. Уполномоченный орган и производитель получат уведомление и проведут анализ.
          </p>
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="border border-[#E2E8F0] rounded-lg p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold">
                Номер обращения
              </p>
              <p
                className="mt-1 text-sm font-mono text-[#0F172A] break-all"
                data-testid="success-report-id"
              >
                {success.id}
              </p>
            </div>
            <div className="border border-[#E2E8F0] rounded-lg p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-semibold">
                Категория
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                {success.event_type_label}
              </p>
              <p className="text-xs text-[#475569] mt-1">
                Уровень: {success.severity === "critical" ? "критический" : success.severity === "serious" ? "серьёзный" : "стандартный"}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setSuccess(null);
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
              Подать ещё одно сообщение
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-5 py-2.5 rounded-lg font-medium text-sm"
              data-testid="success-home"
            >
              Вернуться на главную
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
            Форма
          </p>
          <h1 className="mt-1 text-3xl lg:text-4xl font-semibold text-[#0F172A] font-heading tracking-tight">
            Сообщить об инциденте
          </h1>
          <p className="mt-3 text-[15px] text-[#475569] leading-relaxed max-w-2xl">
            Заполните форму как можно подробнее. От тяжести события зависит срок реагирования: 2, 10 или 30 дней.
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
              Email <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="example@domain.ru"
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
            <Label className="text-sm font-medium text-[#0F172A]">
              Я выступаю как
            </Label>
            <Select
              value={form.role}
              onValueChange={(v) => update("role", v)}
            >
              <SelectTrigger className="mt-1.5" data-testid="select-role">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                {meta.roles.map((r) => (
                  <SelectItem
                    key={r.value}
                    value={r.value}
                    data-testid={`select-role-${r.value}`}
                  >
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label className="text-sm font-medium text-[#0F172A]">
              Тип события <span className="text-[#DC2626]">*</span>
            </Label>
            <Select
              value={form.event_type}
              onValueChange={(v) => update("event_type", v)}
            >
              <SelectTrigger className="mt-1.5" data-testid="select-event-type">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {meta.event_types.map((t) => (
                  <SelectItem
                    key={t.value}
                    value={t.value}
                    data-testid={`select-event-${t.value}`}
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.event_type && (
              <p
                className="text-xs text-[#DC2626] mt-1"
                data-testid="error-event-type"
              >
                {errors.event_type}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="incident_date" className="text-sm font-medium text-[#0F172A]">
              Дата события <span className="text-[#DC2626]">*</span>
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
              Наименование изделия
            </Label>
            <Input
              id="device_name"
              placeholder="Напр. инфузионный насос XYZ-200"
              value={form.device_name}
              onChange={(e) => update("device_name", e.target.value)}
              className="mt-1.5"
              data-testid="input-device-name"
            />
          </div>
          <div>
            <Label htmlFor="organization" className="text-sm font-medium text-[#0F172A]">
              Организация
            </Label>
            <Input
              id="organization"
              placeholder="Название мед. организации (если применимо)"
              value={form.organization}
              onChange={(e) => update("organization", e.target.value)}
              className="mt-1.5"
              data-testid="input-organization"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium text-[#0F172A]">
            Описание события <span className="text-[#DC2626]">*</span>
          </Label>
          <Textarea
            id="description"
            rows={6}
            placeholder="Подробно опишите обстоятельства, симптомы, действия персонала, последствия для пациента и любые иные значимые детали."
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
              <span className="text-xs text-[#64748B]">Минимум 10 символов</span>
            )}
            <span className="text-xs text-[#64748B]">
              {form.description.length} / 5000
            </span>
          </div>
        </div>

        <div className="border-t border-[#E2E8F0] pt-5 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[#475569] max-w-md">
            Отправляя форму, вы подтверждаете достоверность сведений. Ложные сообщения преследуются по закону.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#0050A0] hover:bg-[#003D7A] text-white px-6 py-3 rounded-lg font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="submit-report"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Отправка...
              </>
            ) : (
              <>
                <Send size={16} /> Отправить отчёт
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
