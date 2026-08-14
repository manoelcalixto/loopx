#!/usr/bin/env python3
"""Smoke-test the dashboard operator action packet contract.

The dashboard owns the operator-facing packet text. This smoke keeps a
public-safe fixture for the planned opt-in path and checks the source keeps the
copyable packet short and human-facing. The longer local gate dry-run remains
available as an advanced/debug path, not as the default copied packet.
"""

from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DASHBOARD_PAGE = REPO_ROOT / "apps/presentation/dashboard/src/views/dashboard-page.tsx"
ACTION_PACKET = REPO_ROOT / "apps/presentation/dashboard/src/data/action-packet.ts"
STATUS_CONTRACT = REPO_ROOT / "docs/status-data-contract.md"


def command_block(command: str) -> str:
    return "\n".join(["```bash", command, "```"])


def multiline_command(*lines: str) -> str:
    return "\n".join(lines)


def assert_order(text: str, labels: list[str]) -> None:
    positions = [text.index(label) for label in labels]
    assert positions == sorted(positions), (labels, positions, text)


def source_between(source: str, start: str, end: str) -> str:
    start_index = source.index(start)
    end_index = source.index(end, start_index)
    return source[start_index:end_index]


def build_sanitized_controller_packet() -> str:
    goal_id = "planned-main-control"
    project_agent_command = multiline_command(
        "loopx \\",
        "  --registry ./examples/registry.example.json \\",
        "  --runtime-root ./tmp/runtime \\",
        "  read-only-map \\",
        f"  --goal-id {goal_id} \\",
        "  --dry-run",
    )
    return "\n".join(
        [
            "[GH Packet]",
            f"Goal: {goal_id}",
            "State: planned opt-in review fixture",
            "",
            "[User / Gate]",
            "Todo: none",
            "Gate: Allow the target project to enter read-only/controller opt-in?",
            f"Suggestion: Approve a read-only map dry-run for {goal_id} first / do not approve yet, plus one short reason.",
            "Boundary: This authorizes only a dry-run preview by the project Agent. It does not write an operator gate, run history, write control, experiment control, or production state.",
            "Record: dry-run before persisting.",
            "",
            "[Project Agent]",
            "Todo: Run the read-only map dry-run after the owner Todo is resolved.",
            "Path: Read-only map dry-run",
            f"Command: {project_agent_command.replace(chr(10), ' ')}",
            "Report: files / validation / next; stop if authorization is required.",
        ]
    )


def build_sanitized_controller_packet_with_user_todo() -> str:
    goal_id = "planned-main-control"
    project_agent_command = multiline_command(
        "loopx \\",
        "  --registry ./examples/registry.example.json \\",
        "  --runtime-root ./tmp/runtime \\",
        "  read-only-map \\",
        f"  --goal-id {goal_id} \\",
        "  --dry-run",
    )
    return "\n".join(
        [
            "[GH Packet]",
            f"Goal: {goal_id}",
            "State: planned opt-in review fixture",
            "",
            "[User / Gate]",
            "Todo: Read the owner review worksheet first. (resolve or defer it before judging the gate)",
            "Gate: Allow the target project to enter read-only/controller opt-in?",
            f"Suggestion: Confirm the Todo first; then: Approve a read-only map dry-run for {goal_id} first / do not approve yet, plus one short reason.",
            "Boundary: This authorizes only a dry-run preview by the project Agent. It does not write an operator gate, run history, write control, experiment control, or production state.",
            "Record: dry-run before persisting.",
            "",
            "[Project Agent]",
            "Path: Read-only map dry-run",
            f"Command: {project_agent_command.replace(chr(10), ' ')}",
            "Report: files / validation / next; stop if authorization is required.",
        ]
    )


