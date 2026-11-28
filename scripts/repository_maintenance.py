#!/usr/bin/env python3
"""Trusted main-only maintenance. Never modify main or an existing tag."""
import argparse
import json
import os
import re
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

REPO = "Sashido01/21percent"
DEFAULT = "main"
ANCHOR = "cc55348e13c8952bd45c6bc48737a6c9fa5a40f9"
# Explicit historical backfill: known main commits, previously verified/released.
HISTORICAL = {
    "0.0.0": "a216392805a7042054637b443f3e1f2d6a2e315f",
    "0.0.1": "4a2ffd3e77f6404ae4e63432d8d8e97faaa17a55",
    "0.0.2": "622345609ecde866dc801c851d8839302245df13",
    "0.0.3": "60975ed66d67c017289f1b73c6b9cbf7261e3345",
    "0.0.4": "ac76408a60b898dc1d9ccaf578f54d1a6f09ed35",
    "0.0.5": "2b2458ba757410aab13615a095bb52de5b036649",
    "0.0.6": "2ac63c961b50b13c567651f681ea8656dc5ea329",
    "0.0.7": "f62c597fcc709b31e2e4c36655d8110e6d89c000",
    "0.0.8": "f997c592c5c201d3a21d5420470ebc43354926b2",
    "0.0.9": "ee8037fc63726de9975a3dcae00f1878ea19ff7c",
    "0.0.10": "1a88fb5ae2ace7669781312574df236628522de5",
    "0.0.11": "412abadcbd42442572ca14a52f921de17ba826a8",
    "0.0.12": ANCHOR,
}
VERSION = re.compile(r"(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\Z")
SHA = re.compile(r"[0-9a-f]{40}\Z")
MANAGED = re.compile(r"(?:feature|design|qa|fix|docs|chore|release)/[A-Za-z0-9][A-Za-z0-9._/-]*\Z")
# Explicitly reviewed duplicate, not a general rule for closed PRs.
SUPERSEDED = {19: ("feature/unified-visual-research", "98ff4ee772b45231f2382ee5e5a828b6ec55012a", 18)}

def git(*args):
    return subprocess.check_output(["git", *args], text=True, timeout=90).strip()

