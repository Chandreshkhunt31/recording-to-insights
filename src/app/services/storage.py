from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4


@dataclass(frozen=True)
class StoredResult:
    result_id: str
    path: str


def ensure_dir(path: str) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def write_json_file(path: str, payload: dict[str, Any]) -> None:
    out_path = Path(path)
    ensure_dir(str(out_path.parent))
    tmp_path = str(out_path) + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp_path, out_path)


def read_json_file(path: str) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        val = json.load(f)
    if not isinstance(val, dict):
        raise ValueError("JSON file did not contain an object")
    return val


def store_json(output_dir: str, payload: dict[str, Any]) -> StoredResult:
    ensure_dir(output_dir)

    result_id = uuid4().hex
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"{ts}_{result_id}.json"
    out_path = Path(output_dir) / filename

    # Normalize to plain JSON-serializable dict.
    to_write = {
        "result_id": result_id,
        "created_at_utc": ts,
        **payload,
    }

    write_json_file(str(out_path), to_write)

    return StoredResult(result_id=result_id, path=str(out_path))



