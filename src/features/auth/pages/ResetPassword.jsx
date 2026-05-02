import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import AuthLayout from "../../../layouts/AuthLayout.jsx";
import Field from "../../../components/auth/Field.jsx";
import Button from "../../../components/auth/Button.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..4
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "bg-border",
  "bg-danger",
  "bg-warning",
  "bg-info",
  "bg-success",
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const score = useMemo(() => scorePassword(pw), [pw]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate("/login"), 2500);
    return () => clearTimeout(t);
  }, [done, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (pw.length < 8) next.pw = "Must be at least 8 characters.";
    if (pw !== confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    setDone(true);
    toast.success("Password updated successfully");
  };

  if (done) {
    return (
      <AuthLayout
        brandTitle={
          <>
            Supply Chain,
            <br />
            Secured.
          </>
        }
        brandSubtitle="Your credentials have been updated. Return to the dashboard to continue."
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-success-soft flex items-center justify-center mb-8">
            <CheckCircle2 className="h-12 w-12 text-success" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3 text-text">
            Password updated
          </h1>
          <p className="text-text-muted mb-10">
            Your password has been successfully reset.
          </p>
          <div className="flex items-center gap-2 text-primary font-medium">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Redirecting to login…</span>
          </div>
          <Link
            to="/login"
            className="mt-6 text-sm font-semibold text-info hover:underline"
          >
            Return to login manually
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      brandTitle={
        <>
          Supply Chain,
          <br />
          Simplified.
        </>
      }
      brandSubtitle="Re-secure your account to regain control of your enterprise architecture."
    >
      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-primary text-sm font-semibold mb-8 hover:brightness-110 group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to login
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-3 text-text">
          Create a new password
        </h1>
        <p className="text-text-muted">
          Choose a strong password with at least 8 characters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div>
          <Field
            id="new_password"
            type="password"
            label="New Password"
            placeholder="Enter new password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            error={errors.pw}
            autoComplete="new-password"
          />
          {pw && (
            <div className="pt-3">
              <div className="flex gap-1.5 h-1.5 w-full">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${
                      i < score ? STRENGTH_COLORS[score] : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-medium mt-1.5 text-text-muted">
                {STRENGTH_LABELS[score]}
              </p>
            </div>
          )}
        </div>

        <Field
          id="confirm_password"
          type="password"
          label="Confirm Password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          autoComplete="new-password"
        />

        <div className="pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
