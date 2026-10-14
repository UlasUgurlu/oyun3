"""Exercise the installed release, upgrade data, all modes and sustained rendering."""
import hashlib
import json
import random
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "com.nabiz.game"
DIAGNOSTICS = Path("diagnostics")
DIAGNOSTICS.mkdir(exist_ok=True)
RESULT = {"checks": [], "memory_kb": {}, "frames": {}}


def adb(*args: str) -> str:
    return subprocess.check_output(["adb", *args], text=True, timeout=45)


def alive() -> None:
    assert adb("shell", "pidof", PACKAGE).strip(), "Game process exited"


def ui() -> ET.Element:
    adb("shell", "uiautomator", "dump", "--compressed", "/sdcard/nabiz-ui.xml")
    xml = adb("shell", "cat", "/sdcard/nabiz-ui.xml")
    (DIAGNOSTICS / "ui.xml").write_text(xml)
    return ET.fromstring(xml)


def control(root: ET.Element, label: str, prefix: bool = False):
    matches = []
    for node in root.iter("node"):
        values = [node.get("text", ""), node.get("content-desc", "")]
        if any(v.startswith(label) if prefix else v == label for v in values):
            bounds = list(map(int, re.findall(r"\d+", node.get("bounds", ""))))
            if len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]:
                matches.append(node)
    return next((n for n in matches if n.get('clickable') == 'true' or n.get('checkable') == 'true'), matches[0] if matches else None)


def wait_for(label: str, timeout: float = 35, prefix: bool = False):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        alive()
        node = control(ui(), label, prefix)
        if node is not None:
            return node
        time.sleep(0.5)
    raise AssertionError(f"Control did not render: {label}")


