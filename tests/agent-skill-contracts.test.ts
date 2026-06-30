import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  IMPLEMENTED_AGENT_SKILLS,
  SUB_AGENT_META_TOOL_NAMES,
} from '../src/lib/sub-agents/registry';
import { executeTool } from '../src/lib/tools';
import { isValidApprovalPhrase } from '../src/lib/tools/approval-policy';

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

function declaredToolNames(runtimeSource: string): Set<string> {
  return new Set(
    Array.from(runtimeSource.matchAll(/name:\s*'([^']+)'/g), (match) => match[1]),
  );
}

test('implemented agent skills map to declared manifest agents', async () => {
  const manifest = await read('agents/agents.yaml');

  for (const skill of IMPLEMENTED_AGENT_SKILLS) {
    assert.match(
      manifest,
      new RegExp(`id: ${skill.manifestAgentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      `${skill.id} should map to manifest agent ${skill.manifestAgentId}`,
    );
  }
});

test('implemented agent skill allowlists reference existing runtime tools', async () => {
  const runtimeSource = await read('src/lib/tools/runtime.ts');
  const toolNames = declaredToolNames(runtimeSource);

  for (const skill of IMPLEMENTED_AGENT_SKILLS) {
    for (const toolName of skill.allowedTools) {
      assert.equal(
        toolNames.has(toolName),
        true,
        `${skill.id} allowlist references missing tool ${toolName}`,
      );
    }
  }
});

test('sub-agents do not recurse through meta-tools unless explicitly allowed', () => {
  const metaTools = new Set<string>(SUB_AGENT_META_TOOL_NAMES);

  for (const skill of IMPLEMENTED_AGENT_SKILLS) {
    const usedMetaTools = skill.allowedTools.filter((toolName) => metaTools.has(toolName));
    if ('allowsSubAgentMetaTools' in skill && skill.allowsSubAgentMetaTools) continue;
    assert.deepEqual(
      usedMetaTools,
      [],
      `${skill.id} should not include sub-agent meta-tools`,
    );
  }
});

test('approval phrase validator preserves exact accepted phrases', () => {
  assert.equal(isValidApprovalPhrase('I approve this action'), true);
  assert.equal(isValidApprovalPhrase('I approve these actions'), true);
  assert.equal(isValidApprovalPhrase('i approve this action.'), true);
  assert.equal(isValidApprovalPhrase('approved'), false);
  assert.equal(isValidApprovalPhrase('yes, go ahead'), false);
  assert.equal(isValidApprovalPhrase('I approved this action'), false);
});

test('tool facade still exposes the expected public API surface', async () => {
  const facadeSource = await read('src/lib/tools.ts');

  assert.match(facadeSource, /TOOL_DEFINITIONS/);
  assert.match(facadeSource, /executeTool/);
  assert.match(facadeSource, /ExecuteToolContext/);
  assert.match(facadeSource, /ToolName/);
  assert.match(facadeSource, /isValidApprovalPhrase/);
});

test('executeTool facade dispatches read tools and rejects unapproved email execution', async () => {
  const openRequests = await executeTool('get_open_requests', {});
  assert.equal(Array.isArray(openRequests), true);

  const rejected = await executeTool('execute_post_approval_pipeline', {
    request_ids: ['REQ-001'],
    actions: [{ kind: 'send_email', email_recipient_name: 'Mary' }],
    authorization_quote: 'approved',
  });

  assert.deepEqual(
    {
      summary: (rejected as { summary?: string }).summary,
      manifest: (rejected as { manifest?: unknown }).manifest,
    },
    {
      summary: 'Pipeline call rejected: authorization_quote is not a recognized approval phrase.',
      manifest: null,
    },
  );
});
