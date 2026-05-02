import { useState } from "react";
import { useOnboardingStore } from "../store.js";

const inputCls =
  "w-full bg-surface-container-lowest text-text text-sm px-4 py-3 border-0 border-b-2 border-outline-variant focus:border-primary focus:ring-0 outline-none transition-colors";

function Labeled({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest font-semibold text-text-muted mb-2">
        {label}
        {required && " *"}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

export default function Step3Bank() {
  const s = useOnboardingStore();
  const set = useOnboardingStore((x) => x.set);
  const [confirmAcc, setConfirmAcc] = useState("");

  const mismatch =
    confirmAcc.length > 0 && confirmAcc !== s.account_number;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
      <div className="md:col-span-2">
        <Labeled label="Account holder name" required>
          <input
            className={inputCls}
            value={s.vendor_name}
            readOnly
            title="Matches your company name from Step 1"
          />
        </Labeled>
      </div>
      <Labeled label="Bank name" required>
        <input
          className={inputCls}
          value={s.bank_name}
          onChange={(e) => set("bank_name", e.target.value)}
          placeholder="e.g. State Bank of India"
        />
      </Labeled>
      <Labeled label="Branch" required>
        <input
          className={inputCls}
          value={s.branch_name}
          onChange={(e) => set("branch_name", e.target.value)}
          placeholder="e.g. MG Road"
        />
      </Labeled>
      <Labeled label="Account number" required>
        <input
          className={`${inputCls} tracking-[0.2em]`}
          value={s.account_number}
          onChange={(e) => set("account_number", e.target.value)}
          placeholder="Enter account number"
        />
      </Labeled>
      <Labeled
        label="Re-enter account number"
        required
        error={mismatch ? "Account numbers do not match." : null}
      >
        <input
          className={inputCls}
          value={confirmAcc}
          onChange={(e) => setConfirmAcc(e.target.value)}
          placeholder="Confirm account number"
        />
      </Labeled>
      <Labeled label="IFSC code" required>
        <input
          className={`${inputCls} uppercase font-mono`}
          value={s.ifsc_code}
          onChange={(e) => set("ifsc_code", e.target.value.toUpperCase())}
          placeholder="SBIN0001234"
        />
      </Labeled>
    </div>
  );
}
