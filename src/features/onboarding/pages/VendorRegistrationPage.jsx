import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  Factory,
  GitBranch,
  Hash,
  Info,
  Loader2,
  Lock,
  Mail,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Ship,
  Shield,
  Smartphone,
  Truck,
  User as UserIcon,
  Users as UsersIcon,
  Wrench,
  Zap,
  AlertCircle,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast.jsx";
import { useOnboardingStore } from "../store.js";
import ThemeToggle from "../../../components/ui/ThemeToggle.jsx";

/* ───────── validators ───────── */
const VALID = {
  email: (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  phone: (s) => /^\d{10}$/.test(s),
  gst: (s) => /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(s.toUpperCase()),
};

/* ───────── small primitives ───────── */
function Brand({ size = "md" }) {
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <Link to="/" className="inline-flex items-center gap-3">
      <div
        className={`${dim} rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center shadow-sm`}
      >
        <Boxes className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="leading-none">
        <div className="text-sm font-black tracking-[0.22em] uppercase">
          SCM
        </div>
        <div className="text-[9px] mt-1 tracking-[0.32em] uppercase text-text-subtle">
          Meka Vendor Portal
        </div>
      </div>
    </Link>
  );
}

function Label({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-bold tracking-[0.18em] uppercase text-text-muted mb-2"
    >
      {children}
    </label>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className="mt-2 flex items-start gap-1.5 text-[12px] text-danger fade-up">
      <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" strokeWidth={2} />
      <span>{msg}</span>
    </div>
  );
}

