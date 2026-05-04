import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import AuthLayout from "../../../layouts/AuthLayout.jsx";
import Field from "../../../components/auth/Field.jsx";
import Button from "../../../components/auth/Button.jsx";
import { useAuthStore } from "../store.js";
import { useToast } from "../../../hooks/useToast.jsx";

// Demo accounts mirror DemoUsersSeeder. Emails follow <role>.<dept>@scm.com
// where the role is department-scoped (HOD/Manager/Employee/etc) so the
// department is visible in the address itself. Org-wide roles (Admin, CEO,
// Director, Customer, Vendor) keep the plain <role>@scm.com form.
//
// Grouped into three sections so the login page stays scannable as the
// number of demo accounts grows (one HOD + one employee per department).
const DEMO_GROUPS = [
  {
    label: "Org & roles",
    accounts: [
      { email: "admin@scm.com",                role: "Admin" },
      { email: "ceo@scm.com",                  role: "CEO" },
      { email: "director@scm.com",             role: "Director" },
      { email: "cfo.fin@scm.com",              role: "CFO · FIN" },
      { email: "accountant.fin@scm.com",       role: "Accountant · FIN" },
      { email: "purchase.purch@scm.com",       role: "Purchase Officer · PURCH" },
      { email: "manager.eng@scm.com",          role: "Manager · ENG" },
      { email: "customer@scm.com",             role: "Customer" },
      { email: "vendor@scm.com",               role: "Vendor" },
    ],
  },
  {
    label: "Department HODs",
    accounts: [
      { email: "marcus@meka.in",               role: "HOD · PROC" },
      { email: "hod.purch@scm.com",            role: "HOD · PURCH" },
      { email: "hod.fin@scm.com",              role: "HOD · FIN" },
      { email: "hod.it@scm.com",               role: "HOD · IT" },
      { email: "hod.eng@scm.com",              role: "HOD · ENG" },
      { email: "hod.mfg@scm.com",              role: "HOD · MFG" },
      { email: "hod.ops@scm.com",              role: "HOD · OPS" },
      { email: "hod.sales@scm.com",            role: "HOD · SALES" },
      { email: "hod.hr@scm.com",               role: "HOD · HR" },
      { email: "hod.legal@scm.com",            role: "HOD · LEGAL" },
      { email: "hod.qa@scm.com",               role: "HOD · QA" },
      { email: "hod.rnd@scm.com",              role: "HOD · RND" },
    ],
  },
  {
    label: "Department employees",
    accounts: [
      { email: "employee.proc@scm.com",        role: "Employee · PROC" },
      { email: "employee.purch@scm.com",       role: "Employee · PURCH" },
      { email: "employee.fin@scm.com",         role: "Employee · FIN" },
      { email: "employee.it@scm.com",          role: "Employee · IT" },
      { email: "employee.eng@scm.com",         role: "Employee · ENG" },
      { email: "employee.mfg@scm.com",         role: "Employee · MFG" },
      { email: "employee.ops@scm.com",         role: "Employee · OPS" },
      { email: "employee.sales@scm.com",       role: "Employee · SALES" },
      { email: "employee.hr@scm.com",          role: "Employee · HR" },
      { email: "employee.legal@scm.com",       role: "Employee · LEGAL" },
      { email: "employee.qa@scm.com",          role: "Employee · QA" },
      { email: "employee.rnd@scm.com",         role: "Employee · RND" },
    ],
  },
];

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const existingUser = useAuthStore((s) => s.user);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // If landing on /login while a stale token persists in localStorage,
  // drop it — otherwise protected-route requests silently re-use it.
  useEffect(() => {
    if (existingUser) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Please enter a valid business email address.";
    if (password.length < 4)
      next.password = "Password must be at least 4 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const { user, home } = await login({ email, password });
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      navigate(home);
    } catch (err) {
      const message = err?.message ?? "Invalid credentials";
      toast.error(message);
      // attribute to email or password based on the message
      if (/email/i.test(message)) {
        setErrors({ email: message });
      } else {
        setErrors({ password: message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (accountEmail) => {
    setEmail(accountEmail);
    setPassword("password");
    setErrors({});
    setSubmitting(true);
    try {
      const { user, home } = await login({
        email: accountEmail,
        password: "password",
      });
      toast.info(`Signed in as ${user.name} (${user.role})`);
      navigate(home);
    } catch (err) {
      toast.error(err?.message ?? "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-2xl font-semibold tracking-tight mb-2 text-text">
          Sign in to your account
        </h1>
        <p className="text-sm text-text-muted">Enter your credentials to continue.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          id="email"
          type="email"
          label="Email Address"
          placeholder="name@company.com"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
        />
        <Field
          id="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary hover:brightness-110 underline decoration-1 underline-offset-2"
          >
            Forgot password?
          </Link>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
        </div>
      </form>

      <div className="mt-6 p-3 bg-info-soft/40 border border-info/20 rounded-md">
        <div className="text-xs font-bold text-info uppercase tracking-wider mb-3">
          Demo accounts — password:{" "}
          <span className="font-mono normal-case">password</span>
        </div>
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {DEMO_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">
                {group.label}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.accounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => quickLogin(acc.email)}
                    disabled={submitting}
                    className="text-left px-2.5 py-2 bg-surface-container-lowest border border-border rounded-md hover:border-primary text-xs transition-colors disabled:opacity-60 min-w-0"
                  >
                    <div className="font-semibold text-text truncate">{acc.role}</div>
                    <div className="text-text-muted truncate text-[10px]">
                      {acc.email}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant opacity-30" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface-container-lowest text-text-muted">Are you a vendor?</span>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate("/vendor-register")}>
            Register as Vendor
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
