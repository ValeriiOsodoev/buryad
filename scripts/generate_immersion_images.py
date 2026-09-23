#!/usr/bin/env python3
"""Generate BURYAД visual assets from web/data/image-manifest.json.

Requires OPENAI_API_KEY. Existing assets are skipped unless --force is used.
Generation can be scoped by explicit asset IDs or a checked-in batch config.
The learner-facing app never receives the OpenAI API key.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "web/data/image-manifest.json"


def parse_ids(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def load_config(path: str | None) -> dict:
    if not path:
        return {}
    config_path = ROOT / path
    return json.loads(config_path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--ids", default="")
    parser.add_argument("--config")
    args = parser.parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is required")

    config = load_config(args.config)
    selected_ids = set(parse_ids(args.ids) or config.get("asset_ids", []))
    force = args.force or bool(config.get("force", False))

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assets = manifest["assets"]
    if selected_ids:
        assets = [asset for asset in assets if asset["id"] in selected_ids]
        found = {asset["id"] for asset in assets}
        missing = selected_ids - found
        if missing:
            raise SystemExit(f"Unknown asset ids: {', '.join(sorted(missing))}")
    if args.limit:
        assets = assets[: args.limit]
    if not assets:
        raise SystemExit("No assets selected")

    client = OpenAI()
    for i, asset in enumerate(assets, 1):
        target = ROOT / "web" / asset["path"].removeprefix("/assets/")
        if target.exists() and not force:
            print(f"[{i}/{len(assets)}] skip {target}")
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        prompt = asset["prompt"] + " Composition optimized for a 4:3 learning card."
        result = client.images.generate(
            model="gpt-image-2",
            prompt=prompt,
            size="1536x1024",
            quality="medium",
        )
        raw = base64.b64decode(result.data[0].b64_json)
        png = target.with_suffix(".png")
        png.write_bytes(raw)
        print(f"[{i}/{len(assets)}] wrote {png}")


if __name__ == "__main__":
    main()
