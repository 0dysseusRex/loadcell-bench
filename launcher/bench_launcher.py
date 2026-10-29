"""Small window that installs the load cell bench, starts it, and opens a browser.

Install runs npm install and the Next.js build in this repo. Run starts
`next start` on 127.0.0.1:4471 and opens that page. Close, and the window's
title-bar button, stop that server and leave.
"""

from __future__ import annotations

import json
import os
import shutil
import signal
import socket
import stat
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

APP_NAME = "k2-loadcell-bench"
PORT = 4471
URL = f"http://127.0.0.1:{PORT}"
MIN_NODE = (18, 18, 0)
LOG_PATH = Path(tempfile.gettempdir()) / "loadcell-bench-launcher.log"

try:
    import tkinter as tk
    from tkinter import messagebox, ttk
except ImportError:  # Linux often splits this into python3-tk
    tk = None
    messagebox = None
    ttk = None


def project_root_from(start: Path) -> Path | None:
    for folder in [start, *start.parents]:
        package = folder / "package.json"
        if not package.is_file():
            continue
        try:
            data = json.loads(package.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if data.get("name") == APP_NAME:
            return folder
    return None


def locate_project() -> Path | None:
    if getattr(sys, "frozen", False):
        start = Path(sys.executable).resolve().parent
    else:
        start = Path(__file__).resolve().parent
    return project_root_from(start)


def is_installed(root: Path) -> bool:
    next_bin = root / "node_modules" / "next" / "dist" / "bin" / "next"
    build_id = root / ".next" / "BUILD_ID"
    return next_bin.is_file() and build_id.is_file()


def parse_version(text: str) -> tuple[int, int, int] | None:
    cleaned = text.strip().lstrip("v")
    parts = cleaned.split(".")
    if len(parts) < 2:
        return None
    try:
        major = int(parts[0])
        minor = int(parts[1])
        patch = int(parts[2]) if len(parts) > 2 else 0
    except ValueError:
        return None
    return major, minor, patch


def version_ok(text: str) -> bool:
    parsed = parse_version(text)
    return parsed is not None and parsed >= MIN_NODE


def prefer_node(options: list[dict]) -> dict | None:
    """Pick the newest Node that ships npm. A Cursor-bundled node loses to a real install."""
    usable = []
    for option in options:
        if not option.get("npm"):
            continue
        parsed = parse_version(str(option.get("version", "")))
        if parsed is None or parsed < MIN_NODE:
            continue
        usable.append({**option, "parsed": parsed})
    if not usable:
        return None

    def sort_key(option: dict) -> tuple:
        buried = 1 if "cursor-agent" in option["path"].lower().replace("\\", "/") else 0
        major, minor, patch = option["parsed"]
        return (buried, -major, -minor, -patch)

    return min(usable, key=sort_key)


def _no_window_flags() -> dict:
    if os.name != "nt":
        return {}
    return {"creationflags": subprocess.CREATE_NO_WINDOW}


def read_node_version(node: Path) -> str | None:
    try:
        out = subprocess.check_output(
            [str(node), "-p", "process.versions.node"],
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=15,
            **_no_window_flags(),
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return out.strip()


def npm_cli_beside(node: Path) -> Path | None:
    cli = node.parent / "node_modules" / "npm" / "bin" / "npm-cli.js"
    return cli if cli.is_file() else None


def iter_node_candidates() -> list[Path]:
    seen: set[Path] = set()
    found: list[Path] = []

    def add(candidate: Path) -> None:
        if not candidate.is_file():
            return
        try:
            resolved = candidate.resolve()
        except OSError:
            resolved = candidate
        if resolved in seen:
            return
        seen.add(resolved)
        found.append(resolved)

    names = ["node.exe", "node"] if os.name == "nt" else ["node"]
    for folder in os.environ.get("PATH", "").split(os.pathsep):
        if not folder:
            continue
        for name in names:
            add(Path(folder) / name)

    extras: list[Path] = []
    home = Path.home()
    if os.name == "nt":
        local = os.environ.get("LOCALAPPDATA")
        if local:
            winget = Path(local) / "Microsoft" / "WinGet" / "Packages"
            if winget.is_dir():
                extras.extend(winget.glob("OpenJS.NodeJS*/node-v*-win-*/node.exe"))
            extras.append(Path(local) / "Programs" / "nodejs" / "node.exe")
            extras.append(Path(local) / "volta" / "bin" / "node.exe")
        for env_name in ("ProgramFiles", "ProgramFiles(x86)"):
            base = os.environ.get(env_name)
            if base:
                extras.append(Path(base) / "nodejs" / "node.exe")
        symlink = os.environ.get("NVM_SYMLINK")
        if symlink:
            extras.append(Path(symlink) / "node.exe")
    else:
        extras.extend(
            [
                Path("/usr/local/bin/node"),
                Path("/opt/homebrew/bin/node"),
                Path("/usr/bin/node"),
                home / ".volta" / "bin" / "node",
            ]
        )
        extras.extend(home.glob(".nvm/versions/node/*/bin/node"))
        extras.append(home / ".local" / "share" / "fnm" / "aliases" / "default" / "bin" / "node")
    for candidate in extras:
        add(candidate)
    return found


def choose_node() -> tuple[Path, Path] | None:
    options = []
    for node in iter_node_candidates():
        cli = npm_cli_beside(node)
        version = read_node_version(node) if cli else None
        options.append(
            {
                "path": str(node),
                "node": node,
                "cli": cli,
                "npm": cli is not None,
                "version": version or "",
            }
        )
    picked = prefer_node(options)
    if picked is None:
        return None
    return picked["node"], picked["cli"]


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def page_is_up(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=1):
            return True
    except urllib.error.HTTPError:
        return True
    except (OSError, urllib.error.URLError):
        return False


def node_env(node: Path) -> dict[str, str]:
    env = os.environ.copy()
    env["PATH"] = str(node.parent) + os.pathsep + env.get("PATH", "")
    env["npm_config_fund"] = "false"
    env["npm_config_audit"] = "false"
    env["npm_config_update_notifier"] = "false"
    env["NO_COLOR"] = "1"
    return env


def popen_kwargs() -> dict:
    if os.name == "nt":
        return {
            "creationflags": subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW,
        }
    return {"start_new_session": True}


def kill_process(proc: subprocess.Popen | None) -> None:
    if proc is None or proc.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            **_no_window_flags(),
        )
        return
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError, OSError):
        proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError, OSError):
            proc.kill()