def build_sanitized_approved_command_packet() -> str:
    goal_id = "planned-main-control"
    approved_command = "loopx read-only-map --goal-id planned-main-control --dry-run --approved"
    return "\n".join(
        [
            "[GH Packet]",
            f"Goal: {goal_id}",
            "State: operator gate approved fixture",
            "",
            "[User / Gate]",
            "Todo: none",
            "Gate: none; Suggestion: forward directly to the claimed project Agent without adding write authority, global control, or production-action authorization.",
            "Boundary: run only the approved read-only/dry-run agent_command. The project Agent must stop again if writes or higher authority are required.",
            "",
            "[Project Agent]",
            "Path: Approved agent command",
            f"Command: {approved_command}",
            "Report: files / validation / next; stop if authorization is required.",
        ]
    )


def build_sanitized_focus_wait_packet() -> str:
    goal_id = "focus-wait-owner-blocker"
    status_command = (
        "loopx --registry ./examples/registry.example.json "
        "--runtime-root ./tmp/runtime diagnose --goal-id focus-wait-owner-blocker --limit 20"
    )
    return "\n".join(
        [
            "[GH Packet]",
            f"Goal: {goal_id}",
            "State: quiet until owner evidence, a clean baseline, or external eval changes",
            "",
            "[User / Gate]",
            "Todo: Provide new owner evidence, a clean baseline, or external eval before delivery resumes.",
            "Gate: none; Suggestion: keep focus wait and resume delivery only after new owner evidence, a clean baseline, or an external evaluation.",
            "Boundary: this is not delivery approval; the project Agent may inspect status and history only, without delivery-path execution, writes, reward appends, or production actions.",
            "",
            "[Project Agent]",
            "Todo: inspect current state, status, and history only; keep focus_wait and report what is still pending.",
            "Path: Status/history inspection only",
            f"Command: {status_command}",
            "Report: files / validation / next; stop if authorization is required.",
        ]
    )


