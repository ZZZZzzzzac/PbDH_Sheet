#!/usr/bin/env python3
"""Audit image-marker pairs used by countableResource modules."""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse
from xml.etree import ElementTree


FORBIDDEN_ELEMENTS = {
    "animate",
    "animateMotion",
    "animateTransform",
    "discard",
    "foreignObject",
    "script",
    "set",
}
EXTERNAL_SCHEMES = {"data", "file", "http", "https", "javascript"}
VIEWBOX_PATTERN = re.compile(
    r"^\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s+"
    r"(-?(?:\d+(?:\.\d*)?|\.\d+))\s+"
    r"((?:\d+(?:\.\d*)?|\.\d+))\s+"
    r"((?:\d+(?:\.\d*)?|\.\d+))\s*$"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit paired image markers in a PbDH System Package."
    )
    parser.add_argument("package_root", type=Path)
    parser.add_argument(
        "modules_file",
        nargs="?",
        help="Package-relative modules JSON path. Defaults to manifest.json or modules.json.",
    )
    parser.add_argument(
        "--module",
        action="append",
        default=[],
        dest="module_ids",
        help="Audit only this module ID. Repeat for multiple modules.",
    )
    return parser.parse_args()


class Audit:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warning(self, message: str) -> None:
        self.warnings.append(message)


def read_json(path: Path) -> object:
    with path.open("r", encoding="utf-8-sig") as source:
        return json.load(source)


def resolve_within(root: Path, relative_path: str, audit: Audit, owner: str) -> Path | None:
    if not relative_path or "\\" in relative_path:
        audit.error(f"{owner}: asset path must be non-empty and use forward slashes: {relative_path!r}")
        return None

    pure_path = PurePosixPath(relative_path)
    parsed = urlparse(relative_path)
    if parsed.scheme or relative_path.startswith(("/", "//")) or ".." in pure_path.parts:
        audit.error(f"{owner}: unsafe package path: {relative_path!r}")
        return None
    if not pure_path.parts or pure_path.parts[0] != "assets":
        audit.error(f"{owner}: marker asset must live under assets/**: {relative_path!r}")
        return None

    resolved = root.joinpath(*pure_path.parts).resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        audit.error(f"{owner}: resolved path escapes package root: {relative_path!r}")
        return None
    return resolved


def local_name(name: str) -> str:
    return name.rsplit("}", 1)[-1]


def audit_svg(path: Path, package_path: str, audit: Audit) -> None:
    try:
        source = path.read_bytes()
    except OSError as error:
        audit.error(f"{package_path}: cannot read SVG: {error}")
        return
    lowered_source = source.lower()
    if b"<!doctype" in lowered_source or b"<!entity" in lowered_source:
        audit.error(f"{package_path}: DOCTYPE and ENTITY declarations are forbidden")
        return
    try:
        root = ElementTree.fromstring(source)
    except (OSError, ElementTree.ParseError) as error:
        audit.error(f"{package_path}: invalid SVG XML: {error}")
        return

    if local_name(root.tag) != "svg":
        audit.error(f"{package_path}: root element is not <svg>")
        return

    view_box = root.attrib.get("viewBox")
    match = VIEWBOX_PATTERN.match(view_box or "")
    if not match:
        audit.error(f"{package_path}: SVG needs a valid positive viewBox")
    elif match:
        width = float(match.group(3))
        height = float(match.group(4))
        if width <= 0 or height <= 0:
            audit.error(f"{package_path}: viewBox width and height must be positive")
        elif abs(width - height) > 0.001:
            audit.warning(f"{package_path}: non-square viewBox may waste marker space")

    for element in root.iter():
        element_name = local_name(element.tag)
        if element_name in FORBIDDEN_ELEMENTS:
            audit.error(f"{package_path}: forbidden <{element_name}> element")
        for raw_name, value in element.attrib.items():
            attribute_name = local_name(raw_name)
            lowered_value = value.strip().lower()
            if attribute_name.lower().startswith("on"):
                audit.error(f"{package_path}: forbidden event attribute {attribute_name}")
            if "javascript:" in lowered_value:
                audit.error(f"{package_path}: forbidden javascript URL")
            if re.search(r"url\s*\(\s*['\"]?(?:data:|file:|https?:|//)", lowered_value):
                audit.error(f"{package_path}: external or embedded URL is forbidden")
            if attribute_name in {"href", "src"}:
                parsed = urlparse(value)
                if parsed.scheme.lower() in EXTERNAL_SCHEMES or value.startswith("//"):
                    audit.error(f"{package_path}: external or embedded reference is forbidden: {value!r}")
        lowered_text = (element.text or "").lower()
        if "javascript:" in lowered_text or "@import" in lowered_text:
            audit.error(f"{package_path}: forbidden active or imported content")
        if re.search(r"url\s*\(\s*['\"]?(?:data:|file:|https?:|//)", lowered_text):
            audit.error(f"{package_path}: external or embedded CSS URL is forbidden")

    size = path.stat().st_size
    if size > 32 * 1024:
        audit.warning(f"{package_path}: {size} bytes is large for a UI marker SVG")


