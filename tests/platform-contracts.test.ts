import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('agent manifest keeps side effects denied by default', async () => {
  const manifest = await read('agents/agents.yaml');

  assert.match(manifest, /side_effects: denied_by_default/);
  assert.match(manifest, /trace_required: true/);
  assert.match(manifest, /id: execution-coordinator/);
  assert.match(manifest, /permissions: human_approved_only/);
  assert.match(manifest, /approval_policy: approval-gates\.v1/);
});

test('approval gate policy requires exact phrases and trace-backed approval records', async () => {
  const policy = await read('policies/approval-gates.yaml');

  assert.match(policy, /singular: I approve this action/);
  assert.match(policy, /plural: I approve these actions/);
  assert.match(policy, /approval_quote_exact_match/);
  assert.match(policy, /action_ids_match_presented_bundle/);
  assert.match(policy, /tool_trace_id/);
  assert.match(policy, /on_mismatched_quote: reject_without_side_effect/);
});

test('tool permission policy preserves read-only defaults and communication queueing', async () => {
  const policy = await read('policies/tool-permissions.yaml');

  assert.match(policy, /read_only: true/);
  assert.match(policy, /writes: deny/);
  assert.match(policy, /external_messages: deny/);
  assert.match(policy, /send_without_approval/);
  assert.match(policy, /communications\.send_after_approval/);
});

test('data classification policy keeps credentials and personal data out of the repo', async () => {
  const policy = await read('policies/data-classification.yaml');

  assert.match(policy, /personal_data:/);
  assert.match(policy, /credential:/);
  assert.match(policy, /allowed_in_repo: false/);
  assert.match(policy, /trace_behavior: never_log/);
});
