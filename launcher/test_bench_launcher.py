import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import bench_launcher


class LauncherLogicTest(unittest.TestCase):
    def test_project_root_walks_up_to_the_package_name(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "package.json").write_text('{"name": "k2-loadcell-bench"}', encoding="utf-8")
            nested = root / "launcher" / "dist"
            nested.mkdir(parents=True)
            self.assertEqual(bench_launcher.project_root_from(nested), root)

    def test_a_different_package_is_ignored(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "package.json").write_text('{"name": "other"}', encoding="utf-8")
            self.assertIsNone(bench_launcher.project_root_from(root))

    def test_installed_means_next_and_a_production_build(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.assertFalse(bench_launcher.is_installed(root))
            next_bin = root / "node_modules" / "next" / "dist" / "bin" / "next"
            next_bin.parent.mkdir(parents=True)
            next_bin.write_text("", encoding="utf-8")
            self.assertFalse(bench_launcher.is_installed(root))
            build = root / ".next" / "BUILD_ID"
            build.parent.mkdir()
            build.write_text("abc", encoding="utf-8")
            self.assertTrue(bench_launcher.is_installed(root))

    def test_node_version_floor_is_18_18(self) -> None:
        self.assertFalse(bench_launcher.version_ok("v18.17.1"))
        self.assertTrue(bench_launcher.version_ok("v18.18.0"))
        self.assertTrue(bench_launcher.version_ok("24.20.0"))
        self.assertIsNone(bench_launcher.parse_version("nope"))

    def test_prefer_a_real_node_with_npm_over_a_newer_bundled_one(self) -> None:
        picked = bench_launcher.prefer_node(
            [
                {
                    "path": r"C:\agent\cursor-agent\node.exe",
                    "npm": True,
                    "version": "24.22.1",
                },
                {
                    "path": r"C:\Users\me\AppData\Local\node-v24.20.0\node.exe",
                    "npm": True,
                    "version": "24.20.0",
                },
                {
                    "path": r"C:\old\node.exe",
                    "npm": False,
                    "version": "22.0.0",
                },
            ]
        )
        self.assertIsNotNone(picked)
        assert picked is not None
        self.assertIn("node-v24.20.0", picked["path"])

    def test_kill_process_stops_a_child(self) -> None:
        proc = subprocess.Popen(
            [sys.executable, "-c", "import time; time.sleep(30)"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            **bench_launcher.popen_kwargs(),
        )
        bench_launcher.kill_process(proc)
        proc.wait(timeout=8)
        self.assertIsNotNone(proc.poll())

    def test_skip_node_without_npm_or_below_the_floor(self) -> None:
        self.assertIsNone(
            bench_launcher.prefer_node(
                [
                    {"path": "/usr/bin/node", "npm": True, "version": "16.20.0"},
                    {"path": "/usr/local/bin/node", "npm": False, "version": "22.0.0"},
                ]
            )
        )


if __name__ == "__main__":
    unittest.main()
