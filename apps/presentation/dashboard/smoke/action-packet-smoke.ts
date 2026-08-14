import { buildActionPacket, buildApprovedAgentHandoff } from "../src/data/action-packet.js";
// @ts-expect-error The smoke compiler intentionally runs without @types/node.
import { readFileSync } from "node:fs";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const packet = buildActionPacket({
  goalId: "showcase-safe-route",
  title: "Review or authorize",
  summary: "production still blocked; owner/SOP snapshot has 9 blockers, but only two user todos are open",
  userTodoText: "Read the public decision memo section 8 first. Focus on the current conclusion and the config diff anchors table.",
  agentTodoText: "Run the read-only map dry-run after the owner todo is resolved; stop before writes.",
  todoBlocksGate: true,
  operatorQuestion: "Do you approve continuing the showcase safe route after the owner/SOP review?",
  suggestedReply: "Approve the safe-local/offline route, or decline with a one-sentence reason.",
  gateFallbackDecision: "Continue the safe-local/offline route without authorizing writes or production actions.",
  boundary: "Do not write configuration, upsert metadata, create workflows, or change production state.",
  durableRecordRule: "Record rule: preview with the operator-gate dry-run; remove --dry-run only for an approved write.",
  safePathLabel: "Read-only map dry-run",
  command: "loopx read-only-map --goal-id showcase-safe-route --dry-run",
  quotaShortLine: "Operator gate; 0/1440 slots",
  authorityShortLine: "default entries 10/10; topic 10; materials 6; owner review 1; stale 1; risk medium",
  projectOwner: "user_or_controller",
  projectGate: "owner_sop_review",
  projectNextAction: "Project asset says the owner/SOP review is the current authority.",
  projectStopCondition: "Stop before write-control or production mutation.",
  projectAssetSource: "project_asset",
  handoffReadinessLine: "ready; codex_ready=true; source=project_asset; quota=eligible; failed=none",
});

assert(packet.includes("[GH Packet]"), "missing packet title");
assert(packet.includes("[User / Gate]"), "missing user action section");
assert(packet.includes("Quota: Operator gate; 0/1440 slots"), "missing compact quota context");
assert(packet.includes("Authority: default entries 10/10; topic 10; materials 6; owner review 1; stale 1; risk medium"), "missing compact authority/material context");
assert(packet.includes("Project Asset: Owner=user_or_controller; Gate=owner_sop_review"), "missing project-asset owner/gate");
assert(packet.includes("Next: Project asset says the owner/SOP review is the current authority."), "missing project-asset next action");
assert(packet.includes("Stop: Stop before write-control or production mutation."), "missing project-asset stop condition");
assert(packet.includes("Handoff: ready; codex_ready=true; source=project_asset; quota=eligible; failed=none"), "missing handoff readiness");
assert(packet.includes("Todo: Read the public decision memo section 8 first."), "missing first user todo");
assert(packet.includes("resolve or defer it before judging the gate"), "missing todo-before-gate cue");
assert(packet.includes("Gate: Do you approve continuing the showcase safe route"), "missing gate question");
assert(packet.includes("[Project Agent]"), "missing project-agent handoff section");
assert(packet.includes("Todo: Run the read-only map dry-run after the owner todo is resolved; stop before writes."), "missing first agent todo");
assert(packet.includes("Path: Read-only map dry-run"), "missing safe path");
assert(packet.includes("Context: trust only the current state, status, history, and command output"), "missing agent context rule");
assert(packet.includes("Do not write configuration") || packet.includes("without authorizing writes"), "missing safety boundary");
assert(packet.length > 600 && packet.length < 1800, `unexpected packet length: ${packet.length}`);
assert(
  packet.indexOf("[User / Gate]") < packet.indexOf("[Project Agent]"),
  "user action section must precede project-agent handoff",
);

const approvedHandoff = buildApprovedAgentHandoff({
  goalId: "planned-main-control",
  command: "loopx read-only-map --goal-id planned-main-control --dry-run --approved",
  agentTodoText: "Run the read-only map dry-run after owner todo resolution.",
  projectNextAction: "Approved project asset next action.",
  projectStopCondition: "Stop if execution needs write authority.",
  projectAssetSource: "project_asset",
});

