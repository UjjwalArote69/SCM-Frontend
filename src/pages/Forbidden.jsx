import { Link } from "react-router-dom";
import { ShieldAlert, Home } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-24 h-24 rounded-full bg-danger-soft flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="h-14 w-14 text-danger" strokeWidth={1.5} />
        </div>
        <div className="text-6xl font-black text-text mb-2 tracking-tighter">403</div>
        <h1 className="text-2xl font-bold text-text mb-3">Access Denied</h1>
        <p className="text-text-muted mb-8">
          You don&apos;t have permission to view this page. If you believe this is a mistake, contact your administrator.
        </p>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-md font-bold text-sm">
          <Home className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </div>
  );
}