def api(path, **params):
    token = os.environ["GH_TOKEN"]
    url = f"https://api.github.com/repos/{REPO}" + ("/" + path if path else "")
    if params:
        url += "?" + urlencode(params)
    request = Request(url, headers={"Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "21percent-maintenance"})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=20) as response:
                return json.load(response)
        except (HTTPError, URLError, TimeoutError) as exc:
            if isinstance(exc, HTTPError) and exc.code not in (429, 500, 502, 503, 504):
                raise
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

def pages(path, **params):
    for page in range(1, 101):
        items = api(path, per_page=100, page=page, **params)
        if not isinstance(items, list):
            raise RuntimeError("Expected paginated list")
        yield from items
        if len(items) < 100:
            return
    raise RuntimeError("Pagination limit; refusing incomplete inventory")

def ver(commit):
    return git("show", commit + ":VERSION")

def tree(commit):
    return git("rev-parse", commit + "^{tree}")

def first_parent_chain(tip):
    return git("rev-list", "--first-parent", tip).splitlines()

def eligible_branch(branch, pr, open_heads, main_trees, tree_of, merge_base_of):
    """Return reason only when a closed PR head is demonstrably integrated."""
    name = branch["name"]
    sha = branch["commit"]["sha"]
    if name == DEFAULT or branch.get("protected") or not MANAGED.fullmatch(name) or not SHA.fullmatch(sha):
        return None
    if name in open_heads or pr.get("state") != "closed":
        return None
    head, base = pr.get("head") or {}, pr.get("base") or {}
    if (head.get("repo") or {}).get("full_name") != REPO or (base.get("repo") or {}).get("full_name") != REPO:
        return None
    if head.get("ref") != name or head.get("sha") != sha or base.get("ref") != DEFAULT:
        return None
    try:
        head_tree = tree_of(sha)
        if pr.get("merged_at"):
            merge = pr.get("merge_commit_sha")
            if merge in main_trees and main_trees[merge][0] == head_tree:
                return "merged PR #" + str(pr["number"])
        # Exception: GitHub recorded main commit but not merged PR status.
        # Exact tree plus original merge base equals the main commit's parent.
        origin = merge_base_of(sha)
        if any(t == head_tree and parent == origin for t, parent in main_trees.values()):
            return "integrated identical tree, PR #" + str(pr["number"])
    except subprocess.CalledProcessError:
        return None
    return None

def superseded_branch(branch, pr, open_heads, main_trees, closed_prs, tree_of, quality_of):
    """Delete only an explicitly reviewed duplicate after its replacement passes main CI."""
    rule = SUPERSEDED.get(pr.get("number"))
    if not rule:
        return None
    name, sha, replacement = rule
    if (branch.get("name") != name or branch.get("commit", {}).get("sha") != sha
            or branch.get("protected") or name == DEFAULT or name in open_heads
            or pr.get("state") != "closed" or pr.get("merged_at")):
        return None
    def same_repo(p):
        return ((p.get("head", {}).get("repo") or {}).get("full_name") == REPO
                and (p.get("base", {}).get("repo") or {}).get("full_name") == REPO
                and p.get("base", {}).get("ref") == DEFAULT)
    if not same_repo(pr) or pr.get("head", {}).get("ref") != name or pr.get("head", {}).get("sha") != sha:
        return None
    successor = next((p for p in closed_prs if p.get("number") == replacement), None)
    if not successor or successor.get("state") != "closed" or not successor.get("merged_at") or not same_repo(successor):
        return None
    merge = successor.get("merge_commit_sha")
    if merge not in main_trees:
        return None
    try:
        if tree_of(successor["head"]["sha"]) != main_trees[merge][0] or not quality_of(merge):
            return None
    except (subprocess.CalledProcessError, KeyError):
        return None
    return f"reviewed duplicate PR #{pr['number']} replaced by verified PR #{replacement}"

def current_tags():
    out = git("ls-remote", "--tags", "origin")
    refs = {}
    for line in out.splitlines():
        sha, ref = line.split("\t", 1)
        refs[ref] = sha
    return refs

def tag_status(refs, version, commit):
    ref = "refs/tags/v" + version
    if ref not in refs:
        return "missing"
    return "ok" if refs.get(ref+"^{}", refs[ref]) == commit else "conflict"

def tag_plan(chain, version_at, subject_at):
    chain_set = set(chain)
    root = HISTORICAL["0.0.0"]
    if not chain or chain[-1] != root or not subject_at(root).startswith("v0.0.0 "):
        raise RuntimeError("Historical root commit does not match main")
    # The exact initial commit predates VERSION. All later historical commits must have it.
    if any(sha not in chain_set or version_at(sha) != version
           for version, sha in HISTORICAL.items() if version != "0.0.0"):
        raise RuntimeError("Historical version map does not match main first-parent history")
    result = dict(HISTORICAL)
    previous = "0.0.12"
    newer = chain[:chain.index(ANCHOR)]
    for sha in reversed(newer):
        version = version_at(sha)
        if not VERSION.fullmatch(version):
            raise RuntimeError("Invalid VERSION at " + sha)
        if version == previous:
            continue
        if tuple(map(int, version.split("."))) <= tuple(map(int, previous.split("."))):
            raise RuntimeError("Version must increase: " + version)
        if version in result or not subject_at(sha).startswith("v" + version + " "):
            raise RuntimeError("Version commit requires unique matching subject: " + version)
        result[version] = sha
        previous = version
    return result

def quality_passed(commit):
    runs = api("actions/workflows/quality.yml/runs", branch=DEFAULT, event="push",
               head_sha=commit, status="success", per_page=100).get("workflow_runs", [])
    return any(r.get("head_sha") == commit and r.get("head_branch") == DEFAULT
               and r.get("event") == "push" and r.get("conclusion") == "success" for r in runs)

def push(*args):
    subprocess.run(["git", "push", *args], check=True, timeout=90)

def summary(lines):
    for line in lines:
        print(line, flush=True)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as handle:
            handle.write("## Repository maintenance\n\n" + "\n".join("- " + x for x in lines) + "\n")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Create missing tags and delete proven-integrated branches")
    args = parser.parse_args()
    if os.environ.get("GITHUB_REPOSITORY") != REPO or os.environ.get("GITHUB_REF") != "refs/heads/main":
        raise SystemExit("Maintenance is restricted to the canonical repository and main")
    meta = api("")
    if meta.get("default_branch") != DEFAULT:
        raise RuntimeError("Unexpected default branch")
    git("fetch", "--no-tags", "origin", "+refs/heads/*:refs/remotes/origin/*")
    tip = git("rev-parse", "refs/remotes/origin/main")
    chain = first_parent_chain(tip)
    plan = tag_plan(chain, ver, lambda c: git("show", "-s", "--format=%s", c))
    refs = current_tags()
    lines, errors = [], []
    for version, sha in plan.items():
        status = tag_status(refs, version, sha)
        if status == "ok":
            lines.append(f"OK tag v{version}")
        elif status == "conflict":
            errors.append(f"CONFLICT tag v{version}; existing ref untouched")
        elif version not in HISTORICAL and not quality_passed(sha):
            lines.append(f"WAIT tag v{version}: successful main quality run not yet available")
        elif not args.apply:
            lines.append(f"DRY RUN create v{version} -> {sha}")
        else:
            try:
                push("origin", sha+":refs/tags/v"+version)
                if tag_status(current_tags(), version, sha) != "ok":
                    raise RuntimeError("Tag verification failed")
                lines.append(f"CREATED tag v{version} -> {sha}")
            except (subprocess.SubprocessError, RuntimeError) as exc:
                errors.append(f"FAILED tag v{version}: {exc}")
    # Never use untrusted PR code. Read metadata only from the canonical repo.
    branches = list(pages("branches"))
    opened = list(pages("pulls", state="open"))
    open_heads = {p["head"]["ref"] for p in opened if (p["head"].get("repo") or {}).get("full_name") == REPO}
    closed = list(pages("pulls", state="closed"))
    main_trees = {sha: (tree(sha), chain[i+1] if i+1<len(chain) else None)
                  for i, sha in enumerate(chain)}
    for branch in branches:
        name, sha = branch["name"], branch["commit"]["sha"]
        if name == DEFAULT:
            continue
        candidates = [p for p in closed if (p.get("head") or {}).get("ref") == name]
        reason = next((r for p in candidates if (r := eligible_branch(branch,p,open_heads,main_trees,tree,
                      lambda c: git("merge-base",c,tip)))), None)
        if not reason:
            reason = next((r for p in candidates if (r := superseded_branch(branch,p,open_heads,main_trees,closed,tree,quality_passed))), None)
        if not reason:
            lines.append(f"KEEP branch {name}: no safe integration or replacement proof")
            continue
        if not args.apply:
            lines.append(f"DRY RUN delete {name}: {reason}")
            continue
        try:
            # Recheck all open PRs; lease protects against a concurrent head change.
            live = list(pages("pulls", state="open", head="Sashido01:"+name))
            if live:
                lines.append(f"KEEP branch {name}: open PR appeared")
                continue
            ref = "refs/heads/"+name
            remote = git("ls-remote", "origin", ref)
            if not remote:
                lines.append(f"OK branch {name}: already removed")
                continue
            if remote.split("\t",1)[0] != sha:
                lines.append(f"KEEP branch {name}: head changed")
                continue
            push("--force-with-lease="+ref+":"+sha, "origin", ":"+ref)
            if git("ls-remote","origin",ref):
                raise RuntimeError("Branch deletion not verified")
            lines.append(f"DELETED branch {name}: {reason}")
        except (subprocess.SubprocessError, RuntimeError) as exc:
            errors.append(f"FAILED branch {name}: {exc}")
    summary(lines + errors)
    if errors:
        raise SystemExit("Maintenance failed closed; see summary")

if __name__ == "__main__":
    main()