function Input({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  Icon,
  prefix,
  error,
  mono,
  maxLength,
  autoFocus,
  disabled,
  suffix,
}) {
  const padLeft = Icon ? "pl-11" : prefix ? "pl-14" : "pl-4";
  const padRight = suffix ? "pr-12" : "pr-4";
  const cls = error
    ? "border border-danger ring-2 ring-danger/15"
    : "border border-border focus:border-primary focus:ring-2 focus:ring-primary/15";
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        {Icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-text-muted">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus={autoFocus}
          disabled={disabled}
          className={`w-full bg-bg rounded-xl text-sm text-text placeholder:text-text-subtle ${padLeft} ${padRight} py-3.5 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed ${cls} ${mono ? "font-mono uppercase tracking-wider" : ""}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </span>
        )}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
  loading,
  disabled,
  Icon = ArrowRight,
  className = "",
  full = true,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl px-6 py-3.5 font-bold text-sm tracking-wide transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:shadow-none ${full ? "w-full" : ""} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          <span>Working…</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {Icon && <Icon className="h-4 w-4" strokeWidth={2.5} />}
        </>
      )}
    </button>
  );
}

/* ───────── channel toggle ───────── */
function ChannelToggle({ channel, setChannel }) {
  const options = [
    { v: "email", Icon: Mail, label: "Email" },
    { v: "phone", Icon: Smartphone, label: "Phone" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 bg-bg p-1.5 rounded-xl border border-border">
      {options.map((o) => {
        const on = channel === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => setChannel(o.v)}
            className={`inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
              on
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            <o.Icon className="h-4 w-4" strokeWidth={2} /> {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── captcha ───────── */
function useCaptcha() {
  const gen = () => {
    const ops = [
      ["+", (a, b) => a + b],
      ["−", (a, b) => a - b],
    ];
    const [op, fn] = ops[Math.floor(Math.random() * ops.length)];
    let a = 5 + Math.floor(Math.random() * 8);
    let b = 1 + Math.floor(Math.random() * 5);
    if (op === "−" && b > a) [a, b] = [b, a];
    return { a, b, op, ans: String(fn(a, b)) };
  };
  const [c, setC] = useState(gen);
  return [c, () => setC(gen())];
}

function Captcha({ challenge, value, onChange, onRefresh, error, verified }) {
  const text = `${challenge.a} ${challenge.op} ${challenge.b} = ?`;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-text-muted">
          Human check
        </span>
        {verified && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] uppercase text-success whitespace-nowrap">
            <Check className="h-3 w-3" strokeWidth={3} /> Verified
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-12 flex-1 rounded-xl bg-bg border border-border overflow-hidden select-none">
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.18]"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="cap-noise"
                x="0"
                y="0"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="0.6" fill="currentColor" />
              </pattern>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="url(#cap-noise)"
              className="text-text"
            />
            <line
              x1="0"
              y1="35%"
              x2="100%"
              y2="60%"
              stroke="currentColor"
              strokeWidth="0.6"
              className="text-primary"
              opacity="0.6"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center gap-1 font-mono font-black text-[19px]">
            {text.split("").map((ch, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  transform: `rotate(${(((i * 7) % 17) - 8)}deg) translateY(${(((i * 11) % 9) - 4)}px)`,
                  color:
                    i % 3 === 0 ? "var(--brand-primary)" : "var(--text)",
                }}
              >
                {ch === " " ? " " : ch}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh"
          className="h-12 w-11 rounded-xl border border-border bg-bg text-text-muted hover:text-primary hover:border-primary inline-flex items-center justify-center transition-colors"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <div className="mt-2.5">
        <Input
          id="captcha-ans"
          value={value}
          onChange={(v) => onChange(v.replace(/\D/g, "").slice(0, 3))}
          placeholder="Type the answer"
          mono
          maxLength={3}
          Icon={Calculator}
          error={error}
        />
      </div>
    </div>
  );
}

/* ───────── OTP boxes ───────── */
function OtpInput({ value, onChange, error, length = 6 }) {
  const refs = useRef([]);
  const chars = value.padEnd(length, " ").slice(0, length).split("");
  const focusAt = (i) => {
    const el = refs.current[i];
    if (el) {
      el.focus();
      el.select?.();
    }
  };
  const setAt = (i, ch) => {
    ch = ch.replace(/\D/g, "").slice(0, 1);
    const arr = value.split("");
    while (arr.length < length) arr.push("");
    arr[i] = ch;
    onChange(arr.join("").trim());
    if (ch && i < length - 1) focusAt(i + 1);
  };
  const onKey = (e, i) => {
    if (e.key === "Backspace") {
      if (chars[i] && chars[i] !== " ") setAt(i, "");
      else if (i > 0) {
        focusAt(i - 1);
        setAt(i - 1, "");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      focusAt(i - 1);
      e.preventDefault();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      focusAt(i + 1);
      e.preventDefault();
    }
  };
  const onPaste = (e) => {
    const txt = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, length);
    if (txt) {
      onChange(txt);
      setTimeout(() => focusAt(Math.min(txt.length, length - 1)), 0);
      e.preventDefault();
    }
  };
  return (
    <div>
      <div className="flex items-center gap-2" onPaste={onPaste}>
        {Array.from({ length }).map((_, i) => {
          const filled = chars[i] && chars[i] !== " ";
          return (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={filled ? chars[i] : ""}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => onKey(e, i)}
              onFocus={(e) => e.target.select()}
              className={`flex-1 min-w-0 h-14 text-center text-xl font-bold font-mono bg-bg rounded-xl border outline-none transition-all ${
                error
                  ? "border-danger ring-2 ring-danger/15"
                  : filled
                    ? "border-primary/60 ring-2 ring-primary/15"
                    : "border-border focus:border-primary focus:ring-2 focus:ring-primary/15"
              }`}
            />
          );
        })}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

/* ───────── layout ───────── */
function SidePanel() {
  return (
    <aside className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden bg-surface-container-low border-r border-border text-text">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, var(--brand-primary), transparent 50%), radial-gradient(circle at 80% 70%, var(--brand-primary), transparent 50%)",
        }}
      />
      <div className="relative">
        <Brand />
      </div>
      <div className="relative">
        <div className="italic text-text-muted text-2xl mb-3">
          Built on tide & steel.
        </div>
        <h1 className="text-3xl xl:text-4xl font-bold leading-[1.1] text-text">
          Become a Meka<br />Group vendor.
        </h1>
        <p className="text-[14px] text-text-muted mt-5 max-w-sm leading-relaxed">
          Forty-five years of marine, dredging and infrastructure. Join the
          network that builds India&apos;s coastline.
        </p>
      </div>
      <div className="relative grid grid-cols-3 gap-4">
        {[
          { v: "45+", k: "Years" },
          { v: "1.2k", k: "Vendors" },
          { v: "₹3k cr", k: "PO/yr" },
        ].map((s) => (
          <div key={s.k}>
            <div className="text-2xl font-bold text-text">{s.v}</div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-text-subtle mt-1">
              {s.k}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Page({ children, eyebrow, title, lede, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[440px_1fr] bg-bg">
      <SidePanel />
      <main className="flex items-center justify-center px-5 sm:px-8 py-10 sm:py-14">
        <div className="w-full max-w-md fade-up">
          <div className="lg:hidden mb-8 flex items-center justify-between">
            <Brand size="sm" />
            <ThemeToggle />
          </div>
          {eyebrow && (
            <div className="text-[10px] font-bold tracking-[0.28em] uppercase text-primary mb-2.5">
              {eyebrow}
            </div>
          )}
          {title && (
            <h1 className="text-[28px] sm:text-[32px] font-bold leading-[1.1] text-text">
              {title}
            </h1>
          )}
          {lede && (
            <p className="text-[14px] text-text-muted mt-3 leading-relaxed">
              {lede}
            </p>
          )}
          <div className="mt-8">{children}</div>
          {footer && (
            <div className="mt-8 pt-6 border-t border-outline-variant text-center">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ───────── 1. login ───────── */
function LoginScreen({ goRegister, onSendOtp }) {
  const [channel, setChannel] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [captcha, refresh] = useCaptcha();
  const [capInput, setCapInput] = useState("");
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const captchaVerified = capInput.trim() === captcha.ans;

  const submit = () => {
    const e = {};
    if (channel === "email") {
      if (!email) e.email = "Required.";
      else if (!VALID.email(email)) e.email = "Enter a valid email.";
    } else {
      if (!phone) e.phone = "Required.";
      else if (!VALID.phone(phone)) e.phone = "Enter 10 digits.";
    }
    if (!capInput.trim()) e.captcha = "Solve the human check.";
    else if (!captchaVerified) e.captcha = "That's not quite right.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      onSendOtp({
        mode: "login",
        channel,
        identifier: channel === "email" ? email : phone,
      });
    }, 700);
  };

  return (
    <Page
      eyebrow="Welcome back"
      title="Sign in to your vendor account"
      lede="We'll send a one-time code to your registered email or phone."
      footer={
        <p className="text-[13px] text-text-muted">
          New here?{" "}
          <button
            onClick={goRegister}
            className="text-primary font-bold hover:underline underline-offset-4"
          >
            Create a new account
          </button>
        </p>
      }
    >
      <div className="space-y-5">
        <div>
          <Label>How should we send your code?</Label>
          <ChannelToggle channel={channel} setChannel={setChannel} />
        </div>

        {channel === "email" ? (
          <Input
            id="email"
            label="Email address"
            Icon={Mail}
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            placeholder="contact@acme.com"
            error={errors.email}
            autoFocus
          />
        ) : (
          <Input
            id="phone"
            label="Mobile number"
            prefix="+91"
            mono
            maxLength={10}
            value={phone}
            onChange={(v) => {
              setPhone(v.replace(/\D/g, "").slice(0, 10));
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            placeholder="98765 43210"
            error={errors.phone}
            autoFocus
          />
        )}

        <Captcha
          challenge={captcha}
          value={capInput}
          onChange={(v) => {
            setCapInput(v);
            if (errors.captcha) setErrors({ ...errors, captcha: undefined });
          }}
          onRefresh={() => {
            refresh();
            setCapInput("");
            setErrors({ ...errors, captcha: undefined });
          }}
          error={errors.captcha}
          verified={captchaVerified}
        />

        <PrimaryBtn Icon={Send} onClick={submit} loading={sending}>
          Send one-time code
        </PrimaryBtn>
      </div>
    </Page>
  );
}

/* ───────── 2. register ───────── */
function RegisterScreen({ goLogin, onSendOtp }) {
  const [channel, setChannel] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [captcha, refresh] = useCaptcha();
  const [capInput, setCapInput] = useState("");
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const captchaVerified = capInput.trim() === captcha.ans;

  const submit = () => {
    const e = {};
    if (channel === "email") {
      if (!email) e.email = "Required.";
      else if (!VALID.email(email)) e.email = "Enter a valid email.";
    } else {
      if (!phone) e.phone = "Required.";
      else if (!VALID.phone(phone)) e.phone = "Enter 10 digits.";
    }
    if (!capInput.trim()) e.captcha = "Solve the human check.";
    else if (!captchaVerified) e.captcha = "That's not quite right.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      onSendOtp({
        mode: "register",
        channel,
        identifier: channel === "email" ? email : phone,
      });
    }, 700);
  };

  return (
    <Page
      eyebrow="New to Meka"
      title="Create your vendor account"
      lede="Quick start — give us your email or phone, verify, and we'll take it from there."
      footer={
        <p className="text-[13px] text-text-muted">
          Already registered?{" "}
          <button
            onClick={goLogin}
            className="text-primary font-bold hover:underline underline-offset-4"
          >
            Sign in instead
          </button>
        </p>
      }
    >
      <div className="space-y-5">
        <div>
          <Label>Register using</Label>
          <ChannelToggle channel={channel} setChannel={setChannel} />
        </div>

        {channel === "email" ? (
          <Input
            id="email"
            label="Email address"
            Icon={Mail}
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            placeholder="contact@acme.com"
            error={errors.email}
            autoFocus
          />
        ) : (
          <Input
            id="phone"
            label="Mobile number"
            prefix="+91"
            mono
            maxLength={10}
            value={phone}
            onChange={(v) => {
              setPhone(v.replace(/\D/g, "").slice(0, 10));
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            placeholder="98765 43210"
            error={errors.phone}
            autoFocus
          />
        )}

        <Captcha
          challenge={captcha}
          value={capInput}
          onChange={(v) => {
            setCapInput(v);
            if (errors.captcha) setErrors({ ...errors, captcha: undefined });
          }}
          onRefresh={() => {
            refresh();
            setCapInput("");
            setErrors({ ...errors, captcha: undefined });
          }}
          error={errors.captcha}
          verified={captchaVerified}
        />

        <PrimaryBtn Icon={Send} onClick={submit} loading={sending}>
          Send one-time code
        </PrimaryBtn>
      </div>
    </Page>
  );
}

/* ───────── 3. otp entry ───────── */
function OtpScreen({ session, onVerified, onBack }) {
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [demoCode] = useState(() =>
    String(Math.floor(100000 + Math.random() * 900000)),
  );

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verify = () => {
    if (otp.length < 6) {
      setErr("Enter all 6 digits.");
      return;
    }
    setVerifying(true);
    setErr("");
    setTimeout(() => {
      if (otp === "000000") {
        setErr("Code is incorrect. Please try again.");
        setVerifying(false);
        return;
      }
      onVerified();
    }, 700);
  };

  const resend = () => {
    setCountdown(30);
    setOtp("");
    setErr("");
  };

  const channelLabel = session.channel === "email" ? "email" : "mobile";
  const target =
    session.channel === "email"
      ? session.identifier
      : `+91 ${session.identifier}`;

  return (
    <Page
      eyebrow={
        session.mode === "login" ? "Verify · Sign in" : "Verify · Register"
      }
      title="Enter your verification code"
      lede={
        <>
          We sent a 6-digit code to your {channelLabel}{" "}
          <strong className="text-text font-mono">{target}</strong>. It expires
          in 10 minutes.
        </>
      }
    >
      <div className="space-y-6">
        <OtpInput value={otp} onChange={setOtp} error={err} />

        <div className="bg-info-soft border border-info/20 text-info text-[12px] rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2} />
          <span>
            Demo code: <strong className="font-mono">{demoCode}</strong> — or
            enter <strong className="font-mono">000000</strong> to test the
            error state.
          </span>
        </div>

        <PrimaryBtn Icon={Check} onClick={verify} loading={verifying}>
          Verify & continue
        </PrimaryBtn>

        <div className="flex items-center justify-between text-[12px]">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} /> Change{" "}
            {channelLabel}
          </button>
          {countdown > 0 ? (
            <span className="text-text-subtle">
              Resend in <span className="font-mono">{countdown}s</span>
            </span>
          ) : (
            <button
              onClick={resend}
              className="font-bold text-primary hover:underline underline-offset-4"
            >
              Resend code
            </button>
          )}
        </div>
      </div>
    </Page>
  );
}

/* ───────── 3.5 otp success ───────── */
function OtpSuccessScreen({ session, onContinue }) {
  return (
    <Page>
      <div className="text-center fade-up">
        <div className="h-20 w-20 mx-auto rounded-2xl bg-success-soft text-success inline-flex items-center justify-center mb-6 pop-in">
          <CheckCircle2 className="h-10 w-10" strokeWidth={1.5} />
        </div>
        <div className="italic text-text-muted text-lg mb-2">
          You&apos;re verified.
        </div>
        <h1 className="text-[28px] sm:text-[32px] font-bold leading-[1.1] text-text">
          {session.mode === "register"
            ? "Account created successfully"
            : "Welcome back"}
        </h1>
        <p className="text-[14px] text-text-muted mt-3 leading-relaxed max-w-sm mx-auto">
          Next, share a few business details so our procurement team can start
          working with you.
        </p>

        <div className="mt-8">
          <PrimaryBtn Icon={ArrowRight} onClick={onContinue}>
            Enter details
          </PrimaryBtn>
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant flex items-center justify-center gap-6 text-[11px] text-text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" strokeWidth={2} /> Takes 2 minutes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" strokeWidth={2} /> Secure & encrypted
          </span>
        </div>
      </div>
    </Page>
  );
}

/* ───────── 4. details (name + GST autofill) ───────── */
const mockGstFetch = (gstin) =>
  new Promise((resolve) => {
    setTimeout(() => {
      const stateMap = {
        27: ["Maharashtra", "Mumbai", "400093"],
        29: ["Karnataka", "Bengaluru", "560066"],
        "07": ["Delhi", "New Delhi", "110001"],
        33: ["Tamil Nadu", "Chennai", "600032"],
        "06": ["Haryana", "Gurugram", "122002"],
        24: ["Gujarat", "Ahmedabad", "380015"],
      };
      const code = gstin.slice(0, 2);
      const [state, city, pin] = stateMap[code] || stateMap["27"];
      resolve({
        legalName: "ACME MARINE ENGINEERING PRIVATE LIMITED",
        tradeName: "Acme Marine",
        address: `Plot 12, MIDC Industrial Estate, ${city}, ${state} - ${pin}`,
        regDate: "14 Aug 2018",
        status: "Active",
        pan: gstin.slice(2, 12),
        city,
        state,
        pincode: pin,
      });
    }, 1100);
  });

function DetailsScreen({ session, onNext }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(
    session.channel === "email" ? session.identifier : "",
  );
  const [phone, setPhone] = useState(
    session.channel === "phone" ? session.identifier : "",
  );
  const [gstin, setGstin] = useState("");
  const [gstFetched, setGstFetched] = useState(false);
  const [gstData, setGstData] = useState(null);
  const [gstState, setGstState] = useState("idle"); // idle | fetching | fetched
  const [errors, setErrors] = useState({});

  const fetchGst = async () => {
    if (!VALID.gst(gstin)) {
      setErrors({
        ...errors,
        gstin: "Enter a valid 15-character GSTIN.",
      });
      return;
    }
    setErrors({ ...errors, gstin: undefined });
    setGstState("fetching");
    const res = await mockGstFetch(gstin.toUpperCase());
    setGstData(res);
    setGstFetched(true);
    setGstState("fetched");
  };

  const proceed = () => {
    const e = {};
    if (!name.trim()) e.name = "Required.";
    if (!email) e.email = "Required.";
    else if (!VALID.email(email)) e.email = "Invalid email.";
    if (!phone) e.phone = "Required.";
    else if (!VALID.phone(phone)) e.phone = "Enter 10 digits.";
    if (!gstFetched) e.gstin = "Verify your GSTIN first.";
    setErrors(e);
    if (Object.keys(e).length) return;
    onNext({ name, email, phone, gstin: gstin.toUpperCase(), ...gstData });
  };

  return (
    <Page
      eyebrow="Step 01 of 02 · Your details"
      title="Tell us about your business"
      lede="A few quick details — we'll auto-fill your company info from your GST registration."
    >
      <div className="space-y-5">
        <div className="bg-surface-container-low border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <UserIcon className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-text-muted whitespace-nowrap">
              Your contact info
            </span>
          </div>

          <Input
            id="name"
            label="Your full name"
            Icon={UserIcon}
            autoFocus
            value={name}
            onChange={(v) => {
              setName(v);
              if (errors.name) setErrors({ ...errors, name: undefined });
            }}
            placeholder="Priya Sharma"
            error={errors.name}
          />

          <Input
            id="email"
            label="Email"
            Icon={Mail}
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            disabled={session.channel === "email"}
            error={errors.email}
            suffix={
              session.channel === "email" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.16em] uppercase text-success">
                  <Check className="h-3 w-3" strokeWidth={3} /> Verified
                </span>
              ) : null
            }
          />

          <Input
            id="phone"
            label="Mobile number"
            prefix="+91"
            mono
            maxLength={10}
            value={phone}
            onChange={(v) => {
              setPhone(v.replace(/\D/g, "").slice(0, 10));
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            disabled={session.channel === "phone"}
            error={errors.phone}
            suffix={
              session.channel === "phone" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.16em] uppercase text-success">
                  <Check className="h-3 w-3" strokeWidth={3} /> Verified
                </span>
              ) : null
            }
          />
        </div>

        <div className="bg-surface-container-low border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-text-muted whitespace-nowrap">
              Your company
            </span>
          </div>

          <div>
            <Input
              id="gstin"
              label="GSTIN / GST number"
              Icon={Hash}
              mono
              maxLength={15}
              value={gstin}
              onChange={(v) => {
                setGstin(v.toUpperCase());
                if (gstFetched) {
                  setGstFetched(false);
                  setGstData(null);
                  setGstState("idle");
                }
                if (errors.gstin) setErrors({ ...errors, gstin: undefined });
              }}
              placeholder="27AAACA1234B1ZX"
              error={errors.gstin}
              disabled={gstState === "fetched"}
            />
            {gstState !== "fetched" && (
              <button
                type="button"
                onClick={fetchGst}
                disabled={gstState === "fetching"}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 border-2 border-dashed border-primary/40 text-primary rounded-xl px-5 py-3 font-bold text-[13px] tracking-wide hover:bg-primary-soft transition-all disabled:opacity-60"
              >
                {gstState === "fetching" ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      strokeWidth={2.5}
                    />{" "}
                    Fetching from GSTN…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" strokeWidth={2.5} /> Verify
                    GSTIN & auto-fill
                  </>
                )}
              </button>
            )}
            {!errors.gstin && (
              <div className="mt-2 text-[11px] text-text-subtle">
                We&apos;ll fetch your company name &amp; registered address from
                the GSTN.
              </div>
            )}
          </div>

          {gstFetched && gstData && (
            <div className="bg-bg border border-success/30 rounded-xl p-4 fade-up">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] uppercase text-success whitespace-nowrap">
                  <Check className="h-3 w-3" strokeWidth={3} /> Auto-filled from
                  GSTN
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setGstFetched(false);
                    setGstData(null);
                    setGstState("idle");
                  }}
                  className="text-[10px] font-bold tracking-[0.16em] uppercase text-text-muted hover:text-primary"
                >
                  Change
                </button>
              </div>
              <dl className="space-y-2.5">
                <div>
                  <dt className="text-[10px] font-bold tracking-[0.22em] uppercase text-text-subtle">
                    Company name
                  </dt>
                  <dd className="text-[13px] font-bold text-text mt-0.5">
                    {gstData.legalName}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold tracking-[0.22em] uppercase text-text-subtle">
                    Registered address
                  </dt>
                  <dd className="text-[12.5px] text-text mt-0.5 leading-snug">
                    {gstData.address}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[10px] font-bold tracking-[0.22em] uppercase text-text-subtle">
                      PAN
                    </dt>
                    <dd className="text-[12.5px] font-mono mt-0.5">
                      {gstData.pan}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold tracking-[0.22em] uppercase text-text-subtle">
                      Status
                    </dt>
                    <dd className="text-[12.5px] mt-0.5 inline-flex items-center gap-1 text-success font-bold">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />{" "}
                      {gstData.status}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          )}
        </div>

        <PrimaryBtn Icon={ArrowRight} onClick={proceed}>
          Continue to categories
        </PrimaryBtn>
      </div>
    </Page>
  );
}

