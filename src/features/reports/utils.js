// ── Number formatters ────────────────────────────────────────────────────────
export const fmtINR = (n) => {
  const v = Number(n ?? 0);
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const fmtCompactINR = (n) => {
  const v = Number(n ?? 0);
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}k`;
  return `₹${Math.round(v)}`;
};

export const fmtNum = (n) => Number(n ?? 0).toLocaleString("en-IN");

export const fmtPct = (n) => `${Number(n ?? 0).toFixed(1)}%`;

export const fmtDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return s; }
};

// ── CSV export ───────────────────────────────────────────────────────────────
/**
 * Trigger a CSV download in the browser.
 * @param filename  e.g. "spend-by-vendor-2026-05.csv"
 * @param columns   [{ key, label }]
 * @param rows      array of objects
 */
export function downloadCSV(filename, columns, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escape(typeof c.format === "function" ? c.format(r[c.key], r) : r[c.key])).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;

  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Default 12-month date range ──────────────────────────────────────────────
export function defaultRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(today) };
}
