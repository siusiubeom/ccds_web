"use client";
import Script from "next/script";

export default function PyScriptLoader() {
  return (
    <>
      <link rel="stylesheet" href="https://pyscript.net/releases/2024.11.1/core.css" />
      <Script
        type="module"
        src="https://pyscript.net/releases/2024.11.1/core.js"
        strategy="afterInteractive"
      />
    </>
  );
}
