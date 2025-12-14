# Tiny Tracker – AI + Code Workflow

This repository uses a **strict, deterministic workflow** for working with AI tools.
AI is used for **reasoning and patch generation only**.
All code execution happens locally via git and VS Code tasks.

This document exists so **any AI in any chat** can immediately understand:
- where the source of truth lives
- what it is allowed to do
- what it is NOT allowed to do

---

## Source of Truth (Live Files)

These URLs always return the **current production source** from the `main` branch
as raw text (no GitHub UI, no truncation):

- **Application logic**  
  https://raw.githubusercontent.com/arlebowski/Tiny-Time/main/script.js

- **HTML entry point**  
  https://raw.githubusercontent.com/arlebowski/Tiny-Time/main/index.html

- **PWA manifest**  
  https://raw.githubusercontent.com/arlebowski/Tiny-Time/main/manifest.json

If frozen context is required, replace `main` with a **commit SHA**:

```
https://raw.githubusercontent.com/arlebowski/Tiny-Time/<commit-sha>/script.js
```

---

## AI Usage Rules (Critical)

Any AI reading this repository **must follow these rules**:

1. **READ-ONLY CONTEXT**
   - AI may read files via the raw URLs above
   - AI must NOT assume access to local files, editor state, or uncommitted changes

2. **NO DIRECT EDITS**
   - AI must NOT apply changes
   - AI must NOT push commits or create PRs
   - AI must NOT refactor broadly unless explicitly asked

3. **PATCH-ONLY OUTPUT**
   - All code changes must be returned as a **git diff–formatted unified diff**
   - The diff **must start with** `diff --git`
   - Partial diffs, context-only diffs (`--- a / +++ b` without `diff --git`), or truncated lines are **not acceptable**
   - Diffs must be minimal and scoped
   - No speculative or drive-by changes
   - **AI must explicitly label which file(s) are being changed** before the diff (example: “Files: index.html, script.js”).
   - **AI must explicitly label which file(s) are being changed** before the diff (example: “Files: index.html, script.js”).

4. **STEP-BY-STEP APPLICATION INSTRUCTIONS**
   - Alongside the diff, AI must provide **exact, step-by-step instructions** to apply it using the workflow below.
   - Instructions must be concrete (what to click, what command to run, what success looks like).

5. **EXECUTION IS EXTERNAL**
   - Diffs are applied locally via git + VS Code Tasks
   - AI never executes code or modifies files directly

If these constraints cannot be followed, the AI should ask for clarification **before responding**.

---

## Canonical Development Loop

1. Human describes intent ("I want to change X")
2. AI reads source via raw GitHub URLs
3. AI proposes a **unified diff only**
4. Human applies diff using the VS Code Task:
   - `Patch: Apply (clipboard)`
5. Human previews locally
6. Human publishes to `main` when satisfied

---

## Applying a Patch (Exact Steps)

When the AI provides a patch:

1. **Verify format**
   - The first line of the clipboard **must** start with:
     ```
     diff --git
     ```
   - If not, the patch task will fail by design.

2. **Apply the patch**
   - In VS Code: **Terminal → Run Task… → `Patch: Apply (clipboard)`**

3. **If the task fails**
   - Paste the terminal error back into chat
   - Do **not** try to "fix" the patch manually

4. **Preview locally**
   - VS Code: **Terminal → Run Task… → `Preview: Start local server (8000)`**
   - Open `http://localhost:8000`

5. **Publish when satisfied**
   - VS Code: **Terminal → Run Task… → `Publish: Merge current branch to main + push`**

---

## Why This Exists

Most AI tools lack stable editor or repo context.
This workflow provides:
- deterministic changes
- clean audit history
- minimal surface area for mistakes
- zero "AI went rogue" risk
- reproducibility across chats and tools

This is intentional.

