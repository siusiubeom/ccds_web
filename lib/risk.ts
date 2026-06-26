export type Group = "High" | "Moderate" | "Normal";

export const DEFAULT_THRESHOLDS = {
  cxcl10Low: 293,
  cxcl10Max: 1000,
  high:  { lo: 0,    hi: 2.3 },
  mid1:  { lo: 2.3,  hi: 3.3 },
  mid2:  { lo: 0,    hi: 0.79 },
  norm1: { lo: 3.3,  hi: 10 },
  norm2: { lo: 0.79, hi: 10 },
} as const;

export type Classification = {
  group: Group;
  flag: "high" | "mid1" | "mid2" | "norm1" | "norm2";
  placement: { metric: "nox4" | "cxcl10"; lo: number; hi: number };
} | null;

export function classify(cxcl10: number, nox4: number, t = DEFAULT_THRESHOLDS): Classification {
  const low  = cxcl10 > 0 && cxcl10 < t.cxcl10Low;
  const high = cxcl10 >= t.cxcl10Low && cxcl10 < t.cxcl10Max;

  if (low  && nox4 > t.high.lo  && nox4 < t.high.hi)
    return { group: "High",     flag: "high",  placement: { metric: "nox4",   lo: t.high.lo,  hi: t.high.hi } };
  if (low  && nox4 >= t.mid1.lo && nox4 < t.mid1.hi)
    return { group: "Moderate", flag: "mid1",  placement: { metric: "nox4",   lo: t.mid1.lo,  hi: t.mid1.hi } };
  if (high && nox4 > t.mid2.lo  && nox4 < t.mid2.hi)
    return { group: "Moderate", flag: "mid2",  placement: { metric: "cxcl10", lo: t.cxcl10Low, hi: t.cxcl10Max } };
  if (low  && nox4 >= t.norm1.lo && nox4 < t.norm1.hi)
    return { group: "Normal",   flag: "norm1", placement: { metric: "nox4",   lo: t.norm1.lo,  hi: t.norm1.hi } };
  if (high && nox4 >= t.norm2.lo && nox4 < t.norm2.hi)
    return { group: "Normal",   flag: "norm2", placement: { metric: "nox4",   lo: t.norm2.lo,  hi: t.norm2.hi } };
  return null;
}
