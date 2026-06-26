"use client";

import { useEffect, useRef, useState } from "react";
import PyScriptLoader from "./PyScriptLoader";

interface RefPoint { cxcl10: number; nox4: number; }

interface Props {
  cxcl10: number;
  nox4: number;
  refPoints: RefPoint[];
}

export default function PyReferenceMap({ cxcl10, nox4, refPoints }: Props) {
  const [loaded, setLoaded] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;
    win.__sampleCxcl10 = cxcl10;
    win.__sampleNox4 = nox4;
    win.__refPoints = refPoints;

    const script = document.createElement("script");
    script.type = "py";
    script.setAttribute("config", JSON.stringify({ packages: ["numpy", "matplotlib"] }));
    script.setAttribute("src", "/py/reference_map.py");
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
  }, [cxcl10, nox4, refPoints]);

  return (
    <div>
      <PyScriptLoader />
      {!loaded && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
          Loading reference map…
        </div>
      )}
      <div id="ref-map-output" ref={outputRef} />
    </div>
  );
}
