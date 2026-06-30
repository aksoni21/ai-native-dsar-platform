import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getAiProviderConfig } from '../src/lib/ai/config';
import { anthropicToolSchema } from '../src/lib/ai/providers/anthropic';
import { geminiToolSchema } from '../src/lib/ai/providers/gemini';
import { openAiToolSchema } from '../src/lib/ai/providers/openai';
import type { AiToolDefinition } from '../src/lib/ai/types';

async function read(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

const sampleTools: AiToolDefinition[] = [
  {
    name: 'get_request_details',
    description: 'Fetch one request.',
    input_schema: {
      type: 'object',
      properties: {
        request_id: { type: 'string' },
      },
      required: ['request_id'],
    },
  },
];

test('AI provider config defaults to Anthropic and requires model for OpenAI/Gemini', () => {
  assert.deepEqual(
    getAiProviderConfig({ ANTHROPIC_API_KEY: 'sk-ant-test' } as unknown as NodeJS.ProcessEnv),
    {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      apiKey: 'sk-ant-test',
    },
  );

  assert.throws(
    () => getAiProviderConfig({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' } as unknown as NodeJS.ProcessEnv),
    /AI_MODEL is required/,
  );

  assert.deepEqual(
    getAiProviderConfig({
      AI_PROVIDER: 'gemini',
      AI_MODEL: 'gemini-test',
      GEMINI_API_KEY: 'gem-test',
    } as unknown as NodeJS.ProcessEnv),
    {
      provider: 'gemini',
      model: 'gemini-test',
      apiKey: 'gem-test',
    },
  );
});

test('tool schemas convert canonical app tools for every provider', () => {
  assert.deepEqual(anthropicToolSchema(sampleTools)[0], {
    name: 'get_request_details',
    description: 'Fetch one request.',
    input_schema: sampleTools[0].input_schema,
  });

  assert.deepEqual(openAiToolSchema(sampleTools)[0], {
    type: 'function',
    name: 'get_request_details',
    description: 'Fetch one request.',
    parameters: sampleTools[0].input_schema,
  });

  assert.deepEqual(geminiToolSchema(sampleTools), [
    {
      functionDeclarations: [
        {
          name: 'get_request_details',
          description: 'Fetch one request.',
          parametersJsonSchema: sampleTools[0].input_schema,
        },
      ],
    },
  ]);
});

test('migrated runtime call sites do not import provider SDKs directly', async () => {
  const migratedFiles = [
    'src/app/api/chat/route.ts',
    'src/app/api/chat/privacy-hub/route.ts',
    'src/lib/sub-agents/runner.ts',
    'src/lib/ai-gov/model.ts',
  ];

  for (const path of migratedFiles) {
    const source = await read(path);
    assert.doesNotMatch(source, /@anthropic-ai\/sdk|from 'openai'|@google\/genai/, path);
  }
});
