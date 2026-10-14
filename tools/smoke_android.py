"""Run the actual release APK offline; exercise its menu and first game."""

import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "com.nabiz.game"
DIAGNOSTICS = Path("diagnostics")
DIAGNOSTICS.mkdir(exist_ok=True)


def adb(*args: str) -> str:
    return subprocess.check_output(["adb", *args], text=True, timeout=45)


def alive() -> None:
    assert adb("shell", "pidof", PACKAGE).strip(), "Game process exited"


def ui() -> ET.Element:
    adb("shell", "uiautomator", "dump", "--compressed", "/sdcard/oyun3-ui.xml")
    xml = adb("shell", "cat", "/sdcard/oyun3-ui.xml")
    (DIAGNOSTICS / "ui.xml").write_text(xml)
    return ET.fromstring(xml)


def find_control(root: ET.Element, label: str):
    for node in root.iter("node"):
        if node.get("text") == label or node.get("content-desc") == label:
            return node
    return None


def wait_for(label: str):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        alive()
        root = ui()
        node = find_control(root, label)
        if node is not None:
            return node
        time.sleep(2)
    raise AssertionError(f"Menu did not render: {label}")


def tap(node) -> None:
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds", "")))
    adb("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))


def screenshot(name: str) -> None:
    data = subprocess.check_output(["adb", "exec-out", "screencap", "-p"], timeout=30)
    (DIAGNOSTICS / name).write_bytes(data)


try:
    adb("install", "-r", str(Path(sys.argv[1]).resolve()))
    adb("shell", "svc", "wifi", "disable")
    adb("shell", "svc", "data", "disable")
    adb("logcat", "-c")
    adb("shell", "am", "start", "-W", "-n", f"{PACKAGE}/.MainActivity")
    play = wait_for("Oyna")
    assert find_control(ui(), "Ayarlar") is not None, "Settings control missing"
    screenshot("menu.png")
    print("PASS: offline startup and game menu", flush=True)

    tap(play)
    time.sleep(6)
    alive()
    screenshot("game.png")
    assert find_control(ui(), "Tekrar") is not None, "First round did not finish correctly"
    print("PASS: first game and game-over screen", flush=True)

    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(2)
    adb("shell", "am", "start", "-W", "-n", f"{PACKAGE}/.MainActivity")
    time.sleep(3)
    alive()
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    wait_for("Oyna")
    print("PASS: background resume and Android back navigation", flush=True)

    pid = adb("shell", "pidof", PACKAGE).strip()
    logs = adb("logcat", "-d", "--pid", pid)
    assert not re.search(r"FATAL EXCEPTION|Fatal signal|JavascriptException", logs), "Runtime crash in logcat"
    (DIAGNOSTICS / "smoke-result.txt").write_text("PASS: offline menu, first game, resume and back navigation\n")
finally:
    (DIAGNOSTICS / "logcat.txt").write_text(adb("logcat", "-d"))

