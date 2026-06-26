"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

interface RefPoint { cxcl10: number; nox4: number; }
interface Props { cxcl10: number; nox4: number; refPoints: RefPoint[]; }

export default function RefMapChart({ cxcl10, nox4, refPoints }: Props) {
  const [loaded, setLoaded] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Run after PyScript interpreter + packages are ready
  const afterPyReady = useCallback(() => {
    if (document.getElementById("ccds-refmap-py")) return;

    const win = window as unknown as Record<string, unknown>;
    win.ccds_cxcl10     = cxcl10;
    win.ccds_nox4       = nox4;
    win.ccds_ref_points = refPoints;

    const script = document.createElement("script");
    script.type = "py";
    script.id   = "ccds-refmap-py";
    script.setAttribute("src", "/py/charts.py");
    document.body.appendChild(script);
  }, [cxcl10, nox4, refPoints]);

  // core.js onLoad → wait for py:ready (async Pyodide init + package download)
  const onCoreLoad = useCallback(() => {
    // If pyscript is already available on window, interpreter is ready
    if ((window as unknown as Record<string, unknown>).pyscript) {
      afterPyReady();
    } else {
      document.addEventListener("py:ready", afterPyReady, { once: true });
    }
  }, [afterPyReady]);

  // Watch the output div for children to know when the chart rendered
  useEffect(() => {
    if (!outputRef.current) return;
    const obs = new MutationObserver(() => {
      if (outputRef.current && outputRef.current.childElementCount > 0) {
        setLoaded(true);
        obs.disconnect();
      }
    });
    obs.observe(outputRef.current, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  return (
    <div>
      {/*
        <py-config> must be in the DOM *before* core.js initialises so Pyodide
        downloads numpy + matplotlib during its startup phase.
        type="json" tells PyScript to parse as JSON, not TOML.
      */}
      <div
        dangerouslySetInnerHTML={{
          __html: '<py-config type="json">{"packages":["numpy","matplotlib"]}</py-config>',
        }}
      />
      <link
        rel="stylesheet"
        href="https://pyscript.net/releases/2024.11.1/core.css"
      />
      <Script
        type="module"
        src="https://pyscript.net/releases/2024.11.1/core.js"
        strategy="afterInteractive"
        onLoad={onCoreLoad}
      />
      {!loaded && (
        <div className="flex items-start gap-3 text-gray-500 text-sm py-6">
          <span className="mt-0.5 animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full inline-block shrink-0" />
          <span>
            Loading Python runtime…{" "}
            <span className="text-gray-400 text-xs">
              numpy + matplotlib download ~30–60 s on first visit; cached after that.
              If stuck beyond 3 min, check browser DevTools → Console.
            </span>
          </span>
        </div>
      )}
      <div id="ref-map-output" ref={outputRef} />
    </div>
  );
}
