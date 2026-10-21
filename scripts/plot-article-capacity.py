"""Render the article's measured figure and its public aggregate data."""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "content/data/light-dex-capacity.json"
data = json.loads(source.read_text())
runs = data["runs"]
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 12,
    "text.color": "#d5e7e5", "axes.labelcolor": "#91aab0",
    "xtick.color": "#91aab0", "ytick.color": "#91aab0",
    "svg.fonttype": "none", "svg.hashsalt": "light-dex-article",
})
fig, axes = plt.subplots(1, 2, figsize=(9, 5.4), facecolor="#0b151b")
fig.subplots_adjust(left=.085, right=.965, bottom=.24, top=.75, wspace=.34)
colors = ["#83ead1", "#f0b37b"]
labels = [f'{r["requested_tps"]:,} requested\n{r["configured_measure_seconds"]} seconds' for r in runs]
for ax, key, title, maximum in [
    (axes[0], "successful_tps", "Successful transactions / sec", 3200),
    (axes[1], "scheduled_to_commit_p95_ms", "Scheduled → durable commit · p95", 1000),
]:
    ax.set_facecolor("#0b151b")
    ax.bar([0, 1], [r[key] for r in runs], color=colors, width=.5, zorder=3)
    ax.set_xticks([0,1], labels, fontsize=11)
    ax.set_ylim(0,maximum)
    ax.set_title(title, fontsize=11, color="#d5e7e5", pad=18)
    ax.grid(axis="y", color="#243b44", linewidth=.7, zorder=0)
    ax.spines[["top","right","left"]].set_visible(False)
    ax.spines["bottom"].set_color("#36515a")
    ax.tick_params(length=0, pad=9)
    for i,r in enumerate(runs):
        label=f'{r[key]:,.0f}' + (" ms" if key.endswith("_ms") else "")
        ax.text(i,r[key]+maximum*.035,label,ha="center",fontsize=14,fontweight="bold")
axes[1].axhline(500, color="#91aab0", linestyle="--", linewidth=1)
axes[1].text(.02, 520, "500 ms target", fontsize=10, color="#91aab0")
fig.text(.085,.925,"More throughput. Much more waiting.",fontsize=19,weight="bold")
fig.text(.085,.865,"4 pinned HotStuff validators · BTC / ETH / SOL spot + perp",fontsize=11,color="#91aab0")
fig.text(.085,.10,"Both runs: zero missed driver slots; signed-journal replay passed.",fontsize=10,color="#91aab0")
fig.text(.085,.055,"One laptop · shared CPU and disk · 19 Oct 2026",fontsize=9,color="#91aab0")
out = ROOT / "public/diagrams/light-dex-capacity.svg"
fig.savefig(out, format="svg", facecolor=fig.get_facecolor(), metadata={"Date": None})
public_data = ROOT / "public/data/light-dex-capacity.json"
public_data.parent.mkdir(parents=True, exist_ok=True)
public_data.write_text(source.read_text())
print(f"Rendered {out.name} and public aggregate JSON")
