# CLAUDE.md

> Build spec for an AI agent (Claude Code). Read this top-to-bottom before writing
> any code. Build in the **phase order** in §12. Do not skip the guardrails in §13.

---

## 0. What we are building (TL;DR)

A **Next.js (App Router) + TailwindCSS + ESLint** web app that:

1. Collects biomarker samples (`CXCL10`, `NOX4`, and optionally `RBP4`, `CCDR`) and
   stores them in **Postgres via Prisma**, hosted on **Supabase**.
2. Splits the app into a **User area** and an **Admin area**.
3. **Admin approves/rejects user sign-ups.** Unapproved users cannot use the app.
4. Renders two charts **client-side with PyScript (Python in the browser)**, ported
   from the original matplotlib scripts in §8 — a **Risk gradient bar** and a
   **Reference map**.
5. Has a **"model update" capability that is deferred** — for now we only *collect*
   data into Prisma. Admin gets a placeholder Models page; thresholds live in the DB
   so they can be edited later without a redeploy.
6. Keeps the **free Supabase project from auto-pausing** via a scheduled keep-alive
   job that runs a *varying* query roughly every 3 days.

Everything ships as **one Next.js app**. No separate Python backend.

> ⚠️ **Domain note:** this is a **veterinary** tool. The biomarker data and "risk"
> category describe a **senior/aging dog**, not a human/child. (The original Korean
> script said "아이의 현재 위치" — "the kid's current position" — but that was casual
> phrasing for the animal; the subject is a dog.) This is a **research/visualization
> tool, not a medical/diagnostic device.** Add the disclaimer in §13 to every results
> view. Do not present output as diagnosis. Use neutral/pet-appropriate copy in the UI
> (e.g. "this dog", "current sample") rather than human-clinical language.

### Original requirements (verbatim, Korean — source of truth)
```
- prisma로 데이터 모으고 관리자에게 연결되서 모델 업데이트 가능하게
- pyscript로 client side python code 진행해서 그래프 만들기
- 유저 페이지 / 관리자 페이지 구분
- 관리자 페이지에서 유저 회원가입 결정 및 모델 업데이트 결정
  (일단 모델 업데이트는 나중에, 데이터만 prisma에 모아놓는 식으로 진행)
- supabase 연결 (3일에 한 번씩 변동하는 query 줘서 비활성화 안되게)
- 일단 전부를 next js 로 진행
```

---

## 1. Assumptions about the current project

The project already exists (created by WebStorm's Next.js generator) with:
- **Next.js App Router** (`app/` directory), **React 19+**, **TypeScript**.
- **TailwindCSS** already wired in.
- **ESLint** configured.

**First action:** verify the actual versions before assuming APIs.
```bash
cat package.json
npx next --version
```
- If **Tailwind v4** → there is no `tailwind.config.js`; theme/utilities are configured
  in `app/globals.css` via `@import "tailwindcss";` and `@theme { … }`.
- If **Tailwind v3** → use `tailwind.config.ts`.
  Detect which one is present and follow that convention. Do **not** introduce a
  conflicting config.

If `src/` is used instead of root `app/`, keep the existing layout — adapt all paths
below accordingly.

---

## 2. Tech stack & libraries

| Concern            | Choice                                                            |
|--------------------|-------------------------------------------------------------------|
| Framework          | Next.js App Router (Server Components + Route Handlers)            |
| DB / ORM           | Postgres (Supabase) + **Prisma**                                  |
| Auth               | **Auth.js v5 (`next-auth@5`)** Credentials provider + Prisma adapter |
| Passwords          | `bcryptjs`                                                         |
| Validation         | `zod`                                                              |
| Client charts      | **PyScript** (Pyodide) running ported matplotlib code             |
| Styling            | TailwindCSS (existing)                                            |
| Scheduling         | Vercel Cron (preferred) **or** GitHub Actions fallback           |

Install:
```bash
npm i @prisma/client next-auth@beta @auth/prisma-adapter bcryptjs zod
npm i -D prisma @types/bcryptjs tsx
npx prisma init
```
> Pin `next-auth` to the v5 line. If `@beta` has graduated to a stable v5 tag by the
> time you build, use that instead — confirm with `npm view next-auth version`.

---

## 3. Environment variables

Create `.env` (and a committed `.env.example` without secrets):

```dotenv
# Supabase Postgres — POOLED connection (PgBouncer, port 6543) for the app
DATABASE_URL="postgresql://postgres.[ref]:[pw]@aws-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
# Supabase Postgres — DIRECT connection (port 5432) for migrations/seed
DIRECT_URL="postgresql://postgres.[ref]:[pw]@aws-region.pooler.supabase.com:5432/postgres"

# Auth.js
AUTH_SECRET="<generate: npx auth secret>"
AUTH_URL="http://localhost:3000"

# Keep-alive cron
CRON_SECRET="<random long string>"

# Optional supabase-js (not required for Prisma path)
NEXT_PUBLIC_SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
```

Get the two connection strings from **Supabase → Project → Connect → ORMs/Prisma**.
The pooled URL is for the running app; the direct URL is for `prisma migrate`/`seed`.

---

## 4. Data model (Prisma)

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled
  directUrl = env("DIRECT_URL")     // direct, for migrate/seed
}

