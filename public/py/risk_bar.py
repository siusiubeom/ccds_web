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
    if low  and 0    < nox4 < 2.3:   return "High",     ("nox4", 0.0,   2.3)
    if low  and 2.3 <= nox4 < 3.3:   return "Moderate", ("nox4", 2.3,   3.3)
    if high and 0    < nox4 < 0.79:  return "Moderate", ("cxcl10", CX_LOW, CX_MAX)
    if low  and 3.3 <= nox4 < 10:    return "Normal",   ("nox4", 3.3,  10.0)
    if high and 0.79 <= nox4 < 10:   return "Normal",   ("nox4", 0.79, 10.0)
    return None, None

def seg_center(value, lo, hi, x_left, x_right, reverse=True):
    frac = (value - lo) / (hi - lo)
    seg = int(frac * 10)
    seg = max(0, min(9, seg))
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
            grad[..., c] = 1 - frac + frac * rgb[c]
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

render(float(js.window.__sampleCxcl10), float(js.window.__sampleNox4))
