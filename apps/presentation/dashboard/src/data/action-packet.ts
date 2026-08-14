export type ProjectAssetSource = "project_asset" | "legacy_raw_fallback";

export type ActionPacketInput = {
  goalId: string;
  title: string;
  summary: string;
  userTodoText?: string | null;
  agentTodoText?: string | null;
  todoBlocksGate?: boolean;
  operatorQuestion?: string | null;
  suggestedReply: string;
  gateFallbackDecision: string;
  boundary: string;
  durableRecordRule?: string | null;
  safePathLabel: string;
  command?: string | null;
  quotaShortLine?: string | null;
  authorityShortLine?: string | null;
  projectOwner?: string | null;
  projectGate?: string | null;
  projectNextAction?: string | null;
  projectStopCondition?: string | null;
  projectAssetSource?: ProjectAssetSource | null;
  handoffReadinessLine?: string | null;
};

export type ApprovedAgentHandoffInput = {
  goalId: string;
  command: string;
  agentTodoText?: string | null;
  projectNextAction?: string | null;
  projectStopCondition?: string | null;
  projectAssetSource?: ProjectAssetSource | null;
};

export function buildApprovedAgentHandoff(input: ApprovedAgentHandoffInput) {
  const command = input.command.replace(/\s+/g, " ").trim();
  const isFallback = input.projectAssetSource === "legacy_raw_fallback";
  const nextLabel = isFallback ? "Fallback Next" : "Project Asset Next";
  const stopLabel = isFallback ? "Fallback Stop" : "Project Asset Stop";
  return [
    `Goal check: this handoff applies only to goal_id=\`${input.goalId}\`. Stop and report a goal mismatch if it differs from the active goal or registry entry.`,
    "Context rule: this handoff carries only the minimum current instructions. Do not rebuild current state from old chats or packets. Read the current active state, status, history, and command output when more context is needed.",
    isFallback ? "Project Asset Source: legacy/raw fallback; project_asset was not provided, so Next and Stop come from a degraded raw-status interpretation." : null,
    input.projectNextAction ? `${nextLabel}: ${compactPacketText(input.projectNextAction, 180)}` : null,
    input.projectStopCondition ? `${stopLabel}: ${compactPacketText(input.projectStopCondition, 180)}` : null,
    input.agentTodoText ? `Agent Todo: ${compactPacketText(input.agentTodoText, 220)}` : null,
    "Forwarding condition: the operator gate is recorded as approved; this handoff is only for passing the approved agent_command to the project Agent.",
    "Execution boundary: run only the command below. It is read-only/dry-run execution, not write authority, global control, or production-action authorization.",
    "Stop condition: stop and report the result in English if the command fails or requires writes, a run-history append, a production action, or higher authority.",
    "",
    "```bash",
    command,
    "```",
  ].filter(Boolean).join("\n");
}

export function buildActionPacket(input: ActionPacketInput) {
  const isFallback = input.projectAssetSource === "legacy_raw_fallback";
  const needsTodoFirst = Boolean(input.userTodoText && input.todoBlocksGate);
  const userActionLines = input.userTodoText
    ? [
      `Todo: ${compactPacketText(input.userTodoText, 180)}${needsTodoFirst ? " (resolve or defer it before judging the gate)" : ""}`,
    ]
    : [
      "Todo: none",
    ];
  const gateLines = input.operatorQuestion
    ? [
      `Gate: ${compactPacketText(input.operatorQuestion, 160)}`,
      `Suggestion: ${needsTodoFirst ? `Confirm the Todo first; then: ${input.suggestedReply}` : input.suggestedReply}`,
    ]
    : [
      `Gate: none; Suggestion: ${input.gateFallbackDecision}`,
    ];
  const stateLine = [
    compactPacketText(input.summary, 110),
  ].filter(Boolean).join("; ");
  const compactContextLines = [
    input.quotaShortLine ? `Quota: ${compactPacketText(input.quotaShortLine, 80)}` : null,
    input.authorityShortLine ? `Authority: ${compactPacketText(input.authorityShortLine, 110)}` : null,
  ];
  const projectAssetLines = [
    isFallback
      ? "Project Asset: legacy/raw fallback; project_asset was not provided, so Owner, Gate, and Stop are unverified."
      : input.projectOwner || input.projectGate
      ? `Project Asset: Owner=${compactPacketText(input.projectOwner ?? "unknown", 70)}; Gate=${compactPacketText(input.projectGate ?? "unknown", 70)}`
      : null,
    input.projectNextAction ? `${isFallback ? "Fallback Next" : "Next"}: ${compactPacketText(input.projectNextAction, 160)}` : null,
    input.projectStopCondition ? `${isFallback ? "Fallback Stop" : "Stop"}: ${compactPacketText(input.projectStopCondition, 160)}` : null,
    input.handoffReadinessLine ? `Handoff: ${compactPacketText(input.handoffReadinessLine, 140)}` : null,
  ];

  return [
    "[GH Packet]",
    `Goal: ${input.goalId}`,
    `State: ${stateLine}`,
    ...projectAssetLines,
    ...compactContextLines,
    "",
    "[User / Gate]",
    ...userActionLines,
    ...gateLines,
    `Boundary: ${compactPacketText(input.boundary, 110)}`,
    input.durableRecordRule ? `Record: ${compactPacketText(input.durableRecordRule, 180)}` : null,
    "",
    "[Project Agent]",
    input.agentTodoText ? `Todo: ${compactPacketText(input.agentTodoText, 180)}` : null,
    `Path: ${input.safePathLabel}`,
    "Context: trust only the current state, status, history, and command output; do not reconstruct stale state.",
    input.command ? `Command: ${input.command.replace(/\s+/g, " ").trim()}` : null,
    "Report: files / validation / next; stop if authorization is required.",
  ].filter(Boolean).join("\n");
}

export function compactPacketText(value: string, maxLength = 260) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1)}…`;
}
