#!/usr/bin/env python3
"""Generate BURYAД visual assets from web/data/image-manifest.json.

Requires OPENAI_API_KEY. Existing assets are skipped unless --force is used.
The script is intentionally offline from the learner-facing app: generated
images are committed/deployed as static assets, so no API key reaches browsers.
"""
from __future__ import annotations
import argparse
import base64
import json
import os
from pathlib import Path

from openai import OpenAI

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"web/data/image-manifest.json"

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--force",action="store_true")
    parser.add_argument("--limit",type=int,default=0)
    args=parser.parse_args()
    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is required")
    manifest=json.loads(MANIFEST.read_text(encoding="utf-8"))
    client=OpenAI()
    assets=manifest["assets"][:args.limit or None]
    for i,asset in enumerate(assets,1):
        target=ROOT/"web"/asset["path"].removeprefix("/assets/").replace("images/","images/",1)
        if target.exists() and not args.force:
            print(f"[{i}/{len(assets)}] skip {target}")
            continue
        target.parent.mkdir(parents=True,exist_ok=True)
        prompt=asset["prompt"]+" Composition optimized for a 4:3 learning card."
        result=client.images.generate(model="gpt-image-2",prompt=prompt,size="1536x1024",quality="medium")
        raw=base64.b64decode(result.data[0].b64_json)
        png=target.with_suffix(".png")
        png.write_bytes(raw)
        print(f"[{i}/{len(assets)}] wrote {png}")

if __name__=="__main__":
    main()