def main() -> int:
    source = DASHBOARD_PAGE.read_text(encoding="utf-8")
    action_packet_source = ACTION_PACKET.read_text(encoding="utf-8")
    contract = STATUS_CONTRACT.read_text(encoding="utf-8")
    controller_contract = source_between(
        contract,
        "For controller opt-in packets",
        "`status=read_only_project_map`",
    )
    assert "the dashboard/operator view owns the human decision" in contract
    assert "the project-agent command is the after-approval dry-run path" in contract
    assert "Copy and send this directly to the corresponding project Agent; the user adds one judgment line." not in source
    assert "[GH Packet]" in action_packet_source
    assert "[User / Gate]" in action_packet_source
    assert "Copy action packet for ${item.goalId}" in source
    assert "stop if authorization is required" in action_packet_source
    assert "input.command ? `Command:" in action_packet_source
    assert_order(
        controller_contract,
        [
            "operator question must appear before any",
            "local gate preview must appear before any",
            "project-agent command",
        ],
    )

    packet_builder = source_between(source, "function buildHumanFriendlyActionPacket", "function readinessVariant")
    assert "return buildActionPacket({" in packet_builder
    assert "const approvedAgentCommand = item.kind === \"codex\" && Boolean(item.agentCommand);" in packet_builder
    assert "const isFocusWait = isFocusWaitQuota(item.quota);" in packet_builder
    assert "const agentTodo = firstOpenTodo(item.agentTodos);" in packet_builder
    assert "agentTodoText: agentTodo?.text" in packet_builder
    assert "projectAssetSource: item.projectAssetSource" in packet_builder
    assert "Status/history inspection only" in packet_builder
    assert "keep focus_wait and report what is still pending" in packet_builder
    assert "without delivery-path execution, writes, reward appends, or production actions" in packet_builder
    assert "Forward directly to the assigned project agent; this grants no additional write access, global control, or production authorization." in packet_builder
    assert "Execute only the approved read-only or dry-run agent command; the project agent must stop again before any write or higher-privilege action." in packet_builder
    assert "Approved agent command" in packet_builder
    assert_order(action_packet_source, ["[GH Packet]", "[User / Gate]", "[Project Agent]"])
    assert "operatorGateDraftCommand" not in packet_builder
    assert "Todo:" in action_packet_source
    assert "input.agentTodoText ? `Todo:" in action_packet_source
    assert "Gate:" in action_packet_source
    assert "Confirm the Todo first" in action_packet_source

    controller_prompt = source_between(source, "if (kind === \"controller\")", "if (kind === \"codex\")")
    assert "Allow the target project to enter read-only/controller opt-in?" in controller_prompt
    assert "Approve a read-only map dry-run first / do not approve yet, plus one short reason." in controller_prompt
    assert "does not write an operator gate, run history, write control, experiment control, or production state" in controller_prompt

    controller_reply = source_between(source, "function controllerReplyLine", "function suggestedDecisionLine")
    assert "Approve a read-only map dry-run for ${goalId} first / do not approve yet, plus one short reason." in controller_reply
    assert "Approve a read-only map dry-run for ${goalId}; do not authorize writes or production actions" in controller_reply
    record_rule = source_between(source, "function durableOperatorGateRecordRule", "function suggestedDecisionLine")
    assert "Record rule: preview this judgment with the local operator-gate dry-run" in record_rule
    assert "Remove --dry-run only after write confirmation" in record_rule
    assert "operator_gate_resume_contract_v0" in record_rule
    assert "rebases current authoritative state only at this decision point" in record_rule
    assert "does not roll back or restore the repository" in record_rule
    assert "Use reject/defer with a public-safe reason" in record_rule
    assert "durableOperatorGateRecordRule(item.kind)" in packet_builder

    gate_builder = source_between(source, "function buildOperatorGateDryRunCommand", "function buildOperatorDecision")
    assert "operator-gate" in gate_builder
    assert "--decision approve" in gate_builder
    assert "controllerApprovalReason(goalId)" in gate_builder
    assert "--dry-run" in gate_builder

    read_only_builder = source_between(source, "function buildReadOnlyMapDryRunCommand", "function buildRefreshStateDryRunCommand")
    assert "read-only-map" in read_only_builder
    assert "--dry-run" in read_only_builder

    quota_state_labels = source_between(source, "const quotaStateLabel", "function quotaVariant")
    assert "Focus wait" in quota_state_labels
    assert "waiting for owner evidence, a clean baseline, or an external evaluation" in quota_state_labels
    assert "Throttled" in quota_state_labels
    assert "the quota for this window is exhausted" in quota_state_labels

    user_action_builder = source_between(source, "function buildUserActionSummaryItems", "function UserActionSummary")
    assert "const projectAsset = row.queueItem?.project_asset;" in user_action_builder
    assert 'const projectAssetSource: ProjectAssetSource = projectAsset ? "project_asset" : "legacy_raw_fallback";' in user_action_builder
    assert "const quota = projectAsset?.quota ?? row.queueItem?.quota ?? row.goal.quota;" in user_action_builder
    assert "todosFromProjectAssetSummary(projectAsset?.user_todos" in user_action_builder
    assert "const nextAction = projectAsset?.next_action ?? decision.action;" in user_action_builder
    assert "const stopCondition = projectAsset?.stop_condition ?? handoffCondition ?? decision.action;" in user_action_builder
    assert "const latestValidation = projectAsset?.latest_validation;" in user_action_builder
    assert "projectAssetSource," in user_action_builder
    assert "const quotaState = quota?.state ?? \"waiting\";" in user_action_builder
    assert "decision.waitingOn === \"codex\" && quotaState === \"focus_wait\"" in user_action_builder
    assert "Waiting for owner evidence, a clean baseline, or external eval before delivery resumes." in user_action_builder
    assert "Status/history inspection only" in user_action_builder
    assert 'decision.waitingOn === "codex" && quotaState === "throttled"' in user_action_builder
    assert_order(
        user_action_builder,
        [
            "if (decision.waitingOn === \"external_evidence\")",
            "decision.waitingOn === \"codex\" && quotaState === \"focus_wait\"",
            'decision.waitingOn === "codex" && quotaState === "throttled"',
            "if (decision.waitingOn === \"codex\")",
        ],
    )
    user_action_surface = source_between(source, "function UserActionSummary", "function buildOperatorActionBridge")
    user_action_summary = source_between(source, "function UserActionSummary", "function OperatorDecisionPanel")
    assert "buildHumanFriendlyActionPacket({ item, registry, runtimeRoot })" in user_action_summary
    assert "aria-label={`Copy action packet for ${item.goalId}`}" in user_action_summary
    assert "Copy Focus Packet" in user_action_summary
    assert "const primaryOperatorGate" not in user_action_summary
    assert "Needs decision" not in user_action_summary
    assert "blocksGate={Boolean(item.operatorQuestion && firstOpenTodo(item.userTodos))}" in user_action_summary
    assert "focusWait={isFocusWaitQuota(item.quota)}" in user_action_summary
    assert "formatLatestValidation(item.latestValidation)" in user_action_summary
    assert "const agentTodo = firstOpenTodo(item.agentTodos);" in user_action_summary
    assert "Agent todo" in user_action_summary
    assert "Resolve user Todo first" in source
    assert "Complete or explicitly defer this user Todo before approving the gate below." in source
    assert "Focus wait owner blocker" in source
    assert "Waiting for owner evidence, a clean baseline, or external eval before delivery resumes." in source

    packet = build_sanitized_controller_packet()
    assert_order(
        packet,
        [
            "[User / Gate]",
            "Gate: Allow the target project to enter read-only/controller opt-in?",
            "Suggestion: Approve a read-only map dry-run for planned-main-control first / do not approve yet, plus one short reason.",
            "Record: dry-run before persisting.",
            "[Project Agent]",
            "read-only-map",
            "stop if authorization is required",
        ],
    )
    assert "Record: dry-run before persisting." in packet, packet
    assert "operator-gate \\" not in packet, packet
    assert packet.count("read-only-map") == 1, packet
    assert len(packet.splitlines()) <= 18, packet
    assert "does not write an operator gate, run history, write control, experiment control, or production state" in packet

    packet_with_todo = build_sanitized_controller_packet_with_user_todo()
    assert_order(
        packet_with_todo,
        [
            "[User / Gate]",
            "Todo:",
            "resolve or defer it before judging the gate",
            "Gate:",
            "Suggestion: Confirm the Todo first",
            "[Project Agent]",
        ],
    )
    assert "Read the owner review worksheet first." in packet_with_todo
    assert "operator-gate \\" not in packet_with_todo, packet_with_todo
    assert len(packet_with_todo.splitlines()) <= 18, packet_with_todo

    approved_packet = build_sanitized_approved_command_packet()
    assert_order(
        approved_packet,
        [
            "[User / Gate]",
            "Gate: none; Suggestion: forward directly to the claimed project Agent",
            "run only the approved read-only/dry-run agent_command",
            "[Project Agent]",
            "Approved agent command",
        ],
    )
    assert "Approve Codex continuing along the safe path" not in approved_packet, approved_packet
    assert "if the next step requires writes, a reward append, or approval" not in approved_packet, approved_packet
    assert "without adding write authority, global control, or production-action authorization" in approved_packet, approved_packet
    assert len(approved_packet.splitlines()) <= 18, approved_packet

    focus_wait_packet = build_sanitized_focus_wait_packet()
    assert_order(
        focus_wait_packet,
        [
            "[User / Gate]",
            "Todo: Provide new owner evidence",
            "Gate: none; Suggestion: keep focus wait",
            "[Project Agent]",
            "Status/history inspection only",
        ],
    )
    assert "keep focus_wait" in focus_wait_packet, focus_wait_packet
    assert "read-only-map" not in focus_wait_packet, focus_wait_packet
    assert "operator-gate" not in focus_wait_packet, focus_wait_packet
    assert len(focus_wait_packet.splitlines()) <= 18, focus_wait_packet
    print("review-packet-smoke ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