def marker_asset(descriptor: object, owner: str, audit: Audit) -> str | None:
    if not isinstance(descriptor, dict) or descriptor.get("类型") != "图片":
        audit.error(f"{owner}: expected an image Marker Descriptor")
        return None
    asset_path = descriptor.get("资源路径")
    if not isinstance(asset_path, str) or not asset_path:
        audit.error(f"{owner}: missing 资源路径")
        return None
    return asset_path


def find_modules_path(package_root: Path, argument: str | None, audit: Audit) -> Path | None:
    relative_path = argument
    if relative_path is None:
        manifest_path = package_root / "manifest.json"
        if manifest_path.is_file():
            manifest = read_json(manifest_path)
            if isinstance(manifest, dict) and isinstance(manifest.get("modules"), str):
                relative_path = manifest["modules"]
        relative_path = relative_path or "modules.json"

    pure_path = PurePosixPath(relative_path)
    if "\\" in relative_path or relative_path.startswith(("/", "//")) or ".." in pure_path.parts:
        audit.error(f"unsafe modules path: {relative_path!r}")
        return None
    resolved = package_root.joinpath(*pure_path.parts).resolve()
    try:
        resolved.relative_to(package_root)
    except ValueError:
        audit.error(f"modules path escapes package root: {relative_path!r}")
        return None
    return resolved


def main() -> int:
    args = parse_args()
    audit = Audit()
    package_root = args.package_root.resolve()
    if not package_root.is_dir():
        print(f"ERROR package root is not a directory: {package_root}", file=sys.stderr)
        return 1

    try:
        modules_path = find_modules_path(package_root, args.modules_file, audit)
        modules = read_json(modules_path) if modules_path else None
    except (OSError, json.JSONDecodeError) as error:
        print(f"ERROR cannot read modules JSON: {error}", file=sys.stderr)
        return 1

    if not isinstance(modules, list):
        audit.error("modules JSON root must be an array")
        modules = []

    requested = set(args.module_ids)
    known_ids = {module.get("ID") for module in modules if isinstance(module, dict)}
    for missing_id in sorted(requested - known_ids):
        audit.error(f"requested module does not exist: {missing_id}")

    audited_modules = 0
    asset_paths: set[str] = set()
    for module in modules:
        if not isinstance(module, dict) or module.get("类型") != "countableResource":
            continue
        module_id = module.get("ID")
        if requested and module_id not in requested:
            continue
        if module.get("显示方式") != "标记":
            if module_id in requested:
                audit.error(f"{module_id}: target is not using 标记 presentation")
            continue

        descriptors = (module.get("当前值标记"), module.get("剩余值标记"))
        if not requested and not any(
            isinstance(item, dict) and item.get("类型") == "图片" for item in descriptors
        ):
            continue

        audited_modules += 1
        current_path = marker_asset(descriptors[0], f"{module_id}.当前值标记", audit)
        remaining_path = marker_asset(descriptors[1], f"{module_id}.剩余值标记", audit)
        if current_path and remaining_path and current_path == remaining_path:
            audit.error(f"{module_id}: marked and unmarked assets must differ")

        for kind, package_path in (("marked", current_path), ("unmarked", remaining_path)):
            if package_path is None:
                continue
            resolved = resolve_within(package_root, package_path, audit, f"{module_id}.{kind}")
            if resolved is None:
                continue
            if not resolved.is_file():
                audit.error(f"{module_id}.{kind}: asset does not exist: {package_path}")
                continue
            asset_paths.add(package_path)
            if resolved.suffix.lower() == ".svg":
                audit_svg(resolved, package_path, audit)

    if requested and audited_modules != len(requested):
        audit.error(f"audited {audited_modules} of {len(requested)} requested modules")
    if audited_modules == 0:
        audit.warning("no image-based marker pairs found")

    raw_bytes = 0
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for package_path in sorted(asset_paths):
            file_path = package_root.joinpath(*PurePosixPath(package_path).parts)
            raw_bytes += file_path.stat().st_size
            archive.write(file_path, package_path)

    for message in audit.warnings:
        print(f"WARN  {message}")
    for message in audit.errors:
        print(f"ERROR {message}")
    print(
        f"SUMMARY modules={audited_modules} assets={len(asset_paths)} "
        f"rawBytes={raw_bytes} zipBytes={len(archive_buffer.getvalue())} "
        f"warnings={len(audit.warnings)} errors={len(audit.errors)}"
    )
    return 1 if audit.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
