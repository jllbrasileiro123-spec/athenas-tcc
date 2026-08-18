#!/usr/bin/env python3
"""Gera ícones PWA a partir de public/brand/logo-athena.png."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/brand/logo-athena.png"
OUT = ROOT / "public/icons"


def square_icon(size: int, pad: int, background: str = "#0a0a0a") -> Image.Image:
    src = Image.open(SOURCE).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), background)
    inner = max(size - pad * 2, 1)
    ratio = min(inner / src.width, inner / src.height)
    w = max(int(src.width * ratio), 1)
    h = max(int(src.height * ratio), 1)
    resized = src.resize((w, h), Image.Resampling.LANCZOS)
    x = (size - w) // 2
    y = (size - h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    specs = {
        "icon-192.png": (192, 18),
        "icon-512.png": (512, 48),
        "icon-maskable-512.png": (512, 96),
        "apple-touch-icon.png": (180, 16),
    }
    for name, (size, pad) in specs.items():
        square_icon(size, pad).save(OUT / name, "PNG", optimize=True)
        print(f"wrote {OUT / name}")


if __name__ == "__main__":
    main()
