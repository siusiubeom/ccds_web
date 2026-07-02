"use client";

import { useEffect, useRef } from "react";

interface RefPoint { cxcl10: number; nox4: number; }
interface Props {
  cxcl10: number;
  nox4: number;
  refPoints: RefPoint[];
}

const PAD = 56;
const W   = 560;
const H   = 420;

/** Min-max normalise. Single unique value → 0.5 (centre). */
function norm(vals: number[]): number[] {
  const mn  = Math.min(...vals);
  const mx  = Math.max(...vals);
  if (mx === mn) return vals.map(() => 0.5);
  const rng = mx - mn;
  return vals.map(v => (v - mn) / rng);
}

function drawX(ctx: CanvasRenderingContext2D, px: number, py: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
  ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r);
  ctx.stroke();
}

export default function CanvasRefMap({ cxcl10, nox4, refPoints }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, W, H);

    const plotX = PAD;
    const plotY = 16;
    const plotW = W - PAD - 20;
    const plotH = H - PAD - 16;

    // Grid lines
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 4; i++) {
      const gx = plotX + (plotW / 4) * i;
      const gy = plotY + (plotH / 4) * i;
      ctx.beginPath(); ctx.moveTo(gx, plotY);  ctx.lineTo(gx, plotY + plotH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(plotX, gy); ctx.lineTo(plotX + plotW, gy);  ctx.stroke();
    }

    // Plot border
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(plotX, plotY, plotW, plotH);

    // Normalise — include current sample so it's always within the axes
    const allCx  = [cxcl10, ...refPoints.map(r => r.cxcl10)];
    const allNox = [nox4,   ...refPoints.map(r => r.nox4)];
    const ncx    = norm(allCx);
    const nnox   = norm(allNox);

    const toPixel = (nx: number, ny: number) => ({
      px: plotX + nx * plotW,
      py: plotY + plotH - ny * plotH,   // higher nox4 → higher on screen
    });

    // Reference points — blue ×
    if (refPoints.length > 0) {
      ctx.strokeStyle = "rgba(59, 130, 246, 0.55)";
      ctx.lineWidth   = 1.5;
      for (let i = 1; i < ncx.length; i++) {
        const { px, py } = toPixel(ncx[i], nnox[i]);
        drawX(ctx, px, py, 5);
      }
    }

    // Current sample — red ●
    const { px: cpx, py: cpy } = toPixel(ncx[0], nnox[0]);
    ctx.beginPath();
    ctx.arc(cpx, cpy, 9, 0, Math.PI * 2);
    ctx.fillStyle   = "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "#64748b";
    ctx.font      = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CXCL10 (normalized)", plotX + plotW / 2, H - 6);

    ctx.save();
    ctx.translate(13, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("NOX4 (normalized)", 0, 0);
    ctx.restore();

    // Tick labels
    ctx.fillStyle = "#94a3b8";
    ctx.font      = "9px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) {
      const gx = plotX + (plotW / 4) * i;
      ctx.fillText((i / 4).toFixed(2), gx, plotY + plotH + 12);
    }
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const gy = plotY + plotH - (plotH / 4) * i;
      ctx.fillText((i / 4).toFixed(2), plotX - 6, gy + 3);
    }

    // Legend box
    const lx = plotX + 8;
    const ly = plotY + 10;
    ctx.fillStyle   = "rgba(255,255,255,0.9)";
    ctx.fillRect(lx - 4, ly - 4, 175, refPoints.length > 0 ? 50 : 28);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth   = 1;
    ctx.strokeRect(lx - 4, ly - 4, 175, refPoints.length > 0 ? 50 : 28);

    // Legend — red circle
    ctx.beginPath();
    ctx.arc(lx + 7, ly + 8, 7, 0, Math.PI * 2);
    ctx.fillStyle   = "#ef4444"; ctx.fill();
    ctx.strokeStyle = "#991b1b"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#374151";
    ctx.font      = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Current sample", lx + 20, ly + 12);

    // Legend — blue ×
    if (refPoints.length > 0) {
      ctx.strokeStyle = "rgba(59,130,246,0.7)";
      ctx.lineWidth   = 1.5;
      drawX(ctx, lx + 7, ly + 30, 5);
      ctx.fillStyle = "#374151";
      ctx.fillText(`Reference (n=${refPoints.length})`, lx + 20, ly + 34);
    }

  }, [cxcl10, nox4, refPoints]);

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href     = canvas.toDataURL("image/png");
    a.download = "reference_map.png";
    a.click();
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {refPoints.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
          No reference data found. Run <code className="font-mono">npx prisma db seed</code> to seed the reference points.
        </p>
      )}
      <canvas
        ref={canvasRef}
        className="rounded-lg border border-gray-200 shadow-sm"
      />
      <button
        onClick={exportPng}
        className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg border border-gray-200"
      >
        내보내기 / Export PNG
      </button>
    </div>
  );
}
