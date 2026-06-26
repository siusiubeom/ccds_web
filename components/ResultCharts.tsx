"use client";

import CssRiskBar, { type RiskGroup } from "./CssRiskBar";
import dynamic from "next/dynamic";

const RefMapChart = dynamic(() => import("./RefMapChart"), { ssr: false });

interface RefPoint { cxcl10: number; nox4: number; }
interface Props {
  group: RiskGroup;
  cxcl10: number;
  nox4: number;
  refPoints: RefPoint[];
}

export default function ResultCharts({ group, cxcl10, nox4, refPoints }: Props) {
  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold mb-4">Risk Gradient Bar</h2>
        <CssRiskBar group={group} cxcl10={cxcl10} nox4={nox4} />
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold mb-4">Reference Map — this dog&apos;s current position</h2>
        <RefMapChart cxcl10={cxcl10} nox4={nox4} refPoints={refPoints} />
      </div>
    </>
  );
}
