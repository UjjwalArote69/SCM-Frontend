import { useEffect, useState } from "react";
import {
  Download,
  Smartphone,
  CheckCircle2,
  Share2,
  PlusSquare,
  Apple,
  MonitorSmartphone,
  Loader2,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { useToast } from "../../hooks/useToast.jsx";

/**
 * Drop-in PWA install card.
 *
 * Browsers handle install three different ways — the card adapts to each:
 *
 *   • Chromium-based (Chrome / Edge / Brave / Samsung Internet, desktop &
 *     Android): fires `beforeinstallprompt`. We stash the event, show a
 *     prominent "Install app" CTA, and call `prompt()` on click.
 *
 *   • iOS Safari: no programmatic install API exists. We detect the
 *     platform and render a quick three-step "Add to Home Screen"
 *     walkthrough with the Share icon called out.
 *
 *   • Already installed (running in standalone mode): we detect via
 *     `(display-mode: standalone)` matchMedia + iOS' `navigator.standalone`
 *     and show a "You're already running the app" confirmation.
 *
 *   • Anything else (Firefox desktop, in-app browsers, very old Chromium):
 *     show a soft "not available here" fallback so the card never feels
 *     broken.
 */
export default function InstallAppButton({ compact = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !window.MSStream);

    const standaloneMQ = window.matchMedia("(display-mode: standalone)");
    const checkStandalone = () =>
      setIsInstalled(
        standaloneMQ.matches || window.navigator.standalone === true,
      );
    checkStandalone();
    standaloneMQ.addEventListener?.("change", checkStandalone);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("Suppliers First installed — find it on your home screen.");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      standaloneMQ.removeEventListener?.("change", checkStandalone);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [toast]);

  const install = async () => {
    if (!deferredPrompt || busy) return;
    setBusy(true);
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setDeferredPrompt(null);
      } else {
        toast.info("Install cancelled — you can try again any time.");
      }
    } catch (err) {
      toast.error("Couldn't open the install prompt.");
    } finally {
      setBusy(false);
    }
  };

  // ─── Compact (just the button — for embedding in a wider page) ──
  if (compact) {
    if (isInstalled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-success-soft text-success border border-success/30">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} /> Installed
        </span>
      );
    }
    if (!deferredPrompt && !isIOS) return null;
    return (
      <button
        type="button"
        onClick={isIOS ? undefined : install}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-primary-foreground bg-primary hover:brightness-110 transition-all shadow-sm active:scale-95 disabled:opacity-60"
      >
        {busy
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Download className="h-3.5 w-3.5" strokeWidth={2.5} />}
        Install app
      </button>
    );
  }

  // ─── Full card variants ─────────────────────────────────────────

  // 1. Already installed — confirmation card.
  if (isInstalled) {
    return (
      <CardShell tone="success" Icon={CheckCircle2}>
        <Heading>You're running the installed app</Heading>
        <Body>
          Suppliers First is already installed on this device. Launch it from
          your home screen, Start menu, or app drawer for a faster, full-screen
          experience.
        </Body>
        <FeatureRow />
      </CardShell>
    );
  }

  // 2. iOS Safari — walk through Add to Home Screen.
  if (isIOS) {
    return (
      <CardShell tone="primary" Icon={Apple}>
        <Heading>Install on iPhone / iPad</Heading>
        <Body>
          Safari doesn't have a one-tap install button — but adding Suppliers
          First to your home screen takes 10 seconds:
        </Body>
        <ol className="text-sm text-text space-y-2 mt-3">
          <Step n={1}>
            Tap the <Share2 className="inline h-4 w-4 mx-1 -mt-0.5 text-info" strokeWidth={2.25} />
            <span className="font-semibold">Share</span> icon at the bottom of Safari.
          </Step>
          <Step n={2}>
            Scroll the share sheet and tap{" "}
            <PlusSquare className="inline h-4 w-4 mx-1 -mt-0.5 text-text-muted" strokeWidth={2} />
            <span className="font-semibold">"Add to Home Screen"</span>.
          </Step>
          <Step n={3}>
            Confirm with <span className="font-semibold">Add</span> in the top-right.
            The app appears on your home screen with the Suppliers First icon.
          </Step>
        </ol>
        <FeatureRow />
      </CardShell>
    );
  }

  // 3. Installable right now via beforeinstallprompt.
  if (deferredPrompt) {
    return (
      <CardShell tone="primary" Icon={Smartphone}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <Heading>Install Suppliers First</Heading>
            <Body>
              Pin it to your home screen or Start menu. Runs in its own window,
              loads faster, and the app shell works offline.
            </Body>
          </div>
          <button
            type="button"
            onClick={install}
            disabled={busy}
            className="self-start sm:self-center shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-primary-foreground bg-primary hover:brightness-110 rounded-full transition-all shadow-[0_4px_16px_-6px_color-mix(in_srgb,var(--color-primary)_55%,transparent)] active:scale-95 disabled:opacity-60"
          >
            {busy
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" strokeWidth={2.5} />}
            Install app
          </button>
        </div>
        <FeatureRow />
      </CardShell>
    );
  }

  // 4. Fallback — browser doesn't expose beforeinstallprompt.
  return (
    <CardShell tone="muted" Icon={MonitorSmartphone}>
      <Heading>Install not available here</Heading>
      <Body>
        Your browser hasn't offered an install option yet. This usually means
        one of:
      </Body>
      <ul className="text-[13px] text-text-muted space-y-1.5 mt-3 list-disc list-inside ml-1">
        <li>The app is already installed on this device.</li>
        <li>You're using a browser that doesn't support PWA installs (try Chrome, Edge, or Safari on iOS).</li>
        <li>The page hasn't met install criteria yet — keep using it for a minute and try again.</li>
      </ul>
      <FeatureRow />
    </CardShell>
  );
}

