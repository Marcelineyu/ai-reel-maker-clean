#!/usr/bin/env python3
"""Read-only project validator for the AI Reel Maker repository."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_PATHS = [
    "package.json",
    "package-lock.json",
    "src",
    "api",
    "public",
    "vercel.json",
    "craco.config.js",
    "tailwind.config.js",
    "postcss.config.js",
    ".gitignore",
    ".env.example",
]

CRITICAL_ENTRY_FILES = [
    "src/index.js",
    "src/App.js",
    "public/index.html",
    "src/services/ffmpegService.js",
    "src/services/apiClient.js",
]

JS_EXTENSIONS = (".js", ".jsx", ".mjs", ".cjs")
IMPORT_PATTERNS = [
    re.compile(r"""(?:import\s+(?:[^'"]+\s+from\s+)?|import\s+)['"]([^'"]+)['"]"""),
    re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
    re.compile(r"""import\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
]

ENV_PATTERNS = [
    re.compile(r"process\.env\.([A-Z0-9_]+)"),
    re.compile(r"process\.env\[['\"]([A-Z0-9_]+)['\"]\]"),
    re.compile(r"\b(REACT_APP_[A-Z0-9_]+)\b"),
    re.compile(r"\b(OPENAI_API_KEY|GEMINI_API_KEY|ELEVENLABS_API_KEY|OPENAI_MODEL)\b"),
]

SECRET_VALUE_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"AIza[0-9A-Za-z\-_]{20,}"),
    re.compile(r"(?:api[_-]?key|secret)\s*[:=]\s*['\"][^'\"]{12,}['\"]", re.I),
]

MERGE_MARKER = re.compile(r"^(<<<<<<<|=======|>>>>>>>)(?:\s|$)", re.M)
PLACEHOLDER_MARKER = re.compile(r"INSERT_CODE_HERE", re.I)

NODE_ONLY_MODULES = {
    "fs", "path", "child_process", "crypto", "http", "https", "net", "tls",
    "os", "readline", "stream", "zlib", "buffer", "module", "worker_threads",
}

SENSITIVE_SERVER_KEYS = {
    "OPENAI_API_KEY", "GEMINI_API_KEY", "ELEVENLABS_API_KEY", "OPENAI_MODEL",
}

FFMPEG_INVARIANTS = {
    "ffmpeg_init": ["new FFmpeg(", "from '@ffmpeg/ffmpeg'"],
    "mp4_output": ["video/mp4", "output.mp4"],
    "aspect_ratio": ["720:1280", "720x1280", "scale=720:1280"],
    "subtitles": ["sceneToSRT", ".srt", "subtitles="],
    "audio_duration": ["getAudioDuration", "audioDurations"],
    "concatenation": ["concat.txt", "-f", "concat"],
    "font_loading": ["DejaVuSans", "loadFontForSubtitles", "fontsdir="],
    "media_inputs": ["imageBlob", "audioBlob"],
}

CSS_URL_PATTERN = re.compile(r"""(?<![a-zA-Z.])url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)""", re.I)
STATIC_ASSET_PATTERNS = [
    re.compile(r"""['"](/[^'"]+\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|mp3|wav|txt|css))['"]"""),
    re.compile(r"""['"](\./[^'"]+\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|mp3|wav|txt|css))['"]"""),
    re.compile(r"""['"](\.\./[^'"]+\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|mp3|wav|txt|css))['"]"""),
]
HTML_ATTR_PATTERN = re.compile(
    r"""(?:src|href)\s*=\s*['"](/[^'"]+\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|mp3|wav|txt|css))['"]""",
    re.I,
)

RUNTIME_PUBLIC_PATHS = {
    "/fonts/DejaVuSans.ttf",
}

IGNORED_ASSET_PREFIXES = (
    "data:", "blob:", "http://", "https://", "#", "/api/", "api/",
)

SECRET_FILES = {".env", ".env.local", ".env.development", ".env.production"}


@dataclass
class CategoryResult:
    name: str
    passes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)

    @property
    def status(self) -> str:
        if self.failures:
            return "FAIL"
        if self.warnings:
            return "WARN"
        return "PASS"


@dataclass
class ValidationReport:
    root: Path
    categories: list[CategoryResult] = field(default_factory=list)

    @property
    def passed(self) -> int:
        return sum(len(c.passes) for c in self.categories)

    @property
    def warnings(self) -> int:
        return sum(len(c.warnings) for c in self.categories)

    @property
    def failed(self) -> int:
        return sum(len(c.failures) for c in self.categories)

    def add(self, category: CategoryResult) -> None:
        self.categories.append(category)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def is_local_import(specifier: str) -> bool:
    return specifier.startswith(".") or specifier.startswith("/")


def is_npm_import(specifier: str) -> bool:
    return not is_local_import(specifier)


def resolve_local_import(source_file: Path, specifier: str, root: Path) -> Path | None:
    if specifier.startswith("/"):
        candidate_base = root / "public" / specifier.lstrip("/")
        if candidate_base.exists():
            return candidate_base
        candidate_base = root / specifier.lstrip("/")
    else:
        candidate_base = (source_file.parent / specifier).resolve()

    candidates = [
        candidate_base,
        candidate_base.with_suffix(".js"),
        candidate_base.with_suffix(".jsx"),
        candidate_base / "index.js",
        candidate_base / "index.jsx",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def find_js_files(directory: Path) -> list[Path]:
    if not directory.exists():
        return []
    files: list[Path] = []
    for path in directory.rglob("*"):
        if path.suffix.lower() in JS_EXTENSIONS and path.is_file():
            files.append(path)
    return sorted(files)


def extract_imports(content: str) -> list[tuple[str, bool]]:
    imports: list[tuple[str, bool]] = []
    for pattern in IMPORT_PATTERNS:
        dynamic = "import(" in pattern.pattern
        for match in pattern.finditer(content):
            imports.append((match.group(1), dynamic))
    return imports


def parse_json_file(path: Path) -> tuple[object | None, str | None]:
    try:
        return json.loads(read_text(path)), None
    except json.JSONDecodeError as exc:
        return None, f"{path}: malformed JSON ({exc.msg} at line {exc.lineno})"


def classify_env_var(name: str, file_path: Path, root: Path) -> str:
    rel = file_path.relative_to(root).as_posix()
    if rel.startswith("src/"):
        return "frontend"
    if rel.startswith("api/"):
        return "server"
    return "other"


def should_ignore_asset(path: str) -> bool:
    lowered = path.strip()
    if not lowered or lowered.startswith("#"):
        return True
    for prefix in IGNORED_ASSET_PREFIXES:
        if lowered.startswith(prefix):
            return True
    if "${" in lowered or "`" in lowered:
        return True
    if lowered.startswith("/static/"):
        return True
    return False


def extract_asset_references(file_path: Path, content: str) -> list[str]:
    suffix = file_path.suffix.lower()
    assets: list[str] = []

    if suffix == ".css":
        for match in CSS_URL_PATTERN.finditer(content):
            assets.append(match.group(1).strip())
    elif suffix == ".html":
        for match in HTML_ATTR_PATTERN.finditer(content):
            assets.append(match.group(1).strip())
    elif suffix in JS_EXTENSIONS:
        for pattern in STATIC_ASSET_PATTERNS:
            for match in pattern.finditer(content):
                assets.append(match.group(1).strip())

    return assets


def resolve_asset_reference(source_file: Path, asset: str, root: Path) -> Path | None:
    if asset.startswith("/"):
        public_candidate = root / "public" / asset.lstrip("/")
        if public_candidate.exists():
            return public_candidate
        root_candidate = root / asset.lstrip("/")
        if root_candidate.exists():
            return root_candidate
        return None
    candidate = (source_file.parent / asset).resolve()
    if candidate.is_file():
        return candidate
    return None


def validate_repository_structure(root: Path, verbose: bool) -> CategoryResult:
    result = CategoryResult("Repository structure")
    for rel in REQUIRED_PATHS:
        path = root / rel
        if not path.exists():
            result.failures.append(f"Missing required path: {rel}")
        elif path.is_file() and path.stat().st_size == 0:
            result.failures.append(f"Required file is empty: {rel}")
        else:
            result.passes.append(f"Found {rel}")
            if verbose:
                result.passes.append(f"Validated presence of {rel}")

    for rel in CRITICAL_ENTRY_FILES:
        path = root / rel
        if not path.exists():
            result.failures.append(f"Missing critical entry file: {rel}")
        elif path.stat().st_size == 0:
            result.failures.append(f"Critical entry file is empty: {rel}")
        else:
            result.passes.append(f"Critical entry present: {rel}")

    for rel in ["src/components", "src/services", "src/utils", "api/_lib"]:
        path = root / rel
        if not path.is_dir():
            result.failures.append(f"Missing source directory: {rel}")
        else:
            count = sum(1 for _ in path.rglob("*") if _.is_file())
            result.passes.append(f"{rel}/ contains {count} file(s)")
            if verbose:
                result.passes.append(f"Architecture directory verified: {rel}")

    return result


def validate_package_json(root: Path, verbose: bool) -> CategoryResult:
    result = CategoryResult("package.json")
    path = root / "package.json"
    data, error = parse_json_file(path)
    if error:
        result.failures.append(error)
        return result

    result.passes.append("package.json parsed")

    if not isinstance(data, dict):
        result.failures.append("package.json root must be an object")
        return result

    deps = data.get("dependencies", {})
    if not isinstance(deps, dict):
        result.failures.append("dependencies must be an object")
    else:
        for pkg in ("react", "react-dom"):
            if pkg not in deps:
                result.failures.append(f"Missing dependency: {pkg}")
            else:
                result.passes.append(f"Dependency present: {pkg}@{deps[pkg]}")
                if verbose:
                    result.passes.append(f"Reported version for {pkg}: {deps[pkg]}")

    scripts = data.get("scripts", {})
    if not isinstance(scripts, dict):
        result.failures.append("scripts must be an object")
        return result

    for script_name in ("start", "build"):
        if script_name not in scripts:
            result.failures.append(f"Missing npm script: {script_name}")
        else:
            result.passes.append(f"Script present: {script_name} -> {scripts[script_name]}")

    script_tools = {
        "start": ["craco"],
        "build": ["craco"],
        "serve": ["vercel"],
        "dev": ["serve"],
    }
    for script_name, tokens in script_tools.items():
        command = scripts.get(script_name, "")
        if not command:
            continue
        for token in tokens:
            if token not in command:
                result.warnings.append(
                    f"Script '{script_name}' does not reference expected tool '{token}': {command}"
                )

    for section in ("dependencies", "devDependencies"):
        section_data = data.get(section, {})
        if section_data is None:
            continue
        if not isinstance(section_data, dict):
            result.failures.append(f"{section} must be an object")
            continue
        for name, version in section_data.items():
            if not isinstance(name, str) or not name.strip():
                result.failures.append(f"Malformed dependency name in {section}: {name!r}")
            if not isinstance(version, str) or not version.strip():
                result.failures.append(f"Malformed dependency version for {name} in {section}")

    if verbose:
        result.passes.append(f"Configured scripts: {', '.join(sorted(scripts))}")

    return result


def validate_local_imports(root: Path, verbose: bool) -> CategoryResult:
    result = CategoryResult("Local imports")
    js_files = find_js_files(root / "src")
    checked = 0

    for js_file in js_files:
        content = read_text(js_file)
        rel_source = js_file.relative_to(root).as_posix()
        for specifier, is_dynamic in extract_imports(content):
            if is_npm_import(specifier):
                continue
            checked += 1
            resolved = resolve_local_import(js_file, specifier, root)
            if resolved is None:
                level = result.warnings if is_dynamic else result.failures
                kind = "Dynamic import" if is_dynamic else "Import"
                level.append(f"{rel_source}: unresolved {kind.lower()} '{specifier}'")
            elif verbose:
                result.passes.append(
                    f"{rel_source}: '{specifier}' -> {resolved.relative_to(root).as_posix()}"
                )

    if checked == 0:
        result.warnings.append("No local imports discovered under src/")
    else:
        unresolved = len(result.failures) + len(result.warnings)
        if unresolved == 0:
            result.passes.append(f"All {checked} local import(s) under src/ resolve")

    return result


def validate_api_routes(root: Path, verbose: bool) -> CategoryResult:
    result = CategoryResult("Vercel API routes")
    api_dir = root / "api"
    route_files = sorted(
        p for p in api_dir.glob("*.js") if p.is_file()
    ) if api_dir.exists() else []

    if not route_files:
        result.failures.append("No API route files found under api/")
        return result

    handler_pattern = re.compile(
        r"module\.exports\s*=\s*(?:async\s+)?function\s+handler|export\s+default\s+async\s+function\s+handler"
    )

    for route_file in route_files:
        rel_route = route_file.relative_to(root).as_posix()
        content = read_text(route_file)
        if not content.strip():
            result.failures.append(f"API route is empty: {rel_route}")
            continue

        if not handler_pattern.search(content):
            result.failures.append(f"API route missing handler export: {rel_route}")
        else:
            result.passes.append(f"Handler export found: {rel_route}")

        for specifier, is_dynamic in extract_imports(content):
            if is_npm_import(specifier):
                continue
            resolved = resolve_local_import(route_file, specifier, root)
            if resolved is None:
                kind = "dynamic import" if is_dynamic else "import"
                result.failures.append(f"{rel_route}: unresolved local {kind} '{specifier}'")
            elif verbose:
                result.passes.append(
                    f"{rel_route} -> {specifier} resolves to {resolved.relative_to(root).as_posix()}"
                )

        helpers = re.findall(r"require\(['\"]\./_lib/([^'\"]+)['\"]\)", content)
        for helper in helpers:
            helper_path = api_dir / "_lib" / helper
            if not helper_path.exists() and not (helper_path.with_suffix(".js")).exists():
                result.failures.append(f"{rel_route}: missing helper api/_lib/{helper}")
            elif verbose:
                result.passes.append(f"{rel_route} uses helper api/_lib/{helper}")

    lib_files = sorted(find_js_files(api_dir / "_lib"))
    if lib_files:
        result.passes.append(f"Found {len(lib_files)} helper module(s) under api/_lib/")
        if verbose:
            for lib in lib_files:
                result.passes.append(f"Helper module: {lib.relative_to(root).as_posix()}")

    return result


def validate_environment_audit(root: Path, verbose: bool) -> CategoryResult:
    result = CategoryResult("Environment variables")
    frontend_vars: set[str] = set()
    server_vars: set[str] = set()

    scan_files = find_js_files(root / "src") + find_js_files(root / "api")
    for file_path in scan_files:
        content = read_text(file_path)
        rel = file_path.relative_to(root).as_posix()
        for pattern in ENV_PATTERNS:
            for match in pattern.finditer(content):
                var_name = match.group(1)
                bucket = classify_env_var(var_name, file_path, root)
                if bucket == "frontend":
                    frontend_vars.add(var_name)
                elif bucket == "server":
                    server_vars.add(var_name)

                if var_name in SENSITIVE_SERVER_KEYS and bucket == "frontend":
                    if "process.env" in match.group(0) or var_name.startswith("REACT_APP_"):
                        result.warnings.append(
                            f"{rel}: sensitive server key '{var_name}' referenced in frontend source"
                        )

        for secret_pattern in SECRET_VALUE_PATTERNS:
            if secret_pattern.search(content):
                result.warnings.append(f"{rel}: possible hard-coded secret pattern detected")

    if frontend_vars:
        result.passes.append(f"Frontend env references: {', '.join(sorted(frontend_vars))}")
    if server_vars:
        result.passes.append(f"Server env references: {', '.join(sorted(server_vars))}")

    example_path = root / ".env.example"
    if example_path.exists():
        example_vars = {
            line.split("=", 1)[0].strip()
            for line in read_text(example_path).splitlines()
            if line.strip() and not line.strip().startswith("#") and "=" in line
        }
        undocumented = server_vars - example_vars - {"NODE_ENV", "VERCEL", "VERCEL_ENV"}
        if undocumented:
            result.warnings.append(
                "Server env vars referenced in code but absent from .env.example: "
                + ", ".join(sorted(undocumented))
            )
        if verbose:
            result.passes.append(f".env.example documents: {', '.join(sorted(example_vars))}")

    return result


def validate_client_server_boundary(root: Path, verbose: bool) -> CategoryResult:
    result = CategoryResult("Client/server boundary")
    src_files = find_js_files(root / "src")

    forbidden_prefixes = ("../api/", "../../api/", "/api/_lib/", "./api/_lib/")
    for src_file in src_files:
        rel = src_file.relative_to(root).as_posix()
        content = read_text(src_file)
        for specifier, _ in extract_imports(content):
            normalized = specifier.replace("\\", "/")
            if normalized.startswith("api/_lib") or "/api/_lib/" in normalized:
                result.failures.append(f"{rel}: imports server-only module '{specifier}'")
            for prefix in forbidden_prefixes:
                if normalized.startswith(prefix):
                    result.failures.append(f"{rel}: imports server path '{specifier}'")

        for specifier, _ in extract_imports(content):
            if is_npm_import(specifier):
                base = specifier.split("/")[0]
                if base.startswith("@"):
                    base = "/".join(specifier.split("/")[:2])
                pkg_root = base.replace("@", "")
                first_segment = pkg_root.split("/")[0]
                if first_segment in NODE_ONLY_MODULES:
                    result.warnings.append(
                        f"{rel}: browser code imports Node-only module '{specifier}'"
                    )

    service_files = find_js_files(root / "src" / "services")
    if service_files:
        route_refs: set[str] = set()
        for service_file in service_files:
            route_refs.update(re.findall(r"""['"`](/api/[^'"`]+)['"`]""", read_text(service_file)))
        if route_refs:
            result.passes.append(
                f"Frontend services call server routes: {', '.join(sorted(route_refs))}"
            )
            if verbose:
                for route in sorted(route_refs):
                    result.passes.append(f"Detected frontend API route usage: {route}")
        else:
            result.warnings.append("No /api/ route references found in frontend services")

    secret_hits = 0
    for src_file in src_files:
        content = read_text(src_file)
        for key in SENSITIVE_SERVER_KEYS:
            if re.search(rf"{key}\s*=\s*['\"][^'\"{{}}]+['\"]", content):
                secret_hits += 1
                result.failures.append(
                    f"{src_file.relative_to(root).as_posix()}: embedded value for {key}"
                )

    if secret_hits == 0:
        result.passes.append("No embedded provider secrets detected in src/")

    return result


def validate_ffmpeg_pipeline(root: Path, verbose: bool) -> CategoryResult:
    result = CategoryResult("FFmpeg media pipeline")
    ffmpeg_file = root / "src" / "services" / "ffmpegService.js"
    if not ffmpeg_file.exists():
        result.failures.append("Missing src/services/ffmpegService.js")
        return result

    content = read_text(ffmpeg_file)
    for invariant, tokens in FFMPEG_INVARIANTS.items():
        if any(token in content for token in tokens):
            result.passes.append(f"Invariant present: {invariant}")
            if verbose:
                found = next(token for token in tokens if token in content)
                result.passes.append(f"{invariant} matched token '{found}'")
        else:
            result.failures.append(
                f"Missing FFmpeg invariant '{invariant}' (expected one of: {', '.join(tokens)})"
            )

    if "missing image or audio" in content:
        result.passes.append("Scene media requirement check present")
    else:
        result.warnings.append("Could not find explicit image/audio requirement message")

    return result


def validate_asset_references(root: Path, verbose: bool) -> CategoryResult:
    result = CategoryResult("Asset references")
    scan_paths: list[Path] = []
    for pattern in ("*.html", "*.css", "*.js", "*.jsx"):
        scan_paths.extend(root.glob(f"public/{pattern}"))
        scan_paths.extend((root / "src").rglob(pattern))

    checked = 0
    for file_path in sorted(set(scan_paths)):
        content = read_text(file_path)
        rel_source = file_path.relative_to(root).as_posix()
        for asset in extract_asset_references(file_path, content):
            if should_ignore_asset(asset):
                continue
            checked += 1
            if asset in RUNTIME_PUBLIC_PATHS:
                result.warnings.append(
                    f"{rel_source}: runtime public path '{asset}' is fetched dynamically, not committed"
                )
                continue
            if asset.startswith("/"):
                public_path = root / "public" / asset.lstrip("/")
                if not public_path.exists():
                    result.failures.append(f"{rel_source}: missing public asset '{asset}'")
                elif verbose:
                    result.passes.append(f"{rel_source}: public asset '{asset}' exists")
            else:
                resolved = resolve_asset_reference(file_path, asset, root)
                if resolved is None:
                    result.failures.append(f"{rel_source}: missing local asset '{asset}'")
                elif verbose:
                    result.passes.append(
                        f"{rel_source}: asset '{asset}' -> {resolved.relative_to(root).as_posix()}"
                    )

    preview_images = list((root / "public" / "images" / "preview").glob("*"))
    if preview_images:
        result.passes.append(f"Found {len(preview_images)} preview image(s) in public/images/preview/")
    else:
        result.warnings.append("No preview images found under public/images/preview/")

    if checked == 0:
        result.warnings.append("No local static asset references discovered")
    elif not result.failures:
        result.passes.append(f"Validated {checked} local asset reference(s)")

    return result


def validate_source_integrity(root: Path, verbose: bool) -> CategoryResult:
    result = CategoryResult("Source integrity")
    json_targets = [
        root / "package.json",
        root / "package-lock.json",
        root / "vercel.json",
    ]

    for json_path in json_targets:
        if not json_path.exists():
            continue
        _, error = parse_json_file(json_path)
        if error:
            result.failures.append(error)
        else:
            result.passes.append(f"Valid JSON: {json_path.relative_to(root).as_posix()}")

    source_files = []
    for base in (root / "src", root / "api", root / "public"):
        if base.exists():
            source_files.extend(
                p for p in base.rglob("*") if p.is_file() and p.suffix.lower() in (*JS_EXTENSIONS, ".json", ".css", ".html", ".txt")
            )

    for file_path in sorted(source_files):
        rel = file_path.relative_to(root).as_posix()
        try:
            content = read_text(file_path)
        except OSError as exc:
            result.failures.append(f"{rel}: unreadable ({exc})")
            continue

        if not content.strip():
            result.failures.append(f"Empty source file: {rel}")
        if MERGE_MARKER.search(content):
            result.failures.append(f"Merge marker detected in {rel}")
        if PLACEHOLDER_MARKER.search(content):
            result.failures.append(f"Placeholder marker detected in {rel}")

    for secret_name in SECRET_FILES:
        secret_path = root / secret_name
        if secret_path.exists() and secret_path.is_file():
            result.warnings.append(
                f"Local environment file present (should remain untracked): {secret_name}"
            )

    route_names = [p.name for p in (root / "api").glob("*.js")] if (root / "api").exists() else []
    duplicates = sorted({name for name in route_names if route_names.count(name) > 1})
    if duplicates:
        result.failures.append(f"Duplicated API route filenames: {', '.join(duplicates)}")
    else:
        result.passes.append("No duplicated API route filenames detected")

    if verbose:
        result.passes.append(f"Scanned {len(source_files)} source/config files for integrity issues")

    return result


def run_validation(root: Path, verbose: bool = False) -> ValidationReport:
    report = ValidationReport(root=root)
    validators = [
        validate_repository_structure,
        validate_package_json,
        validate_local_imports,
        validate_api_routes,
        validate_environment_audit,
        validate_client_server_boundary,
        validate_ffmpeg_pipeline,
        validate_asset_references,
        validate_source_integrity,
    ]
    for validator in validators:
        report.add(validator(root, verbose))
    return report


def format_text_report(report: ValidationReport) -> str:
    lines: list[str] = []
    for category in report.categories:
        lines.append(f"[{category.status}] {category.name}")
        for item in category.passes:
            lines.append(f"  [PASS] {item}")
        for item in category.warnings:
            lines.append(f"  [WARN] {item}")
        for item in category.failures:
            lines.append(f"  [FAIL] {item}")
        lines.append("")
    lines.append(f"Passed: {report.passed}")
    lines.append(f"Warnings: {report.warnings}")
    lines.append(f"Failed: {report.failed}")
    return "\n".join(lines)


def format_json_report(report: ValidationReport) -> str:
    payload = {
        "root": str(report.root),
        "summary": {
            "passed": report.passed,
            "warnings": report.warnings,
            "failed": report.failed,
        },
        "categories": [
            {
                "name": category.name,
                "status": category.status,
                "passes": category.passes,
                "warnings": category.warnings,
                "failures": category.failures,
            }
            for category in report.categories
        ],
    }
    return json.dumps(payload, indent=2)


def build_exit_summary(report: ValidationReport) -> dict[str, int]:
    return {
        "passed": report.passed,
        "warnings": report.warnings,
        "failed": report.failed,
    }


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate AI Reel Maker repository structure and configuration.")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON.")
    parser.add_argument("--verbose", action="store_true", help="Include successful checks and architecture details.")
    parser.add_argument("--root", type=Path, default=ROOT, help="Repository root (defaults to project root).")
    args = parser.parse_args(list(argv) if argv is not None else None)

    root = args.root.resolve()
    if not root.exists():
        print(f"Repository root does not exist: {root}", file=sys.stderr)
        return 2

    report = run_validation(root, verbose=args.verbose)

    if args.json:
        print(format_json_report(report))
    else:
        print(format_text_report(report))

    return 1 if report.failed else 0


if __name__ == "__main__":
    sys.exit(main())