assert(approvedHandoff.includes("Goal check: this handoff applies only to goal_id=`planned-main-control`"), "missing target guard");
assert(approvedHandoff.includes("Context rule: this handoff carries only the minimum current instructions"), "missing compact context rule");
assert(approvedHandoff.includes("Project Asset Next: Approved project asset next action."), "missing approved project-asset next action");
assert(approvedHandoff.includes("Project Asset Stop: Stop if execution needs write authority."), "missing approved project-asset stop condition");
assert(approvedHandoff.includes("Agent Todo: Run the read-only map dry-run after owner todo resolution."), "missing approved agent todo");
assert(approvedHandoff.includes("operator gate is recorded as approved"), "missing approved forwarding condition");
assert(approvedHandoff.includes("run only the command below"), "missing execution boundary");
assert(approvedHandoff.includes("loopx read-only-map --goal-id planned-main-control --dry-run --approved"), "missing approved command");
assert(!approvedHandoff.includes("[GH Packet]"), "handoff-only payload must not include packet wrapper");
assert(!approvedHandoff.includes("[User / Gate]"), "handoff-only payload must not include user gate wrapper");
assert(!approvedHandoff.includes("Suggestion:"), "handoff-only payload must not include human suggestion text");

const legacyFallbackPacket = buildActionPacket({
  goalId: "legacy-status-only",
  title: "Legacy status",
  summary: "raw status says continue but no project_asset is present",
  userTodoText: null,
  agentTodoText: "Inspect status only; do not treat raw fields as owner-approved state.",
  todoBlocksGate: false,
  operatorQuestion: null,
  suggestedReply: "Keep status inspection; resume delivery after project_asset is available.",
  gateFallbackDecision: "Keep status inspection; resume delivery after project_asset is available.",
  boundary: "This is a legacy/raw fallback; do not infer owner, gate, or stop condition authority.",
  safePathLabel: "Legacy status inspection",
  command: "loopx diagnose --goal-id legacy-status-only --limit 20",
  projectNextAction: "Continue from raw status field.",
  projectStopCondition: "Stop before any delivery claim.",
  projectAssetSource: "legacy_raw_fallback",
});

assert(legacyFallbackPacket.includes("Project Asset: legacy/raw fallback"), "missing legacy/raw fallback source");
assert(legacyFallbackPacket.includes("Owner, Gate, and Stop are unverified"), "missing fallback untrusted-owner cue");
assert(legacyFallbackPacket.includes("Fallback Next: Continue from raw status field."), "missing fallback next label");
assert(legacyFallbackPacket.includes("Fallback Stop: Stop before any delivery claim."), "missing fallback stop label");
assert(!legacyFallbackPacket.includes("Project Asset: Owner="), "fallback packet must not claim owner/gate authority");

const focusWaitPacket = buildActionPacket({
  goalId: "focus-wait-owner-blocker",
  title: "Focus wait owner blocker",
  summary: "quiet until owner evidence, a clean baseline, or external eval changes",
  userTodoText: "Provide new owner evidence, a clean baseline, or external eval before delivery resumes.",
  agentTodoText: "Inspect current state, status, and history only; keep focus_wait and report what is still pending.",
  todoBlocksGate: false,
  operatorQuestion: null,
  suggestedReply: "Keep focus wait; resume delivery only after new owner evidence, a clean baseline, or an external evaluation.",
  gateFallbackDecision: "Keep focus wait; resume delivery only after new owner evidence, a clean baseline, or an external evaluation.",
  boundary: "This is not delivery approval; inspect status and history only, without writes, reward appends, or production actions.",
  safePathLabel: "Status/history inspection only",
  command: "loopx --registry ./examples/registry.example.json --runtime-root ./tmp/runtime diagnose --goal-id focus-wait-owner-blocker --limit 20",
});

assert(focusWaitPacket.includes("Goal: focus-wait-owner-blocker"), "missing focus-wait goal id");
assert(focusWaitPacket.includes("Todo: Provide new owner evidence"), "missing owner blocker unlock condition");
assert(focusWaitPacket.includes("Gate: none; Suggestion: Keep focus wait"), "missing focus-wait fallback decision");
assert(focusWaitPacket.includes("Status/history inspection only"), "missing status/history-only safe path");
assert(focusWaitPacket.includes("keep focus_wait"), "missing agent focus-wait boundary");
assert(!focusWaitPacket.includes("operator-gate"), "focus-wait packet must not draft an operator gate");
assert(!focusWaitPacket.includes("read-only-map"), "focus-wait packet must not expose a delivery map command");

