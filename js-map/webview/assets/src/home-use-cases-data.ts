import type { ModeKind } from "app-server-types";
import type { MessageDescriptor } from "react-intl";

import type { ComposerMode } from "@/composer/composer";

export type HomeUseCase = {
  id: string;
  promptMessage: MessageDescriptor;
  automationPromptMessage?: MessageDescriptor;
  iconName: string;
  mode: ComposerMode;
  initialCollaborationMode?: ModeKind;
  skillName?: string;
  isAutomation?: boolean;
};

export const HOME_USE_CASES: Array<HomeUseCase> = [
  {
    id: "snake-game",
    promptMessage: {
      id: "home.useCases.snakeGame.prompt",
      defaultMessage:
        "Build a classic Snake game in this repo.\n\nScope & constraints:\n- Implement ONLY the classic Snake loop: grid movement, growing snake, food spawn, score, game-over, restart.\n- Reuse existing project tooling/frameworks; do NOT add new dependencies unless truly required.\n- Keep UI minimal and consistent with the repo’s existing styles (no new design systems, no extra animations).\n\nImplementation plan:\n1) Inspect the repo to find the right place to add a small interactive game (existing pages/routes/components).\n2) Implement game state (snake positions, direction, food, score, tick timer) with deterministic, testable logic.\n3) Render: simple grid + snake + food; support keyboard controls (arrow keys/WASD) and on-screen controls if mobile is present in the repo.\n4) Add basic tests for the core game logic (movement, collisions, growth, food placement) if the repo has a test runner.\n\nDeliverables:\n- A small set of files/changes with clear names.\n- Short run instructions (how to start dev server + where to navigate).\n- A brief checklist of what to manually verify (controls, pause/restart, boundaries).",
      description: "Prompt for creating a classic snake game",
    },
    iconName: "game-controller",
    mode: "worktree",
  },
  {
    id: "fix-bugs",
    promptMessage: {
      id: "home.useCases.fixBugs.prompt",
      defaultMessage:
        "Find and fix bugs in my codebase with minimal, high-confidence changes.\n\nMethod (grounded + disciplined):\n1) Reproduce: run tests/lint/build (or follow the existing repo scripts). If I provided an error, reproduce that exact failure.\n2) Localize: identify the smallest set of files/lines involved (stack traces, failing tests, logs).\n3) Fix: implement the minimal change that resolves the issue without refactors or unrelated cleanup.\n4) Prove: add/update a focused test (or a tight repro) that fails before and passes after.\n\nConstraints:\n- Do NOT invent errors or pretend to run commands you cannot run.\n- No scope drift: no new features, no UI embellishments, no style overhauls.\n- If information is missing, state what you can confirm from the repo and what remains unknown.\n\nOutput:\n- Summary (3–6 sentences max): what was broken, why, and the fix.\n- Then ≤5 bullets: What changed, Where (paths), Evidence (tests/logs), Risks, Next steps.",
      description: "Prompt for finding and fixing bugs",
    },
    iconName: "ladybug",
    mode: "worktree",
  },
  {
    id: "one-page-pdf",
    promptMessage: {
      id: "home.useCases.onePagePdf.prompt",
      defaultMessage:
        "Create a one-page $pdf that summarizes this app.\n\nContent requirements (1 page total):\n- What it is: 1–2 sentence description.\n- Who it’s for: primary user/persona.\n- What it does: 5–7 crisp bullets of key features.\n- How it works: a compact architecture overview (components/services/data flow) based ONLY on repo evidence.\n- How to run: the minimal “getting started” steps.\n\nFormatting constraints:\n- Must fit on a single page (no overflow).\n- Prefer a clean, scannable layout: headings + bullets; avoid long paragraphs.\n- If the repo lacks key info, explicitly mark those items as “Not found in repo.”\n\nDeliverable:\n- Output a generated $pdf and include its filename/path.",
      description: "Prompt for creating a one-page PDF summary",
    },
    iconName: "pdf-document",
    mode: "local",
  },
  {
    id: "create-plan",
    promptMessage: {
      id: "home.useCases.createPlan.prompt",
      defaultMessage: "Create a plan to...",
      description: "Prompt for creating a plan before implementation",
    },
    iconName: "pencil",
    mode: "worktree",
    initialCollaborationMode: "plan",
  },
  {
    id: "viral-feature",
    promptMessage: {
      id: "home.useCases.viralFeature.prompt",
      defaultMessage:
        "Propose AND implement one high-leverage viral feature for my app.\n\nRules:\n- Pick ONE feature that fits the app’s existing product surface (no multi-feature bundles).\n- Optimize for minimal engineering scope and measurable impact.\n- Reuse existing patterns, auth, analytics, and UI components.\n- Do NOT introduce a new design system or a complex growth framework.\n\nProcess:\n1) Quickly infer the app’s core loop and shareable moment from repo signals (routes, copy, analytics, existing flows).\n2) Choose one feature (e.g., share link/referral/invite loop) and state assumptions clearly if the repo doesn’t reveal intent.\n3) Implement the end-to-end slice: UI entry point → backend/API (if needed) → tracking (if present) → success state.\n4) Add a small measurement hook: define 1–2 concrete events/metrics (e.g., share_clicked, invite_accepted).\n\nOutput:\n- 1 short overview paragraph.\n- Then ≤5 bullets: Feature, Why (evidence/assumptions), Implementation plan, Files changed, How to verify.",
      description: "Prompt for suggesting and implementing a viral feature",
    },
    iconName: "flash",
    mode: "worktree",
  },
  {
    id: "dashboard",
    promptMessage: {
      id: "home.useCases.dashboard.prompt",
      defaultMessage:
        "Create a dashboard for ….\n\nInterpretation rule:\n- If the exact metrics/entities are not specified, build the simplest valid dashboard shell that’s easy to extend (layout + placeholders + wiring points), and clearly label assumptions.\n\nImplementation requirements:\n- Reuse the repo’s existing UI components, charts, and data-fetch patterns.\n- No new charting libraries unless the repo has none and the dashboard cannot be built otherwise.\n- Provide a clean information hierarchy: headline KPIs → trends → breakdown table.\n\nOutput:\n- ≤5 bullets: What you built, Where it lives (routes/components), Data sources used (or TODOs), Risks, Next steps.\n- Include a short “How to view” instruction.",
      description: "Prompt for creating a dashboard",
    },
    iconName: "components-window",
    mode: "worktree",
  },
  {
    id: "figma-implementation",
    promptMessage: {
      id: "home.useCases.figmaImplementation.prompt",
      defaultMessage:
        "Implement designs from my Figma file in this codebase using $figma-implement-design.\n\nDesign-system & scope discipline:\n- Match the existing design system/tokens exactly; do NOT invent new colors, shadows, spacing scales, or animations.\n- Implement ONLY what’s in the provided Figma frames (no extra UX features).\n\nWorkflow:\n1) Identify target screens/components in Figma and map them to existing routes/components.\n2) Reuse existing primitives; create new components only when reuse is clearly impossible.\n3) Ensure responsive behavior consistent with the repo’s conventions.\n4) Validate: pixel-ish alignment where feasible, but prioritize correctness and consistency over overfitting.\n\nOutput:\n- A compact change summary: What changed + file paths.\n- A checklist of what to verify in the UI (states, responsiveness, accessibility basics).\n- If any Figma detail is ambiguous, pick the simplest interpretation and note it briefly.",
      description: "Prompt for implementing designs from Figma",
    },
    iconName: "figma-document",
    mode: "worktree",
    skillName: "figma-implement-design",
  },
  {
    id: "deploy-vercel",
    promptMessage: {
      id: "home.useCases.deployVercel.prompt",
      defaultMessage:
        "Deploy this project to Vercel with $vercel-deploy and a safe, minimal setup.\n\nRequirements:\n- Detect existing deployment configuration (vercel.json, build settings, env vars) and reuse it.\n- Ensure the project builds successfully with the repo’s standard commands.\n- Identify required environment variables from the repo and document them clearly.\n\nConstraints:\n- No code changes unless required to make the build/deploy succeed.\n- Do not guess secrets or values.\n\nOutput:\n- Step-by-step deployment instructions.\n- A concise list of required env vars (name + where referenced).\n- A short validation checklist after deploy (key routes, smoke checks).",
      description: "Prompt for deploying the project to Vercel",
    },
    iconName: "triangle, vercel",
    mode: "local",
    skillName: "vercel-deploy",
  },
  {
    id: "daily-bug-scan",
    promptMessage: {
      id: "home.useCases.dailyBugScan.prompt",
      defaultMessage:
        "Scan recent commits for likely bugs and propose minimal fixes.",
      description: "Prompt for a daily bug scan at 9am",
    },
    automationPromptMessage: {
      id: "home.useCases.dailyBugScan.automationPrompt",
      defaultMessage:
        "Scan recent commits (since the last run, or last 24h) for likely bugs and propose minimal fixes.\n\nGrounding rules:\n- Use ONLY concrete repo evidence (commit SHAs, PRs, file paths, diffs, failing tests, CI signals).\n- Do NOT invent bugs; if evidence is weak, say so and skip.\n- Prefer the smallest safe fix; avoid refactors and unrelated cleanup.",
      description: "Automation prompt for a daily bug scan at 9am",
    },
    iconName: "ladybug",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "weekly-release-notes",
    promptMessage: {
      id: "home.useCases.weeklyReleaseNotes.prompt",
      defaultMessage: "Draft release notes from merged PRs.",
      description: "Prompt for drafting weekly release notes",
    },
    automationPromptMessage: {
      id: "home.useCases.weeklyReleaseNotes.automationPrompt",
      defaultMessage:
        "Draft weekly release notes from merged PRs (include links when available).\n\nScope & grounding:\n- Stay strictly within the repo history for the week; do not add extra sections beyond what the data supports.\n- Use PR numbers/titles; avoid claims about impact unless supported by PR description/tests/metrics in repo.",
      description: "Automation prompt for drafting weekly release notes",
    },
    iconName: "book-open",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "daily-standup",
    promptMessage: {
      id: "home.useCases.dailyStandup.prompt",
      defaultMessage: "Summarize yesterday’s git activity for standup.",
      description: "Prompt for a daily standup summary",
    },
    automationPromptMessage: {
      id: "home.useCases.dailyStandup.automationPrompt",
      defaultMessage:
        "Summarize yesterday’s git activity for standup.\n\nGrounding rules:\n- Anchor statements to commits/PRs/files; do not speculate about intent or future work.\n- Keep it scannable and team-ready.",
      description: "Automation prompt for a daily standup summary",
    },
    iconName: "bubble-on-bubble",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "nightly-ci-report",
    promptMessage: {
      id: "home.useCases.nightlyCiReport.prompt",
      defaultMessage: "Summarize CI failures and flaky tests.",
      description: "Prompt for a nightly CI summary",
    },
    automationPromptMessage: {
      id: "home.useCases.nightlyCiReport.automationPrompt",
      defaultMessage:
        "Summarize CI failures and flaky tests from the last CI window; suggest top fixes.\n\nGrounding rules:\n- Cite specific jobs, tests, error messages, or log snippets when available.\n- Avoid overconfident root-cause claims; separate “observed” vs “suspected.”",
      description: "Automation prompt for a nightly CI summary",
    },
    iconName: "radar",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "interactive-prototype",
    promptMessage: {
      id: "home.useCases.interactivePrototype.prompt",
      defaultMessage:
        "Create an interactive prototype based on my meeting notes.\n\nRequirements:\n- Extract the core user flow and acceptance criteria from the notes.\n- Build a minimal clickable prototype (happy path + 1–2 key edge states).\n- Keep styling consistent with the repo; do not introduce new UI systems.\n\nOutput:\n- 1 short overview paragraph.\n- Then ≤5 bullets: Flow, Screens/components, Key interactions, Files/paths, How to run/view.\n- If notes are ambiguous, choose the simplest interpretation and label assumptions.",
      description: "Prompt for creating an interactive prototype",
    },
    iconName: "pointer",
    mode: "local",
  },
  {
    id: "roadmap-doc",
    promptMessage: {
      id: "home.useCases.roadmapDoc.prompt",
      defaultMessage:
        "Create a $doc with a 6-week roadmap for my app.\n\nRequirements:\n- Base the roadmap on what the repo indicates (current features, TODOs, architecture constraints).\n- Include milestones, weekly goals, and clear deliverables.\n- Call out dependencies and risks explicitly.\n\nFormatting:\n- Keep it scannable: headings + bullets + a simple week-by-week table.\n\nOutput:\n- Provide the generated $doc and include the filename/path.",
      description: "Prompt for creating a six week roadmap document",
    },
    iconName: "map",
    mode: "local",
  },
  {
    id: "daily-classic-game",
    promptMessage: {
      id: "home.useCases.dailyClassicGame.prompt",
      defaultMessage: "Create a small classic game with minimal scope.",
      description: "Prompt for creating a daily classic game at 2pm",
    },
    automationPromptMessage: {
      id: "home.useCases.dailyClassicGame.automationPrompt",
      defaultMessage:
        "Create a small classic game with minimal scope.\n\nConstraints:\n- Do NOT add extra features, styling systems, content, or new dependencies unless required.\n- Reuse existing repo tooling and patterns.",
      description: "Automation prompt for creating a daily classic game",
    },
    iconName: "star-app",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "skill-progression-map",
    promptMessage: {
      id: "home.useCases.skillProgressionMap.prompt",
      defaultMessage:
        "Suggest next skills to deepen from recent PRs and reviews.",
      description:
        "Prompt for a weekly skill progression map based on recent PRs and reviews",
    },
    automationPromptMessage: {
      id: "home.useCases.skillProgressionMap.automationPrompt",
      defaultMessage:
        "From recent PRs and reviews, suggest next skills to deepen.\n\nGrounding rules:\n- Anchor each suggestion to concrete evidence (PR themes, review comments, recurring issues).\n- Avoid generic advice; make each recommendation actionable and specific.",
      description: "Automation prompt for a skill progression map",
    },
    iconName: "hierarchy",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "weekly-engineering-summary",
    promptMessage: {
      id: "home.useCases.weeklyEngineeringSummary.prompt",
      defaultMessage:
        "Synthesize this week’s PRs, rollouts, incidents, and reviews.",
      description: "Prompt for a weekly engineering summary across projects",
    },
    automationPromptMessage: {
      id: "home.useCases.weeklyEngineeringSummary.automationPrompt",
      defaultMessage:
        "Synthesize this week’s PRs, rollouts, incidents, and reviews into a weekly update.\n\nGrounding rules:\n- Do not invent events; if data is missing, say that briefly.\n- Prefer concrete references (PR #, incident ID, rollout note, file path) where available.",
      description: "Automation prompt for a weekly engineering summary",
    },
    iconName: "figure-text-document",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "performance-regression-watch",
    promptMessage: {
      id: "home.useCases.performanceRegressionWatch.prompt",
      defaultMessage: "Watch for performance regressions in recent changes.",
      description: "Prompt for a daily performance regression watch",
    },
    automationPromptMessage: {
      id: "home.useCases.performanceRegressionWatch.automationPrompt",
      defaultMessage:
        "Compare recent changes to benchmarks or traces and flag regressions early.\n\nGrounding rules:\n- Ground claims in measurable signals (benchmarks, traces, timings, flamegraphs).\n- If measurements are unavailable, state “No measurements found” rather than guessing.",
      description: "Automation prompt for a performance regression watch",
    },
    iconName: "bar-chart",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "dependency-sdk-drift",
    promptMessage: {
      id: "home.useCases.dependencySdkDrift.prompt",
      defaultMessage: "Detect dependency and SDK drift; propose alignment.",
      description: "Prompt for a daily dependency and SDK drift check",
    },
    automationPromptMessage: {
      id: "home.useCases.dependencySdkDrift.automationPrompt",
      defaultMessage:
        "Detect dependency and SDK drift and propose a minimal alignment plan.\n\nGrounding rules:\n- Cite current and target versions from the repo when possible (lockfiles, package manifests).\n- Do not guess versions; if targets are unclear, propose options and label them as suggestions.",
      description: "Automation prompt for a dependency and SDK drift check",
    },
    iconName: "checkmark-circle",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "test-gap-detection",
    promptMessage: {
      id: "home.useCases.testGapDetection.prompt",
      defaultMessage: "Find test gaps from recent changes; create draft PRs.",
      description: "Prompt for a daily test gap detection automation",
    },
    automationPromptMessage: {
      id: "home.useCases.testGapDetection.automationPrompt",
      defaultMessage:
        "Identify untested paths from recent changes; add focused tests and use $yeet for draft PRs.\n\nConstraints:\n- Keep scope tight to the changed areas; avoid broad refactors.\n- Prefer small, reliable tests that fail before and pass after.",
      description: "Automation prompt for a test gap detection run",
    },
    iconName: "puzzle",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "pre-release-check",
    promptMessage: {
      id: "home.useCases.preReleaseCheck.prompt",
      defaultMessage: "Run a pre-release checklist before tagging.",
      description: "Prompt for a pre-release checklist automation",
    },
    automationPromptMessage: {
      id: "home.useCases.preReleaseCheck.automationPrompt",
      defaultMessage:
        "Before tagging, verify changelog, migrations, feature flags, and tests.\n\nGrounding rules:\n- Report ONLY what you can confirm from the repo and CI context.\n- If a check cannot be verified, mark it explicitly as “Unknown.”",
      description: "Automation prompt for a pre-release checklist",
    },
    iconName: "checkmark-circle",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "agents-docs-sync",
    promptMessage: {
      id: "home.useCases.agentsDocsSync.prompt",
      defaultMessage: "Update AGENTS.md with new workflows and commands.",
      description: "Prompt for a weekly AGENTS.md update automation",
    },
    automationPromptMessage: {
      id: "home.useCases.agentsDocsSync.automationPrompt",
      defaultMessage:
        "Update AGENTS.md with newly discovered workflows and commands.\n\nConstraints:\n- Keep edits minimal, accurate, and grounded in repo usage.\n- Do not touch unrelated sections or auto-generated files.\n- If you are unsure, prefer adding a TODO with a short note rather than inventing.",
      description: "Automation prompt for updating AGENTS.md",
    },
    iconName: "text-document",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "weekly-pr-summary",
    promptMessage: {
      id: "home.useCases.weeklyPrSummary.prompt",
      defaultMessage: "Summarize last week's PRs by teammate and theme.",
      description: "Prompt for a weekly PR summary automation",
    },
    automationPromptMessage: {
      id: "home.useCases.weeklyPrSummary.automationPrompt",
      defaultMessage:
        "Summarize last week’s PRs by teammate and theme; highlight risks.\n\nGrounding rules:\n- Use PR numbers/titles when available.\n- Avoid speculation about impact; stick to what the PR changed.",
      description: "Automation prompt for a weekly PR summary",
    },
    iconName: "newspaper",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "issue-triage",
    promptMessage: {
      id: "home.useCases.issueTriage.prompt",
      defaultMessage: "Triage new issues and suggest owners and priority.",
      description: "Prompt for a daily issue triage automation",
    },
    automationPromptMessage: {
      id: "home.useCases.issueTriage.automationPrompt",
      defaultMessage:
        "Triage new issues; suggest owner, priority, and labels.\n\nGrounding rules:\n- Base recommendations on issue content + repo context (CODEOWNERS, touched areas, prior similar issues).\n- Do not guess owners without signals; if unclear, say “Owner: Unknown” and suggest a team instead.",
      description: "Automation prompt for issue triage",
    },
    iconName: "exclamationmark-bubble",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "ci-monitor",
    promptMessage: {
      id: "home.useCases.ciMonitor.prompt",
      defaultMessage: "Check CI failures; group likely root causes.",
      description: "Prompt for a CI monitoring automation",
    },
    automationPromptMessage: {
      id: "home.useCases.ciMonitor.automationPrompt",
      defaultMessage:
        "Check CI failures; group by likely root cause and suggest minimal fixes.\n\nGrounding rules:\n- Cite jobs, tests, errors, and log evidence.\n- Avoid overconfident root-cause claims; label uncertain items as “Suspected.”",
      description: "Automation prompt for CI monitoring",
    },
    iconName: "terminal",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "dependency-sweep",
    promptMessage: {
      id: "home.useCases.dependencySweep.prompt",
      defaultMessage: "Scan outdated dependencies and propose safe upgrades.",
      description: "Prompt for a dependency sweep automation",
    },
    automationPromptMessage: {
      id: "home.useCases.dependencySweep.automationPrompt",
      defaultMessage:
        "Scan outdated dependencies; propose safe upgrades with minimal changes.\n\nRules:\n- Prefer the smallest viable upgrade set.\n- Explicitly call out breaking-change risks and required migrations.\n- Do not propose upgrades without identifying current versions from the repo.",
      description: "Automation prompt for a dependency sweep",
    },
    iconName: "block-stack, skills",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "performance-audit",
    promptMessage: {
      id: "home.useCases.performanceAudit.prompt",
      defaultMessage: "Audit performance regressions; propose fixes.",
      description: "Prompt for a weekly performance audit automation",
    },
    automationPromptMessage: {
      id: "home.useCases.performanceAudit.automationPrompt",
      defaultMessage:
        "Audit performance regressions and propose highest-leverage fixes.\n\nGrounding rules:\n- Ground claims in measurements/traces when available.\n- If evidence is missing, state uncertainty briefly and suggest what to measure next.",
      description: "Automation prompt for a performance audit",
    },
    iconName: "compass",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "changelog-update",
    promptMessage: {
      id: "home.useCases.changelogUpdate.prompt",
      defaultMessage: "Update the changelog with this week's highlights.",
      description: "Prompt for a weekly changelog update automation",
    },
    automationPromptMessage: {
      id: "home.useCases.changelogUpdate.automationPrompt",
      defaultMessage:
        "Update the changelog with this week’s highlights and key PR links.\n\nConstraints:\n- Only include items supported by repo history.\n- Keep structure simple and consistent with existing changelog format.",
      description: "Automation prompt for updating the changelog",
    },
    iconName: "pencil",
    mode: "worktree",
    isAutomation: true,
  },
  {
    id: "investor-video",
    promptMessage: {
      id: "home.useCases.investorVideo.prompt",
      defaultMessage:
        "Analyze my codebase and create an investor/influencer-style ad concept for it using $sora.\n\nConstraints:\n- Do not fabricate product claims. If the repo doesn’t support a claim, phrase it as a possibility or omit it.\n- Keep it punchy: one clear narrative and one clear CTA.\n\nOutput:\n- A 20–45 second script (spoken narration + on-screen text cues).\n- A shot list (5–8 shots) with visuals, motion, and what’s on screen.\n- A short set of safe claims grounded in repo evidence (features, differentiators) + assumptions labeled.",
      description: "Prompt for creating an investor-facing video",
    },
    iconName: "file-video",
    mode: "local",
  },
  {
    id: "gh-fix-ci",
    promptMessage: {
      id: "home.useCases.ghFixCi.prompt",
      defaultMessage:
        "$gh-fix-ci iterate on my PR until CI is green.\n\nConstraints:\n- Make the smallest set of changes required to fix failures.\n- Prefer targeted fixes over refactors.\n\nOutput:\n- ≤5 bullets: Failures observed, Root cause (with evidence), Patch summary, Tests/CI rerun results, Remaining risks.",
      description: "Prompt for using the gh-fix-ci skill",
    },
    iconName: "terminal",
    mode: "worktree",
    skillName: "gh-fix-ci",
  },
  {
    id: "sentry-monitor",
    promptMessage: {
      id: "home.useCases.sentryMonitor.prompt",
      defaultMessage:
        "Monitor incoming bug reports on $sentry and attempt fixes.\n\nRules:\n- Triage by severity and frequency.\n- Do not guess root cause without stack traces/log evidence.\n- Prefer minimal fixes and add regression tests when possible.\n\nOutput:\n- ≤5 bullets: Top issues, Evidence (error + path), Proposed fix, Risk, Next steps.",
      description: "Prompt for monitoring Sentry bug reports",
    },
    iconName: "sentry-logo",
    mode: "worktree",
    skillName: "sentry",
  },
  {
    id: "bedtime-story-pdf",
    promptMessage: {
      id: "home.useCases.bedtimeStoryPdf.prompt",
      defaultMessage:
        "Generate a $pdf bedtime story children’s book.\n\nRequirements:\n- Target age: ~4–7.\n- Warm, gentle tone; simple vocabulary; clear moral.\n- 10–14 short pages with one scene per page.\n\nOutput:\n- A page-by-page layout with: Page title, 2–4 sentences of story text, and a simple illustration prompt.\n- Export as a single $pdf and include the filename/path.",
      description: "Prompt for generating a bedtime story PDF",
    },
    iconName: "heart-bubble",
    mode: "local",
  },
  {
    id: "sales-call-features",
    promptMessage: {
      id: "home.useCases.salesCallFeatures.prompt",
      defaultMessage:
        "Analyze a sales call and implement the highest-impact missing features.\n\nMethod:\n- Extract customer pain points and explicit feature requests.\n- Map them to the current product (repo evidence), then select 1–2 features with best ROI.\n- Implement minimal end-to-end slices with clear acceptance criteria.\n\nConstraints:\n- No broad product rewrites.\n- If the call notes are ambiguous, present 2–3 interpretations with labeled assumptions and pick the simplest build.\n\nOutput:\n- ≤5 bullets: Requests, Chosen features, Implementation plan, Files changed, How to verify.",
      description: "Prompt for analyzing a sales call",
    },
    iconName: "briefcase",
    mode: "worktree",
  },
  {
    id: "top-customers-spreadsheet",
    promptMessage: {
      id: "home.useCases.topCustomersSpreadsheet.prompt",
      defaultMessage:
        "Query my database and create a $spreadsheet with my top 10 customers.\n\nRequirements:\n- Define “top” using the most reliable available metric (e.g., revenue, ARR, usage), and state which one you used.\n- Include consistent columns (name, metric, period, segment, notes) and clear units.\n\nConstraints:\n- Do not guess missing values; leave blanks or mark as N/A.\n\nOutput:\n- Generate the $spreadsheet and include the filename/path.\n- Add a short note explaining the ranking logic and any data caveats.",
      description: "Prompt for creating a top customers spreadsheet",
    },
    iconName: "xls-document, excel",
    mode: "local",
  },
  {
    id: "architecture-failure-modes",
    promptMessage: {
      id: "home.useCases.architectureFailureModes.prompt",
      defaultMessage:
        "Explain the top failure modes of my application's architecture.\n\nApproach:\n- Derive the architecture from repo evidence (services, DBs, queues, network calls, critical paths).\n- Identify realistic failure modes (availability, data loss, latency, scaling, consistency, security, dependency outages).\n\nOutput:\n- 1 short overview paragraph.\n- Then ≤5 bullets: Failure mode, Trigger, Symptoms, Detection, Mitigation.\n- If key architecture details are missing, state what you inferred vs. what you confirmed.",
      description: "Prompt for explaining architecture failure modes",
    },
    iconName: "hierarchy",
    mode: "local",
  },
  {
    id: "architecture-bedtime-story",
    promptMessage: {
      id: "home.useCases.architectureBedtimeStory.prompt",
      defaultMessage:
        "Write a bedtime story for a 5-year-old about my system's architecture.\n\nConstraints:\n- Keep it comforting and simple.\n- Use friendly analogies for core components (e.g., “mail carrier” for queues) grounded in the app’s real pieces.\n\nOutput:\n- 8–12 short paragraphs.\n- A tiny glossary at the end mapping each character to a real system component (2–6 entries).",
      description: "Prompt for a bedtime story about system architecture",
    },
    iconName: "book-open",
    mode: "local",
  },
];

export function getHomeAutomationUseCases(): Array<HomeUseCase> {
  return HOME_USE_CASES.filter((useCase) => useCase.isAutomation === true);
}
