"use client";

export type RiskGroup = "High" | "Moderate" | "Normal";

interface Props {
  group: RiskGroup;
  cxcl10: number;
  nox4: number;
}

const BARS: Array<{ name: RiskGroup; r: number; g: number; b: number; label: string }> = [
  { name: "Normal",   r: 0,   g: 200, b: 0,   label: "Normal" },
  { name: "Moderate", r: 243, g: 146, b: 0,   label: "Moderate Risk" },
  { name: "High",     r: 228, g: 26,  b: 28,  label: "High" },
];

const CX_LOW = 293, CX_MAX = 1000;

// Mirrors Python seg_center() — reversed segments, max value → leftmost
function dotPercent(group: RiskGroup, cxcl10: number, nox4: number): number {
  const low = cxcl10 > 0 && cxcl10 < CX_LOW;
  let value: number, lo: number, hi: number;

  if (group === "High") {
    [value, lo, hi] = [nox4, 0, 2.3];
  } else if (group === "Moderate" && low) {
    [value, lo, hi] = [nox4, 2.3, 3.3];
  } else if (group === "Moderate") {
    [value, lo, hi] = [cxcl10, CX_LOW, CX_MAX];
  } else if (group === "Normal" && low) {
    [value, lo, hi] = [nox4, 3.3, 10];
  } else {
    [value, lo, hi] = [nox4, 0.79, 10];
  }

  const seg = Math.min(9, Math.max(0, Math.floor(((value - lo) / (hi - lo || 1)) * 10)));
  return (9 - seg + 0.5) * 10; // 0-100%
}

function exportPng(group: RiskGroup, pct: number) {
  const barW = 320, barH = 80, gap = 24, padX = 20, padY = 20, labelH = 28;
  const canvas = document.createElement("canvas");
  canvas.width  = padX * 2 + 3 * barW + 2 * gap;
  canvas.height = padY * 2 + barH + labelH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  BARS.forEach(({ name, r, g, b, label }, i) => {
    const x = padX + i * (barW + gap);
    const y = padY;
    const grad = ctx.createLinearGradient(x, 0, x + barW, 0);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, `rgb(${r},${g},${b})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, barH);
    ctx.strokeStyle = "#e5e7eb";
    ctx.strokeRect(x, y, barW, barH);

    if (name === group) {
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x + (pct / 100) * barW, y + barH / 2, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.font = "bold 13px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + barW / 2, y + barH + 20);
  });

  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob!);
    const a = document.createElement("a");
    a.href = url; a.download = "risk_bar.png"; a.click();
    URL.revokeObjectURL(url);
  });
}

export default function CssRiskBar({ group, cxcl10, nox4 }: Props) {
  const pct = dotPercent(group, cxcl10, nox4);

  return (
    <div>
      <div className="flex gap-4">
        {BARS.map(({ name, r, g, b, label }) => {
          const active = name === group;
          return (
            <div key={name} className="flex flex-col items-center gap-2 flex-1">
              <div
                className="relative w-full h-10 rounded-md border border-gray-100"
                style={{ background: `linear-gradient(to right, #fff, rgb(${r},${g},${b}))` }}
              >
                {active && (
                  <div
                    className="absolute top-1/2 w-3 h-3 bg-black rounded-full shadow"
                    style={{ left: `${pct}%`, transform: "translate(-50%, -50%)" }}
                  />
                )}
              </div>
              <span
                className={`text-xs font-semibold ${active ? "" : "opacity-40"}`}
                style={{ color: `rgb(${r},${g},${b})` }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => exportPng(group, pct)}
        className="mt-3 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm border border-gray-200"
      >
        내보내기 / Export PNG
      </button>
    </div>
  );
}