def remove_tree(path: Path) -> None:
    if not path.exists():
        return

    def on_error(func, target, _exc) -> None:
        os.chmod(target, stat.S_IWRITE)
        func(target)

    if sys.version_info >= (3, 12):
        shutil.rmtree(path, onexc=on_error)
    else:
        shutil.rmtree(path, onerror=on_error)


def clip(line: str, limit: int = 96) -> str:
    text = " ".join(line.split())
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def enable_dpi() -> None:
    if os.name != "nt":
        return
    try:
        import ctypes

        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except (AttributeError, OSError):
        try:
            import ctypes

            ctypes.windll.user32.SetProcessDPIAware()
        except (AttributeError, OSError):
            return


class Launcher:
    def __init__(self) -> None:
        if tk is None or ttk is None or messagebox is None:
            raise SystemExit("This launcher needs tkinter. On Linux, install python3-tk.")
        enable_dpi()
        self.root_dir = locate_project()
        self.installed = bool(self.root_dir and is_installed(self.root_dir))
        self.busy = False
        self.closing = False
        self.stop_event = threading.Event()
        self.child_lock = threading.Lock()
        self.child: subprocess.Popen | None = None
        self.server: subprocess.Popen | None = None
        self.worker: threading.Thread | None = None
        self.log_handle = LOG_PATH.open("a", encoding="utf-8")

        self.root = tk.Tk()
        self.root.title("Load cell bench")
        self.root.resizable(False, False)
        self.status = tk.StringVar(value=self.initial_status())
        frame = ttk.Frame(self.root, padding=16)
        frame.grid(row=0, column=0, sticky="nsew")
        ttk.Label(frame, text="Load cell bench").grid(row=0, column=0, sticky="w")
        ttk.Label(frame, textvariable=self.status, wraplength=400, justify="left").grid(
            row=1, column=0, sticky="w", pady=(8, 14)
        )
        buttons = ttk.Frame(frame)
        buttons.grid(row=2, column=0, sticky="w")
        self.install_btn = ttk.Button(buttons, text="Install", width=12, command=self.on_install)
        self.run_btn = ttk.Button(buttons, text="Run", width=12, command=self.on_run)
        self.close_btn = ttk.Button(buttons, text="Close", width=12, command=self.close)
        self.install_btn.grid(row=0, column=0, padx=(0, 8))
        self.run_btn.grid(row=0, column=1, padx=(0, 8))
        self.close_btn.grid(row=0, column=2)
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.refresh()
        self.root.update_idletasks()
        width, height = 440, 168
        x = max(0, (self.root.winfo_screenwidth() - width) // 2)
        y = max(0, (self.root.winfo_screenheight() - height) // 3)
        self.root.geometry(f"{width}x{height}+{x}+{y}")
        self.root.after(1000, self.poll_server)

    def initial_status(self) -> str:
        if self.root_dir is None:
            return "Place this launcher inside the load cell bench folder."
        if self.installed:
            return "Installed. Run opens the bench in your browser."
        return "Install builds the app. Run then starts it and opens the browser."

    def refresh(self) -> None:
        self.installed = bool(self.root_dir and is_installed(self.root_dir))
        self.install_btn.configure(text="Uninstall" if self.installed else "Install")
        can_work = self.root_dir is not None and not self.busy and not self.closing
        self.install_btn.configure(state=tk.NORMAL if can_work else tk.DISABLED)
        self.run_btn.configure(state=tk.NORMAL if can_work and self.installed else tk.DISABLED)
        self.close_btn.configure(state=tk.NORMAL if not self.closing else tk.DISABLED)

    def set_status(self, text: str) -> None:
        if self.closing:
            return

        def apply() -> None:
            self.status.set(text)

        try:
            self.root.after(0, apply)
        except tk.TclError:
            return

    def log(self, text: str) -> None:
        try:
            self.log_handle.write(text.rstrip() + "\n")
            self.log_handle.flush()
        except OSError:
            return

    def fail(self, text: str) -> None:
        self.log(text)
        self.set_status(text)
        if self.closing:
            return

        def show() -> None:
            messagebox.showerror("Load cell bench", f"{text}\n\nDetails: {LOG_PATH}")

        try:
            self.root.after(0, show)
        except tk.TclError:
            return

    def start_worker(self, target) -> None:
        if self.busy or self.closing:
            return
        self.busy = True
        self.refresh()

        def wrap() -> None:
            try:
                target()
            except Exception as exc:
                self.fail(str(exc))
            finally:
                self.busy = False
                if not self.closing:
                    try:
                        self.root.after(0, self.refresh)
                    except tk.TclError:
                        return

        self.worker = threading.Thread(target=wrap, daemon=True)
        self.worker.start()

    def remember(self, proc: subprocess.Popen) -> None:
        with self.child_lock:
            self.child = proc

    def kill_all(self) -> None:
        with self.child_lock:
            procs = [proc for proc in (self.child, self.server) if proc is not None]
            self.child = None
            self.server = None
        seen: set[int] = set()
        for proc in procs:
            if id(proc) in seen:
                continue
            seen.add(id(proc))
            kill_process(proc)

    def stream(self, cmd: list[str], phase: str, cwd: Path, env: dict[str, str]) -> int:
        self.log("$ " + " ".join(cmd))
        proc = subprocess.Popen(
            cmd,
            cwd=str(cwd),
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            **popen_kwargs(),
        )
        self.remember(proc)
        assert proc.stdout is not None
        for line in proc.stdout:
            self.log(line)
            if self.stop_event.is_set():
                kill_process(proc)
                break
            shown = clip(line)
            if shown:
                self.set_status(f"{phase} {shown}")
        code = proc.wait()
        if code != 0 and not self.stop_event.is_set():
            self.fail(f"{phase} failed (exit {code}).")
        return code

    def require_node(self) -> tuple[Path, Path] | None:
        chosen = choose_node()
        if chosen is not None:
            return chosen
        self.set_status("Node.js 18.18 or newer, with npm, is required.")
        self.log("Node.js 18.18 or newer, with npm, was not found.")

        def offer() -> None:
            if messagebox.askyesno(
                "Node.js",
                "Node.js 18.18 or newer is required. Open the Node.js download page?",
            ):
                webbrowser.open("https://nodejs.org/")

        if not self.closing:
            try:
                self.root.after(0, offer)
            except tk.TclError:
                return None
        return None

    def on_install(self) -> None:
        if self.installed:
            running = self.server is not None and self.server.poll() is None
            question = (
                "Stop the server and remove the installed packages and the built app?"
                if running
                else "Remove the installed packages and the built app? Install can put them back."
            )
            if not messagebox.askyesno("Uninstall", question):
                return
            self.start_worker(self.do_uninstall)
            return
        self.start_worker(self.do_install)

    def do_install(self) -> None:
        if self.root_dir is None:
            self.fail("Place this launcher inside the load cell bench folder.")
            return
        chosen = self.require_node()
        if chosen is None or self.stop_event.is_set():
            return
        node, cli = chosen
        env = node_env(node)
        base = [str(node), str(cli)]
        self.set_status("Installing packages…")
        if self.stream(base + ["install"], "Installing packages…", self.root_dir, env) != 0:
            return
        if self.stop_event.is_set():
            return
        self.set_status("Building the app…")
        if self.stream(base + ["run", "build"], "Building the app…", self.root_dir, env) != 0:
            return
        if is_installed(self.root_dir):
            self.set_status("Installed. Run opens the bench in your browser.")
        else:
            self.fail("The build finished without a Next.js production build.")

    def do_uninstall(self) -> None:
        if self.root_dir is None:
            return
        self.set_status("Stopping the server…")
        self.kill_all()
        self.set_status("Removing the installed app…")
        try:
            remove_tree(self.root_dir / "node_modules")
            remove_tree(self.root_dir / ".next")
        except OSError as exc:
            self.fail(f"Uninstall could not remove every file. {exc}")
            return
        self.set_status("Uninstalled. Install builds the app again.")

    def on_run(self) -> None:
        self.start_worker(self.do_run)

    def do_run(self) -> None:
        if self.root_dir is None or not is_installed(self.root_dir):
            self.set_status("Install the app first.")
            return
        if self.server is not None and self.server.poll() is None:
            webbrowser.open(URL)
            self.set_status("Server is running.")
            return
        if port_in_use(PORT):
            webbrowser.open(URL)
            self.set_status("Opened the page. Port 4471 was already in use, so this window left that server running.")
            return
        chosen = self.require_node()
        if chosen is None or self.stop_event.is_set():
            return
        node, _cli = chosen
        next_bin = self.root_dir / "node_modules" / "next" / "dist" / "bin" / "next"
        cmd = [str(node), str(next_bin), "start", "-H", "127.0.0.1", "-p", str(PORT)]
        self.log("$ " + " ".join(cmd))
        self.set_status("Starting the server…")
        proc = subprocess.Popen(
            cmd,
            cwd=str(self.root_dir),
            env=node_env(node),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            **popen_kwargs(),
        )
        self.remember(proc)
        self.server = proc

        def drain() -> None:
            if proc.stdout is None:
                return
            for line in proc.stdout:
                self.log(line)

        threading.Thread(target=drain, daemon=True).start()

        def wait_ready() -> bool:
            for _ in range(90):
                if self.stop_event.is_set():
                    return False
                if proc.poll() is not None:
                    return False
                if page_is_up(URL):
                    return True
                self.stop_event.wait(0.5)
            return page_is_up(URL)

        if not wait_ready():
            if self.stop_event.is_set():
                return
            died = proc.poll() is not None
            self.server = None
            kill_process(proc)
            self.fail(
                "The server stopped before the page was ready."
                if died
                else "The server did not answer on port 4471."
            )
            return
        webbrowser.open(URL)
        self.set_status("Server is running.")

    def poll_server(self) -> None:
        proc = self.server
        if proc is not None and proc.poll() is not None and not self.busy and not self.closing:
            self.server = None
            self.status.set("The server stopped.")
            self.refresh()
        if not self.closing:
            self.root.after(1000, self.poll_server)

    def close(self) -> None:
        if self.closing:
            return
        self.closing = True
        self.status.set("Stopping the server…")
        self.refresh()
        threading.Thread(target=self._shutdown, daemon=True).start()

    def _shutdown(self) -> None:
        self.stop_event.set()
        self.kill_all()
        try:
            self.log_handle.close()
        except OSError:
            pass
        try:
            self.root.after(0, self.root.destroy)
        except tk.TclError:
            return

    def run(self) -> None:
        self.root.mainloop()


def check_report() -> str:
    root = locate_project()
    chosen = choose_node()
    node = chosen[0] if chosen else None
    installed = bool(root and is_installed(root))
    return f"project={root}\nnode={node}\ninstalled={installed}\n"


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if "--check" in args:
        report = check_report()
        out = Path(tempfile.gettempdir()) / "loadcell-bench-launcher-check.txt"
        out.write_text(report, encoding="utf-8")
        if sys.stdout is not None:
            sys.stdout.write(report)
        return 0
    Launcher().run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
