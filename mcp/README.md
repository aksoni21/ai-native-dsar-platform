# MCP Servers

The MCP layer exposes enterprise privacy operations as governed tools. In the browser demo, similar tools live inside the Next.js API and in-app agent runtime; the files here are MCP-ready contracts/scaffolds rather than the active browser runtime. They show how the same capability can become reusable infrastructure.

## Planned Servers

| Server | Purpose | Default Mode |
|--------|---------|--------------|
| `source-systems` | Search and retrieve normalized records from CRM, warehouse, marketing, dealer, support, and telemetry connectors. | Read-only |
| `dsar-intake` | List and inspect requests, deadlines, verification state, and operator queues. | Read-only, status updates gated |
| `legal-rules` | Retrieve privacy obligations, deadline rules, and exemption candidates. | Read-only |
| `communications` | Draft, parse, match, and queue email correspondence. | Queue-only |
| `evidence-vault` | Append and retrieve immutable trace events. | Append-only |

## Safety Pattern

MCP tools should be narrow, typed, auditable, and permissioned. Side effects should not be exposed as ordinary model-callable tools unless they enforce the same approval policy used by the application.
