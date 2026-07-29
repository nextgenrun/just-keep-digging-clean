from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path, PurePosixPath
import posixpath
import shlex
from datetime import datetime, timezone

import paramiko


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
EXPECTED_BUILD_ID = "c84f8c6b69f1"

HOST = "ssh.nextgen.run"
PORT = 18765
USERNAME = "u1701-2c3pt2cnshtu"
KEY_FILE = Path(r"C:\Users\Mila\.ssh\nextgen_codex_deploy_ed25519")
PINNED_FINGERPRINT = "SHA256:XO42VDief1THp+Uv4fC3VTt/2hQ4eP8Y6UnU69N994k"

TARGET = "/home/customer/www/nextgen.run/public_html/diggame-beta-1"
PARENT = posixpath.dirname(TARGET)
NAME = posixpath.basename(TARGET)


def log(message: str) -> None:
    print(message, flush=True)


class PinnedHostKeyPolicy(paramiko.MissingHostKeyPolicy):
    def missing_host_key(self, client, hostname, key) -> None:
        fingerprint = "SHA256:" + base64.b64encode(
            hashlib.sha256(key.asbytes()).digest()
        ).decode("ascii").rstrip("=")
        if fingerprint != PINNED_FINGERPRINT:
            raise paramiko.SSHException(
                f"Host-key mismatch for {hostname}: {fingerprint}"
            )
        client.get_host_keys().add(hostname, key.get_name(), key)


def local_hashes() -> tuple[dict[str, str], int]:
    files = sorted(path for path in DIST.rglob("*") if path.is_file())
    hashes: dict[str, str] = {}
    total_bytes = 0
    for index, path in enumerate(files, start=1):
        digest = hashlib.sha256()
        size = 0
        with path.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                digest.update(chunk)
                size += len(chunk)
        rel = path.relative_to(DIST).as_posix()
        hashes[rel] = digest.hexdigest()
        total_bytes += size
        if index % 500 == 0:
            log(f"LOCAL_HASH_PROGRESS files={index}/{len(files)}")
    return hashes, total_bytes


def run_remote(client: paramiko.SSHClient, command: str) -> bytes:
    _, stdout, stderr = client.exec_command(command, timeout=900)
    output = stdout.read()
    error = stderr.read()
    status = stdout.channel.recv_exit_status()
    if status != 0:
        raise RuntimeError(
            f"Remote command failed ({status}): {command}\n"
            + error.decode("utf-8", "replace")
        )
    return output


def remote_hashes(client: paramiko.SSHClient, root: str) -> dict[str, str]:
    quoted_root = shlex.quote(root)
    command = (
        f"cd {quoted_root} && "
        "find . -type f -print0 | LC_ALL=C sort -z | "
        "xargs -0 sha256sum -z"
    )
    raw = run_remote(client, command)
    hashes: dict[str, str] = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        digest, encoded_path = record.split(b"  ", 1)
        path = encoded_path.decode("utf-8", "surrogateescape")
        if path.startswith("./"):
            path = path[2:]
        hashes[path] = digest.decode("ascii")
    return hashes


def read_remote_build_id(sftp: paramiko.SFTPClient, root: str) -> str:
    manifest_path = posixpath.join(root, "build-manifest.json")
    with sftp.open(manifest_path, "r") as handle:
        manifest = json.loads(handle.read().decode("utf-8"))
    return str(manifest["buildId"])


def ensure_remote_directory(sftp: paramiko.SFTPClient, directory: str) -> None:
    parts = PurePosixPath(directory).parts
    current = "/" if parts and parts[0] == "/" else ""
    for part in parts:
        if part == "/":
            continue
        current = posixpath.join(current, part)
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)


def upload_changed_files(
    sftp: paramiko.SFTPClient,
    local: dict[str, str],
    remote: dict[str, str],
    stage: str,
) -> int:
    changed = [path for path, digest in local.items() if remote.get(path) != digest]
    log(f"UPLOAD_PLAN changed_or_new={len(changed)}")
    for index, rel in enumerate(changed, start=1):
        local_path = DIST / Path(*PurePosixPath(rel).parts)
        remote_path = posixpath.join(stage, rel)
        ensure_remote_directory(sftp, posixpath.dirname(remote_path))
        temporary_path = f"{remote_path}.codex-upload-{EXPECTED_BUILD_ID}"
        try:
            sftp.remove(temporary_path)
        except FileNotFoundError:
            pass
        sftp.put(str(local_path), temporary_path)
        try:
            sftp.posix_rename(temporary_path, remote_path)
        except OSError:
            try:
                sftp.remove(remote_path)
            except FileNotFoundError:
                pass
            sftp.rename(temporary_path, remote_path)
        if index % 25 == 0 or index == len(changed):
            log(f"UPLOAD_PROGRESS files={index}/{len(changed)}")
    return len(changed)


def remove_stale_files(
    sftp: paramiko.SFTPClient,
    local: dict[str, str],
    remote: dict[str, str],
    stage: str,
) -> int:
    stale = sorted(set(remote) - set(local))
    log(f"STALE_PLAN files={len(stale)}")
    for index, rel in enumerate(stale, start=1):
        sftp.remove(posixpath.join(stage, rel))
        if index % 100 == 0 or index == len(stale):
            log(f"STALE_PROGRESS files={index}/{len(stale)}")
    return len(stale)


