"""Redraw the dark illustrated card covers as light versions: ink on warm cream.

Each cover is cyan/amber line art glowing on a dark ground. We separate the
drawing from the ground (how far each pixel rises above a local estimate of
the background), choose an ink colour from the original hue (cyan -> deep
teal, amber -> burnt amber, neutral -> warm graphite), and lay that ink on a
cream paper gradient in the site's lamplight palette.
"""
import sys, pathlib
import numpy as np
from PIL import Image, ImageFilter

src_dir = pathlib.Path(sys.argv[1]); out_dir = pathlib.Path(sys.argv[2]); out_dir.mkdir(parents=True, exist_ok=True)
names = sys.argv[3:] or sorted(p.stem for p in src_dir.glob('*.jpg'))

PAPER_TOP = np.array([248, 240, 223]) / 255.0
PAPER_BOT = np.array([238, 225, 200]) / 255.0
GRAPHITE  = np.array([62, 50, 36]) / 255.0
TEAL      = np.array([10, 100, 112]) / 255.0
AMBER     = np.array([184, 92, 18]) / 255.0

def background(V):
    """Local floor of the value channel: coarse min filter, then smoothed."""
    h, w = V.shape
    small = Image.fromarray((V * 255).astype(np.uint8)).resize((w // 8, h // 8), Image.BILINEAR)
    small = small.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(4))
    return np.asarray(small.resize((w, h), Image.BILINEAR), dtype=np.float32) / 255.0

for n in names:
    im = np.asarray(Image.open(src_dir / f'{n}.jpg').convert('RGB'), dtype=np.float32) / 255.0
    h, w, _ = im.shape
    V = im.max(axis=2); m = im.min(axis=2)
    bg = background(V)
    rise = np.clip(V - bg, 0, None)
    top = max(np.percentile(rise, 99.6), 1e-3); floor = 0.035   # floor drops JPEG noise in flat ground
    a = np.clip((rise - floor) / (top - floor), 0, 1) ** 0.8

    # ink: the original hue, darkened to an ink value, desaturated toward graphite when neutral
    sat = np.where(V > 1e-3, (V - m) / np.maximum(V, 1e-3), 0)
    # warmth: red over blue, relative to brightness; cyan -> 0, amber -> 1
    warm = np.clip((im[..., 0] - im[..., 2]) / np.maximum(V, 1e-3) * 2.2 + 0.35, 0, 1)[..., None]
    ink = TEAL * (1 - warm) + AMBER * warm
    s = np.clip(sat * 1.5, 0, 1)[..., None] ** 0.6
    ink = GRAPHITE * (1 - s) + ink * s

    # cream paper with a soft vertical falloff and a faint edge shade
    yy = np.linspace(0, 1, h)[:, None, None]
    paper = PAPER_TOP * (1 - yy) + PAPER_BOT * yy
    xx = np.linspace(-1, 1, w)[None, :, None]; y2 = np.linspace(-1, 1, h)[:, None, None]
    paper = paper * (1 - 0.05 * np.clip(xx**2 + y2**2 - 0.4, 0, None))

    out = paper * (1 - a[..., None]) + ink * a[..., None]
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(out_dir / f'{n}.jpg', quality=84, optimize=True, progressive=True)
    print(n, 'ok')
