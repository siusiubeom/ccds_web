import io
import base64
import numpy as np
import matplotlib.pyplot as plt
from pyscript import display
from js import document as jsdoc
import js


def add_export(fig, container_id, filename):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=150)
    b64 = base64.b64encode(buf.getvalue()).decode()
    wrap = jsdoc.createElement("div")
    wrap.style.marginTop = "12px"
    a = jsdoc.createElement("a")
    a.href = f"data:image/png;base64,{b64}"
    a.download = filename
    a.textContent = "내보내기 / Export PNG"
    a.style.cssText = (
        "display:inline-block;padding:6px 16px;background:#f3f4f6;"
        "color:#374151;border-radius:8px;font-size:13px;"
        "text-decoration:none;border:1px solid #e5e7eb;"
    )
    wrap.appendChild(a)
    jsdoc.getElementById(container_id).appendChild(wrap)


def draw_reference_map(cxcl10, nox4, ref_raw):
    n = int(ref_raw.length) if hasattr(ref_raw, "length") else 0
    refs = [[float(ref_raw[i].cxcl10), float(ref_raw[i].nox4)] for i in range(n)]

    current = [cxcl10, nox4]
    all_pts = np.array([current] + refs if refs else [current], dtype=float)

    mn = all_pts.min(axis=0)
    mx = all_pts.max(axis=0)
    rng = np.where(mx - mn == 0, 1.0, mx - mn)
    norm = (all_pts - mn) / rng

    fig, ax = plt.subplots(figsize=(10, 7), dpi=100)
    ax.set_facecolor("#f8f9fa")

    if refs:
        ax.scatter(norm[1:, 0], norm[1:, 1],
                   c="steelblue", marker="x", s=50, alpha=0.3,
                   label=f"Reference (n={len(refs)})")

    ax.scatter([norm[0, 0]], [norm[0, 1]],
               c="red", marker="o", s=180, zorder=5,
               edgecolors="darkred", linewidths=1.5,
               label="Current sample")

    ax.set_xlim(-0.05, 1.05)
    ax.set_ylim(-0.05, 1.05)
    ax.set_xlabel("CXCL10 (normalized)", fontsize=10)
    ax.set_ylabel("NOX4 (normalized)", fontsize=10)
    ax.set_title("Reference Map — Current Sample Position", fontsize=11)
    ax.legend(loc="upper right", fontsize=9)
    ax.grid(True, alpha=0.15, linestyle="--")

    display(fig, target="ref-map-output")
    add_export(fig, "ref-map-output", "reference_map.png")
    plt.close(fig)


try:
    cxcl10  = float(js.window.ccds_cxcl10)
    nox4    = float(js.window.ccds_nox4)
    ref_raw = js.window.ccds_ref_points
    draw_reference_map(cxcl10, nox4, ref_raw)
except Exception as e:
    display(f"Chart error: {e}", target="ref-map-output")