enum UserRole   { USER ADMIN }
enum UserStatus { PENDING APPROVED REJECTED }
enum SampleSource { USER REFERENCE IMPORT }

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  name         String?
  role         UserRole   @default(USER)
  status       UserStatus @default(PENDING)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  approvedById String?
  approvedBy   User?      @relation("Approvals", fields: [approvedById], references: [id])
  approved     User[]     @relation("Approvals")

  samples      Sample[]
}

/// One biomarker measurement. Live user samples have label = null.
model Sample {
  id        String       @id @default(cuid())
  userId    String?
  user      User?        @relation(fields: [userId], references: [id])

  rbp4      Float?
  cxcl10    Float
  nox4      Float
  ccdrOri   Int?
  label     Int?         // 0/1/2 for seeded reference rows; null for live
  source    SampleSource @default(USER)
  group     String?      // computed: "High" | "Moderate" | "Normal"
  createdAt DateTime     @default(now())

  @@index([source])
  @@index([userId])
}

/// Deferred "model update" feature. Admin can edit thresholds later (no redeploy).
model RiskModel {
  id          String   @id @default(cuid())
  version     Int      @unique
  thresholds  Json     // see §7 DEFAULT_THRESHOLDS shape
  active      Boolean  @default(false)
  note        String?
  createdById String?
  createdAt   DateTime @default(now())
}

/// Audit trail for the Supabase keep-alive pings (also makes each ping a write).
model KeepAlive {
  id       String   @id @default(cuid())
  token    String
  pingedAt DateTime @default(now())
}
```

Then:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

`lib/prisma.ts` (singleton to avoid dev hot-reload connection storms):
```ts
import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
```

---

## 5. Seeding the reference data

The file **`reference.csv`** (shipped alongside this spec) holds the original training
table: columns `rbp4,cxcl10,nox4,ccdr_ori,label` with labels 0/1/2. These become the
blue-X background points of the Reference map.

1. Copy `reference.csv` → `prisma/seed-data/reference.csv`.
2. Also drop the original **`ReferenceMap.png`** background image into `public/`
   (the user must provide it — if missing, the Reference map should render a plain
   white background and still plot points; do not crash).
3. `prisma/seed.ts`:

```ts
import { PrismaClient, SampleSource } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Default admin (change the password after first login)
  const adminEmail = "admin@example.com";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      status: "APPROVED",
      passwordHash: await bcrypt.hash("ChangeMe123!", 10),
    },
  });

  // Reference samples (idempotent: clear prior REFERENCE rows first)
  await prisma.sample.deleteMany({ where: { source: SampleSource.REFERENCE } });
  const csv = readFileSync(join(process.cwd(), "prisma/seed-data/reference.csv"), "utf8");
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const data = rows.map((line) => {
    const [rbp4, cxcl10, nox4, ccdr, label] = line.split(",").map(Number);
    return {
      rbp4, cxcl10, nox4, ccdrOri: ccdr, label,
      source: SampleSource.REFERENCE,
    };
  });
  await prisma.sample.createMany({ data });

  console.log(`Seeded ${data.length} reference samples + admin user.`);
}

