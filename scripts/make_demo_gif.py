from PIL import Image
from pathlib import Path

out = Path("outputs")
files = ["dashboard.png", "monthly_analysis.png", "category_analysis.png", "region_analysis.png",
         "customer_analysis.png", "customer_rfm.png", "cohort_retention.png", "targets_&_variance.png",
         "validation.png", "data_dictionary.png"]
W = 1100
frames = []
for f in files:
    im = Image.open(out / f).convert("RGB")
    h = int(im.height * W / im.width)
    frames.append(im.resize((W, h)))
H = max(im.height for im in frames)
norm = []
for im in frames:
    bg = Image.new("RGB", (W, H), (248, 250, 252))
    bg.paste(im, (0, (H - im.height) // 2))
    norm.append(bg)
gif = Path("outputs/demo.gif")
norm[0].save(gif, save_all=True, append_images=norm[1:], duration=1400, loop=0, optimize=True)
print(gif, gif.stat().st_size // 1024, "KB")
