#!/usr/bin/env python3
"""Local, reproducible ISO extraction and corpus indexing. Never executes disc code.

ISO directory fields follow ECMA-119; the Joliet supplementary tree retains names.
Only plain, single-extent, non-interleaved ISO files are supported. Unsupported
records fail closed. Raw assets and generated indexes live entirely under local/.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import html
import json
from pathlib import Path, PurePosixPath
import sqlite3
import struct

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parents[1]
DISCS = {
    "logical-journey": ("Zoombinis.iso", "INSTALL/Data/LogicalJourney.pdf"),
    "mountain-rescue": ("MountainRescue.iso", "INSTALL/Data/Zoombinimr.pdf"),
    "island-odyssey": ("IslandOdyssey.iso", "User's Guide.pdf"),
}
BLOCK = 2048


def sha256(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def safe_name(name):
    if not name or name in (".", "..") or any(c in name for c in "/\\\x00"):
        raise ValueError(f"Unsafe ISO filename: {name!r}")
    return name


def both_endian(data, offset, size):
    little = int.from_bytes(data[offset:offset + size], "little")
    big = int.from_bytes(data[offset + size:offset + 2 * size], "big")
    if little != big:
        raise ValueError("Inconsistent ISO dual-endian field")
    return little


def iso_files(path):
    """Return volume info and files with exact ISO byte ranges; no mounting needed."""
    total = path.stat().st_size
    with path.open("rb") as stream:
        def read(offset, length):
            if offset < 0 or length < 0 or offset + length > total:
                raise ValueError(f"ISO range out of bounds: {offset}+{length}/{total}")
            stream.seek(offset)
            data = stream.read(length)
            if len(data) != length:
                raise ValueError("Truncated ISO")
            return data

        primary = joliet = None
        for sector in range(16, 80):
            descriptor = read(sector * BLOCK, BLOCK)
            if descriptor[1:6] != b"CD001" or descriptor[6] != 1:
                raise ValueError("Invalid ISO descriptor")
            if descriptor[0] == 1:
                primary = descriptor
            if descriptor[0] == 2 and descriptor[88:91] in (b"%/@", b"%/C", b"%/E"):
                joliet = descriptor
            if descriptor[0] == 255:
                break
        else:
            raise ValueError("No ISO descriptor terminator")
        if primary is None:
            raise ValueError("No primary ISO descriptor")
        selected = joliet or primary
        if both_endian(selected, 128, 2) != BLOCK:
            raise ValueError("Unsupported logical block size")
        encoding = "utf-16-be" if joliet else "ascii"
        seen_dirs, seen_paths, files = set(), set(), []

        def directory(record, prefix, depth=0):
            if depth > 32:
                raise ValueError("ISO directory nesting limit")
            extent = both_endian(record, 2, 4)
            length = both_endian(record, 10, 4)
            if extent in seen_dirs:
                raise ValueError("Repeated/cyclic directory extent")
            seen_dirs.add(extent)
            data = read(extent * BLOCK, length)
            pos = 0
            while pos < len(data):
                n = data[pos]
                if not n:
                    pos = (pos // BLOCK + 1) * BLOCK
                    continue
                if n < 34 or pos + n > len(data) or pos % BLOCK + n > BLOCK:
                    raise ValueError("Malformed ISO directory record")
                r = data[pos:pos + n]
                record_offset = extent * BLOCK + pos
                pos += n
                if 33 + r[32] > n:
                    raise ValueError("ISO filename extends beyond record")
                raw_name = r[33:33 + r[32]]
                if raw_name in (b"\x00", b"\x01"):
                    continue
                name = raw_name.decode(encoding).split(";", 1)[0]
                safe_name(name)
                relative = str(PurePosixPath(prefix) / name)
                if relative.casefold() in seen_paths:
                    raise ValueError(f"Duplicate/case-colliding ISO path: {relative}")
                seen_paths.add(relative.casefold())
                if r[1] or r[26] or r[27] or r[25] & 0x80:
                    raise ValueError("Extended attributes/interleaved/multi-extent file unsupported")
                if r[25] & 2:
                    directory(r, relative, depth + 1)
                else:
                    offset = both_endian(r, 2, 4) * BLOCK
                    size = both_endian(r, 10, 4)
                    if offset + size > total:
                        raise ValueError(f"File outside ISO: {relative}")
                    files.append({"path": relative, "iso_offset": offset, "size": size,
                                  "directory_record_offset": record_offset})

        directory(selected[156:190], "")
    return {"volume_id": primary[40:72].decode("ascii").strip(),
            "filesystem": "joliet" if joliet else "iso9660",
            "files": sorted(files, key=lambda r: r["path"])}


def role(slug, path):
    p = path.lower()
    if "/demo/" in p:
        return "bundled-demo"
    if p.endswith(".pdf") and "acrobat" not in p:
        return "game-manual"
    if p.startswith(("data/", "rsc/", "scripts/")):
        return "game-data"
    if p.startswith("hd/") and not p.startswith("hd/launcher/"):
        return "game-data"
    if p.startswith("install/hd/"):
        return "game-runtime"
    return "installer-or-support"


def extract(local, source):
    for slug, (filename, _) in DISCS.items():
        iso = source / filename
        inventory = iso_files(iso)
        inventory.update({"id": slug, "iso_filename": filename, "iso_size": iso.stat().st_size,
                          "iso_sha256": sha256(iso), "schema_version": 1})
        target = local / "discs" / slug
        target.mkdir(parents=True, exist_ok=True)
        resolved_root = target.resolve()
        with iso.open("rb") as stream:
            for entry in inventory["files"]:
                dest = target / entry["path"]
                if not dest.resolve().is_relative_to(resolved_root) or dest.is_symlink():
                    raise ValueError(f"Unsafe output path: {dest}")
                stream.seek(entry["iso_offset"])
                remaining, h = entry["size"], hashlib.sha256()
                # Hash directly from ISO; only write missing/mismatching files.
                while remaining:
                    block = stream.read(min(remaining, 1024 * 1024))
                    if not block:
                        raise ValueError("Truncated ISO payload")
                    h.update(block)
                    remaining -= len(block)
                entry["sha256"] = h.hexdigest()
                if not dest.is_file() or sha256(dest) != entry["sha256"]:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    stream.seek(entry["iso_offset"])
                    remaining = entry["size"]
                    with dest.open("wb") as output:
                        while remaining:
                            block = stream.read(min(remaining, 1024 * 1024))
                            output.write(block)
                            remaining -= len(block)
                if sha256(dest) != entry["sha256"]:
                    raise ValueError(f"Extraction hash mismatch: {entry['path']}")
                entry["role"] = role(slug, entry["path"])
        write_json(local / "manifests" / f"{slug}.json", inventory)
        print(f"{slug}: {len(inventory['files'])} files verified against ISO", flush=True)


def manuals(local):
    from pypdf import PdfReader
    for slug, (_, path) in DISCS.items():
        source = local / "discs" / slug / path
        reader = PdfReader(source)
        pages = [{"pdf_page": i + 1, "text": p.extract_text()} for i, p in enumerate(reader.pages)]
        write_json(local / "manuals" / f"{slug}.json", {
            "disc": slug, "source": path, "source_sha256": sha256(source), "pages": pages})
        (local / "manuals" / f"{slug}.txt").write_text("\n\n".join(
            f'--- PDF PAGE {p["pdf_page"]} ---\n{p["text"]}' for p in pages))
        print(f"{slug}: {len(pages)} manual pages")


def verify(local, source):
    count = 0
    for slug, (filename, _) in DISCS.items():
        manifest = json.loads((local / "manifests" / f"{slug}.json").read_text())
        if sha256(source / filename) != manifest["iso_sha256"]:
            raise ValueError(f"ISO changed: {filename}")
        for entry in manifest["files"]:
            if sha256(local / "discs" / slug / entry["path"]) != entry["sha256"]:
                raise ValueError(f"Extracted file changed: {slug}/{entry['path']}")
            count += 1
    print(f"Verified 3 ISO hashes and {count} extracted file hashes")


def index(local):
    """A SQLite catalog and JSONL file inventory join outputs without copying assets."""
    records, puzzles, summaries = [], [], []
    for slug in DISCS:
        manifest = json.loads((local / "manifests" / f"{slug}.json").read_text())
        for entry in manifest["files"]:
            records.append({**entry, "game": slug, "layer": "disc",
                            "local_path": f"discs/{slug}/{entry['path']}"})
        derived = local / "derived" / slug
        if derived.exists():
            for p in sorted(derived.rglob("*")):
                if p.is_file():
                    records.append({"game": slug, "layer": "derived", "path": str(p.relative_to(derived)),
                                    "local_path": str(p.relative_to(local)), "size": p.stat().st_size,
                                    "sha256": sha256(p), "role": "derived-research"})
        for layer in ("native-analysis", "manuals"):
            candidates = ((local / layer / slug).rglob("*") if layer == "native-analysis"
                          else (local / layer).glob(f"{slug}.*"))
            for p in sorted(candidates):
                if p.is_file():
                    records.append({"game": slug, "layer": layer, "path": p.name,
                                    "local_path": str(p.relative_to(local)), "size": p.stat().st_size,
                                    "sha256": sha256(p), "role": "derived-research"})
        # Generator investigations use both analysis/<game>/ and named puzzle
        # trees such as analysis/logical-journey-bridge/. Preserve that prefix
        # in the indexed path so reports from different puzzles cannot collide.
        analysis = local / "analysis"
        if analysis.exists():
            for source in sorted(analysis.iterdir()):
                if not (source.name == slug or source.name.startswith((slug + "-", slug + "."))):
                    continue
                for p in sorted(source.rglob("*")) if source.is_dir() else [source]:
                    if p.is_file():
                        records.append({"game": slug, "layer": "analysis", "path": str(p.relative_to(analysis)),
                                        "local_path": str(p.relative_to(local)), "size": p.stat().st_size,
                                        "sha256": sha256(p), "role": "generator-analysis"})
        puzzle_path = derived / "puzzles.json"
        if puzzle_path.exists():
            data = json.loads(puzzle_path.read_text())
            rows = data if isinstance(data, list) else data.get("puzzles", [])
            for row in rows:
                asset_locations = []
                for root in row.get("asset_roots", []):
                    for layer in ("derived", "discs"):
                        candidate = local / layer / slug / root
                        if candidate.exists():
                            asset_locations.append(str(candidate.relative_to(local)))
                puzzles.append({**row, "game": slug, "asset_locations_relative_to_local": asset_locations,
                                "manual_location": f"discs/{slug}/{DISCS[slug][1]}",
                                "source_manifest": f"manifests/{slug}.json"})
        summaries.append({"game": slug, "source_files": len(manifest["files"]),
                          "iso_sha256": manifest["iso_sha256"], "volume_id": manifest["volume_id"]})
    overlay_path = local / "generator-parity.json"
    overlay_summary = None
    if overlay_path.exists():
        from generator_catalog import merge_overlay, verify_report_snapshots
        raw_overlay = overlay_path.read_bytes()
        overlay = json.loads(raw_overlay)
        puzzles = merge_overlay(puzzles, overlay)
        verify_report_snapshots(local, overlay)
        overlay_summary = {"local_path": "generator-parity.json", "sha256": hashlib.sha256(raw_overlay).hexdigest(),
                           "matched_puzzles": len(overlay["entries"]), "full_game_parity": False}
    spec_summary = None
    spec_path = local / "puzzle-specifications.json"
    if spec_path.exists():
        from specification_catalog import merge_overlay as merge_specs, verify_snapshots
        raw_specs = spec_path.read_bytes()
        specs = json.loads(raw_specs)
        verify_snapshots(local, specs)
        puzzles = merge_specs(puzzles, specs)
        spec_summary = {"local_path": "puzzle-specifications.json", "sha256": hashlib.sha256(raw_specs).hexdigest(),
                        "matched_puzzles": len(specs["entries"]), "expected_puzzles": specs["expected_count"],
                        "missing": specs["missing"], "full_game_parity": False}
        for p in sorted((local / "specs").glob("*/*.json")):
            records.append({"game": p.parent.name, "layer": "specification", "path": str(p.relative_to(local / "specs")),
                            "local_path": str(p.relative_to(local)), "size": p.stat().st_size,
                            "sha256": sha256(p), "role": "puzzle-specification"})
    (local / "files.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in records))
    write_json(local / "puzzles.json", {"schema_version": 1, "puzzles": puzzles,
                                        **({"generator_parity_overlay": overlay_summary} if overlay_summary else {}),
                                        **({"puzzle_specification_overlay": spec_summary} if spec_summary else {})})
    db = sqlite3.connect(local / "corpus.sqlite3")
    db.executescript("DROP TABLE IF EXISTS files; DROP TABLE IF EXISTS puzzles; "
                     "CREATE TABLE files(game TEXT, layer TEXT, path TEXT, extension TEXT, bytes INTEGER, "
                     "sha256 TEXT, role TEXT, local_path TEXT, iso_offset INTEGER); "
                     "CREATE INDEX files_hash ON files(sha256); CREATE INDEX files_extension ON files(extension); "
                     "CREATE TABLE puzzles(game TEXT, id TEXT, name TEXT, metadata_json TEXT);")
    db.executemany("INSERT INTO files VALUES(?,?,?,?,?,?,?,?,?)", [
        (r["game"], r["layer"], r["path"], Path(r["path"]).suffix.lower(), r["size"], r["sha256"],
         r["role"], r["local_path"], r.get("iso_offset")) for r in records])
    db.executemany("INSERT INTO puzzles VALUES(?,?,?,?)", [
        (p["game"], p.get("id"), p.get("name"), json.dumps(p, ensure_ascii=False)) for p in puzzles])
    db.commit()
    db.close()
    counts = Counter((r["game"], r["layer"], Path(r["path"]).suffix.lower()) for r in records)
    write_json(local / "summary.json", {"games": summaries, "indexed_files": len(records),
        "puzzle_count": len(puzzles),
        **({"generator_parity_overlay": overlay_summary} if overlay_summary else {}),
        **({"puzzle_specification_overlay": spec_summary} if spec_summary else {}),
        "counts": [{"game": g, "layer": l, "extension": e, "count": n}
            for (g, l, e), n in sorted(counts.items())]})
    # A static local report is usable directly from disk, with no network or app integration.
    cards = []
    for p in puzzles:
        rendered = html.escape(json.dumps(p, indent=2, ensure_ascii=False))
        cards.append(f'<details><summary>{html.escape(p["game"])} · {html.escape(p.get("name", p.get("id", "Puzzle")))}</summary><pre>{rendered}</pre></details>')
    links = []
    for slug in DISCS:
        for p in sorted((local / "derived" / slug).rglob("*")):
            if p.is_file() and (any(word in p.name.lower() for word in ("contact", "preview", "overview")) or p.name == "summary.json"):
                rel = html.escape(str(p.relative_to(local)), quote=True)
                links.append(f'<li><a href="{rel}">{rel}</a></li>')
    page = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Zoombinis research corpus</title><style>body{font:17px/1.6 system-ui;max-width:1100px;margin:3rem auto;padding:0 24px;background:#f8f5ed;color:#20362d}h1{font-size:2.4rem;line-height:1.1}a{color:#155846}details{background:white;border:1px solid #ccd7ce;border-radius:9px;margin:12px 0;padding:16px}summary{cursor:pointer;font-weight:650}pre{white-space:pre-wrap;font:14px/1.6 ui-monospace}input{padding:12px;width:90%;font:inherit}li{overflow-wrap:anywhere}</style><h1>Zoombinis research corpus</h1><p>Local disc research. Rules documented in manuals and decoded data are identified separately from unrecovered generator code. Original assets remain in this local directory.</p>'
    page += f'<p>{len(records):,} indexed files · {len(puzzles)} puzzle records · 3 discs</p><p><a href="puzzles.json">Puzzle JSON</a> · <a href="summary.json">Coverage</a> · <a href="files.jsonl">File provenance</a> · <a href="corpus.sqlite3">SQLite catalog</a></p><h2>Previews and reports</h2><ul>{"".join(links)}</ul><h2>Puzzle evidence</h2><input type="search" placeholder="Filter by puzzle, rule, game, or difficulty" aria-label="Filter puzzle records">{"".join(cards)}<script>document.querySelector("input").addEventListener("input",e=>{{for(const d of document.querySelectorAll("details"))d.hidden=!d.textContent.toLowerCase().includes(e.target.value.toLowerCase())}})</script></html>'
    (local / "index.html").write_text(page)
    print(f"Indexed {len(records)} files and {len(puzzles)} puzzle records")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["extract", "manuals", "index", "verify"])
    parser.add_argument("--source", type=Path, default=PROJECT)
    parser.add_argument("--local", type=Path, default=ROOT / "local")
    args = parser.parse_args()
    if args.command == "extract":
        extract(args.local, args.source)
    elif args.command == "manuals":
        manuals(args.local)
    elif args.command == "verify":
        verify(args.local, args.source)
    else:
        index(args.local)


if __name__ == "__main__":
    main()
