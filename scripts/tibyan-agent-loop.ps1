param(
  [switch]$Install,
  [switch]$RunOnce,
  [string]$RepoRoot = "F:\tebyan",
  [string]$WorkerRoot = "F:\tebyan-agent-worktree"
)

$ErrorActionPreference = "Stop"
$Repo = "Zeyad-Abderahman1/tibyan"
$PhaseIssue = 3
$ControlIssue = 1
$StateDir = Join-Path $env:LOCALAPPDATA "TibyanAgentLoop"
$LogFile = Join-Path $StateDir "orchestrator.log"
$StateFile = Join-Path $StateDir "state.json"
$LockFile = Join-Path $StateDir "lock.pid"
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

function Log([string]$m) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $m"
  Write-Host $line
  Add-Content -LiteralPath $LogFile -Value $line
}

function Need([string]$name) {
  $c = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $c) { throw "Required command not found: $name" }
  return $c.Source
}

function Read-State {
  if (Test-Path $StateFile) {
    try { return Get-Content $StateFile -Raw | ConvertFrom-Json } catch {}
  }
  return [pscustomobject]@{ taskHash=""; reviewedSha=""; paused=$false; phaseComplete=$false }
}

function Save-State($s) {
  $s | ConvertTo-Json -Depth 8 | Set-Content $StateFile -Encoding UTF8
}

function Hash([string]$text) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($text)
    return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-","").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Gh-Comment([int]$number, [string]$body) {
  $tmp = Join-Path $StateDir ("comment-" + [guid]::NewGuid().ToString("N") + ".md")
  try {
    Set-Content $tmp $body -Encoding UTF8
    & gh issue comment $number --repo $Repo --body-file $tmp | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to comment on GitHub item #$number" }
  } finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
}

function Run-Codex([string]$instruction, [string]$context) {
  Push-Location $RepoRoot
  try {
    $err = Join-Path $StateDir ("codex-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".stderr.log")
    $out = ($context | & codex exec --ephemeral --sandbox read-only --ask-for-approval never $instruction 2>$err | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Codex failed. See $err" }
    if ([string]::IsNullOrWhiteSpace($out)) { throw "Codex returned no final decision" }
    return $out
  } finally { Pop-Location }
}

function Run-Agy([string]$prompt) {
  Push-Location $WorkerRoot
  try {
    $log = Join-Path $StateDir ("agy-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")
    return ((& agy --print-timeout 60m -p $prompt 2>&1 | Tee-Object -FilePath $log | Out-String).Trim())
  } finally { Pop-Location }
}

function Latest-ActiveTask {
  $body = (& gh issue view $PhaseIssue --repo $Repo --json comments --jq '.comments | map(select(.body | contains("ACTIVE_TASK="))) | last | .body' 2>$null | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($body)) { return $null }
  return $body
}

function Latest-MergedMarker {
  return ((& gh issue view $PhaseIssue --repo $Repo --json comments --jq '.comments | map(select(.body | contains("TASK_MERGED="))) | last | .body' 2>$null | Out-String).Trim())
}

function Ready-Pr {
  $line = (& gh pr list --repo $Repo --state open --base master --json number,headRefOid,body,updatedAt --jq '.[] | select(.body | contains("IMPLEMENTER_STATUS=READY_FOR_REVIEW")) | [.number,.headRefOid] | @tsv' | Select-Object -First 1)
  if (-not $line) { return $null }
  $p = $line -split [char]9
  return [pscustomobject]@{ number=[int]$p[0]; sha=$p[1] }
}

if ($Install) {
  Need "git" | Out-Null
  Need "gh" | Out-Null
  Need "agy" | Out-Null
  Need "codex" | Out-Null

  & gh auth status | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "GitHub CLI is not authenticated" }
  & agy --help | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Antigravity CLI is not ready" }
  & codex --version | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Codex CLI is not ready" }

  & git -C $RepoRoot fetch origin master
  if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }

  if (-not (Test-Path $WorkerRoot)) {
    & git -C $RepoRoot worktree add --detach $WorkerRoot origin/master
    if ($LASTEXITCODE -ne 0) { throw "Could not create dedicated worker worktree" }
  }

  $scriptPath = Join-Path $RepoRoot "scripts\tibyan-agent-loop.ps1"
  $quotedScript = '"' + $scriptPath + '"'
  $quotedRepo = '"' + $RepoRoot + '"'
  $quotedWorker = '"' + $WorkerRoot + '"'
  $args = "-NoProfile -ExecutionPolicy Bypass -File $quotedScript -RunOnce -RepoRoot $quotedRepo -WorkerRoot $quotedWorker"
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $args
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 12) -RepetitionDuration (New-TimeSpan -Days 3650)
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
  Register-ScheduledTask -TaskName "Tibyan-Agent-Orchestrator" -Action $action -Trigger $trigger -Settings $settings -Description "Codex supervises Antigravity for Tibyan every 12 minutes" -Force | Out-Null
  Start-ScheduledTask -TaskName "Tibyan-Agent-Orchestrator"
  Log "Installed and started Tibyan-Agent-Orchestrator (12-minute interval)."
  exit 0
}