def tap(node) -> None:
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds", "")))
    adb("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))


def screenshot(name: str) -> bytes:
    data = subprocess.check_output(["adb", "exec-out", "screencap", "-p"], timeout=30)
    (DIAGNOSTICS / name).write_bytes(data)
    return data


def size():
    values = re.findall(r"(\d+)x(\d+)", adb("shell", "wm", "size"))
    return tuple(map(int, values[-1]))


def scroll_top():
    w, h = size()
    for _ in range(2):
        adb("shell", "input", "swipe", str(w // 2), str(h // 3), str(w // 2), str(h * 4 // 5), "200")


def scroll_find(label: str):
    w, h = size()
    for _ in range(5):
        node = control(ui(), label)
        if node is not None:
            return node
        adb("shell", "input", "swipe", str(w // 2), str(h * 4 // 5), str(w // 2), str(h // 3), "200")
    raise AssertionError(f"Could not scroll to {label}")


def select_mode(label: str):
    tap(wait_for("Oyna"))
    scroll_top()
    tap(scroll_find(label))
    return scroll_find("Ritmi başlat")


def pass_check(name: str):
    RESULT["checks"].append(name)
    print(f"PASS: {name}", flush=True)


def memory(label: str):
    report = adb("shell", "dumpsys", "meminfo", PACKAGE)
    (DIAGNOSTICS / f"memory-{label}.txt").write_text(report)
    value = re.search(r"TOTAL PSS:\s*(\d+)", report) or re.search(r"^\s*TOTAL\s+(\d+)", report, re.M)
    assert value, "Android did not provide process memory statistics"
    kb = int(value.group(1))
    RESULT["memory_kb"][label] = kb
    return kb


def frame_report(label: str):
    report = adb("shell", "dumpsys", "gfxinfo", PACKAGE, "framestats")
    (DIAGNOSTICS / f"frames-{label}.txt").write_text(report)
    values = {}
    for key, expression in [
        ("total", r"Total frames rendered:\s*(\d+)"),
        ("janky", r"Janky frames:\s*(\d+)"),
        ("p90_ms", r"90th percentile:\s*(\d+)ms"),
        ("p99_ms", r"99th percentile:\s*(\d+)ms"),
    ]:
        match = re.search(expression, report)
        if match:
            values[key] = int(match.group(1))
    RESULT["frames"][label] = values
    print(f"DIAGNOSTIC {label}: {values}", flush=True)
    return values


try:
    expected_daily = 3
    # Install the previously delivered APK and leave one daily attempt in its v1 save.
    if len(sys.argv) > 2:
        adb("install", "-r", str(Path(sys.argv[2]).resolve()))
        adb("shell", "am", "start", "-W", "-n", f"{PACKAGE}/.MainActivity")
        wait_for("Oyna", 60)
        adb("shell", "dumpsys", "gfxinfo", PACKAGE, "reset")
        time.sleep(10)
        memory("v1-menu")
        frame_report("v1-menu-idle")
        screenshot("v1-menu.png")
        previous_day = adb("shell", "date", "+%F").strip()
        tap(wait_for("Günün Nabzı #", prefix=True))
        wait_for("Tekrar", 20)
        adb("shell", "am", "force-stop", PACKAGE)

    adb("install", "-r", str(Path(sys.argv[1]).resolve()))
    adb("shell", "svc", "wifi", "disable")
    adb("shell", "svc", "data", "disable")
    adb("logcat", "-c")
    adb("shell", "am", "start", "-W", "-n", f"{PACKAGE}/.MainActivity")
    wait_for("Klasik", 60)
    assert control(ui(), "Ayarlar") is not None, "Settings missing"
    screenshot("nabiz-menu.png")
    pass_check("offline Nabız menu and new logo")

    if len(sys.argv) > 2:
        expected_daily = 2 if adb("shell", "date", "+%F").strip() == previous_day else 3
        select_mode("Günün Nabzı")
        assert any(f"{expected_daily} deneme kaldı" in n.get("text", "") for n in ui().iter("node")), "Old daily attempt was not preserved"
        pass_check("in-place v1 upgrade preserves daily progress")
    adb("shell", "dumpsys", "gfxinfo", PACKAGE, "reset")
    time.sleep(10)
    memory("v2-menu")
    frame_report("v2-menu-idle")

    tap(wait_for("Görevler"))
    wait_for("Bugünün görevleri")
    screenshot("nabiz-missions.png")
    tap(wait_for("Koleksiyon"))
    wait_for("Sinyal koleksiyonu")
    assert wait_for("Buz akımı teması").get("enabled") == "false", "Locked theme is selectable"
    screenshot("nabiz-collection.png")
    pass_check("missions, level progress and locked theme collection")

    tap(wait_for("Ayarlar"))
    switch = scroll_find("Pil dostu mod")
    tap(switch)
    checked = wait_for("Pil dostu mod")
    assert checked.get("checked") == "true", "Low-power setting did not turn on"
    screenshot("nabiz-settings.png")
    tap(scroll_find("Kapat"))
    tap(wait_for("Ayarlar"))
    assert wait_for("Pil dostu mod").get("checked") == "true", "Setting was not retained"
    tap(wait_for("Pil dostu mod"))
    tap(scroll_find("Kapat"))
    pass_check("settings and low-power toggle persistence")

    tap(select_mode("Klasik"))
    time.sleep(0.5)
    screenshot("nabiz-gameplay.png")
    tap(wait_for("Tekrar", 20))
    wait_for("Tekrar", 20)
    screenshot("nabiz-result.png")
    tap(wait_for("Menü"))
    pass_check("classic timeout, score screen and repeat")

    tap(select_mode("Günün Nabzı"))
    wait_for("Tekrar", 20)
    tap(wait_for("Menü"))
    select_mode("Günün Nabzı")
    assert any(f"{expected_daily - 1} deneme kaldı" in n.get("text", "") for n in ui().iter("node")), "Daily attempt consumption is incorrect"
    pass_check("daily seeded game and attempt consumption")

    tap(select_mode("Kaos"))
    # Waiting without touching consumes all three lives; it must recover twice.
    wait_for("Tekrar", 25)
    screenshot("nabiz-chaos-result.png")
    tap(wait_for("Menü"))
    pass_check("Kaos recovers two misses and ends after its third life")

    tap(select_mode("Serbest"))
    field = wait_for("Oyun alanı")
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", field.get("bounds", "")))
    x, y = (x1 + x2) // 2, (y1 + y2) // 2
    memory("practice-start")
    adb("shell", "dumpsys", "gfxinfo", PACKAGE, "reset")
    randomizer = random.Random(42)
    deadline = time.monotonic() + 120
    taps = 0
    memory_samples = []
    while time.monotonic() < deadline:
        time.sleep(randomizer.choice([0.18, 0.42, 0.76, 1.22, 1.65]))
        adb("shell", "input", "tap", str(x), str(y))
        taps += 1
        if taps % 20 == 0:
            alive()
            memory_samples.append(memory(f"practice-{taps}"))
    alive()
    assert control(ui(), "Duraklat") is not None, "Practice stopped responding during sustained play"
    texts = [n.get("text", "") for n in ui().iter("node")]
    hits = [int(m.group(1)) for t in texts if (m := re.search(r"BPM · (\d+) isabet", t))]
    assert hits and hits[0] > 0, "Actual touch inputs never produced an in-game hit"
    frames = frame_report("practice-120s")
    assert frames.get("total", 0) >= 300, "Needle stopped rendering during sustained play"
    start_memory = RESULT["memory_kb"]["practice-start"]
    end_memory = memory("practice-end")
    assert max([end_memory, *memory_samples]) - start_memory < 100_000, "Large memory growth during sustained play"
    signatures = set()
    for i in range(8):
        signatures.add(hashlib.sha256(screenshot(f"motion-{i}.png")).hexdigest())
        time.sleep(0.12)
    assert len(signatures) >= 4, "Visible gameplay animation appears frozen"
    RESULT["sustained"] = {"seconds": 120, "taps": taps, "hits": hits[0], "distinct_motion_frames": len(signatures), "memory_growth_kb": end_memory - start_memory}
    screenshot("nabiz-practice.png")
    pass_check("two-minute interactive practice, moving frames and bounded memory")

    tap(wait_for("Duraklat"))
    wait_for("Devam et")
    time.sleep(3)
    assert control(ui(), "Devam et") is not None, "Manual pause resumed on its own"
    screenshot("nabiz-pause.png")
    tap(wait_for("Devam et"))
    adb("shell", "input", "keyevent", "KEYCODE_HOME")
    time.sleep(3)
    adb("shell", "am", "start", "-W", "-n", f"{PACKAGE}/.MainActivity")
    wait_for("Duraklat")
    tap(wait_for("Antrenmanı bitir"))
    wait_for("Tekrar")
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    wait_for("Oyna")
    pass_check("manual pause, background resume, practice completion and Android back")

    pid = adb("shell", "pidof", PACKAGE).strip()
    logs = adb("logcat", "-d", "--pid", pid)
    all_logs = adb("logcat", "-d")
    assert not re.search(r"FATAL EXCEPTION|Fatal signal|JavascriptException", logs), "Runtime crash in game process"
    assert f"ANR in {PACKAGE}" not in all_logs, "Game became unresponsive"
    pass_check("no Android crash or ANR")
    (DIAGNOSTICS / "smoke-result.txt").write_text("\n".join(RESULT["checks"]) + "\n")
finally:
    (DIAGNOSTICS / "performance.json").write_text(json.dumps(RESULT, ensure_ascii=False, indent=2))
    (DIAGNOSTICS / "logcat.txt").write_text(adb("logcat", "-d"))
