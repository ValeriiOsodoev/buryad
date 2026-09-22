#!/usr/bin/env python3
"""Create responsive WebP/AVIF derivatives for generated BURYAД teaching images."""
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]/"web/images"
WIDTHS=(480,960,1440)

def main():
    if not ROOT.exists():
        print("No generated images yet.")
        return
    for src in ROOT.rglob("*.png"):
        with Image.open(src) as im:
            im=im.convert("RGB")
            for width in WIDTHS:
                if width>im.width:
                    continue
                height=round(im.height*width/im.width)
                resized=im.resize((width,height),Image.Resampling.LANCZOS)
                resized.save(src.with_name(f"{src.stem}-{width}.webp"),"WEBP",quality=84,method=6)
                try:
                    resized.save(src.with_name(f"{src.stem}-{width}.avif"),"AVIF",quality=70)
                except Exception:
                    pass
                print(src, width)

if __name__=="__main__":
    main()