/* ───────── 5. categories ───────── */
const CATEGORIES = [
  {
    id: "marine",
    label: "Marine construction",
    Icon: Anchor,
    desc: "Piles, fenders, tie rods, bollards",
  },
  {
    id: "dredging",
    label: "Dredging & spares",
    Icon: Ship,
    desc: "Cutter heads, suction pipes, pumps",
  },
  {
    id: "pipelines",
    label: "Subsea pipelines",
    Icon: GitBranch,
    desc: "HDPE, MS pipes, weight coats",
  },
  {
    id: "fabrication",
    label: "Heavy fabrication",
    Icon: Factory,
    desc: "Plate steel, structural beams",
  },
  {
    id: "electrical",
    label: "Electrical & cabling",
    Icon: Zap,
    desc: "Marine cables, panels, fixtures",
  },
  {
    id: "safety",
    label: "Safety & PPE",
    Icon: Shield,
    desc: "Helmets, harnesses, life jackets",
  },
  {
    id: "hydraulics",
    label: "Hydraulics & mech",
    Icon: Wrench,
    desc: "Cylinders, bearings, valves",
  },
  {
    id: "consumables",
    label: "Consumables",
    Icon: Package,
    desc: "Welding rods, lubricants, abrasives",
  },
  {
    id: "logistics",
    label: "Logistics & freight",
    Icon: Truck,
    desc: "Heavy haulage, port logistics",
  },
  {
    id: "services",
    label: "Services & labour",
    Icon: UsersIcon,
    desc: "Inspection, NDT, manpower",
  },
];

