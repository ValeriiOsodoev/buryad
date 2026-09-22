#!/usr/bin/env python3
"""Bind reviewed native recordings to native-audio-queue.json.

Expected filename:
phrase-12__natural__speaker.webm
phrase-12__slow__speaker.webm

Copy reviewed files into web/audio/native/ and run this script.
"""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
QUEUE=ROOT/"web/data/native-audio-queue.json"
AUDIO=ROOT/"web/audio/native"

def main():
    data=json.loads(QUEUE.read_text(encoding="utf-8"))
    by_id={item["id"]:item for item in data["recordingQueue"]}
    if not AUDIO.exists():
        print("No web/audio/native directory.")
        return
    for file in AUDIO.iterdir():
        if not file.is_file() or "__" not in file.stem:
            continue
        parts=file.stem.split("__")
        if len(parts)<3 or parts[0] not in by_id or parts[1] not in {"slow","natural"}:
            continue
        item=by_id[parts[0]]
        item[parts[1]]=f"/assets/audio/native/{file.name}"
        item["speaker"]=parts[2]
        if item.get("slow") and item.get("natural"):
            item["status"]="verified"
    QUEUE.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
