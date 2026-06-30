# AI-Native Architecture

This project is an AI-native privacy operations platform because the agent layer is treated as governed infrastructure, not a chatbot feature.

The platform is organized around six primitives:

1. **Agents** with explicit roles, tool scopes, output contracts, and memory boundaries.
2. **Tools and MCP servers** that expose enterprise capabilities through narrow, auditable interfaces.
3. **Connectors** that adapt source systems into a common privacy data model.
4. **Policies** that define permissions, approval gates, redaction, and data handling.
5. **Traces** that preserve the evidence trail behind every AI-assisted decision.
6. **Human approval gates** for side effects such as email, report delivery, status changes, deletion, masking, and vendor notification.

## Reference Layout

```txt
agents/
  agents.yaml                         governed agent manifest

policies/
  approval-gates.yaml                 side-effect approval policy
  data-classification.yaml            data handling classes
  tool-permissions.yaml               least-privilege tool policy

connectors/
  sdk/                                common connector interfaces
  examples/postgres/                  example enterprise-system connector

mcp/
  source-systems/                     read-only MCP server scaffold

src/
  app/                                Next.js app and API routes
  lib/tools.ts                        public facade for the in-app tool runtime
  lib/tools/                          grouped runtime internals and approval policy
  lib/sub-agents/                     focused agent prompts, registry, and runners
  data/                               synthetic demo fixtures
```

## Agent Model

Agents are specialized workers. Each agent has a declared purpose, permission mode, tool list, and expected outputs.

Examples:

- `identity-resolver` searches fragmented systems and explains match confidence.
- `disposition-planner` maps records to DSAR outcomes and statutory rationale.
- `communications-coordinator` drafts and parses correspondence but queues sends for review.
- `execution-coordinator` performs side effects only after approval policy checks pass.

The manifest lives in `agents/agents.yaml`. Implemented sub-agents are registered in `src/lib/sub-agents/registry.ts`, and contract tests compare that registry against the manifest and runtime tool surface so the implementation cannot silently drift away from the governance model.

## Tool and MCP Model

The browser demo currently uses the in-app runtime exposed through `src/lib/tools.ts`. That facade exports `TOOL_DEFINITIONS`, `executeTool`, and approval helpers while the implementation is grouped under `src/lib/tools/`.

The `mcp/` directory is a contract/scaffold layer, not the browser runtime. It shows how the same capabilities can be externalized as MCP servers for production deployments.

This makes the platform deployable in enterprise environments where agents need governed access to existing systems:

- CRM
- warehouse
- marketing automation
- dealer or branch systems
- support systems
- telemetry or product data
- email and case-management queues
- evidence stores

## Connector Model

Connectors normalize each enterprise system into a common privacy operations shape. Agents should reason over `CandidateRecord`, `PrivacyRecord`, and `RecordProvenance` instead of vendor-specific APIs.

This separation lets the same agent workflow run against synthetic demo data, Postgres, Salesforce, Snowflake, Zendesk, or a custom legacy system.

The connector contract lives in `connectors/sdk/src/types.ts`. In this public demo, source-system tools still call the local Postgres/query layer directly; production deployments can bind customer-specific connectors behind the MCP contracts without changing the agent-facing model.

## Policy Model

The policy files are intended to be machine-readable controls:

- `tool-permissions.yaml` defines which agents can use which tools.
- `approval-gates.yaml` defines when a human approval is required and how it is verified.
- `data-classification.yaml` defines how personal data, credentials, internal data, and public demo data should be handled.

Production deployments can enforce these policies directly in the agent runtime, MCP gateway, or API layer. In the local demo, approval phrase validation lives in `src/lib/tools/approval-policy.ts`, and tests keep the policy files aligned with the runtime behavior.

## Trace Model

Every material AI action should be traceable:

- request received,
- agent invoked,
- tools called,
- records searched,
- records included or excluded,
- legal rules used,
- draft generated,
- human approval captured,
- side effect executed,
- final artifact delivered.

The trace is not just observability. For privacy operations, it is litigation-defense evidence.

## Human Approval Model

The platform is read-only by default. Side effects require explicit approval. The demo uses exact approval phrases and server-side validation before execution.

This design keeps the agent useful without allowing invisible data mutation, silent deletion, or unsupervised external communication.

## Enterprise Deployment Shape

A production deployment would typically include:

- SSO and role-based access control for operators.
- Customer-specific connectors and source-system credentials.
- MCP gateway or tool registry with policy enforcement.
- Central evidence vault for immutable trace events.
- Tenant-specific retention and redaction policies.
- Human approval queues for side-effect bundles.
- Export controls for consumer packages and regulator-ready reports.

## Why This Matters

Most AI demos stop at "the model can answer questions." Privacy teams need something harder:

- agents that can inspect messy systems,
- explain why records match or do not match,
- cite the rule basis for decisions,
- generate customer-safe language,
- preserve evidence,
- and wait for humans before doing anything irreversible.

That is the platform boundary this repository is designed to demonstrate.
