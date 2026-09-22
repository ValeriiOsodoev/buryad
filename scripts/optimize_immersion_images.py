#!/usr/bin/env python3
"""Create responsive WebP/AVIF derivatives for generated BURYAД teaching images."""
from contextlib import suppress
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "web/images"
WIDTHS = (480, 960, 1440)

\ndef main():
    if not ROOT.exists():
        print("No generated images yet.")
        return
    for src in ROOT.rglob("*.png"):
        with Image.open(src) as im:
            im = im.convert("RGB")
            for width in WIDTHS:
                if width > im.width:
                    continue
                height = round(im.height * width / im.width)
                resized = im.resize((width, height), Image.Resampling.LANCZOS)
                resized.save(\n                    src.with_name(f"{src.stem}-{width}.webp"),\n                    "WEBP",\n                    quality=84,\n                    method=6,\n                )
                try:
                    resized.save(src.with_name(f"{src.stem}-{width}.avif"),"AVIF",quality=70)
                except Exception:
                    pass
                print(src, width)

if __name__=="__main__":
    main()