main().finally(() => prisma.$disconnect());
```

4. Wire the seed in `package.json`:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```
5. Run: `npx prisma db seed`

---

## 6. Routes & file layout

```
app/
  layout.tsx
  page.tsx                         # public landing → links to login/register
  globals.css
  (auth)/
    login/page.tsx
    register/page.tsx
  (user)/
    layout.tsx                     # guard: session + status=APPROVED
    dashboard/page.tsx             # submit a sample
    result/[sampleId]/page.tsx     # shows PyScript charts for a sample
  admin/
    layout.tsx                     # guard: session + role=ADMIN
    page.tsx                       # admin home / stats
    users/page.tsx                 # approve / reject sign-ups
    data/page.tsx                  # browse collected samples
    models/page.tsx                # DEFERRED model-update placeholder
  api/
    register/route.ts              # POST: create PENDING user
    samples/route.ts               # POST: create user sample (classifies + stores)
    samples/reference/route.ts     # GET: reference points for the map
    admin/users/[id]/route.ts      # PATCH: approve/reject (admin only)
    cron/keep-alive/route.ts       # GET: Supabase keep-alive (CRON_SECRET)
auth.ts                            # Auth.js config (see §9)
middleware.ts                      # route protection
lib/
  prisma.ts
  risk.ts                          # TS port of the classifier (server-authoritative)
components/
  PyRiskBar.tsx                    # PyScript risk gradient bar
  PyReferenceMap.tsx               # PyScript reference map
  PyScriptLoader.tsx               # loads PyScript assets once
public/
  ReferenceMap.png                 # background (user-provided)
  py/
    risk_bar.py
    reference_map.py
prisma/
  schema.prisma
  seed.ts
  seed-data/reference.csv
```

---

## 7. Risk classification — server-authoritative TS port

Compute and **store** `group` on every sample (TS, server-side) so analytics/admin
don't depend on the browser. PyScript independently recomputes for drawing. Keep both
in sync via the same thresholds.

`lib/risk.ts`:
```ts
export type Group = "High" | "Moderate" | "Normal";

export const DEFAULT_THRESHOLDS = {
  cxcl10Low: 293,    // CXCL10 < 293 ⇒ "low" band
  cxcl10Max: 1000,
  high:  { lo: 0,    hi: 2.3 },   // NOX4, low-CXCL10
  mid1:  { lo: 2.3,  hi: 3.3 },   // NOX4, low-CXCL10  → Moderate
  mid2:  { lo: 0,    hi: 0.79 },  // NOX4, high-CXCL10 → Moderate (placed via CXCL10)
  norm1: { lo: 3.3,  hi: 10 },    // NOX4, low-CXCL10  → Normal
  norm2: { lo: 0.79, hi: 10 },    // NOX4, high-CXCL10 → Normal
} as const;

export type Classification = {
  group: Group;
  flag: "high" | "mid1" | "mid2" | "norm1" | "norm2";
  /** which axis + range the gradient-bar dot is placed against */
  placement: { metric: "nox4" | "cxcl10"; lo: number; hi: number };
} | null;

export function classify(cxcl10: number, nox4: number, t = DEFAULT_THRESHOLDS): Classification {
  const low = cxcl10 > 0 && cxcl10 < t.cxcl10Low;
  const high = cxcl10 >= t.cxcl10Low && cxcl10 < t.cxcl10Max;

  if (low && nox4 > t.high.lo && nox4 < t.high.hi)
    return { group: "High", flag: "high", placement: { metric: "nox4", lo: t.high.lo, hi: t.high.hi } };
  if (low && nox4 >= t.mid1.lo && nox4 < t.mid1.hi)
    return { group: "Moderate", flag: "mid1", placement: { metric: "nox4", lo: t.mid1.lo, hi: t.mid1.hi } };
  if (high && nox4 > t.mid2.lo && nox4 < t.mid2.hi)
    return { group: "Moderate", flag: "mid2", placement: { metric: "cxcl10", lo: t.cxcl10Low, hi: t.cxcl10Max } };
  if (low && nox4 >= t.norm1.lo && nox4 < t.norm1.hi)
    return { group: "Normal", flag: "norm1", placement: { metric: "nox4", lo: t.norm1.lo, hi: t.norm1.hi } };
  if (high && nox4 >= t.norm2.lo && nox4 < t.norm2.hi)
    return { group: "Normal", flag: "norm2", placement: { metric: "nox4", lo: t.norm2.lo, hi: t.norm2.hi } };
  return null; // does not fit any category
}
```

