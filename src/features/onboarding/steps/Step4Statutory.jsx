import { useRef, useState } from "react";
import {
  FileText,
  Fingerprint,
  BadgeCheck,
  Factory,
  CheckCircle2,
  CloudUpload,
} from "lucide-react";

const DOCS = [
  {
    key: "gst",
    title: "GST Certificate",
    icon: FileText,
    required: true,
  },
  {
    key: "pan",
    title: "PAN Card",
    icon: BadgeCheck,
    required: true,
  },
  {
    key: "msme",
    title: "MSME Certificate",
    icon: Factory,
    required: false,
  },
  {
    key: "aadhar",
    title: "Aadhar of Auth. Person",
    icon: Fingerprint,
    required: true,
  },
];

function DocCard({ doc, state, onPick, onRemove }) {
  const Icon = doc.icon;
  const inputRef = useRef(null);

  const accent =
    state?.status === "uploaded"
      ? "bg-success"
      : state?.status === "uploading"
        ? "bg-info"
        : doc.required
          ? "bg-danger/70"
          : "bg-border";

  return (
    <div className="bg-surface-container-lowest p-6 flex flex-col gap-5 border border-border rounded-lg relative overflow-hidden hover:shadow-md transition-shadow">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="w-12 h-12 bg-surface-alt flex items-center justify-center rounded-md shrink-0">
          <Icon className="h-6 w-6 text-text-muted" />
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text">{doc.title}</h3>
            {doc.required ? (
              <span className="text-danger font-bold text-sm">*</span>
            ) : (
              <span className="bg-surface-alt text-text-muted text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm">
                Optional
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            Accepted: PDF, JPG, PNG (Max 5MB)
          </p>
        </div>
      </div>

      {state?.status === "uploaded" && (
        <>
          <div className="bg-surface-container flex items-center justify-between p-3 border border-border rounded">
            <div className="flex items-center gap-3 overflow-hidden">
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
              <span className="text-xs font-semibold text-text truncate">
                {state.fileName}
              </span>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="text-xs font-bold text-primary hover:brightness-110 flex-shrink-0"
            >
              Remove
            </button>
          </div>
          <div className="w-full bg-surface-alt h-1.5 mt-auto rounded-full">
            <div className="bg-success h-1.5 w-full rounded-full" />
          </div>
        </>
      )}

      {state?.status === "uploading" && (
        <>
          <div className="bg-surface-container flex items-center justify-between p-3 border border-border rounded">
            <div className="flex items-center gap-3 overflow-hidden">
              <CloudUpload className="h-4 w-4 text-info animate-pulse flex-shrink-0" />
              <span className="text-xs font-semibold text-text truncate">
                {state.fileName}
              </span>
            </div>
            <span className="text-xs font-bold text-info flex-shrink-0">
              {state.progress}%
            </span>
          </div>
          <div className="w-full bg-surface-alt h-1.5 mt-auto rounded-full">
            <div
              className="bg-info h-1.5 rounded-full transition-all"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </>
      )}

      {!state && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full h-12 mt-auto border-2 border-dashed border-outline-variant bg-surface flex items-center justify-center cursor-pointer hover:bg-surface-alt transition-colors rounded"
          >
            <span className="text-sm font-semibold text-primary">
              Choose file
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </>
      )}
    </div>
  );
}

export default function Step4Statutory() {
  const [state, setState] = useState({
    gst: { status: "uploaded", fileName: "gst_cert_2023_final.pdf" },
    pan: { status: "uploading", fileName: "pan_card_scan.jpg", progress: 45 },
  });

  const onPick = (key) => (file) => {
    if (!file) return;
    setState({ ...state, [key]: { status: "uploaded", fileName: file.name } });
  };
  const onRemove = (key) => () => {
    const { [key]: _, ...rest } = state;
    setState(rest);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DOCS.map((doc) => (
          <DocCard
            key={doc.key}
            doc={doc}
            state={state[doc.key]}
            onPick={onPick(doc.key)}
            onRemove={onRemove(doc.key)}
          />
        ))}
    </div>
  );
}
