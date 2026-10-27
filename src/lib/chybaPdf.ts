/**
 * Chybová odpověď místo PDF: čitelná stránka v prohlížeči (ne „nepodařilo se načíst PDF“).
 * Technický detail chyby se ukáže pod zprávou, abychom ji mohli nahlásit a opravit.
 */
export function chybaPdf(zprava: string, status: number, e?: unknown): Response {
  const detail = e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 400) : "";
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chyba</title></head>
<body style="font-family:system-ui,sans-serif;background:#f4f7fb;color:#334155;padding:32px">
<div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px">
<h1 style="color:#0f2537;font-size:20px;margin:0 0 8px">${esc(zprava)}</h1>
${detail ? `<p style="font-size:13px;color:#64748b">Technický detail (pošlete nám ho prosím):</p><pre style="white-space:pre-wrap;background:#f4f7fb;padding:12px;border-radius:8px;font-size:12px">${esc(detail)}</pre>` : ""}
<p><a href="javascript:history.back()" style="color:#047857;font-weight:600">← Zpět</a></p></div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
