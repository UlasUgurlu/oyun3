"""Re-embed code-only changes in a verified native build; never change native files."""
import argparse
import hashlib
import io
import re
import subprocess
import zipfile
from pathlib import Path

from PIL import Image

BUNDLE = "assets/index.android.bundle"
MAGIC = bytes.fromhex("c61fbc03c103191f")


def guard_source(base):
    paths = subprocess.check_output(["git", "diff", "--name-only", base, "HEAD"], text=True).splitlines()
    allowed = {"README.md", "RELEASE_NOTES.md", ".github/workflows/oyun3-apk.yml"}
    forbidden = [p for p in paths if p not in allowed
                 and not (p.startswith("src/") and Path(p).suffix in (".ts", ".tsx"))
                 and not (p.startswith("tools/") and Path(p).suffix == ".py")]
    assert not forbidden, f"Native configuration/assets changed; run full Gradle build: {forbidden}"
    print(f"PASS: native configuration, dependencies and assets match {base}")


def signature_file(name):
    return name == "META-INF/MANIFEST.MF" or bool(re.fullmatch(r"META-INF/[^/]+\.(RSA|DSA|EC|SF)", name, re.I))


def pixel_hash(data):
    image = Image.open(io.BytesIO(data)).convert("RGBA")
    return image.size, hashlib.sha256(image.tobytes()).hexdigest()


def repack(base, bundle, resources, table, output, expected_hash):
    assert hashlib.sha256(base.read_bytes()).hexdigest() == expected_hash, "Native base checksum mismatch"
    data = bundle.read_bytes()
    assert data.startswith(MAGIC) and len(data) > 100_000, "Bundle must be compiled Hermes bytecode"
    resource_table = table.read_text()
    with zipfile.ZipFile(base) as source:
        assert source.testzip() is None, "Corrupt native base APK"
        assert source.read(BUNDLE)[:12] == data[:12], "Hermes bytecode version changed"
        hashes = {hashlib.sha256(source.read(n)).hexdigest() for n in source.namelist()}
        images = {pixel_hash(source.read(n)) for n in source.namelist() if n.endswith(".png")}
        count = 0
        for asset in resources.rglob("*"):
            if not asset.is_file() or asset.name == "keep.xml":
                continue
            assert re.search(r"/" + re.escape(asset.stem) + r"\b", resource_table), f"New native resource name: {asset}"
            value = asset.read_bytes()
            if asset.suffix == ".png":
                assert pixel_hash(value) in images, f"Changed image requires full build: {asset}"
            else:
                assert hashlib.sha256(value).hexdigest() in hashes, f"Changed asset requires full build: {asset}"
            count += 1
        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output, "w") as target:
            for entry in source.infolist():
                if not signature_file(entry.filename):
                    target.writestr(entry, data if entry.filename == BUNDLE else source.read(entry.filename))
    print(f"PASS: {count} embedded resources already exist; replaced only Hermes bundle")


def compare(base, built, bundle):
    with zipfile.ZipFile(base) as old, zipfile.ZipFile(built) as new:
        old_names = {n for n in old.namelist() if not signature_file(n)}
        new_names = {n for n in new.namelist() if not signature_file(n)}
        assert old_names == new_names, "APK native entry set changed"
        assert new.testzip() is None, "Corrupt final APK"
        for name in old_names - {BUNDLE}:
            assert old.read(name) == new.read(name), f"Native file changed: {name}"
        assert new.read(BUNDLE) == bundle.read_bytes(), "Latest compiled code missing from APK"
    print("PASS: all native libraries, DEX, manifest, fonts, audio and resources unchanged")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    source = commands.add_parser("guard")
    source.add_argument("base_commit")
    pack = commands.add_parser("repack")
    for name in ("base", "bundle", "resources", "table", "output"):
        pack.add_argument(name, type=Path)
    pack.add_argument("base_sha256")
    comparison = commands.add_parser("compare")
    for name in ("base", "built", "bundle"):
        comparison.add_argument(name, type=Path)
    args = parser.parse_args()
    if args.command == "guard":
        guard_source(args.base_commit)
    elif args.command == "repack":
        repack(args.base, args.bundle, args.resources, args.table, args.output, args.base_sha256)
    else:
        compare(args.base, args.built, args.bundle)
