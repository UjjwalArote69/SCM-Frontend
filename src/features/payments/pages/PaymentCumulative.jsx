import { ShieldCheck } from "lucide-react";
import PaymentGrnList from "../components/PaymentGrnList.jsx";

// FLOW item 55 — Cumulative payment ledger.
// Each row = one fully-approved GRN whose source PO has been paid at
// any point. Mirrors the FTM page but with no time scope.
export default function PaymentCumulativePage() {
  return (
    <PaymentGrnList
      mode="cumulative"
      title="Cumulative Payments"
      subtitle="Every GRN settled to date. The all-time payment ledger."
      icon={ShieldCheck}
      accentTone="success"
    />
  );
}
