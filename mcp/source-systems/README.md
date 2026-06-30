# Source Systems MCP Server

This scaffold defines the public contract for a read-only MCP server that sits in front of enterprise data connectors.

## Tools

| Tool | Description |
|------|-------------|
| `search_subject` | Search across configured connectors using email, phone, name, VIN, address, or request-scoped identifiers. |
| `get_record` | Retrieve one normalized privacy record by connector ID and source record ID. |
| `explain_record` | Return provenance, query evidence, and normalization notes for one record. |
| `list_connectors` | Show configured connector metadata and health state. |

## Security Model

- No writes.
- No bulk export.
- Credentials remain in deployment secrets.
- Tool responses include source provenance.
- Each call should write an evidence event in production deployments.

## Implementation Note

`src/server.ts` is intentionally a minimal scaffold and contract test target, not a standalone MCP process yet. Production implementations can bind the connector SDK in `connectors/sdk` to an MCP transport such as stdio, HTTP, or a managed MCP gateway.
