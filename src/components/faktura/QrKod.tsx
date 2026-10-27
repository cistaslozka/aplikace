import QRCode from "qrcode";

// QR kód jako SVG, vykreslený hned (bez čekání), funguje na serveru i v prohlížeči.
export function QrKod({ text, velikost = 96, popis }: { text: string; velikost?: number; popis: string }) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const okraj = 2;
  const ctverce: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) ctverce.push(`M${c + okraj} ${r + okraj}h1v1h-1z`);
    }
  }
  return (
    <svg
      width={velikost}
      height={velikost}
      viewBox={`0 0 ${n + okraj * 2} ${n + okraj * 2}`}
      className="text-navy"
      role="img"
      aria-label={popis}
      shapeRendering="crispEdges"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      <path d={ctverce.join("")} fill="currentColor" />
    </svg>
  );
}
