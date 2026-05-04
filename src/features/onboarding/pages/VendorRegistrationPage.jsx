import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  Briefcase,
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  Factory,
  FileText,
  GitBranch,
  Hash,
  Info,
  Landmark,
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
  UserPlus,
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
    <aside className="hidden lg:flex relative flex-col p-12 xl:p-14 overflow-hidden bg-surface-container-low border-r border-border text-text">
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, var(--brand-primary), transparent 55%), radial-gradient(circle at 85% 80%, var(--brand-primary), transparent 55%)",
        }}
      />

      <div className="relative">
        <Brand />
      </div>

      <div className="relative flex-1 flex flex-col justify-center max-w-sm">
        <div className="text-[10px] font-bold tracking-[0.32em] uppercase text-primary mb-4">
          Vendor Portal
        </div>
        <h1 className="text-[34px] xl:text-[40px] font-bold leading-[1.05] tracking-tight text-text">
          Built on tide<br />&amp; steel.
        </h1>
        <p className="italic text-text-muted text-lg mt-5 leading-snug">
          Become a Meka Group vendor.
        </p>
        <p className="text-[14px] text-text-muted mt-6 leading-relaxed">
          Forty-five years of marine, dredging and infrastructure work.
          Join the network that builds India&apos;s coastline.
        </p>

        <div className="mt-10 space-y-3">
          {[
            "Verify in minutes — email or phone OTP",
            "Tell us about your business at your own pace",
            "Start receiving RFQs once approved",
          ].map((line, idx) => (
            <div key={idx} className="flex items-start gap-3 text-[13px] text-text-muted">
              <span className="mt-[2px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {idx + 1}
              </span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative pt-6 border-t border-outline-variant/60 flex items-center justify-between text-[11px] text-text-subtle">
        <span className="tracking-[0.24em] uppercase font-semibold">Meka Group</span>
        <span>procurement@meka.in</span>
      </div>
    </aside>
  );
}

function Page({ children, eyebrow, title, lede, footer }) {
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden grid lg:grid-cols-[440px_1fr] bg-bg">
      <SidePanel />
      <main className="flex items-center justify-center px-5 sm:px-8 py-8 sm:py-10 lg:py-8 lg:overflow-y-auto">
        <div className="w-full max-w-md fade-up">
          <div className="lg:hidden mb-6 flex items-center justify-between">
            <Brand size="sm" />
            <ThemeToggle />
          </div>
          {eyebrow && (
            <div className="text-[10px] font-bold tracking-[0.28em] uppercase text-primary mb-2">
              {eyebrow}
            </div>
          )}
          {title && (
            <h1 className="text-[26px] sm:text-[30px] font-bold leading-[1.1] text-text">
              {title}
            </h1>
          )}
          {lede && (
            <p className="text-[13px] text-text-muted mt-2 leading-relaxed">
              {lede}
            </p>
          )}
          <div className="mt-6">{children}</div>
          {footer && (
            <div className="mt-6 pt-5 border-t border-outline-variant text-center">
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

/* gstincheck.co.in — verify a GSTIN against the live GSTN registry.
   Endpoint: GET https://sheet.gstincheck.co.in/check/{API_KEY}/{GSTIN}
   Response shape on success:
     { flag: true, message, data: { lgnm, tradeNam, gstin, rgdt, sts, ctb,
       pradr: { adr, addr: { loc, pncd, stcd, dst, st, bnm, ... } }, ... } }
   On failure:
     { flag: false, message, errorCode, data: {} }
   The API allows CORS (Access-Control-Allow-Origin: *) so we can call it
   directly from the browser. The key is exposed in the bundle — for
   production, proxy this through the Laravel backend.

   Falls back to a mock response when the API errors out so the demo flow
   keeps working offline. */
const GSTINCHECK_API_KEY = "3c5e6006ab69f09f6a9ae97fc9330dd7";

function mockGstResult(gstin) {
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
  return {
    legalName: "ACME MARINE ENGINEERING PRIVATE LIMITED",
    tradeName: "Acme Marine",
    address: `Plot 12, MIDC Industrial Estate, ${city}, ${state} - ${pin}`,
    regDate: "14 Aug 2018",
    status: "Active",
    pan: gstin.slice(2, 12),
    city,
    state,
    pincode: pin,
    constitution: null,
    natureOfBusiness: null,
    isMock: true,
  };
}

async function fetchGstinFromApi(gstin) {
  const url = `https://sheet.gstincheck.co.in/check/${GSTINCHECK_API_KEY}/${encodeURIComponent(
    gstin,
  )}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`GSTIN lookup failed (HTTP ${res.status})`);
  }
  const json = await res.json();
  if (!json.flag) {
    const e = new Error(json.message || "GSTIN not found");
    e.errorCode = json.errorCode;
    throw e;
  }
  const d = json.data || {};
  const addr = d.pradr?.addr ?? {};
  // Format the registration date "DD/MM/YYYY" → "DD Mon YYYY".
  const regDate = (() => {
    if (!d.rgdt) return null;
    const [dd, mm, yyyy] = d.rgdt.split("/");
    if (!dd || !mm || !yyyy) return d.rgdt;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${dd} ${months[parseInt(mm, 10) - 1] ?? mm} ${yyyy}`;
  })();
  return {
    legalName: d.lgnm || "",
    tradeName: d.tradeNam || d.lgnm || "",
    address: d.pradr?.adr || "",
    regDate,
    status: d.sts || "",
    pan: (d.gstin || gstin).slice(2, 12),
    city: addr.loc || addr.dst || addr.city || "",
    state: addr.stcd || "",
    pincode: addr.pncd || "",
    constitution: d.ctb || null,
    natureOfBusiness: Array.isArray(d.nba)
      ? d.nba.join(", ")
      : d.nba || null,
    raw: d,
  };
}

async function mockGstFetch(gstin) {
  try {
    return await fetchGstinFromApi(gstin);
  } catch (err) {
    // Re-throw "not found" so the UI can show the proper error. Fall back
    // to mock only on network/CORS errors.
    if (err.errorCode === "GSTNUMBER_NOT_FOUND") throw err;
    if (err.message?.includes("Failed to fetch") || err.name === "TypeError") {
      return mockGstResult(gstin);
    }
    throw err;
  }
}

function DetailsScreen({ session, onNext, submitting = false }) {
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
    try {
      const res = await mockGstFetch(gstin.toUpperCase());
      setGstData(res);
      setGstFetched(true);
      setGstState("fetched");
    } catch (err) {
      setGstState("idle");
      setErrors({
        ...errors,
        gstin:
          err?.errorCode === "GSTNUMBER_NOT_FOUND"
            ? "This GSTIN was not found in the GSTN registry."
            : err?.message || "Could not verify GSTIN. Try again.",
      });
    }
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
                    {(() => {
                      const ok = gstData.status?.toLowerCase() === "active";
                      const Icon = ok ? CheckCircle2 : AlertCircle;
                      return (
                        <dd
                          className={`text-[12.5px] mt-0.5 inline-flex items-center gap-1 font-bold ${
                            ok ? "text-success" : "text-danger"
                          }`}
                        >
                          <Icon className="h-3 w-3" strokeWidth={2.5} />{" "}
                          {gstData.status || "—"}
                        </dd>
                      );
                    })()}
                  </div>
                </div>
                {gstData.constitution && (
                  <div>
                    <dt className="text-[10px] font-bold tracking-[0.22em] uppercase text-text-subtle">
                      Constitution
                    </dt>
                    <dd className="text-[12.5px] text-text mt-0.5">
                      {gstData.constitution}
                    </dd>
                  </div>
                )}
                {gstData.regDate && (
                  <div>
                    <dt className="text-[10px] font-bold tracking-[0.22em] uppercase text-text-subtle">
                      Registered on
                    </dt>
                    <dd className="text-[12.5px] text-text mt-0.5">
                      {gstData.regDate}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        <PrimaryBtn
          Icon={ArrowRight}
          onClick={proceed}
          loading={submitting}
        >
          Create my account
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

/* ─────────────────────────────────────────────
   SCREEN 5.5 — Welcome / Setup wizard
   Five step cards mirroring the Reliance SupplierFirst layout. Each card
   carries a "Pending" badge, an icon, a title, and a one-line description.
   "Get Started" walks the user through the steps; "Skip for now" sends
   them to the sign-in page so they can finish later from their portal.
   ───────────────────────────────────────────── */
const SETUP_STEPS = [
  {
    id: "company",
    Icon: Building2,
    title: "Company Details",
    desc: "Update your company information, logo and product/service offerings",
  },
  {
    id: "category",
    Icon: Briefcase,
    title: "Category & Business",
    desc: "Select nature of business",
  },
  {
    id: "contact",
    Icon: UserPlus,
    title: "Contact Details",
    desc: "Add owner details and import your employee data",
  },
  {
    id: "account",
    Icon: Landmark,
    title: "Account Details",
    desc: "Add account details",
  },
  {
    id: "document",
    Icon: FileText,
    title: "Document",
    desc: "Add and upload your verification documents in the portal",
  },
];

function WelcomeSetupScreen({ details, onSkip, onContinue, completed = {} }) {
  const firstName = details?.name ? details.name.split(" ")[0] : null;
  const doneCount = SETUP_STEPS.filter((s) => completed[s.id]).length;
  const firstPending =
    SETUP_STEPS.find((s) => !completed[s.id])?.id ?? SETUP_STEPS[0].id;

  return (
    <div className="h-screen bg-bg flex flex-col overflow-hidden">
      <header className="px-6 sm:px-10 h-14 border-b border-border flex items-center justify-between shrink-0">
        <Brand size="sm" />
        <ThemeToggle />
      </header>

      {/* Header band — title left, progress right */}
      <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-border shrink-0">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-primary mb-1.5">
              Supplier Setup
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-black text-text leading-tight tracking-tight">
              Welcome{firstName ? `, ${firstName}.` : "."}
            </h1>
            <p className="text-text-muted text-[13px] sm:text-[14px] mt-1">
              Five steps to a complete supplier profile.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted tabular-nums">
              {doneCount} of {SETUP_STEPS.length} complete
            </div>
            <div className="w-40 h-1.5 bg-surface-container rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{
                  width: `${(doneCount / SETUP_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step cards — flex-1 so they fill remaining vertical space */}
      <div className="flex-1 px-6 sm:px-10 py-6 sm:py-8 overflow-auto">
        <div className="h-full grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-stretch gap-3 lg:gap-3 fade-up">
          {SETUP_STEPS.map((step, i) => {
            const isDone = completed[step.id];
            return (
              <Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => onContinue(step.id)}
                  className={`group lg:flex-1 flex flex-row lg:flex-col items-center justify-center text-left lg:text-center gap-3 lg:gap-4 rounded-2xl border-2 px-5 py-4 lg:py-8 transition-all relative min-h-[110px] lg:min-h-0 ${
                    isDone
                      ? "border-success/40 bg-success-soft/20 hover:border-success/60"
                      : "border-dashed border-outline-variant hover:border-primary/60 hover:bg-primary-soft/30 hover:scale-[1.01]"
                  }`}
                >
                  <div
                    className={`w-12 h-12 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                      isDone
                        ? "bg-success-soft text-success"
                        : "bg-primary-soft text-primary group-hover:scale-105 transition-transform"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-6 w-6 lg:h-7 lg:w-7" strokeWidth={2.5} />
                    ) : (
                      <step.Icon
                        className="h-6 w-6 lg:h-8 lg:w-8"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 lg:flex-initial">
                    <div className="text-[14px] lg:text-[15px] font-bold text-text leading-tight">
                      {step.title}
                    </div>
                    <div className="text-[12px] text-text-muted leading-snug mt-1 line-clamp-2 lg:line-clamp-none">
                      {step.desc}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider lg:absolute lg:top-3 lg:right-3 ${
                      isDone
                        ? "bg-success text-white"
                        : "bg-surface-container text-text-muted"
                    }`}
                  >
                    {isDone ? "Done" : "Pending"}
                  </span>
                </button>

                {i < SETUP_STEPS.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center text-text-subtle">
                    <ArrowRight className="h-5 w-5" strokeWidth={2} />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Footer band */}
      <div className="px-6 sm:px-10 py-4 border-t border-border flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] font-semibold text-text-muted hover:text-text transition-colors underline-offset-4 hover:underline"
        >
          Skip — go to dashboard
        </button>
        <button
          type="button"
          onClick={() => onContinue(firstPending)}
          className="group inline-flex items-center gap-2.5 bg-primary hover:brightness-110 text-primary-foreground rounded-full px-7 py-3 font-bold text-[13px] transition-all shadow-sm"
        >
          {doneCount === 0 ? "Get Started" : "Continue Setup"}
          <ArrowRight
            className="h-4 w-4 group-hover:translate-x-1 transition-transform"
            strokeWidth={2.5}
          />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCREEN 5.6 — Setup form sub-pages
   Five forms (Company / Business / Contact / Account / Document) reached
   from the welcome wizard. Each saves to local state (`setupData`) so the
   user can move between them without losing input. The final submit
   would push these into the vendor profile API once they sign in.
   ───────────────────────────────────────────── */

const COMPANY_TYPES = [
  "Private Limited",
  "Public Limited",
  "LLP",
  "Partnership",
  "Proprietorship",
  "OPC (One Person Company)",
  "Trust / Society",
  "Other",
];

const NATURE_OF_BUSINESS = [
  "Manufacturer",
  "Distributor",
  "Trader",
  "Service Provider",
  "OEM",
  "Reseller",
  "Importer",
  "Exporter",
];

const ACCOUNT_TYPES = ["Savings", "Current", "Cash Credit", "Overdraft"];

const DOCUMENT_TYPES = [
  {
    id: "pan",
    label: "PAN Card",
    desc: "Company PAN — issued by Income Tax Dept",
    required: true,
  },
  {
    id: "gst",
    label: "GST Registration Certificate",
    desc: "Form REG-06 from the GSTN portal",
    required: true,
  },
  {
    id: "cheque",
    label: "Cancelled Cheque",
    desc: "Bank-stamped cancelled cheque leaf for the account above",
    required: true,
  },
  {
    id: "address",
    label: "Address Proof",
    desc: "Recent utility bill / lease / property tax receipt",
    required: true,
  },
  {
    id: "incorporation",
    label: "Incorporation Certificate",
    desc: "MoA / AoA / partnership deed / proprietorship registration",
    required: false,
  },
  {
    id: "msme",
    label: "MSME / Udyam Certificate",
    desc: "Optional — only if registered as MSME",
    required: false,
  },
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/* Shell used by every setup sub-form. Layout:
   ┌──────────────────────────────────────────────┐
   │  Top bar: brand + step counter + theme       │
   ├──────────────┬───────────────────────────────┤
   │  Side rail:  │  Form body                    │
   │  - Big "01"  │  ┌──────────────────────┐    │
   │  - Step list │  │ Section heading       │    │
   │    (clicks   │  │ Field, field          │    │
   │    jump)     │  └──────────────────────┘    │
   │              │                                │
   ├──────────────┴───────────────────────────────┤
   │  Sticky footer: Skip ··· Save & Continue →  │
   └──────────────────────────────────────────────┘  */
function SetupShell({
  stepIndex,
  totalSteps,
  title,
  subtitle,
  Icon,
  children,
  onBack,
  onSkip,
  onSave,
  saveLabel = "Save & Continue",
  saving = false,
  navItems,
  currentId,
  onJump,
}) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar — translucent so body gradient bleeds through */}
      <header className="px-6 sm:px-10 h-14 border-b border-border flex items-center justify-between shrink-0 bg-bg/70 backdrop-blur-xl">
        <Brand size="sm" />
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All steps
          </button>
          <span className="hidden sm:block w-px h-4 bg-border" />
          <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted tabular-nums">
            {String(stepIndex).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Body — single column, max-width container, white card holds the form */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-7 sm:py-9 fade-up">
        <div className="max-w-[1100px] mx-auto">
          {/* Page header — eyebrow + bold title + subtitle (matches PR / Quotations) */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-text-muted">
                <Icon className="h-3 w-3" strokeWidth={2} />
                <span className="text-[10px] font-semibold tracking-[0.22em] uppercase">
                  Supplier Setup · Step {String(stepIndex).padStart(2, "0")} of {String(totalSteps).padStart(2, "0")}
                </span>
              </div>
              <h1 className="text-[24px] sm:text-[30px] font-bold text-text leading-tight tracking-tight mt-1.5 flex items-baseline gap-3">
                <span className="text-primary tabular-nums">
                  {String(stepIndex).padStart(2, "0")}
                </span>
                <span>{title}</span>
              </h1>
              {subtitle && (
                <p className="text-text-muted text-[13px] sm:text-[14px] mt-1.5 leading-relaxed max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Horizontal step rail — Stripe / Linear style, sits between header and card */}
          {navItems && (
            <nav
              className="mb-6 sm:mb-7 flex items-center gap-0 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              aria-label="Setup steps"
            >
              {navItems.map((item, i) => {
                const num = String(i + 1).padStart(2, "0");
                const active = item.id === currentId;
                const done = item.done;
                const isLast = i === navItems.length - 1;
                return (
                  <Fragment key={item.id}>
                    <button
                      type="button"
                      onClick={() => onJump?.(item.id)}
                      className={`group flex items-center gap-2.5 px-3 py-2 rounded-full transition-colors shrink-0 ${
                        active
                          ? "bg-primary-soft text-primary"
                          : done
                            ? "text-success hover:bg-success-soft"
                            : "text-text-muted hover:bg-surface-container-low/60 hover:text-text"
                      }`}
                    >
                      {/* Numbered dot */}
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black tabular-nums transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : done
                              ? "bg-success text-white"
                              : "border border-border text-text-subtle group-hover:border-text-muted group-hover:text-text-muted"
                        }`}
                      >
                        {done ? (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        ) : (
                          num
                        )}
                      </span>
                      <span
                        className={`text-[12px] font-semibold whitespace-nowrap ${
                          active ? "text-primary" : ""
                        }`}
                      >
                        {item.title}
                      </span>
                    </button>
                    {!isLast && (
                      <span className="w-6 sm:w-8 h-px bg-border mx-0.5 shrink-0" />
                    )}
                  </Fragment>
                );
              })}
            </nav>
          )}

          {/* The form — single white card with hairline border + soft shadow */}
          <div className="bg-surface border border-border rounded-2xl shadow-sm p-5 sm:p-8">
            {children}
          </div>

          {/* Helper note under the card */}
          <p className="mt-4 text-[11.5px] text-text-subtle text-center">
            Your progress is saved automatically. You can finish setup any time
            from your vendor profile.
          </p>
        </div>
      </main>

      {/* Sticky footer — translucent, frosted, Skip text-link + red CTA */}
      <div className="px-4 sm:px-6 py-3.5 border-t border-border bg-bg/70 backdrop-blur-xl shrink-0">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-[13px] font-semibold text-text-muted hover:text-text transition-colors underline-offset-4 hover:underline"
          >
            Skip this step
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="group inline-flex items-center gap-2 bg-primary hover:brightness-110 text-primary-foreground rounded-full px-6 py-2.5 font-bold text-[13px] transition-all shadow-sm hover:shadow-md disabled:opacity-60 whitespace-nowrap"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveLabel}
            {!saving && (
              <ArrowRight
                className="h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                strokeWidth={2.5}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Reusable field row — uses 2-col grid by default; cols=1 forces full-width. */
function FormRow({ children, cols = 2 }) {
  return (
    <div
      className={`grid grid-cols-1 ${cols === 2 ? "md:grid-cols-2" : ""} gap-4`}
    >
      {children}
    </div>
  );
}

/* Field-group section — section heading + hint above, fields below.
   Numbered with a tiny tracked marker so each group reads as a chapter. */
function FieldGroup({ title, hint, index, children }) {
  return (
    <section className="mb-7 last:mb-0">
      <header className="mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          {typeof index === "number" && (
            <span className="text-[10px] font-black tabular-nums text-primary tracking-widest">
              {String(index).padStart(2, "0")}
            </span>
          )}
          <h3 className="text-[15px] font-bold text-text">{title}</h3>
        </div>
        {hint && (
          <p className="text-[12px] text-text-muted leading-relaxed mt-1">
            {hint}
          </p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* Compact select — same styling as Input but for native selects */
function FormSelect({ label, value, onChange, options, placeholder = "— select —" }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg rounded-xl px-3.5 py-2.5 text-sm text-text border border-border focus:border-primary/60 focus:ring-2 focus:ring-primary/15 outline-none transition-colors"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* Compact textarea */
function FormTextarea({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <div>
      <Label>{label}</Label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-bg rounded-xl px-3.5 py-2.5 text-sm text-text border border-border focus:border-primary/60 focus:ring-2 focus:ring-primary/15 outline-none transition-colors placeholder:text-text-subtle resize-none"
      />
    </div>
  );
}

/* ── Setup 1: Company Details ── */
function CompanyDetailsForm({ data, setData, onBack, onSkip, onSave, navItems, currentId, onJump }) {
  return (
    <SetupShell
      stepIndex={1}
      totalSteps={5}
      Icon={Building2}
      title="Company Details"
      subtitle="Most fields are pre-filled from your GSTIN. Update anything that needs correcting."
      onBack={onBack}
      onSkip={onSkip}
      onSave={onSave}
      navItems={navItems}
      currentId={currentId}
      onJump={onJump}
    >
      <FieldGroup
        index={1}
        title="Identity"
        hint="The legal name on file with the GSTN, plus the trade / brand name your customers know you by."
      >
        <FormRow>
          <Input
            label="Legal company name"
            value={data.legalName ?? ""}
            onChange={(v) => setData({ ...data, legalName: v })}
            placeholder="Acme Marine Engineering Pvt Ltd"
          />
          <Input
            label="Trade / brand name"
            value={data.tradeName ?? ""}
            onChange={(v) => setData({ ...data, tradeName: v })}
            placeholder="Acme Marine"
          />
        </FormRow>
      </FieldGroup>

      <FieldGroup
        index={2}
        title="Profile"
        hint="Helps the procurement team understand your scale and structure."
      >
        <FormRow>
          <FormSelect
            label="Company type"
            value={data.companyType}
            onChange={(v) => setData({ ...data, companyType: v })}
            options={COMPANY_TYPES}
          />
          <Input
            label="Year of incorporation"
            value={data.incorporationYear ?? ""}
            onChange={(v) =>
              setData({
                ...data,
                incorporationYear: v.replace(/\D/g, "").slice(0, 4),
              })
            }
            mono
            maxLength={4}
            placeholder="2018"
          />
        </FormRow>
        <FormRow>
          <Input
            label="Website"
            value={data.website ?? ""}
            onChange={(v) => setData({ ...data, website: v })}
            placeholder="https://acme-marine.in"
            type="url"
          />
          <Input
            label="Number of employees"
            value={data.employees ?? ""}
            onChange={(v) =>
              setData({ ...data, employees: v.replace(/\D/g, "") })
            }
            mono
            placeholder="120"
          />
        </FormRow>
      </FieldGroup>

      <FieldGroup
        index={3}
        title="About"
        hint="A one-liner that helps buyers spot you in a list of vendors."
      >
        <FormTextarea
          label="What does your business do?"
          value={data.description}
          onChange={(v) => setData({ ...data, description: v })}
          placeholder="Key products / services / specialisations"
          rows={3}
        />
      </FieldGroup>
    </SetupShell>
  );
}

/* ── Setup 2: Category & Business ── */
function CategoryBusinessForm({ data, setData, onBack, onSkip, onSave, navItems, currentId, onJump }) {
  return (
    <SetupShell
      stepIndex={2}
      totalSteps={5}
      Icon={Briefcase}
      title="Category & Business"
      subtitle="What kind of business you run, and what you supply."
      onBack={onBack}
      onSkip={onSkip}
      onSave={onSave}
      navItems={navItems}
      currentId={currentId}
      onJump={onJump}
    >
      <FieldGroup
        index={1}
        title="Business model"
        hint="Tells buyers whether you make, distribute, trade, or service."
      >
        <FormRow>
          <FormSelect
            label="Nature of business"
            value={data.natureOfBusiness}
            onChange={(v) => setData({ ...data, natureOfBusiness: v })}
            options={NATURE_OF_BUSINESS}
          />
          <FormSelect
            label="MSME / Udyam status"
            value={data.msmeStatus}
            onChange={(v) => setData({ ...data, msmeStatus: v })}
            options={["Not registered", "Micro", "Small", "Medium"]}
          />
        </FormRow>
      </FieldGroup>

      <FieldGroup
        index={2}
        title="Scale"
        hint="Used internally to tier vendors by capacity and tenure."
      >
        <FormRow>
          <Input
            label="Years in business"
            value={data.yearsInBusiness ?? ""}
            onChange={(v) =>
              setData({ ...data, yearsInBusiness: v.replace(/\D/g, "") })
            }
            mono
            placeholder="6"
          />
          <Input
            label="Annual turnover (₹)"
            value={data.turnover ?? ""}
            onChange={(v) =>
              setData({ ...data, turnover: v.replace(/\D/g, "") })
            }
            mono
            placeholder="50000000"
          />
        </FormRow>
      </FieldGroup>

      <FieldGroup
        index={3}
        title="What you supply"
        hint="Be specific — the procurement team uses this to match you to RFQs."
      >
        <FormTextarea
          label="Products / services"
          value={data.productsServices}
          onChange={(v) => setData({ ...data, productsServices: v })}
          placeholder="e.g. Fender systems, mooring bollards, cutter heads, weight-coated HDPE pipes…"
          rows={3}
        />
      </FieldGroup>
    </SetupShell>
  );
}

/* ── Setup 3: Contact Details ── */
function ContactDetailsForm({ data, setData, onBack, onSkip, onSave, navItems, currentId, onJump }) {
  const c = data.primaryContact ?? {};
  const setC = (patch) =>
    setData({ ...data, primaryContact: { ...c, ...patch } });

  return (
    <SetupShell
      stepIndex={3}
      totalSteps={5}
      Icon={UserPlus}
      title="Contact Details"
      subtitle="The owner or authorised signatory who can speak for the business."
      onBack={onBack}
      onSkip={onSkip}
      onSave={onSave}
      navItems={navItems}
      currentId={currentId}
      onJump={onJump}
    >
      <FieldGroup
        index={1}
        title="Primary contact"
        hint="The person we'll route POs, RFQs, and approvals to."
      >
        <FormRow>
          <Input
            label="Full name"
            value={c.name ?? ""}
            onChange={(v) => setC({ name: v })}
            placeholder="Priya Sharma"
          />
          <Input
            label="Designation"
            value={c.designation ?? ""}
            onChange={(v) => setC({ designation: v })}
            placeholder="Managing Director"
          />
        </FormRow>
        <FormRow>
          <Input
            label="Work email"
            type="email"
            value={c.email ?? ""}
            onChange={(v) => setC({ email: v })}
            placeholder="priya@acme-marine.in"
          />
          <Input
            label="Mobile"
            prefix="+91"
            mono
            maxLength={10}
            value={c.phone ?? ""}
            onChange={(v) => setC({ phone: v.replace(/\D/g, "").slice(0, 10) })}
            placeholder="98765 43210"
          />
        </FormRow>
      </FieldGroup>

      <FieldGroup
        index={2}
        title="Office address"
        hint="Where you operate from. Used on POs and shipping labels."
      >
        <FormTextarea
          label="Street, building, area"
          value={c.address}
          onChange={(v) => setC({ address: v })}
          placeholder="Plot 12, MIDC Industrial Estate, Andheri East"
          rows={2}
        />
        <FormRow>
          <Input
            label="City"
            value={c.city ?? ""}
            onChange={(v) => setC({ city: v })}
            placeholder="Mumbai"
          />
          <FormSelect
            label="State"
            value={c.state}
            onChange={(v) => setC({ state: v })}
            options={INDIAN_STATES}
          />
        </FormRow>
      </FieldGroup>
    </SetupShell>
  );
}

/* ── Setup 4: Account / Banking ── */
function AccountDetailsForm({ data, setData, onBack, onSkip, onSave, navItems, currentId, onJump }) {
  const b = data.bank ?? {};
  const setB = (patch) => setData({ ...data, bank: { ...b, ...patch } });
  const accountMatch =
    !b.accountNumber ||
    !b.confirmAccountNumber ||
    b.accountNumber === b.confirmAccountNumber;

  return (
    <SetupShell
      stepIndex={4}
      totalSteps={5}
      Icon={Landmark}
      title="Account Details"
      subtitle="Where to send payments. We'll verify against your cancelled cheque in the next step."
      onBack={onBack}
      onSkip={onSkip}
      onSave={onSave}
      navItems={navItems}
      currentId={currentId}
      onJump={onJump}
    >
      <FieldGroup
        index={1}
        title="Beneficiary"
        hint="Use the exact name printed on the bank account (no abbreviations)."
      >
        <FormRow>
          <Input
            label="Beneficiary name"
            value={b.beneficiary ?? ""}
            onChange={(v) => setB({ beneficiary: v })}
            placeholder="ACME MARINE ENG PVT LTD"
          />
          <Input
            label="Bank name"
            value={b.bankName ?? ""}
            onChange={(v) => setB({ bankName: v })}
            placeholder="HDFC Bank"
          />
        </FormRow>
      </FieldGroup>

      <FieldGroup
        index={2}
        title="Account"
        hint="Re-enter the account number to catch typos. Used for every payout."
      >
        <FormRow>
          <Input
            label="Account number"
            value={b.accountNumber ?? ""}
            onChange={(v) =>
              setB({ accountNumber: v.replace(/\D/g, "").slice(0, 18) })
            }
            mono
            maxLength={18}
            placeholder="0123456789012345"
          />
          <Input
            label="Re-enter account number"
            value={b.confirmAccountNumber ?? ""}
            onChange={(v) =>
              setB({
                confirmAccountNumber: v.replace(/\D/g, "").slice(0, 18),
              })
            }
            mono
            maxLength={18}
            error={accountMatch ? null : "Account numbers don't match"}
            placeholder="0123456789012345"
          />
        </FormRow>
        <FormRow>
          <Input
            label="IFSC code"
            value={b.ifsc ?? ""}
            onChange={(v) => setB({ ifsc: v.toUpperCase().slice(0, 11) })}
            mono
            maxLength={11}
            placeholder="HDFC0001234"
          />
          <FormSelect
            label="Account type"
            value={b.accountType}
            onChange={(v) => setB({ accountType: v })}
            options={ACCOUNT_TYPES}
          />
        </FormRow>
      </FieldGroup>
    </SetupShell>
  );
}

/* ── Setup 5: Document upload — 2-col grid of compact tiles. ── */
function DocumentForm({ data, setData, onBack, onSkip, onSave, saving, navItems, currentId, onJump }) {
  const docs = data.documents ?? {};
  const setDoc = (id, file) =>
    setData({ ...data, documents: { ...docs, [id]: file } });
  const removeDoc = (id) => {
    const next = { ...docs };
    delete next[id];
    setData({ ...data, documents: next });
  };
  const requiredDone = DOCUMENT_TYPES.filter(
    (d) => d.required && docs[d.id],
  ).length;
  const requiredTotal = DOCUMENT_TYPES.filter((d) => d.required).length;

  return (
    <SetupShell
      stepIndex={5}
      totalSteps={5}
      Icon={FileText}
      title="Documents"
      subtitle={`Upload your verification documents — PDF / JPG / PNG, max 10 MB each.  ${requiredDone}/${requiredTotal} required uploaded.`}
      onBack={onBack}
      onSkip={onSkip}
      onSave={onSave}
      navItems={navItems}
      currentId={currentId}
      onJump={onJump}
      saveLabel="Finish setup"
      saving={saving}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DOCUMENT_TYPES.map((doc) => {
          const file = docs[doc.id];
          const uploaded = Boolean(file);
          return (
            <div
              key={doc.id}
              className={`relative p-3 rounded-xl border transition-colors ${
                uploaded
                  ? "border-success/40 bg-success-soft/30"
                  : "border-dashed border-border hover:border-primary/40 bg-surface-container-low/30"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    uploaded
                      ? "bg-success-soft text-success"
                      : "bg-primary-soft text-primary"
                  }`}
                >
                  {uploaded ? (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-text truncate">
                      {doc.label}
                    </span>
                    {doc.required && (
                      <span className="text-[8px] font-bold uppercase tracking-wider text-danger">
                        *
                      </span>
                    )}
                  </div>
                  {uploaded ? (
                    <div className="text-[11px] text-success font-medium truncate mt-0.5">
                      {file.name}
                    </div>
                  ) : (
                    <div className="text-[11px] text-text-muted line-clamp-2 mt-0.5">
                      {doc.desc}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2.5 flex justify-end">
                {uploaded ? (
                  <button
                    type="button"
                    onClick={() => removeDoc(doc.id)}
                    className="text-[10px] font-bold text-danger hover:bg-danger-soft rounded-full px-2.5 py-1 transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <label className="cursor-pointer text-[10px] font-bold text-primary border border-primary/40 bg-primary-soft hover:brightness-110 rounded-full px-2.5 py-1 transition-all inline-flex items-center gap-1">
                    <Send className="h-2.5 w-2.5" strokeWidth={2.5} />
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 10 * 1024 * 1024) {
                          alert(`${f.name} is larger than 10 MB`);
                          return;
                        }
                        setDoc(doc.id, f);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SetupShell>
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
  // Initial screen comes from the URL — `/vendor-login` starts on the
  // sign-in screen, `/vendor-register` starts on the create-account screen.
  const location = useLocation();
  const [screen, setScreen] = useState(() =>
    location.pathname === "/vendor-login" ? "login" : "register",
  );
  const [session, setSession] = useState(null);
  const [details, setDetails] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reference, setReference] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Setup wizard state — each sub-form writes into one slice of `setupData`.
  // `completed` tracks which step cards should show the "Done" badge.
  const [setupData, setSetupData] = useState(() => ({
    company: {},
    business: {},
    contact: { primaryContact: {} },
    account: { bank: {} },
    document: { documents: {} },
  }));
  const [completed, setCompleted] = useState({});

  const toast = useToast();
  const navigate = useNavigate();
  const setMany = useOnboardingStore((s) => s.setMany);
  const submitToBackend = useOnboardingStore((s) => s.submit);
  const resetStore = useOnboardingStore((s) => s.reset);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  // Registers the vendor right after Details — categories are NOT picked
  // here any more. The user fills them in via the welcome wizard's
  // "Category & Business" sub-step instead.
  const handleSubmit = async (d = details) => {
    if (!d) return;
    setSubmitting(true);
    // Fresh registration — nothing in the welcome wizard is "done" yet.
    // Explicitly reset so a re-register in the same session doesn't carry
    // forward stale Done badges (and so Category never shows green just
    // because the user finished Details).
    setCompleted({});

    // Stage all fields into the onboarding store, then call submit().
    setMany({
      vendor_name: d.legalName || d.tradeName || d.name,
      email_address_1: d.email,
      contact_no: d.phone,
      contact_person_1: d.name,
      gst: d.gstin,
      pan: d.pan,
      address: d.address,
      city: d.city || "",
      state: d.state || "",
      country: "India",
      zipcode: d.pincode || "",
      password: genPassword(),
      category: null,
    });

    // Pre-fill what we already know into setup forms.
    setSetupData((s) => ({
      ...s,
      company: {
        ...s.company,
        legalName: d.legalName || d.tradeName || s.company.legalName,
        tradeName: d.tradeName || s.company.tradeName,
      },
      contact: {
        ...s.contact,
        primaryContact: {
          ...s.contact.primaryContact,
          name: d.name || s.contact.primaryContact?.name,
          email: d.email || s.contact.primaryContact?.email,
          phone: d.phone || s.contact.primaryContact?.phone,
          address: d.address || s.contact.primaryContact?.address,
          city: d.city || s.contact.primaryContact?.city,
          state: d.state || s.contact.primaryContact?.state,
          pincode: d.pincode || s.contact.primaryContact?.pincode,
          country: "India",
        },
      },
      account: {
        ...s.account,
        bank: {
          ...s.account.bank,
          beneficiary:
            (d.legalName || d.name || "").toUpperCase() ||
            s.account.bank?.beneficiary,
        },
      },
    }));

    try {
      const vendor = await submitToBackend();
      const ref =
        vendor?.code || "MEKA-" + (Math.floor(Math.random() * 90000) + 10000);
      setReference(ref);
      setScreen("welcome");
      toast.success("Account created — let's set up your supplier profile");
    } catch (err) {
      const msg = err?.message || "Submission failed";
      const alreadyRegistered =
        /already registered|already exists|duplicate/i.test(msg);

      if (alreadyRegistered) {
        // The email already has an account — registration shouldn't proceed.
        // Send them to the login screen with a clear toast so they can sign in.
        toast.error(
          "This email is already registered. Sign in to access your supplier portal.",
        );
        setScreen("login");
        navigate("/vendor-login");
      } else {
        // Other validation / server error — stay on categories so they can fix.
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Map step id → next step id so "Save & Continue" walks through them.
  const NEXT_STEP = {
    company: "category",
    category: "contact",
    contact: "account",
    account: "document",
    document: null, // last step
  };

  const saveStep = (stepId) => {
    setCompleted((c) => ({ ...c, [stepId]: true }));
    const next = NEXT_STEP[stepId];
    if (next) setScreen(`setup-${next}`);
    else setScreen("final"); // finished all 5
  };
  const skipStep = (stepId) => {
    const next = NEXT_STEP[stepId];
    if (next) setScreen(`setup-${next}`);
    else setScreen("welcome");
  };

  const reset = () => {
    setSession(null);
    setDetails(null);
    setCategories([]);
    setReference(null);
    resetStore();
    setScreen("login");
    navigate("/vendor-login");
  };

  if (screen === "login")
    return (
      <LoginScreen
        goRegister={() => {
          setScreen("register");
          navigate("/vendor-register");
        }}
        onSendOtp={(s) => {
          setSession(s);
          setScreen("otp");
        }}
      />
    );

  if (screen === "register")
    return (
      <RegisterScreen
        goLogin={() => {
          setScreen("login");
          navigate("/vendor-login");
        }}
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
        submitting={submitting}
        onNext={(d) => {
          setDetails(d);
          // Skip the standalone categories step — go straight to register.
          // Categories are picked later in the welcome wizard's "Category &
          // Business" sub-step.
          handleSubmit(d);
        }}
      />
    );

  if (screen === "welcome")
    return (
      <WelcomeSetupScreen
        details={details}
        completed={completed}
        onSkip={() => setScreen("final")}
        onContinue={(stepId) => setScreen(`setup-${stepId}`)}
      />
    );

  // Setup sub-form screens — one per card on the welcome wizard.
  // Build the side-rail nav once (same for all 5 forms).
  const navItems = SETUP_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    done: !!completed[s.id],
  }));
  const onJump = (id) => setScreen(`setup-${id}`);

  if (screen === "setup-company")
    return (
      <CompanyDetailsForm
        data={setupData.company}
        setData={(d) => setSetupData((s) => ({ ...s, company: d }))}
        onBack={() => setScreen("welcome")}
        onSkip={() => skipStep("company")}
        onSave={() => saveStep("company")}
        navItems={navItems}
        currentId="company"
        onJump={onJump}
      />
    );

  if (screen === "setup-category")
    return (
      <CategoryBusinessForm
        data={setupData.business}
        setData={(d) => setSetupData((s) => ({ ...s, business: d }))}
        onBack={() => setScreen("welcome")}
        onSkip={() => skipStep("category")}
        onSave={() => saveStep("category")}
        navItems={navItems}
        currentId="category"
        onJump={onJump}
      />
    );

  if (screen === "setup-contact")
    return (
      <ContactDetailsForm
        data={setupData.contact}
        setData={(d) => setSetupData((s) => ({ ...s, contact: d }))}
        onBack={() => setScreen("welcome")}
        onSkip={() => skipStep("contact")}
        onSave={() => saveStep("contact")}
        navItems={navItems}
        currentId="contact"
        onJump={onJump}
      />
    );

  if (screen === "setup-account")
    return (
      <AccountDetailsForm
        data={setupData.account}
        setData={(d) => setSetupData((s) => ({ ...s, account: d }))}
        onBack={() => setScreen("welcome")}
        onSkip={() => skipStep("account")}
        onSave={() => saveStep("account")}
        navItems={navItems}
        currentId="account"
        onJump={onJump}
      />
    );

  if (screen === "setup-document")
    return (
      <DocumentForm
        data={setupData.document}
        setData={(d) => setSetupData((s) => ({ ...s, document: d }))}
        onBack={() => setScreen("welcome")}
        onSkip={() => skipStep("document")}
        onSave={() => saveStep("document")}
        saving={false}
        navItems={navItems}
        currentId="document"
        onJump={onJump}
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
