"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface RefPoint { cxcl10: number; nox4: number; }
interface Props    { cxcl10: number; nox4: number; refPoints: RefPoint[]; }

const PYSCRIPT_VERSION = "2024.11.1";
const PYSCRIPT_BASE    = `https://pyscript.net/releases/${PYSCRIPT_VERSION}`;

export default function RefMapChart({ cxcl10, nox4, refPoints }: Props) {
  const [status, setStatus]   = useState<"loading" | "done" | "error">("loading");
  const [errMsg, setErrMsg]   = useState("");
  const outputRef             = useRef<HTMLDivElement>(null);
  const initialised           = useRef(false);

  // Inject the <script type="py"> after PyScript + packages are ready
  const runChart = useCallback(() => {
    if (document.getElementById("ccds-refmap-py")) return;

    const win = window as unknown as Record<string, unknown>;
    win.ccds_cxcl10     = cxcl10;
    win.ccds_nox4       = nox4;
    win.ccds_ref_points = refPoints;

    const s  = document.createElement("script");
    s.type   = "py";
    s.id     = "ccds-refmap-py";
    s.setAttribute("src", "/py/charts.py");
    document.body.appendChild(s);
  }, [cxcl10, nox4, refPoints]);

  // Bootstrap PyScript: py-config → css → core.js  (in that DOM order)
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    // 1. <py-config> must be in the DOM BEFORE core.js evaluates
    if (!document.getElementById("ccds-py-config")) {
      const cfg = document.createElement("py-config");
      cfg.id    = "ccds-py-config";
      cfg.setAttribute("type", "json");
      cfg.textContent = JSON.stringify({ packages: ["numpy", "matplotlib"] });
      // Prepend to body so it appears before any script tags
      document.body.insertBefore(cfg, document.body.firstChild);
    }

    // 2. PyScript CSS
    if (!document.getElementById("ccds-pyscript-css")) {
      const lnk  = document.createElement("link");
      lnk.id     = "ccds-pyscript-css";
      lnk.rel    = "stylesheet";
      lnk.href   = `${PYSCRIPT_BASE}/core.css`;
      document.head.appendChild(lnk);
    }

    // 3. Listen for ready BEFORE loading core.js (never miss the event)
    document.addEventListener("py:ready", runChart, { once: true });

    // 4. Load PyScript core — fire-and-forget if already loaded
    if (!document.getElementById("ccds-pyscript-core")) {
      const core  = document.createElement("script");
      core.id     = "ccds-pyscript-core";
      core.type   = "module";
      core.src    = `${PYSCRIPT_BASE}/core.js`;
      document.head.appendChild(core);
    } else {
      // core.js already loaded; if interpreter is up, run immediately
      if ((window as unknown as Record<string, unknown>).pyscript) {
        runChart();
      }
      // else our py:ready listener above will fire when ready
    }
  }, [runChart]);

  // MutationObserver: hide spinner when output div gets any content
  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    const obs = new MutationObserver(() => {
      if (el.childNodes.length > 0) {
        setStatus("done");
        obs.disconnect();
      }
    });
    obs.observe(el, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // Timeout fallback so the user gets feedback if packages fail to download
  useEffect(() => {
    const t = setTimeout(() => {
      setStatus(s => {
        if (s === "loading") {
          setErrMsg("Timed out — numpy/matplotlib may have failed to download. Check browser Console (F12) for details.");
          return "error";
        }
        return s;
      });
    }, 210_000); // 3.5 minutes
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      {status === "loading" && (
        <div className="flex items-start gap-3 text-gray-500 text-sm py-6">
          <span className="mt-0.5 animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full inline-block shrink-0" />
          <span>
            Loading Python runtime…{" "}
            <span className="text-gray-400 text-xs">
              numpy + matplotlib are downloaded from the Pyodide CDN (~30–60 s on first visit; cached after).
            </span>
          </span>
        </div>
      )}
      {status === "error" && (
        <p className="text-red-600 text-sm py-4">{errMsg}</p>
      )}
      <div id="ref-map-output" ref={outputRef} />
    </div>
  );
}