const platformMigrationNoEvidencePacket = buildActionPacket({
  goalId: "platform-migration-material-registry",
  title: "Let Codex continue",
  summary: "Refreshed public-safe no-evidence projection gives Codex a usable next action.",
  userTodoText: "Confirm whether owner review is fresh enough to resume delivery.",
  agentTodoText: "Run read-only map and report material freshness without internal links.",
  todoBlocksGate: false,
  operatorQuestion: null,
  suggestedReply: "Continue the no-evidence projection without access to private evidence, writes, or production actions.",
  gateFallbackDecision: "Continue the no-evidence projection without access to private evidence, writes, or production actions.",
  boundary: "Use only sanitized status/history/material counts; do not read private evidence, internal links, raw paths, or production state.",
  durableRecordRule: null,
  safePathLabel: "No-evidence status/packet sanity",
  command: "loopx diagnose --goal-id platform-migration-material-registry --limit 20",
  quotaShortLine: "Eligible; 0/1440 slots",
  authorityShortLine: "entries 0/3; topics 3; materials 6; repos 2; owner review 1; stale 1; risk medium",
  projectOwner: "codex",
  projectGate: "none",
  projectNextAction: "Refresh the public-safe material registry summary.",
  projectStopCondition: "stop if the next action needs reward, gate approval, write control, or production access",
  projectAssetSource: "project_asset",
  handoffReadinessLine: "ready; codex_ready=true; source=project_asset; quota=eligible; failed=none",
});

assert(platformMigrationNoEvidencePacket.includes("Goal: platform-migration-material-registry"), "missing platform migration target");
assert(platformMigrationNoEvidencePacket.includes("Project Asset: Owner=codex; Gate=none"), "missing platform project asset owner/gate");
assert(platformMigrationNoEvidencePacket.includes("Next: Refresh the public-safe material registry summary."), "missing platform next action");
assert(platformMigrationNoEvidencePacket.includes("Stop: stop if the next action needs reward"), "missing platform stop condition");
assert(platformMigrationNoEvidencePacket.includes("Handoff: ready; codex_ready=true; source=project_asset; quota=eligible; failed=none"), "missing platform handoff readiness");
assert(platformMigrationNoEvidencePacket.includes("Quota: Eligible; 0/1440 slots"), "missing platform quota context");
assert(platformMigrationNoEvidencePacket.includes("Authority: entries 0/3; topics 3; materials 6; repos 2; owner review 1; stale 1; risk medium"), "missing platform material context");
assert(platformMigrationNoEvidencePacket.includes("Todo: Confirm whether owner review is fresh enough to resume delivery."), "missing platform user todo");
assert(platformMigrationNoEvidencePacket.includes("Todo: Run read-only map and report material freshness without internal links."), "missing platform agent todo");
assert(platformMigrationNoEvidencePacket.includes("Gate: none; Suggestion: Continue the no-evidence projection"), "missing no-evidence non-gate cue");
assert(platformMigrationNoEvidencePacket.includes("No-evidence status/packet sanity"), "missing platform safe path");
assert(!platformMigrationNoEvidencePacket.includes("legacy/raw fallback"), "project-asset-backed platform packet must not fall back to raw status");
assert(platformMigrationNoEvidencePacket.includes("Gate: none"), "platform safety text must remain non-gated");

const dashboardPageSource = readFileSync("src/views/dashboard-page.tsx", "utf8");
const firstScreenRequiredSource = [
  "const quota = projectAsset?.quota ?? row.queueItem?.quota ?? row.goal.quota",
  "const nextAction = projectAsset?.next_action ?? decision.action",
  "const stopCondition = projectAsset?.stop_condition ?? handoffCondition ?? decision.action",
  "const handoffReadiness = row.queueItem?.handoff_readiness",
  "buildHandoffReadinessView(item.handoffReadiness)",
  "function HandoffReadinessPanel({",
  "data-testid={testId}",
  "testId=\"selected-queue-handoff-readiness\"",
  "goalId={queueItem.goal_id}",
  "const userTodos = todosFromProjectAssetSummary(projectAsset?.user_todos",
  "const agentTodos = todosFromProjectAssetSummary(projectAsset?.agent_todos",
  "<Badge variant=\"neutral\">Project asset</Badge>",
  "Handoff readiness:",
  "Handoff state:",
  "Post-handoff run:",
  "Failed checks:",
  "Owner/Gate/Stop are not project_asset-backed; below uses raw status fallback.",
  "<span className=\"font-medium\">{buildQuotaView(item.quota)?.shortLine}</span>",
];
for (const snippet of firstScreenRequiredSource) {
  assert(dashboardPageSource.includes(snippet), `React User Actions source drifted: ${snippet}`);
}

console.log(`action-packet smoke ok (${packet.length} chars, handoff ${approvedHandoff.length} chars, legacy ${legacyFallbackPacket.length} chars, focus ${focusWaitPacket.length} chars)`);