> This faithfully reproduces the original branching in `3graph_ver2.py`. The "reverse"
> segment behavior (10 segments, max value → segment nearest the *left*) lives in the
> PyScript drawing code, §8.

When `classify()` returns `null`, the API should reject the sample with a clear 422
("sample does not fit any category") rather than storing a `group=null` row.

---

## 8. PyScript charts (client-side Python)

We honor the requirement: **graphs are produced by Python in the browser via PyScript**,
ported from the two original matplotlib scripts.

### 8.1 Loading PyScript in Next.js

PyScript ships as CSS + JS from its CDN and uses `<script type="py">` / `<script type="mpy">`.
In React, load assets once, then mount a Python script tag.

`components/PyScriptLoader.tsx` (client):
```tsx
"use client";
import Script from "next/script";
export default function PyScriptLoader() {
  return (
    <>
      {/* Pin to the latest stable PyScript release. Verify the tag at https://pyscript.net */}
      <link rel="stylesheet" href="https://pyscript.net/releases/2025.7.1/core.css" />
      <Script type="module" src="https://pyscript.net/releases/2025.7.1/core.js" strategy="afterInteractive" />
    </>
  );
}
```
> Before building, **confirm the current release tag** (the `2025.7.1` above is a
> placeholder) — check pyscript.net and use the newest stable release.

Heavy packages (`matplotlib`, `numpy`) download from the Pyodide CDN at runtime
(tens of MB). **Do NOT pull in `pandas` or `scikit-learn`** — they are large and
unnecessary here:
- The original `MinMaxScaler` is just `(x - min) / (max - min)` → do it in NumPy.
- The original `pd.read_csv` is replaced by data passed in from JS (from our DB).

Always show a "Loading Python runtime…" state until the chart renders.

### 8.2 Passing data from React → Python

Render a `<script type="py" config="...">` with a `py-config` that lists packages and
maps the `.py` file, then call its functions via the PyScript JS interop, OR set values
on `window` before the script runs. Simplest robust pattern: write the inputs onto
`globalThis` and read them with the `js` module inside Python.

Config (inline JSON) for both charts:
```json
{ "packages": ["numpy", "matplotlib"], "files": { "./py/risk_bar.py": "" } }
```

### 8.3 `public/py/risk_bar.py` — Risk gradient bar (port of `3graph_ver2.py`)

Three white→color gradient bars (Normal=green, Moderate=orange, High=red). The sample is
classified, then a black dot is placed in one of **10 segments** of the matching bar.
Segment index is **reversed**: the max end of the range maps to the **leftmost** segment.

