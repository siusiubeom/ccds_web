"use client";

import { useEffect, useRef, useState } from "react";
import PyScriptLoader from "./PyScriptLoader";

interface Props {
  cxcl10: number;
  nox4: number;
}

export default function PyRiskBar({ cxcl10, nox4 }: Props) {
  const [loaded, setLoaded] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set values on window before the Python script reads them
    (window as unknown as Record<string, unknown>).__sampleCxcl10 = cxcl10;
    (window as unknown as Record<string, unknown>).__sampleNox4 = nox4;

    // Inject the PyScript tag dynamically after setting globals
    const script = document.createElement("script");
    script.type = "py";
    script.setAttribute("config", JSON.stringify({ packages: ["numpy", "matplotlib"] }));
    script.setAttribute("src", "/py/risk_bar.py");
    document.body.appendChild(script);

    const observer = new MutationObserver(() => {
      if (outputRef.current && outputRef.current.children.length > 0) {
        setLoaded(true);
        observer.disconnect();
      }
    });
    if (outputRef.current) {
      observer.observe(outputRef.current, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [cxcl10, nox4]);

  return (
    <div>
      <PyScriptLoader />
      {!loaded && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
          Loading Python runtime… (this may take a minute on first load)
        </div>
      )}
      <div id="risk-bar-output" ref={outputRef} />
    </div>
  );
}
