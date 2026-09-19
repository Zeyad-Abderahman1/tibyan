# Unattended Tibyan Agent Loop

This automation runs the approved workflow locally every 12 minutes:

- Codex = supervisor/reviewer
- Antigravity = implementation worker
- GitHub = coordination channel
- User is interrupted only at explicit protocol gates

## One-time setup

After this reaches master, run once from PowerShell in F:\tebyan:

powershell -ExecutionPolicy Bypass -File .\scripts\tibyan-agent-loop.ps1 -Install

It checks git, gh, agy and codex; creates F:\tebyan-agent-worktree; installs Windows Scheduled Task "Tibyan-Agent-Orchestrator"; and starts it immediately.

## Automatic loop

1. Read active Phase 3 task from Issue #3.
2. Wake Antigravity CLI to implement/test/push/open a PR.
3. Detect PR marked IMPLEMENTER_STATUS=READY_FOR_REVIEW.
4. Run Codex in read-only non-interactive review mode.
5. Post APPROVED / REQUEST_CHANGES / USER_ACTION_REQUIRED.
6. Wake Antigravity to fix or merge.
7. After merge, Codex issues the next already-approved Phase 3 task.
8. Stop at Phase 3 completion; never start Phase 4 automatically.

## Safety

Before installing, set Antigravity Tool Permission to always-proceed once in Antigravity settings/config. The orchestrator then invokes normal non-interactive agy -p. This is still elevated-risk host automation because Antigravity may execute commands and write files without prompting. The worker uses a dedicated Git worktree and repository protocol, but that is not an OS security sandbox.

Codex supervision runs read-only with no interactive approvals.

Keep Windows signed in, the PC awake, and internet available. Screen lock is fine. Sleep/logoff stops local execution.

Logs/state:
%LOCALAPPDATA%\TibyanAgentLoop

If a user gate occurs, the loop pauses itself.