```python
import numpy as np
import matplotlib.pyplot as plt
from pyscript import display
import js

BARS = [
    ("Normal",   (0.000, 0.784, 0.000)),
    ("Moderate", (0.953, 0.573, 0.000)),
    ("High",     (0.894, 0.102, 0.110)),
]
CX_LOW, CX_MAX = 293.0, 1000.0

def classify(cxcl10, nox4):
    low  = 0 < cxcl10 < CX_LOW
    high = CX_LOW <= cxcl10 < CX_MAX
    if low  and 0   < nox4 < 2.3:   return "High",     ("nox4", 0.0,  2.3)
    if low  and 2.3 <= nox4 < 3.3:  return "Moderate", ("nox4", 2.3,  3.3)
    if high and 0   < nox4 < 0.79:  return "Moderate", ("cxcl10", CX_LOW, CX_MAX)
    if low  and 3.3 <= nox4 < 10:   return "Normal",   ("nox4", 3.3,  10.0)
    if high and 0.79 <= nox4 < 10:  return "Normal",   ("nox4", 0.79, 10.0)
    return None, None

def seg_center(value, lo, hi, x_left, x_right, reverse=True):
    frac = (value - lo) / (hi - lo)
    seg = int(frac * 10)
    seg = max(0, min(9, seg))      # clamp (original had an off-by-one at value==hi)
    if reverse:
        seg = 9 - seg
    return x_left + (seg + 0.5) / 10.0 * (x_right - x_left)

def render(cxcl10, nox4, target="risk-bar-output"):
    group, place = classify(cxcl10, nox4)
    if group is None:
        display("Sample does not fit any risk category.", target=target)
        return

    bar_w, bar_h, pad = 1000, 400, 100
    fig, ax = plt.subplots(figsize=(30/2.54, 4/2.54), dpi=150)
    ax.set_axis_off()
    centers = {}
    frac = np.linspace(0, 1, bar_w)
    for i, (name, rgb) in enumerate(BARS):
        grad = np.zeros((bar_h, bar_w, 4))
        for c in range(3):
            grad[..., c] = 1 - frac + frac * rgb[c]   # white → color, left→right
        grad[..., 3] = 1
        x0 = i * (bar_w + pad)
        centers[name] = (x0, x0 + bar_w)
        label = "Moderate Risk" if name == "Moderate" else name
        ax.imshow(grad, extent=[x0, x0 + bar_w, bar_h, 0], origin="upper")
        ax.text((2*x0 + bar_w)/2, bar_h + 40, label, ha="center", va="bottom",
                fontsize=12, color=rgb)

    xl, xr = centers[group]
    metric, lo, hi = place
    value = nox4 if metric == "nox4" else cxcl10
    x_pt = seg_center(value, lo, hi, xl, xr, reverse=True)
    ax.scatter(x_pt, bar_h/2, color="black", s=100, zorder=5)

    total_w = 3*bar_w + 2*pad
    ax.set_xlim(0, total_w)
    ax.set_ylim(bar_h + 60, 0)
    display(fig, target=target)

# Inputs are injected on window by the React component before this runs.
render(float(js.window.__sampleCxcl10), float(js.window.__sampleNox4))
```
> Note: the original used the Korean font "Malgun Gothic"; the bar labels here are
> English so no CJK font is required in Pyodide. If you add Korean labels, register a
> CJK font in the Pyodide FS or keep labels ASCII.

### 8.4 `public/py/reference_map.py` — Reference map (port of `LastResult_ver2.py`)

Red ● = current sample, blue ✕ (alpha 0.2) = all reference samples, over the
`ReferenceMap.png` background. Min-max scaling over CXCL10/NOX4 of the combined set,
mapped into a pixel sub-rectangle offset by `(dx, dy)=(193, 159)`.

