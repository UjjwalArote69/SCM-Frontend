// One-shot script: render FLOW.md (with Mermaid) → FLOW.pdf
// Each Mermaid SVG is scaled to fit a single page so diagrams never overflow.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MD = path.join(ROOT, "FLOW.md");
const OUT_PDF = path.join(ROOT, "FLOW.pdf");
const HTML_OUT = path.join(__dirname, "flow.html");

// Page geometry — A3 portrait works well: gives plenty of vertical room for the tall
// procurement-pipeline diagram and enough width for the horizontal ones.
//   A3: 297mm × 420mm
//   Margins: 14mm sides, 14mm top, 18mm bottom (footer space)
//   Printable: ~269mm × ~388mm
// Diagram cap: a bit smaller than printable so border + padding don't push it off.
const PAGE = { format: "A3", landscape: false };
const MARGINS = { top: "14mm", right: "14mm", bottom: "18mm", left: "14mm" };
const DIAGRAM_MAX_W_MM = 260;
const DIAGRAM_MAX_H_MM = 370;

const md = fs.readFileSync(MD, "utf8");

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>SCM — Flow Diagrams</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
  window.__mermaid = mermaid;
</script>
<style>
  @page { size: A3 portrait; margin: 14mm 14mm 18mm 14mm; }
  :root {
    --fg: #0f172a;
    --muted: #475569;
    --border: #e2e8f0;
    --accent: #b91c1c;
    --bg-soft: #f8fafc;
    --code-bg: #f1f5f9;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--fg);
    line-height: 1.55;
    font-size: 11.5pt;
    background: #fff;
  }
  h1, h2, h3, h4 { color: var(--fg); line-height: 1.25; }
  h1 { font-size: 24pt; border-bottom: 3px solid var(--accent); padding-bottom: 8px; margin-top: 0; }
  h2 { font-size: 18pt; margin-top: 28px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  h3 { font-size: 13.5pt; margin-top: 18px; color: var(--accent); }
  h4 { font-size: 11.5pt; margin-top: 14px; }
  p, li { color: var(--fg); }
  a { color: var(--accent); text-decoration: none; }
  hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
  blockquote {
    border-left: 4px solid var(--accent);
    background: var(--bg-soft);
    margin: 14px 0;
    padding: 10px 16px;
    color: var(--muted);
    border-radius: 4px;
    page-break-inside: avoid;
  }
  blockquote p { margin: 6px 0; }
  code {
    background: var(--code-bg);
    padding: 2px 5px;
    border-radius: 3px;
    font-family: "JetBrains Mono", Consolas, monospace;
    font-size: 0.9em;
  }
  pre code { background: transparent; padding: 0; }
  pre { background: var(--code-bg); padding: 12px 14px; border-radius: 6px; overflow-x: auto; font-size: 0.88em; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 0.95em; page-break-inside: avoid; }
  th, td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; vertical-align: top; }
  th { background: var(--bg-soft); font-weight: 600; }
  ul, ol { padding-left: 24px; }
  li { margin: 4px 0; }

  /* Diagram container */
  .mermaid {
    margin: 14px 0;
    padding: 10px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
    max-width: ${DIAGRAM_MAX_W_MM}mm;
    max-height: ${DIAGRAM_MAX_H_MM}mm;
    overflow: hidden;
    margin-left: auto;
    margin-right: auto;
  }
  /* Force every Mermaid SVG to scale to fit isotropically */
  .mermaid svg {
    display: block !important;
    margin: 0 auto !important;
    max-width: 100% !important;
    max-height: ${DIAGRAM_MAX_H_MM - 6}mm !important;
    width: auto !important;
    height: auto !important;
  }
  /* Use Arial (universally installed) so Mermaid's measurement and rendering use the
     exact same font metrics — eliminates the 1-char clipping at node right edges. */
  .mermaid, .mermaid foreignObject *, .mermaid .nodeLabel, .mermaid .edgeLabel,
  .mermaid .label, .mermaid .label-container, .mermaid text {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
  }
  /* Mermaid sets foreignObject width = measured text width, but rendered text
     can be a hair wider, so the last char gets clipped. Allow horizontal overflow
     into the surrounding node-rect padding (we set flowchart.padding=18). */
  .mermaid foreignObject { overflow: visible !important; }
  .mermaid foreignObject > div { overflow: visible !important; }
  h2 { page-break-after: avoid; break-after: avoid; }
  h2 + p, h2 + blockquote, h2 + .mermaid { page-break-before: avoid; }
</style>
</head>
<body>
<div id="content"></div>
<script>
  const RAW_MD = ${JSON.stringify(md)};
  // Replace fenced \`\`\`mermaid blocks with placeholders BEFORE markdown parse so marked
  // doesn't mangle them, then swap back as <div class="mermaid">…</div>.
  const blocks = [];
  const stripped = RAW_MD.replace(/\`\`\`mermaid\\n([\\s\\S]*?)\`\`\`/g, (_, code) => {
    const i = blocks.push(code) - 1;
    return \`\\n\\n<!--MERMAID_\${i}-->\\n\\n\`;
  });
  let htmlOut = marked.parse(stripped, { gfm: true, breaks: false });
  htmlOut = htmlOut.replace(/<!--MERMAID_(\\d+)-->/g, (_, i) => {
    const code = blocks[Number(i)]
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return \`<div class="mermaid">\${code}</div>\`;
  });
  document.getElementById("content").innerHTML = htmlOut;

  (async () => {
    while (!window.__mermaid) await new Promise(r => setTimeout(r, 50));
    // Wait for Inter to be available so Mermaid measures text widths accurately.
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.load('600 14px "Inter"'); } catch {}
      try { await document.fonts.load('400 13px "Inter"'); } catch {}
      try { await document.fonts.ready; } catch {}
    }

    window.__mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      flowchart: { htmlLabels: true, useMaxWidth: false, padding: 18, nodeSpacing: 32, rankSpacing: 44 },
      sequence:  { useMaxWidth: false },
      er:        { useMaxWidth: false },
      themeVariables: { fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif', fontSize: "13px" }
    });
    await window.__mermaid.run({ querySelector: ".mermaid" });

    // Strip inline sizing on every SVG so CSS can scale to fit. Keep viewBox so
    // browsers compute aspect-ratio-preserving size from max-width / max-height.
    document.querySelectorAll(".mermaid svg").forEach(svg => {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.maxWidth = "";
      svg.style.width = "";
      svg.style.height = "";
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    });

    window.__mermaidReady = true;
  })();
</script>
</body>
</html>`;

fs.writeFileSync(HTML_OUT, html, "utf8");

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.goto("file:///" + HTML_OUT.replace(/\\/g, "/"), { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForFunction(() => window.__mermaidReady === true, { timeout: 60000 });
await new Promise(r => setTimeout(r, 600));

await page.pdf({
  path: OUT_PDF,
  format: PAGE.format,
  landscape: PAGE.landscape,
  printBackground: true,
  margin: MARGINS,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="font-size:9px;color:#64748b;width:100%;text-align:center;padding:0 12mm;">' +
    'SCM — Flow Diagrams · <span class="pageNumber"></span> / <span class="totalPages"></span>' +
    '</div>',
});

await browser.close();
console.log("PDF written:", OUT_PDF);
