#!/usr/bin/env python3
"""Team activity log: appends what the lead, subagents and advisor do to .claude/team-log.md.

Modes (first argument):
  dispatch         PreToolUse/Agent: the lead sends work to a subagent.
  dispatch-failed  PostToolUseFailure/Agent: the dispatch was rejected (e.g. unknown agent).
  subagent   SubagentStop: a subagent finished; logs its steps and final report.
  sync       Stop: logs advisor consultations (with the lead's summary) not yet logged.

team_gate.py also calls log_event() when a gate blocks something.
Fails open: any internal error exits 0.
"""
import datetime
import json
import os
import re
import sys

ROOT = os.environ.get("CLAUDE_PROJECT_DIR", ".")
LOG = os.path.join(ROOT, ".claude", "team-log.md")
STATE_DIR = os.path.join(ROOT, ".claude", "state")
MAX_TEXT = 6000


def clip(text):
    text = (text or "").strip()
    return text if len(text) <= MAX_TEXT else text[:MAX_TEXT] + "\n… [truncated]"


def quote(text):
    return "\n".join("> " + line for line in clip(text).splitlines()) or "> (empty)"


def agent_model(agent_type):
    path = os.path.join(ROOT, ".claude", "agents", "%s.md" % agent_type)
    try:
        with open(path, encoding="utf-8") as f:
            match = re.search(r"^model:\s*(\S+)", f.read(), re.M)
        return match.group(1) if match else "inherit"
    except OSError:
        return "built-in"


def log_event(session_id, title, body=""):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    marker = os.path.join(STATE_DIR, "log-session")
    os.makedirs(STATE_DIR, exist_ok=True)
    try:
        with open(marker, encoding="utf-8") as f:
            last_session = f.read().strip()
    except OSError:
        last_session = ""
    now = datetime.datetime.now().strftime("%H:%M:%S")
    with open(LOG, "a", encoding="utf-8") as f:
        if last_session != session_id:
            f.write("\n---\n\n## Session %s · %s\n\n" % (
                (session_id or "unknown")[:8], datetime.datetime.now().strftime("%Y-%m-%d")))
        f.write("### %s · %s\n\n" % (now, title))
        if body:
            f.write(body.rstrip() + "\n\n")
    if last_session != session_id:
        with open(marker, "w", encoding="utf-8") as f:
            f.write(session_id or "")


def describe(block):
    name = block.get("name", "?")
    inp = block.get("input") or {}
    for key in ("file_path", "path", "pattern", "command", "url", "query", "description"):
        if inp.get(key):
            return "%s `%s`" % (name, str(inp[key]).replace("`", "'")[:120])
    return name


def subagent_steps(transcript_path):
    steps = []
    try:
        with open(transcript_path, encoding="utf-8") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                except ValueError:
                    continue
                if entry.get("type") != "assistant":
                    continue
                for block in (entry.get("message") or {}).get("content") or []:
                    if isinstance(block, dict) and block.get("type") == "tool_use":
                        steps.append(describe(block))
    except OSError:
        pass
    return steps


def dispatch(payload):
    inp = payload.get("tool_input") or {}
    agent_type = inp.get("subagent_type") or "general-purpose"
    log_event(
        payload.get("session_id"),
        "Lead → %s (%s): %s" % (agent_type, agent_model(agent_type), inp.get("description", "")),
        "**Instructions sent:**\n\n" + quote(inp.get("prompt")),
    )


def dispatch_failed(payload):
    inp = payload.get("tool_input") or {}
    log_event(payload.get("session_id"), "Dispatch to %s failed" % (inp.get("subagent_type") or "subagent"),
              quote(payload.get("error")))


def subagent(payload):
    agent_type = payload.get("agent_type") or payload.get("subagent_type") or "subagent"
    steps = subagent_steps(payload.get("agent_transcript_path") or "")
    body = "**Steps (%d):**\n\n" % len(steps)
    body += "\n".join("%d. %s" % (i, s) for i, s in enumerate(steps, 1)) or "(no tool calls)"
    body += "\n\n**Report returned to lead:**\n\n" + quote(payload.get("last_assistant_message"))
    log_event(payload.get("session_id"), "%s (%s) → Lead: finished" % (agent_type, agent_model(agent_type)), body)


def sync(payload):
    """Log advisor calls not logged yet. The advisor's reply is encrypted in the transcript,
    so the log shows the lead's own text right after the call (CLAUDE.md asks for a summary)."""
    path = payload.get("transcript_path")
    if not path or not os.path.exists(path):
        return
    session = payload.get("session_id") or "unknown"
    state_file = os.path.join(STATE_DIR, "advisor-logged-%s.json" % session)
    try:
        with open(state_file, encoding="utf-8") as f:
            logged = set(json.load(f))
    except (OSError, ValueError):
        logged = set()
    calls = []  # [call_id, summary]
    with open(path, encoding="utf-8") as f:
        for line in f:
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            if entry.get("isSidechain") or entry.get("type") != "assistant":
                continue
            for block in (entry.get("message") or {}).get("content") or []:
                if not isinstance(block, dict):
                    continue
                if block.get("type") == "server_tool_use" and block.get("name") == "advisor":
                    calls.append([block.get("id"), None])
                elif block.get("type") == "text" and calls and calls[-1][1] is None and block.get("text", "").strip():
                    calls[-1][1] = block["text"]
    for call_id, summary in calls:
        if call_id in logged or summary is None:
            continue
        log_event(session, "Lead ⇄ Advisor (Opus): consulted",
                  "_The advisor's reply is encrypted in the transcript; this is the lead's next message:_\n\n"
                  + quote(summary))
        logged.add(call_id)
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(state_file, "w", encoding="utf-8") as f:
        json.dump(sorted(logged), f)


MODES = {"dispatch": dispatch, "dispatch-failed": dispatch_failed, "subagent": subagent, "sync": sync}

if __name__ == "__main__":
    try:
        MODES[sys.argv[1]](json.load(sys.stdin))
    except Exception:
        pass
    sys.exit(0)