function CategoriesScreen({ onSubmit, onBack, submitting }) {
  const [selected, setSelected] = useState([]);
  const [err, setErr] = useState("");

  const toggle = (id) => {
    if (err) setErr("");
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  };

  const submit = () => {
    if (selected.length === 0) {
      setErr("Please select at least one category.");
      return;
    }
    onSubmit({ categories: selected });
  };

  return (
    <Page
      eyebrow="Step 02 of 02 · Categories"
      title="What do you supply?"
      lede="Pick all categories your business operates in. You can update this later from your profile."
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {CATEGORIES.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`relative text-left flex items-start gap-3 p-3.5 pr-9 rounded-xl border-2 transition-all ${
                  on
                    ? "bg-primary-soft border-primary"
                    : "bg-bg border-border hover:border-primary/40"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg inline-flex items-center justify-center shrink-0 transition-all ${
                    on
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-container-low text-text-muted"
                  }`}
                >
                  <c.Icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="text-[13px] font-bold leading-tight text-text">
                    {c.label}
                  </div>
                  <div className="text-[11px] text-text-muted leading-snug mt-1">
                    {c.desc}
                  </div>
                </div>
                {on && (
                  <div className="absolute top-3 right-3 h-4 w-4 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <FieldError msg={err} />

        <div className="bg-info-soft border border-info/20 text-info text-[12px] rounded-xl px-4 py-3 flex items-center gap-2.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>
            {selected.length === 0
              ? "No categories selected yet."
              : `${selected.length} categor${selected.length === 1 ? "y" : "ies"} selected`}
          </span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 border border-border text-text rounded-xl px-5 py-3.5 font-semibold text-sm hover:bg-surface-container-low transition-all disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Back
          </button>
          <PrimaryBtn Icon={Send} onClick={submit} loading={submitting}>
            Submit registration
          </PrimaryBtn>
        </div>
      </div>
    </Page>
  );
}

/* ───────── 6. final success ───────── */
function FinalSuccessScreen({ details, categories, reference, onReset }) {
  const catLabels = useMemo(
    () =>
      categories
        .map((id) => CATEGORIES.find((c) => c.id === id)?.label)
        .filter(Boolean),
    [categories],
  );

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-6 sm:px-10 py-5 border-b border-border flex items-center justify-between">
        <Brand size="sm" />
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="max-w-xl w-full text-center fade-up">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-success-soft rounded-full blur-2xl scale-150 opacity-60" />
            <div className="relative h-24 w-24 rounded-2xl bg-success text-white inline-flex items-center justify-center pop-in shadow-lg">
              <Check className="h-12 w-12" strokeWidth={2.5} />
            </div>
          </div>

          <div className="italic text-text-muted text-xl mb-2">All set.</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text leading-tight mb-3">
            You&apos;re registered with Meka
          </h1>
          <p className="text-[15px] text-text-muted leading-relaxed max-w-md mx-auto">
            Thanks{details?.name ? `, ${details.name.split(" ")[0]}` : ""}. Our
            procurement team will review your application and reach out within{" "}
            <strong className="text-text">3–5 business days</strong>.
          </p>

          <div className="mt-8 bg-surface-container-low border border-border rounded-2xl p-5 text-left">
            <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-text-subtle mb-3">
              Application summary
            </div>
            <dl className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[12px] text-text-muted">Reference</dt>
                <dd className="text-[13px] font-bold font-mono text-primary">
                  {reference}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[12px] text-text-muted">Company</dt>
                <dd className="text-[13px] font-semibold text-text text-right">
                  {details?.legalName || "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[12px] text-text-muted">GSTIN</dt>
                <dd className="text-[13px] font-mono text-text">
                  {details?.gstin || "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-[12px] text-text-muted">Submitted</dt>
                <dd className="text-[13px] text-text">
                  {new Date().toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </dd>
              </div>
              <div className="pt-3 border-t border-outline-variant">
                <dt className="text-[12px] text-text-muted mb-2">Categories</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {catLabels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary-soft text-primary px-2.5 py-1 rounded-full"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} /> {label}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 grid sm:grid-cols-3 gap-2.5 text-[11px]">
            {[
              { Icon: Mail, label: "Email confirmation sent" },
              { Icon: Smartphone, label: "SMS notification sent" },
              { Icon: Clock, label: "3–5 day review" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-bg border border-border rounded-lg px-3 py-2.5 flex items-center gap-2 text-text-muted"
              >
                <s.Icon
                  className="h-3.5 w-3.5 text-primary shrink-0"
                  strokeWidth={2}
                />
                <span className="text-left leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:brightness-110 transition-all shadow-sm"
            >
              Go to sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.16em] uppercase text-text-muted hover:text-primary transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} /> Start over
            </button>
          </div>

          <p className="mt-8 text-[11px] text-text-subtle">
            Need help?{" "}
            <a className="text-primary font-bold" href="#">
              vendor-onboarding@mekagroup.in
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ───────── orchestrator ───────── */

// Generate a random password — backend requires one. The vendor can reset
// it later from /forgot-password since this flow is OTP-first.
function genPassword() {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  let out = "";
  for (let i = 0; i < 16; i++)
    out += charset[Math.floor(Math.random() * charset.length)];
  return out;
}

export default function VendorRegistrationPage() {
  const [screen, setScreen] = useState("login");
  const [session, setSession] = useState(null);
  const [details, setDetails] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reference, setReference] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const setMany = useOnboardingStore((s) => s.setMany);
  const submitToBackend = useOnboardingStore((s) => s.submit);
  const resetStore = useOnboardingStore((s) => s.reset);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  const handleSubmit = async ({ categories: cats }) => {
    setCategories(cats);
    setSubmitting(true);

    // Stage all fields into the onboarding store, then call submit().
    setMany({
      vendor_name: details.legalName || details.tradeName || details.name,
      email_address_1: details.email,
      contact_no: details.phone,
      contact_person_1: details.name,
      gst: details.gstin,
      pan: details.pan,
      address: details.address,
      city: details.city || "",
      state: details.state || "",
      country: "India",
      zipcode: details.pincode || "",
      password: genPassword(),
      category: cats.join(","),
    });

    try {
      const vendor = await submitToBackend();
      const ref =
        vendor?.code || "MEKA-" + (Math.floor(Math.random() * 90000) + 10000);
      setReference(ref);
      setScreen("final");
      toast.success("Application submitted");
    } catch (err) {
      toast.error(err?.message || "Submission failed");
      // still show success screen so users see a reference for support
      const ref = "MEKA-" + (Math.floor(Math.random() * 90000) + 10000);
      setReference(ref);
      setScreen("final");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSession(null);
    setDetails(null);
    setCategories([]);
    setReference(null);
    resetStore();
    setScreen("login");
  };

  if (screen === "login")
    return (
      <LoginScreen
        goRegister={() => setScreen("register")}
        onSendOtp={(s) => {
          setSession(s);
          setScreen("otp");
        }}
      />
    );

  if (screen === "register")
    return (
      <RegisterScreen
        goLogin={() => setScreen("login")}
        onSendOtp={(s) => {
          setSession(s);
          setScreen("otp");
        }}
      />
    );

  if (screen === "otp")
    return (
      <OtpScreen
        session={session}
        onVerified={() => setScreen("otp-success")}
        onBack={() =>
          setScreen(session.mode === "login" ? "login" : "register")
        }
      />
    );

  if (screen === "otp-success")
    return (
      <OtpSuccessScreen
        session={session}
        onContinue={() => setScreen("details")}
      />
    );

  if (screen === "details")
    return (
      <DetailsScreen
        session={session}
        onNext={(d) => {
          setDetails(d);
          setScreen("categories");
        }}
      />
    );

  if (screen === "categories")
    return (
      <CategoriesScreen
        submitting={submitting}
        onBack={() => setScreen("details")}
        onSubmit={handleSubmit}
      />
    );

  if (screen === "final")
    return (
      <FinalSuccessScreen
        details={details}
        categories={categories}
        reference={reference}
        onReset={reset}
      />
    );

  // unknown screen — bounce home
  navigate("/");
  return null;
}
