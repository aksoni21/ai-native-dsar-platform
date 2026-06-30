# Adding an Agent Skill

This repo uses "agent skill" as the product/platform term and "sub-agent" as the implementation detail. A skill is a focused worker with a declared purpose, prompt, tool allowlist, and output contract.

## Steps

1. Add or update an entry in `agents/agents.yaml`.
   - Give it an `id`, purpose, permission mode, tool list, and outputs.
   - Keep side effects denied unless the skill routes through an approval-gated executor.

2. Add the system prompt in `src/lib/sub-agents/prompts.ts`.
   - State the role, available tools, procedure, and output format.
   - Be explicit when JSON output is parsed by code.

3. Register the implementation in `src/lib/sub-agents/registry.ts`.
   - Add the skill id, manifest agent id, prompt, allowed tools, and optional parent-callable tool name.
   - Set `allowsSubAgentMetaTools: true` only for a skill that is deliberately allowed to call other sub-agent meta-tools.

4. Add a runner wrapper in `src/lib/sub-agents/`.
   - Follow the existing wrappers: build a user message, read the prompt/allowlist from the registry, then call `runSubAgent`.
   - Do not import `TOOL_DEFINITIONS` directly from a wrapper.

5. Expose a parent-callable tool only if needed.
   - Add a tool definition and execution case through the `src/lib/tools.ts` facade/runtime.
   - Read-only tools are preferred. Any external send, status update, deletion, masking, or vendor notification must go through approval-gated execution.

6. Add tests.
   - The agent-skill contract tests should pass automatically when the registry maps to a manifest agent and every allowed tool exists.
   - Add focused tests for any new policy boundary or parser output shape.

7. Update platform copy only if the skill is user-facing.
   - Add the skill to the `/platform` page when it is part of the product story.
   - Keep internal helper sub-agents documented in architecture docs instead.

## Quick Checklist

- Manifest entry exists.
- Prompt exists.
- Registry entry exists.
- Runner wrapper uses the registry allowlist.
- Parent-callable tool exists only if the main agent should delegate to it.
- Policy files still describe the permission posture.
- `npm test` passes.