if (-not $RunOnce) { throw "Use -Install once, or -RunOnce for a single cycle" }

Need "git" | Out-Null
Need "gh" | Out-Null
Need "agy" | Out-Null
Need "codex" | Out-Null

if (Test-Path $LockFile) {
  try {
    $oldPid = [int](Get-Content $LockFile -Raw)
    if (Get-Process -Id $oldPid -ErrorAction SilentlyContinue) { Log "Another cycle is running; exit."; exit 0 }
  } catch {}
}
Set-Content $LockFile $PID -Encoding ASCII

try {
  $state = Read-State
  if ($state.paused) { Log "Paused for user action."; exit 0 }
  if ($state.phaseComplete) { Log "Phase 3 marked complete."; exit 0 }
  if (-not (Test-Path $WorkerRoot)) { throw "Worker worktree missing. Run -Install first." }

  $pr = Ready-Pr
  if ($pr) {
    if ($state.reviewedSha -eq $pr.sha) { Log "PR #$($pr.number) already reviewed at this head."; exit 0 }

    $prJson = (& gh pr view $pr.number --repo $Repo --json number,title,body,url,headRefName,headRefOid,baseRefName,files,commits,comments,reviews,statusCheckRollup,mergeStateStatus | Out-String)
    $diff = (& gh pr diff $pr.number --repo $Repo | Out-String)
    $phase = (& gh issue view $PhaseIssue --repo $Repo --comments | Out-String)
    $nl = [Environment]::NewLine
    $context = "PHASE ISSUE:" + $nl + $phase + $nl + "PR JSON:" + $nl + $prJson + $nl + "PR DIFF:" + $nl + $diff

    $instruction = @'
You are Tibyan's PRIMARY SUPERVISOR. Read AGENTS.md and .github/SUPERVISOR_PROTOCOL.md locally.
Review only the active task, this PR diff, touched contracts/migrations/security boundaries, and exact verification evidence.
Return a GitHub-ready comment whose FIRST LINE is exactly one of:
SUPERVISOR_STATUS=APPROVED
SUPERVISOR_STATUS=REQUEST_CHANGES
USER_ACTION_REQUIRED=<short reason>
Use USER_ACTION_REQUIRED for any new dependency/plugin/skill, phase/scope expansion, material product choice, security/data-loss risk, unresolved blocker, or required user visual/product approval.
Keep requested changes finite and concrete.
'@
    $decision = Run-Codex $instruction $context
    Gh-Comment $pr.number $decision
    $state.reviewedSha = $pr.sha
    Save-State $state

    if ($decision -match "(?m)^USER_ACTION_REQUIRED=") {
      Gh-Comment $ControlIssue ("Automation paused on PR #$($pr.number)." + [Environment]::NewLine + [Environment]::NewLine + $decision)
      $state.paused = $true
      Save-State $state
      exit 0
    }

    if ($decision -match "(?m)^SUPERVISOR_STATUS=REQUEST_CHANGES$") {
      Log "Codex requested changes on PR #$($pr.number)."
      $result = Run-Agy @"
Read AGENTS.md and .github/SUPERVISOR_PROTOCOL.md. Read PR #$($pr.number) and the latest supervisor comment.
Fix ONLY the requested findings on the SAME PR branch. Re-run required verification and push.
Do not merge, self-approve, install dependencies/plugins/skills, expand scope, or touch outside this worktree.
If user action is required, end with RESULT=BLOCKED_USER. Otherwise end with RESULT=PR_UPDATED.
"@
      if ($result -match "(?m)^RESULT=BLOCKED_USER") {
        Gh-Comment $ControlIssue ("Antigravity requires user action on PR #$($pr.number)." + [Environment]::NewLine + [Environment]::NewLine + $result)
        $state.paused = $true
      } else {
        $state.reviewedSha = ""
      }
      Save-State $state
      exit 0
    }

    if ($decision -match "(?m)^SUPERVISOR_STATUS=APPROVED$") {
      Log "Codex approved PR #$($pr.number)."
      $result = Run-Agy @"
Read AGENTS.md and .github/SUPERVISOR_PROTOCOL.md. Read PR #$($pr.number), its checks, and latest supervisor comment.
The supervisor approved it. Merge ONLY if every merge-contract condition is satisfied, including any required user visual/product approval.
If blocked, do not merge and end with RESULT=BLOCKED_USER.
If merged: update handoff files if required, sync this worktree to origin/master, determine the active Phase 3 task number from Issue #$PhaseIssue, and post a comment there containing BOTH lines:
TASK_MERGED=PR#$($pr.number)
TASK_MERGED_TASK=<the active task number>
Then end with RESULT=MERGED.
Never force-push or rewrite history. Do not start the next task.
"@
      if ($result -match "(?m)^RESULT=BLOCKED_USER") {
        Gh-Comment $ControlIssue ("Approved PR #$($pr.number) could not be merged automatically." + [Environment]::NewLine + [Environment]::NewLine + $result)
        $state.paused = $true
        Save-State $state
      }
      $state.reviewedSha = ""
      Save-State $state
      exit 0
    }

    throw "Codex returned no valid supervisor state"
  }

  $task = Latest-ActiveTask
  if (-not $task) { Log "No ACTIVE_TASK found."; exit 0 }

  $mergedMarker = Latest-MergedMarker
  $taskMatch = [regex]::Match($task, 'Task ([1-6]) of 6')
  if ($mergedMarker -and $taskMatch.Success) {
    $taskNumber = [int]$taskMatch.Groups[1].Value
    if ($mergedMarker -match "TASK_MERGED_TASK=$taskNumber") {
      $phase = (& gh issue view $PhaseIssue --repo $Repo --comments | Out-String)
      $instruction = @'
You are Tibyan's PRIMARY SUPERVISOR/ORCHESTRATOR. Read AGENTS.md and .github/SUPERVISOR_PROTOCOL.md locally.
The previously active Phase 3 task has merged. Using only the already-approved six-task Phase 3 sequence, issue the NEXT task as one concise GitHub-ready comment.
Include exactly one line:
ACTIVE_TASK=Phase 3 — Task X of 6: <canonical name>
Also include acceptance criteria and a line:
ADVANCED_FROM_TASK=<previous task number>
Do not start Phase 4. If all six tasks are complete, return exactly:
PHASE_STATUS=COMPLETE
'@
      $next = Run-Codex $instruction $phase
      Gh-Comment $PhaseIssue $next
      if ($next -match "(?m)^PHASE_STATUS=COMPLETE$") {
        Gh-Comment $ControlIssue "Phase 3 COMPLETE. Phase 4 has NOT started."
        $state.phaseComplete = $true
      }
      Save-State $state
      exit 0
    }
  }

  $h = Hash $task
  if ($state.taskHash -eq $h) { Log "No actionable GitHub change."; exit 0 }

  Log "Dispatching active task to Antigravity."
  $result = Run-Agy @"
You are Tibyan's PRIMARY IMPLEMENTER. Work only inside this dedicated worktree.
Sync origin/master, then read AGENTS.md, .github/SUPERVISOR_PROTOCOL.md, GitHub Control Issue #$ControlIssue, and ALL comments in Phase 3 Issue #$PhaseIssue.

Authorized active supervisor brief:
$task

Implement ONLY that task. Create one feature branch from current origin/master. Run all required verification.
Push the branch and open/update exactly one PR into master. The PR body must contain exact evidence and:
IMPLEMENTER_STATUS=READY_FOR_REVIEW
Do not merge, self-approve, install dependencies/plugins/skills, expand scope, start Phase 4, or touch files outside this worktree.
If user action is required, end with RESULT=BLOCKED_USER. Otherwise end with RESULT=PR_READY.
"@
  if ($result -match "(?m)^RESULT=BLOCKED_USER") {
    Gh-Comment $ControlIssue ("Antigravity requires user action." + [Environment]::NewLine + [Environment]::NewLine + $result)
    $state.paused = $true
  } else {
    $readyAfter = Ready-Pr
    if ($readyAfter) {
      $state.taskHash = $h
      Log "Antigravity opened PR #$($readyAfter.number)."
    } else {
      Log "Antigravity returned without a ready PR; task will retry next cycle."
    }
  }
  Save-State $state
}
catch {
  Log ("ERROR: " + $_.Exception.Message)
  exit 1
}
finally {
  Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
}
