# Agent Trace Schema

Agent traces are the evidence layer for AI-assisted privacy operations. A trace should let a reviewer reconstruct what happened without trusting the model's memory or prose.

## Minimal Trace Event

```json
{
  "event_id": "evt_01",
  "trace_id": "trace_req_001",
  "request_id": "REQ-001",
  "timestamp": "2026-01-01T12:00:00.000Z",
  "actor_type": "agent",
  "actor_id": "identity-resolver",
  "action": "tool_call_completed",
  "tool_name": "source_systems.search_by_email",
  "input_summary": {
    "email": "maria.chen@example.com"
  },
  "output_summary": {
    "candidate_count": 3,
    "included_count": 3,
    "review_count": 0
  },
  "data_classes": ["public_demo"],
  "policy_decision": {
    "allowed": true,
    "policy_id": "tool-permissions.v1"
  }
}
```

## Recommended Event Types

| Event | Purpose |
|-------|---------|
| `agent_started` | Agent role, request scope, and tool scope were established. |
| `tool_call_started` | Tool invocation was requested. |
| `tool_call_completed` | Tool returned a summarized result. |
| `record_included` | A source record was included in a DSAR result set. |
| `record_excluded` | A source record was excluded with rationale. |
| `legal_rule_applied` | A statutory basis or exemption candidate was used. |
| `draft_generated` | A report, email, or consumer response draft was created. |
| `human_approval_requested` | A side-effect bundle was presented to an operator. |
| `human_approval_captured` | The operator approved a specific action bundle. |
| `side_effect_executed` | Email, export, mutation, deletion, or status update occurred. |
| `trace_exported` | Evidence package was exported for review. |

## Trace Requirements

- Store summaries, not raw secrets.
- Redact or minimize personal data according to `policies/data-classification.yaml`.
- Link side effects to the exact approval event.
- Keep trace IDs stable across agents working on the same request.
- Use append-only storage in production.
