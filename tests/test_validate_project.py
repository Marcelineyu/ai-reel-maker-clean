import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import validate_project as vp  # noqa: E402


class ValidateProjectTests(unittest.TestCase):
    def test_parse_json_file_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sample.json"
            path.write_text('{"name": "demo"}', encoding="utf-8")
            data, error = vp.parse_json_file(path)
            self.assertIsNone(error)
            self.assertEqual(data, {"name": "demo"})

    def test_parse_json_file_malformed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "broken.json"
            path.write_text("{not-json", encoding="utf-8")
            data, error = vp.parse_json_file(path)
            self.assertIsNone(data)
            self.assertIn("malformed JSON", error)

    def test_resolve_local_import_with_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            module_dir = root / "src" / "utils"
            module_dir.mkdir(parents=True)
            (module_dir / "index.js").write_text("export const x = 1;", encoding="utf-8")
            source = root / "src" / "App.js"
            source.write_text("import './utils';", encoding="utf-8")
            resolved = vp.resolve_local_import(source, "./utils", root)
            self.assertEqual(resolved, module_dir / "index.js")

    def test_resolve_local_import_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "src" / "App.js"
            source.parent.mkdir(parents=True)
            source.write_text("import './missing';", encoding="utf-8")
            resolved = vp.resolve_local_import(source, "./missing", root)
            self.assertIsNone(resolved)

    def test_missing_import_detection(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "package.json").write_text("{}", encoding="utf-8")
            src = root / "src"
            src.mkdir()
            (src / "App.js").write_text("import './does-not-exist';", encoding="utf-8")
            result = vp.validate_local_imports(root, verbose=False)
            self.assertTrue(any("does-not-exist" in item for item in result.failures))

    def test_should_ignore_data_url(self):
        self.assertTrue(vp.should_ignore_asset("data:image/png;base64,abc"))

    def test_should_ignore_external_url(self):
        self.assertTrue(vp.should_ignore_asset("https://fonts.googleapis.com/css2?family=Inter"))

    def test_merge_marker_detection(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "package.json").write_text("{}", encoding="utf-8")
            src = root / "src"
            src.mkdir()
            (src / "broken.js").write_text("const x = 1;\n<<<<<<< HEAD\n", encoding="utf-8")
            result = vp.validate_source_integrity(root, verbose=False)
            self.assertTrue(any("Merge marker" in item for item in result.failures))

    def test_sensitive_env_classification(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            api_dir = root / "api"
            api_dir.mkdir()
            (api_dir / "demo.js").write_text(
                "const key = process.env.OPENAI_API_KEY;",
                encoding="utf-8",
            )
            result = vp.validate_environment_audit(root, verbose=False)
            self.assertTrue(any("OPENAI_API_KEY" in item for item in result.passes))

    def test_frontend_server_key_warning(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            src = root / "src"
            src.mkdir()
            (src / "bad.js").write_text(
                "const key = process.env.GEMINI_API_KEY;",
                encoding="utf-8",
            )
            result = vp.validate_environment_audit(root, verbose=False)
            self.assertTrue(
                any("GEMINI_API_KEY" in item and "frontend" in item for item in result.warnings)
            )

    def test_classify_env_var_paths(self):
        root = Path("/repo")
        self.assertEqual(
            vp.classify_env_var("OPENAI_API_KEY", root / "api" / "openai.js", root),
            "server",
        )
        self.assertEqual(
            vp.classify_env_var("REACT_APP_TEST", root / "src" / "App.js", root),
            "frontend",
        )

    def test_exit_summary_generation(self):
        report = vp.ValidationReport(root=Path("."))
        report.add(vp.CategoryResult("demo", passes=["ok"], warnings=["warn"], failures=[]))
        summary = vp.build_exit_summary(report)
        self.assertEqual(summary, {"passed": 1, "warnings": 1, "failed": 0})

    def test_main_returns_non_zero_on_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "package.json").write_text("{", encoding="utf-8")
            exit_code = vp.main(["--root", str(root), "--json"])
            self.assertEqual(exit_code, 1)
            exit_code = vp.main(["--root", str(root)])
            self.assertEqual(exit_code, 1)

    def test_main_returns_zero_for_minimal_valid_repo(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self._seed_minimal_repo(root)
            exit_code = vp.main(["--root", str(root)])
            self.assertEqual(exit_code, 0)

    def test_json_output_is_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self._seed_minimal_repo(root)
            with patch("sys.stdout") as stdout:
                exit_code = vp.main(["--root", str(root), "--json"])
                payload = json.loads("".join(call.args[0] for call in stdout.write.call_args_list))
            self.assertEqual(exit_code, 0)
            self.assertIn("categories", payload)
            self.assertIn("summary", payload)

    def _seed_minimal_repo(self, root: Path) -> None:
        (root / "package.json").write_text(
            json.dumps(
                {
                    "dependencies": {"react": "^18.0.0", "react-dom": "^18.0.0"},
                    "scripts": {"start": "craco start", "build": "craco build"},
                }
            ),
            encoding="utf-8",
        )
        (root / "package-lock.json").write_text("{}", encoding="utf-8")
        (root / "vercel.json").write_text("{}", encoding="utf-8")
        (root / "craco.config.js").write_text("module.exports = {};", encoding="utf-8")
        (root / "tailwind.config.js").write_text("module.exports = {};", encoding="utf-8")
        (root / "postcss.config.js").write_text("module.exports = {};", encoding="utf-8")
        (root / ".gitignore").write_text("node_modules\n", encoding="utf-8")
        (root / ".env.example").write_text("OPENAI_API_KEY=\n", encoding="utf-8")

        public = root / "public"
        public.mkdir()
        (public / "index.html").write_text("<html></html>", encoding="utf-8")
        (public / "images" / "preview").mkdir(parents=True)

        src = root / "src"
        src.mkdir()
        (src / "index.js").write_text("import App from './App';", encoding="utf-8")
        (src / "App.js").write_text("export default function App() { return null; }", encoding="utf-8")
        (src / "components").mkdir()
        (src / "services").mkdir()
        (src / "utils").mkdir()
        (src / "services" / "apiClient.js").write_text(
            "export async function postJson(path) { return fetch(path); }",
            encoding="utf-8",
        )
        (src / "services" / "ffmpegService.js").write_text(
            "\n".join(
                [
                    "import { FFmpeg } from '@ffmpeg/ffmpeg';",
                    "export async function assembleVideo(scenes) {",
                    "  const f = new FFmpeg();",
                    "  if (!s.imageBlob || !s.audioBlob) throw new Error('missing image or audio');",
                    "  const audioDurations = [];",
                    "  function sceneToSRT() { return '.srt'; }",
                    "  const scaleFilter = 'scale=720:1280:force_original_aspect_ratio=decrease';",
                    "  const subFilter = 'subtitles=scene.srt:fontsdir=/fonts';",
                    "  await f.exec(['-f', 'concat', '-i', 'concat.txt', '-y', 'output.mp4']);",
                    "  return new Blob([], { type: 'video/mp4' });",
                    "}",
                    "async function loadFontForSubtitles() { return 'DejaVuSans'; }",
                    "async function getAudioDuration() { return 1; }",
                ]
            ),
            encoding="utf-8",
        )

        api = root / "api"
        api.mkdir()
        (api / "_lib").mkdir()
        (api / "_lib" / "validation.js").write_text("module.exports = {};", encoding="utf-8")
        (api / "providers.js").write_text(
            "const x = require('./_lib/validation');\n"
            "module.exports = async function handler(req, res) { return res.end(); };",
            encoding="utf-8",
        )


if __name__ == "__main__":
    unittest.main()
