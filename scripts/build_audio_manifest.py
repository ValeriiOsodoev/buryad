from __future__ import annotations

import argparse
import json
from pathlib import Path

AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a"}


def course_phrase_ids(course_path: Path) -> set[str]:
    course = json.loads(course_path.read_text(encoding="utf-8"))
    return {
        phrase["id"]
        for module in course
        for phrase in module.get("phrases", [])
    }


def build_manifest(
    recordings_dir: Path,
    course_path: Path,
    speaker: str,
    source: str,
    license_name: str = "",
) -> dict[str, dict[str, object]]:
    known = course_phrase_ids(course_path)
    manifest: dict[str, dict[str, object]] = {}
    unknown: list[str] = []

    for path in sorted(recordings_dir.iterdir(), key=lambda item: item.name.lower()):
        if not path.is_file() or path.suffix.lower() not in AUDIO_EXTENSIONS:
            continue
        phrase_id = path.stem
        if phrase_id not in known:
            unknown.append(path.name)
            continue
        entry: dict[str, object] = {
            "src": f"/assets/audio/phrases/{path.name}",
            "speaker": speaker.strip(),
            "source": source.strip(),
            "verified": True,
        }
        if license_name.strip():
            entry["license"] = license_name.strip()
        manifest[phrase_id] = entry

    if unknown:
        joined = ", ".join(unknown)
        raise ValueError(f"Unknown phrase ids in audio pack: {joined}")
    if not speaker.strip():
        raise ValueError("Speaker is required")
    if not source.strip():
        raise ValueError("Source is required")
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a verified Buryad phrase-audio manifest from named recordings.",
    )
    parser.add_argument("recordings_dir", type=Path)
    parser.add_argument("--course", type=Path, default=Path("web/data/course.json"))
    parser.add_argument("--output", type=Path, default=Path("web/data/audio.json"))
    parser.add_argument("--speaker", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--license", dest="license_name", default="")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = build_manifest(
        args.recordings_dir,
        args.course,
        args.speaker,
        args.source,
        args.license_name,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(manifest)} verified audio entries to {args.output}")


if __name__ == "__main__":
    main()
