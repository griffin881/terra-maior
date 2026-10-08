#!/usr/bin/env python3
"""Advisor checkpoints for the lead session.

Modes (first argument):
  commit-gate    PreToolUse/Bash: deny `git commit` when files were edited after the last audit.
  plan-gate      PreToolUse/ExitPlanMode: deny a multi-file plan with no audit since the user's last message.
  stop-gate      Stop: block finishing once when files were edited after the last audit.
  failure-watch  PostToolUseFailure/Bash: tell the lead to call the advisor when the same error repeats.

An "audit" is an advisor tool call or a `reviewer` subagent call on the main chain.
Fails open: any internal error exits 0 so a bug here never locks the session.
"""
import hashlib
import json
import os
import re
import sys

EDIT_TOOLS = {"Edit", "Write", "NotebookEdit", "MultiEdit"}
AGENT_TOOLS = {"Agent", "Task"}
COMMIT_RE = re.compile(r"\bgit\b[^;&|\n]*\bcommit\b")
PATH_RE = re.compile(r"[\w.-]*[/\w-]+\.[A-Za-z]{1,6}\b")


def emit(obj):
    print(json.dumps(obj))
    sys.exit(0)


def is_audit(block):
    if block.get("name") == "advisor" and block.get("type") in ("server_tool_use", "tool_use"):
        return True
    if block.get("type") == "tool_use" and block.get("name") in AGENT_TOOLS:
        return (block.get("input") or {}).get("subagent_type") == "reviewer"
    return False


def scan(transcript_path):
    """Return (last_edit, last_audit, last_user_prompt) positions on the main chain, -1 if none."""
    last_edit = last_audit = last_user = -1
    pos = 0
    with open(transcript_path, encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            if entry.get("isSidechain"):
                continue
            content = (entry.get("message") or {}).get("content")
            if entry.get("type") == "user":
                pos += 1
                if isinstance(content, str) or (
                    isinstance(content, list)
                    and any(b.get("type") == "text" for b in content if isinstance(b, dict))
                    and not any(b.get("type") == "tool_result" for b in content if isinstance(b, dict))
                ):
                    if not entry.get("isMeta"):
                        last_user = pos
                continue
            if entry.get("type") != "assistant" or not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict):
                    continue
                pos += 1
                if block.get("type") == "tool_use" and block.get("name") in EDIT_TOOLS:
                    last_edit = pos
                elif is_audit(block):
                    last_audit = pos
    return last_edit, last_audit, last_user


def unaudited_edits(payload):
    path = payload.get("transcript_path")
    if not path or not os.path.exists(path):
        return False
    last_edit, last_audit, _ = scan(path)
    return last_edit > last_audit


def commit_gate(payload):
    command = (payload.get("tool_input") or {}).get("command", "")
    if not COMMIT_RE.search(command) or not unaudited_edits(payload):
        return
    emit({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            "Diff contract audit required: files were edited after the last audit. "
            "Call the advisor (or the `reviewer` subagent if the advisor is unavailable) "
            "with the staged diff and the original request, address its findings, then commit."
        ),
    }})


def plan_gate(payload):
    plan = (payload.get("tool_input") or {}).get("plan", "")
    if len(set(PATH_RE.findall(plan))) < 2:
        return
    path = payload.get("transcript_path")
    if not path or not os.path.exists(path):
        return
    _, last_audit, last_user = scan(path)
    if last_audit > last_user:
        return
    emit({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            "Multi-file plan: consult the advisor before finalizing it, "
            "incorporate or rebut its feedback, then present the plan again."
        ),
    }})


def stop_gate(payload):
    if payload.get("stop_hook_active") or not unaudited_edits(payload):
        return
    emit({
        "decision": "block",
        "reason": (
            "Before declaring this complete: files were edited after the last audit. "
            "Call the advisor (or the `reviewer` subagent) for a diff contract audit, "
            "fix anything it flags, then finish."
        ),
    })


def signature(text):
    body = text.splitlines()
    if body and re.match(r"Exit code \d+$", body[0].strip()):
        body = body[1:]
    lines = [l for l in body if re.search(r"error|fail|panic|exception|assert", l, re.I)][:5]
    norm = "\n".join(re.sub(r"\d+", "N", l.strip()) for l in lines)
    return hashlib.sha1(norm.encode()).hexdigest() if norm else None


def failure_watch(payload):
    text = payload.get("error") or json.dumps(payload.get("tool_response") or "")
    sig = signature(str(text))
    if not sig:
        return
    state_dir = os.path.join(os.environ.get("CLAUDE_PROJECT_DIR", "."), ".claude", "state")
    os.makedirs(state_dir, exist_ok=True)
    state_file = os.path.join(state_dir, "failures-%s.json" % payload.get("session_id", "unknown"))
    try:
        with open(state_file, encoding="utf-8") as f:
            previous = json.load(f).get("last")
    except (OSError, ValueError):
        previous = None
    with open(state_file, "w", encoding="utf-8") as f:
        json.dump({"last": sig}, f)
    if previous != sig:
        return
    emit({"hookSpecificOutput": {
        "hookEventName": "PostToolUseFailure",
        "additionalContext": (
            "The same error has now failed twice in a row. Stop trying fixes: call the advisor "
            "with the error, both attempts, and the relevant code before a third attempt."
        ),
    }})


MODES = {
    "commit-gate": commit_gate,
    "plan-gate": plan_gate,
    "stop-gate": stop_gate,
    "failure-watch": failure_watch,
}

if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin)
        MODES[sys.argv[1]](payload)
    except Exception:
        pass
    sys.exit(0)
