import { useOnboardingStore } from "../store.js";

const inputCls =
  "w-full bg-surface-container-lowest text-text text-sm px-4 py-3 border-0 border-b-2 border-outline-variant focus:border-primary focus:ring-0 outline-none transition-colors";

function Labeled({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest font-semibold text-text-muted mb-2">
        {label}
        {required && " *"}
      </label>
      {children}
    </div>
  );
}

const NATURES = ["Manufacturing", "Trading", "Distribution", "Services"];
const TURNOVER = ["< 1 Cr", "1 - 5 Cr", "5 - 20 Cr", "> 20 Cr"];
const HEADCOUNT = ["1 - 10", "11 - 50", "51 - 200", "201+"];
const PO_TYPES = ["Goods", "Services", "Works"];

export default function Step5Business() {
  const s = useOnboardingStore();
  const set = useOnboardingStore((x) => x.set);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      <Labeled label="Nature of business" required>
        <select
          className={`${inputCls} appearance-none`}
          value={s.nature_of_vendor}
          onChange={(e) => set("nature_of_vendor", e.target.value)}
        >
          <option value="">Select nature</option>
          {NATURES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
          <option value="other">Other</option>
        </select>
      </Labeled>

      {s.nature_of_vendor === "other" && (
        <Labeled label="Specify nature">
          <input
            className={inputCls}
            value={s.bussines_nature}
            onChange={(e) => set("bussines_nature", e.target.value)}
          />
        </Labeled>
      )}

      <Labeled label="Activity / PO Type" required>
        <select
          className={`${inputCls} appearance-none`}
          value={s.po_type}
          onChange={(e) => set("po_type", e.target.value)}
        >
          <option value="">Select type</option>
          {PO_TYPES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </Labeled>

      <Labeled label="Annual turnover">
        <select
          className={`${inputCls} appearance-none`}
          value={s.turnover}
          onChange={(e) => set("turnover", e.target.value)}
        >
          <option value="">Select range</option>
          {TURNOVER.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Labeled>

      <Labeled label="Number of employees">
        <select
          className={`${inputCls} appearance-none`}
          value={s.employees}
          onChange={(e) => set("employees", e.target.value)}
        >
          <option value="">Select range</option>
          {HEADCOUNT.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </Labeled>

      <div className="md:col-span-2">
        <Labeled label="Key products / services (deals in)" required>
          <textarea
            rows={3}
            className={`${inputCls} resize-y`}
            value={s.deals_in}
            onChange={(e) => set("deals_in", e.target.value)}
            placeholder="Describe your main offerings — these are the goods or services you sell"
          />
        </Labeled>
      </div>
    </div>
  );
}
