import { CalendarCheck } from "lucide-react";
import PaymentGrnList from "../components/PaymentGrnList.jsx";

// FLOW item 54 — Payment (For The Month).
// Each row = one fully-approved GRN whose source PO has a payment
// marked paid during the current calendar month.
export default function PaymentFTMPage() {
  return (
    <PaymentGrnList
      mode="ftm"
      title="Payment (For This Month)"
      subtitle="GRNs whose payment was released during the current calendar month."
      icon={CalendarCheck}
      accentTone="success"
    />
  );
}