```python
import io
import numpy as np
import matplotlib.pyplot as plt
from pyscript import display
import js

DX, DY = 193, 159
PLOT_W, PLOT_H = 1300, 900

async def render(current, refs, bg_url="/ReferenceMap.png", target="ref-map-output"):
    # current = [cxcl10, nox4]; refs = [[cxcl10, nox4], ...]
    pts = np.array([current] + refs, dtype=float)
    mn = pts.min(axis=0)
    rng = np.where(pts.max(axis=0) - mn == 0, 1, pts.max(axis=0) - mn)
    norm = (pts - mn) / rng

    try:
        resp = await js.fetch(bg_url)
        buf = await resp.arrayBuffer()
        img = plt.imread(io.BytesIO(bytes(buf.to_py())))
        H, W = img.shape[0], img.shape[1]
        plot_w = min(PLOT_W, W - DX); plot_h = min(PLOT_H, H - DY)
        fig = plt.figure(figsize=(W/100, H/100), dpi=100)
        plt.imshow(img)
    except Exception:
        W = H = 1600; plot_w, plot_h = PLOT_W, PLOT_H
        fig = plt.figure(figsize=(W/100, H/100), dpi=100)
        plt.gca().set_facecolor("white")

    x_px = DX + norm[:, 0] * plot_w
    y_px = H - DY - norm[:, 1] * plot_h
    plt.scatter(x_px[1:], y_px[1:], color="blue", marker="x", s=100, alpha=0.2)
    plt.scatter(x_px[0], y_px[0], color="red", marker="o", s=120, label="Current sample")
    plt.axis("off")
    plt.legend(loc="upper right", fontsize=8)
    display(fig, target=target)

import asyncio
current = [float(js.window.__sampleCxcl10), float(js.window.__sampleNox4)]
refs = [[r.cxcl10, r.nox4] for r in js.window.__refPoints]
asyncio.ensure_future(render(current, refs))
```

### 8.5 React wrappers

`components/PyRiskBar.tsx` and `components/PyReferenceMap.tsx` (both `"use client"`):
- Receive `cxcl10`, `nox4` (and reference points for the map) as props.
- On mount: set `window.__sampleCxcl10 / __sampleNox4` (and `window.__refPoints`),
  render the `<PyScriptLoader/>`, then inject a `<script type="py" config={…} src="/py/…py">`.