def assert_exact(label: str, actual: dict[str, str], expected: dict[str, str]) -> None:
    if actual == expected:
        log(f"{label}_HASH_OK files={len(actual)}")
        return
    missing = sorted(set(expected) - set(actual))[:10]
    extra = sorted(set(actual) - set(expected))[:10]
    changed = sorted(
        path for path in set(actual) & set(expected) if actual[path] != expected[path]
    )[:10]
    raise RuntimeError(
        f"{label} hash mismatch: missing={missing} extra={extra} changed={changed}"
    )


def main() -> int:
    if DIST.resolve().parent != ROOT.resolve():
        raise RuntimeError(f"Unexpected dist path: {DIST}")
    if TARGET != f"{PARENT}/{NAME}" or NAME != "diggame-beta-1":
        raise RuntimeError(f"Refusing unexpected target: {TARGET}")
    if not KEY_FILE.is_file():
        raise RuntimeError(f"SSH key is missing: {KEY_FILE}")

    local_manifest = json.loads((DIST / "build-manifest.json").read_text("utf-8"))
    if local_manifest.get("buildId") != EXPECTED_BUILD_ID:
        raise RuntimeError(
            f"Local build mismatch: {local_manifest.get('buildId')} != {EXPECTED_BUILD_ID}"
        )

    log(f"LOCAL_HASH_START build={EXPECTED_BUILD_ID}")
    local, total_bytes = local_hashes()
    log(f"LOCAL_HASH_OK files={len(local)} bytes={total_bytes}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    stage = posixpath.join(PARENT, f".{NAME}.stage-{EXPECTED_BUILD_ID}-{stamp}")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(PinnedHostKeyPolicy())
    client.connect(
        HOST,
        port=PORT,
        username=USERNAME,
        key_filename=str(KEY_FILE),
        look_for_keys=False,
        allow_agent=False,
        timeout=30,
        banner_timeout=30,
        auth_timeout=30,
    )
    sftp = client.open_sftp()
    swapped = False
    rollback = ""
    try:
        old_build = read_remote_build_id(sftp, TARGET)
        rollback = posixpath.join(
            PARENT, f".{NAME}.rollback-{old_build}-{stamp}"
        )
        log(f"REMOTE_CURRENT build={old_build}")
        log("REMOTE_HASH_START")
        current = remote_hashes(client, TARGET)
        log(f"REMOTE_HASH_OK files={len(current)}")

        run_remote(
            client,
            " && ".join(
                [
                    f"test ! -e {shlex.quote(stage)}",
                    f"test ! -e {shlex.quote(rollback)}",
                    f"mkdir -p {shlex.quote(stage)}",
                    f"cp -a {shlex.quote(TARGET)}/. {shlex.quote(stage)}/",
                ]
            ),
        )
        log(f"STAGE_CLONE_OK path={stage}")

        uploaded = upload_changed_files(sftp, local, current, stage)
        stale = remove_stale_files(sftp, local, current, stage)
        run_remote(
            client,
            f"find {shlex.quote(stage)} -mindepth 1 -depth -type d -empty -delete",
        )

        log("STAGE_HASH_START")
        staged = remote_hashes(client, stage)
        assert_exact("STAGE", staged, local)
        if read_remote_build_id(sftp, stage) != EXPECTED_BUILD_ID:
            raise RuntimeError("Staged build manifest does not match the expected build")

        swap_command = (
            f"mv {shlex.quote(TARGET)} {shlex.quote(rollback)} && "
            f"if mv {shlex.quote(stage)} {shlex.quote(TARGET)}; then "
            "printf ATOMIC_SWAP_OK; "
            f"else mv {shlex.quote(rollback)} {shlex.quote(TARGET)}; exit 1; fi"
        )
        run_remote(client, swap_command)
        swapped = True
        log("ATOMIC_SWAP_OK")

        live = remote_hashes(client, TARGET)
        try:
            assert_exact("LIVE", live, local)
            if read_remote_build_id(sftp, TARGET) != EXPECTED_BUILD_ID:
                raise RuntimeError("Live build manifest does not match expected build")
        except Exception:
            failed = posixpath.join(
                PARENT, f".{NAME}.failed-{EXPECTED_BUILD_ID}-{stamp}"
            )
            run_remote(
                client,
                f"mv {shlex.quote(TARGET)} {shlex.quote(failed)} && "
                f"mv {shlex.quote(rollback)} {shlex.quote(TARGET)}",
            )
            swapped = False
            raise

        log(
            "DEPLOY_OK "
            f"build={EXPECTED_BUILD_ID} files={len(local)} "
            f"uploaded={uploaded} stale={stale} rollback={rollback}"
        )
        return 0
    except Exception as error:
        log(
            "DEPLOY_FAIL "
            f"swapped={swapped} stage={stage} rollback={rollback or 'none'} "
            f"error={error}"
        )
        return 1
    finally:
        sftp.close()
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
