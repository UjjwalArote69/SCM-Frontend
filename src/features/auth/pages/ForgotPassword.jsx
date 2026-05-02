import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import AuthLayout from "../../../layouts/AuthLayout.jsx";
import Field from "../../../components/auth/Field.jsx";
import Button from "../../../components/auth/Button.jsx";
import { useToast } from "../../../hooks/useToast.jsx";

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    setSent(true);
    toast.success(`Reset link sent to ${email}`);
  };

  return (
    <AuthLayout
      brandTitle={
        <>
          Regain access.
          <br />
          Securely.
        </>
      }
      brandSubtitle="Reset your credentials and return to the precision engine powering your logistics operations."
    >
      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-primary text-sm font-semibold mb-8 hover:brightness-110 group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to login
      </Link>

      {!sent ? (
        <>
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-3 text-text">
              Reset your password
            </h1>
            <p className="text-text-muted">
              Enter your registered email. We&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <Field
              id="email"
              type="email"
              label="Email address"
              placeholder="user@company.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              autoComplete="email"
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-text-muted">
            Need help?{" "}
            <a
              href="mailto:support@mekagroup.in"
              className="font-medium text-info hover:underline"
            >
              Contact support
            </a>
          </p>
        </>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight mb-3 text-text">
              Check your inbox
            </h1>
            <p className="text-text-muted">
              We&apos;ve securely processed your request.
            </p>
          </div>

          <div className="bg-success-soft border border-success/30 rounded-lg p-5 flex items-start gap-4">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-success" />
            <p className="text-sm font-medium text-success leading-relaxed">
              We&apos;ve sent a reset link to{" "}
              <span className="font-bold">{email}</span>. Please check your
              email to continue.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-border">
            <p className="text-sm text-text-muted mb-6">
              Didn&apos;t receive the email? Check your spam folder or contact
              your system administrator.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:brightness-110 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to login
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