// ─── Small composable bits ────────────────────────────────────────────────

function CardShell({ tone, Icon, children }) {
  const ringCls = {
    success: "ring-success/20",
    primary: "ring-primary/20",
    muted: "ring-border",
  }[tone] ?? "ring-border";
  const tileCls = {
    success: "bg-success text-white",
    primary: "bg-primary text-primary-foreground",
    muted: "bg-surface-container text-text-muted",
  }[tone] ?? "bg-surface-container text-text-muted";
  return (
    <section
      className={`relative overflow-hidden glass-card rounded-2xl p-5 sm:p-6 ring-1 ${ringCls}`}
    >
      {/* soft corner glow for editorial atmosphere */}
      {tone !== "muted" && (
        <span
          className={`absolute -top-14 -right-14 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-30 ${
            tone === "success" ? "bg-success/40" : "bg-primary/40"
          }`}
          aria-hidden
        />
      )}
      <div className="relative">
        <div className="flex items-start gap-4">
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${tileCls}`}
          >
            <Icon className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Heading({ children }) {
  return (
    <h3 className="text-base sm:text-lg font-bold text-text leading-tight tracking-tight">
      {children}
    </h3>
  );
}

function Body({ children }) {
  return (
    <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{children}</p>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 h-5 w-5 rounded-md bg-primary-soft text-primary font-black text-[11px] flex items-center justify-center">
        {n}
      </span>
      <span className="text-[13.5px] text-text leading-relaxed pt-0.5">
        {children}
      </span>
    </li>
  );
}

function FeatureRow() {
  return (
    <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-text-muted">
      <Feature Icon={Sparkles} label="Native feel">
        Runs in its own window — no browser chrome.
      </Feature>
      <Feature Icon={WifiOff} label="Offline shell">
        The interface loads without a connection.
      </Feature>
      <Feature Icon={Smartphone} label="Home-screen icon">
        Quick launch from anywhere on your device.
      </Feature>
    </div>
  );
}

function Feature({ Icon, label, children }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" strokeWidth={2.25} />
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-text leading-tight">
          {label}
        </div>
        <div className="text-[11px] text-text-muted leading-snug mt-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}
