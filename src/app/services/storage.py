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

    tmp_path = str(out_path) + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(to_write, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp_path, out_path)

    return StoredResult(result_id=result_id, path=str(out_path))


