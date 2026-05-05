import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ArrowLeft, LogIn } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function Login() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate(location.state?.from || "/admin", { replace: true });
    }
  }, [user, loading, navigate, location.state]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Вход выполнен");
      navigate("/admin", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || t("login.error");
      setError(typeof msg === "string" ? msg : t("login.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-200px)] flex items-center justify-center px-5 py-12 bg-[#F8FAFC]"
      data-testid="login-page"
    >
      <div className="w-full max-w-md">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-11 h-11 rounded-xl bg-[#0050A0] text-white flex items-center justify-center">
              <ShieldCheck size={22} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#0050A0] font-semibold">
                {t("brand.subtitle")}
              </p>
              <h1 className="text-xl font-semibold font-heading text-[#0F172A]">
                {t("login.title")}
              </h1>
            </div>
          </div>
          <p className="text-sm text-[#475569] mt-3 mb-6">{t("login.lead")}</p>

          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
                {t("login.email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@medsafety.gov"
                required
                className="mt-1.5"
                data-testid="login-email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-[#0F172A]">
                {t("login.password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1.5"
                data-testid="login-password"
              />
            </div>
            {error && (
              <p
                className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-md px-3 py-2"
                data-testid="login-error"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0050A0] hover:bg-[#003D7A] text-white px-5 py-3 rounded-lg font-medium text-sm disabled:opacity-60"
              data-testid="login-submit"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("login.submitting")}
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  {t("login.submit")}
                </>
              )}
            </button>
          </form>
        </div>
        <div className="mt-5 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#0050A0]"
            data-testid="login-back"
          >
            <ArrowLeft size={14} />
            {t("login.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
