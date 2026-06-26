import io
import numpy as np
import matplotlib.pyplot as plt
from pyscript import display
import js

DX, DY = 193, 159
PLOT_W, PLOT_H = 1300, 900

async def render(current, refs, bg_url="/ReferenceMap.png", target="ref-map-output"):
    pts = np.array([current] + refs, dtype=float)
    mn = pts.min(axis=0)
    rng = np.where(pts.max(axis=0) - mn == 0, 1, pts.max(axis=0) - mn)
    norm = (pts - mn) / rng

    try:
        resp = await js.fetch(bg_url)
        buf = await resp.arrayBuffer()
        img = plt.imread(io.BytesIO(bytes(buf.to_py())))
        H, W = img.shape[0], img.shape[1]
        plot_w = min(PLOT_W, W - DX)
        plot_h = min(PLOT_H, H - DY)
        fig = plt.figure(figsize=(W/100, H/100), dpi=100)
        plt.imshow(img)
    except Exception:
        W = H = 1600
        plot_w, plot_h = PLOT_W, PLOT_H
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
