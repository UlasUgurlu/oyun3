"""Reject APKs that are missing the standalone JS bundle or native libraries."""

import sys
from pathlib import Path
from zipfile import ZipFile


def verify(path: Path) -> None:
    with ZipFile(path) as apk:
        names = apk.namelist()
        assert apk.testzip() is None, "Corrupt APK archive"
        assert "AndroidManifest.xml" in names, "Missing Android manifest"
        assert "classes.dex" in names, "Missing executable Android code"
        assert "assets/index.android.bundle" in names, "Missing standalone JS bundle"
        assert apk.getinfo("assets/index.android.bundle").file_size > 100_000, "Empty game bundle"
        for abi in ("arm64-v8a", "x86_64"):
            for library in ("libreactnative.so", "libhermes.so", "librnskia.so"):
                assert f"lib/{abi}/{library}" in names, f"Missing {abi}/{library}"
        assert sum(name.endswith(".ttf") for name in names) >= 4, "Missing bundled fonts"
        assert sum(name.endswith(".wav") for name in names) >= 11, "Missing bundled sound effects"
        assert any(name.endswith(".m4a") for name in names), "Missing bundled music"
    print(f"Standalone APK verified: {path.name}, {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    verify(Path(sys.argv[1]))