- Provide the `<div id="risk-bar-output">` / `<div id="ref-map-output">` targets.
- Show a spinner until the figure appears (observe the target node for children).
- The Reference map fetches points from `GET /api/samples/reference` server-side and
  passes them down (don't fetch the whole DB into the client unfiltered — cap it).

Keep these components **client-only** and lazy (`next/dynamic`, `ssr:false`) so the
PyScript runtime never runs during SSR.

---

## 9. Auth & admin-approval gate

`auth.ts` — Auth.js v5, Credentials provider:
- `authorize`: look up user by email, `bcrypt.compare` the password.
    - If user missing / bad password → return null.
    - If `status !== "APPROVED"` → throw a friendly error ("Your account is awaiting
      admin approval." or "rejected"). Surface this on the login page.
- Session strategy: `jwt`. Put `role` and `status` into the token/session callbacks.

Sign-up flow:
- `POST /api/register` (zod-validate email/password/name) → create `User` with
  `role=USER, status=PENDING`. Never let the client set role/status.
- After register, show "Awaiting approval" — do **not** auto sign-in PENDING users.

`middleware.ts`:
- Protect `(user)/*` → require a session **and** `status=APPROVED`.
- Protect `admin/*` → require `role=ADMIN`.
- Redirect unauthenticated → `/login`; non-admins hitting `/admin` → `/dashboard`.

Also enforce the same checks inside `(user)/layout.tsx` and `admin/layout.tsx`
(defense in depth; middleware alone is not enough for Server Component data reads).

---

## 10. APIs

| Route | Method | Auth | Behavior |
|---|---|---|---|
| `/api/register` | POST | public | zod-validate → create PENDING user (hash pw). |
| `/api/samples` | POST | approved user | zod-validate {cxcl10, nox4, rbp4?, ccdrOri?} → `classify()` → store with `group`, `source=USER`, `userId`. Return the sample id. 422 if classify→null. |
| `/api/samples/reference` | GET | approved user | return `[{cxcl10, nox4}]` for `source=REFERENCE` (cap ~500, no PII). |
| `/api/admin/users/[id]` | PATCH | admin | `{action:"approve"\|"reject"}` → set status + `approvedById`. |
| `/api/cron/keep-alive` | GET | `CRON_SECRET` | see §11. |

All write routes: validate with zod, return typed JSON, never trust client-set
`role`/`status`/`userId`.

---

## 11. Supabase keep-alive (the "varying query every ~3 days")

Free Supabase projects pause after inactivity. A scheduled job issues a **write+read**
so the project stays warm. We make the query **vary every run** (per the requirement)
by inserting a unique token and counting:

`app/api/cron/keep-alive/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // Varying write: a fresh token each run
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await prisma.keepAlive.create({ data: { token } });
  // Varying read: count + most recent, prune old rows so the table stays small
  const total = await prisma.keepAlive.count();
  await prisma.keepAlive.deleteMany({
    where: { pingedAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } },
  });
  return NextResponse.json({ ok: true, token, total });
}
```

Schedule it. **Preferred — Vercel Cron** (`vercel.json`):
```json
{ "crons": [{ "path": "/api/cron/keep-alive", "schedule": "0 3 */3 * *" }] }
```
`0 3 */3 * *` = 03:00 every 3rd day. Vercel sends the `CRON_SECRET` automatically if you
add it as the bearer in the cron config / or verify via the `x-vercel-cron` header —
adapt to current Vercel cron auth docs.

**Fallback if not on Vercel — GitHub Actions** (`.github/workflows/keepalive.yml`):
```yaml
on:
  schedule: [{ cron: "0 3 */3 * *" }]
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.APP_URL }}/api/cron/keep-alive"
```

> Note: a paused project can't be un-paused by a request — this keeps an *active*
> project alive; it does not revive an already-paused one.

---

## 12. Build order (do it in this sequence; commit after each phase)

1. **Verify project** — versions, Tailwind v3 vs v4, lint runs clean (§1).
2. **Deps + Prisma init + env** (§2–3). Confirm `prisma migrate dev` connects to Supabase.
3. **Schema + migrate + seed** reference data and admin user (§4–5).
4. **Auth**: register API, Auth.js config, login/register pages, approval gate,
   middleware (§9). Manually verify PENDING users are blocked.
5. **User dashboard**: sample-submit form → `/api/samples` → store + classify (§7, §10).
6. **PyScript charts**: risk bar + reference map on the result page (§8). Verify they
   render for a known sample (e.g. CXCL10=767.230, NOX4=9.99 from the example file).
7. **Admin pages**: users (approve/reject), data browser, **Models placeholder** that
   reads `RiskModel` and clearly states "model updates coming later — data is being
   collected now" (§0, §4).
8. **Keep-alive** cron + schedule (§11).
9. **Polish**: empty/loading/error states, the medical disclaimer (§13), `npm run lint`
   and `npm run build` both green.

After each phase, run `npm run lint` and fix issues — ESLint is part of the stack.

---

## 13. Guardrails (non-negotiable)

- **Not a veterinary diagnostic device.** Every results view must show: *"For
  research/visualization only. Not a veterinary diagnosis. Consult a licensed
  veterinarian."* Do not phrase output as a diagnosis or treatment recommendation.
- **Server is authoritative.** Classification stored in DB comes from `lib/risk.ts`,
  not from the browser. PyScript only *draws*.
- **Never trust the client** for `role`, `status`, or `userId`. Admin-only routes check
  the session role server-side every time.
- **Secrets** stay in `.env` / platform env vars. Only `NEXT_PUBLIC_*` may reach the
  browser. The service-role key must never be exposed client-side.
- **Passwords** are bcrypt-hashed; never logged or returned.
- **Reference endpoint** returns only `{cxcl10, nox4}` — no labels-as-PII, no user data.
- **PyScript heavy packages**: only `numpy` + `matplotlib`. No pandas/sklearn in the
  browser. Always render a loading state; the first load is slow.
- **Model update is deferred**: build the `RiskModel` table + admin placeholder, but do
  not implement retraining/threshold-editing logic yet. Just keep collecting samples.
- If `ReferenceMap.png` is absent, the map still renders (white background) — never crash.

---

## 14. Quick reference — original example input

`data.txt` analog (single live sample), tab/whitespace separated:
```
CXCL10    NOX4
767.230   9.99
```
With CXCL10=767.230 (≥293, "high" band) and NOX4=9.99 — note NOX4=9.99 is just under 10,
so it classifies as **Normal (norm2)**; NOX4≥10 would fit no category (422). Use this
sample to smoke-test the whole pipeline end to end.